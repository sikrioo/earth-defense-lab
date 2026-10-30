/* ---------- fortress mode: mining — ore from broken rocks, drones that carry it home, energy cores ----------
   A broken rock leaves ore floating where it died. It only becomes energy once it is brought home:
   by the fortress's two slow drones, by miner turrets' faster ones, or by the shield's magnet when it
   drifts close. Ore burns up after a while. Elites and bosses also drop energy cores (see CORES). */
import { TAU, ctx, rand, setCtx, time } from '../core/canvas.js';
import { emit, sprite } from '../core/particles.js';
import { ORE } from './data.js';
import { coreCol, dropFor, gradeOf } from './cores.js';
import { G, enemies } from './state.js';
import { V, distC } from './view.js';
import { neonCircle, neonPath, rgb, ringFx } from './fx.js';
import { tierOf, turrets } from './turrets.js';
import { sfx } from './sfx.js';
import { tip } from './tips.js';
import { pullOre } from './bosses.js';

export const ores = [];
export const miners = [];
const ORE_COL = ORE.tiers[0].col;
import { sectorOf } from './data.js';

export function resetMining(){ ores.length = 0; miners.length = 0; }

// called when a rock breaks
export function dropLoot(e, mul = 1){
  const total = e.T.energy*ORE.yieldMul*mul, n = Math.max(1, Math.min(e.T.boss ? 10 : 5, Math.ceil(e.T.energy/2.5)));
  // the rock decides the usual grade; deeper sectors bump pieces up a grade now and then
  const T = e.T, base = T.boss ? 5 : T.elite ? 4 : (T.armor || T.lens) ? 3 : (T.comet || T.icy) ? 2 : 1, bump = sectorOf(G.wave || 1)*.08;
  for (let i = 0; i < n; i++){
    const tier = Math.min(5, base + (Math.random() < bump ? 1 : 0)), a = rand(0, TAU), sp = rand(10, 40) + (T.boss ? 60 : 0);
    ores.push({ kind:'ore', tier, x:e.x + Math.cos(a)*e.r*.3, y:e.y + Math.sin(a)*e.r*.3, vx:(e.vx || 0)*.2 + Math.cos(a)*sp, vy:(e.vy || 0)*.2 + Math.sin(a)*sp,
      v:total/n*ORE.tiers[tier - 1].mul, t:0, life:ORE.life*(1 + (tier - 1)*.1), rot:rand(0, TAU), claim:null });
  }
  const cores = dropFor(e);
  tip('ore');
  for (const c of cores) ores.push({ kind:'core', x:e.x + rand(-10, 10), y:e.y + rand(-10, 10), vx:rand(-30, 30), vy:rand(-30, 30), v:0, core:c, t:0, life:ORE.coreLife, rot:0, claim:null });
}

// bring something home: ore → energy, cores → the store (and offer to fit them)
function deposit(x, y, energy, cores){
  if (energy > 0){ G.energy += energy*G.energyMul; sprite(x, y, 14, ORE_COL, .8); sfx.ore(); }
  if (cores.length){ sfx.core(); tip('core'); }
  for (const c of cores){ G.cores.push(c); G.coreQueue++; ringFx(x, y, 6, 50, .5, coreCol(c), 3); }
}
// the view changed: whatever is still floating is swept in
export function sweepOres(){
  let e = 0; const cs = [];
  for (const o of ores){ if (o.core) cs.push(o.core); else e += o.v; }
  for (const d of miners){ e += d.cargo || 0; cs.push(...(d.cores || [])); }
  ores.length = 0; miners.length = 0;
  deposit(V.cx, V.cy - V.SR, e, cs);
}

/* ----- drones: the fortress's own pair plus every miner turret's ----- */
const canCarry = (s, o) => o.core ? !!s.cores : (o.tier || 1) <= s.tier;
function homeOf(d){
  if (d.owner) return { x:d.owner.px, y:d.owner.py };
  const a = -Math.PI/2 + (d.i ? .14 : -.14); return { x:V.cx + Math.cos(a)*V.PR, y:V.cy + Math.sin(a)*V.PR };
}
function syncDrones(){
  const want = [{ owner:null, n:ORE.base.drones }, ...turrets.filter(t => t.type === 'miner').map(t => ({ owner:t, n:t.s.drones }))];
  for (let i = miners.length - 1; i >= 0; i--){ const d = miners[i]; if (d.owner && !turrets.includes(d.owner)) miners.splice(i, 1); }
  for (const w of want){
    const have = miners.filter(d => d.owner === w.owner).length;
    for (let i = have; i < w.n; i++){ const d = { owner:w.owner, i, state:'home', x:0, y:0, vx:0, vy:0, tgt:null, cargo:0, cores:[], stunT:0, load:[], beams:[] }; const h = homeOf(d); d.x = h.x; d.y = h.y; miners.push(d); }
  }
}
function pickOre(d, s){
  let best = null, bs = 1e9;
  for (const o of ores){
    if ((o.claim && o.claim !== d) || !canCarry(s, o)) continue;
    if (distC(o.x, o.y) < V.SR + G.magnet) continue;              // the magnet will get it
    const left = o.life - o.t, dd = Math.hypot(o.x - d.x, o.y - d.y);
    if (dd/(s.speed*V.spd) > left) continue;                      // would burn up before we got there
    const sc = dd - (o.core ? 900 : 0) - o.v*25;
    if (sc < bs){ bs = sc; best = o; }
  }
  return best;
}
function updDrone(d, dt){
  const s = d.owner ? d.owner.s : ORE.base, home = homeOf(d);
  let sp = s.speed*V.spd;
  // a plasma pulse stuns drones for a moment; the black hole's pull slows them
  if (d.stunT > 0){ d.stunT -= dt; d.vx *= Math.exp(-4*dt); d.vy *= Math.exp(-4*dt); d.x += d.vx*dt; d.y += d.vy*dt; return; }
  for (const e of enemies) if (!e.dead && e.T.blackhole && Math.hypot(e.x - d.x, e.y - d.y) < e.r*4) sp *= .5;
  if (d.state === 'home'){
    d.x = home.x; d.y = home.y;
    const o = pickOre(d, s); if (!o) return;
    o.claim = d; d.tgt = o; d.state = 'go';
  }
  let gx = home.x, gy = home.y;
  if (d.state === 'pull'){
    // tractor fleet: hold position and reel in everything in beam range
    d.pullT -= dt; d.vx *= Math.exp(-6*dt); d.vy *= Math.exp(-6*dt); d.x += d.vx*dt; d.y += d.vy*dt;
    d.beams = [];
    for (let i = ores.length - 1; i >= 0 && d.cargo < s.cap; i--){
      const o = ores[i]; if (!canCarry(s, o)) continue;
      const dx = d.x - o.x, dy = d.y - o.y, dd = Math.hypot(dx, dy); if (dd > s.beam) continue;
      if (o.claim && o.claim !== d) continue;
      o.claim = d; d.beams.push(o);
      const v = Math.min(dd, 300*dt); o.x += dx/(dd || 1)*v; o.y += dy/(dd || 1)*v; o.t = Math.min(o.t, o.life - .5);
      if (dd < 12){ take(d, s, o); ores.splice(i, 1); }
    }
    if (d.pullT <= 0 || d.cargo >= s.cap || !d.beams.length){ d.beams = []; d.state = 'back'; }
    return;
  }
  if (d.state === 'go'){
    if (!ores.includes(d.tgt)){ const o = pickOre(d, s); if (o){ o.claim = d; d.tgt = o; } else { d.tgt = null; d.state = 'back'; } }
    if (d.tgt){ gx = d.tgt.x; gy = d.tgt.y; }
    const reach = s.beam ? s.beam*.85 : 8;
    if (d.tgt && Math.hypot(gx - d.x, gy - d.y) < reach){
      if (s.beam){ d.state = 'pull'; d.pullT = 1.4; return; }
      // scoop up everything in reach that this drone can carry, until the hold is full
      const r = s.scoop;
      for (let i = ores.length - 1; i >= 0 && d.cargo < s.cap; i--){
        const o = ores[i]; if (!canCarry(s, o) || Math.hypot(o.x - d.x, o.y - d.y) > r) continue;
        take(d, s, o); ores.splice(i, 1);
      }
      sprite(d.x, d.y, r, ORE_COL, .25);
      d.tgt = null;
      const next = d.cargo < s.cap*.8 ? pickOre(d, s) : null;
      if (next && Math.hypot(next.x - d.x, next.y - d.y) < 220){ next.claim = d; d.tgt = next; } else d.state = 'back';
    }
  }
  if (d.state === 'back' && Math.hypot(home.x - d.x, home.y - d.y) < 10){
    deposit(d.x, d.y, d.cargo, d.cores); d.cargo = 0; d.cores = []; d.load = []; d.state = 'home'; return;
  }
  // fly toward the goal, steering around any rock in the way (drones never get hit: dodging costs time instead)
  let dx = gx - d.x, dy = gy - d.y, dd = Math.hypot(dx, dy) || 1; dx /= dd; dy /= dd;
  let ax = 0, ay = 0;
  for (const e of enemies){
    if (e.dead || e.warnT > 0) continue;
    const ex = d.x - e.x, ey = d.y - e.y, ed = Math.hypot(ex, ey) || 1, R = e.r + 60;
    if (ed > R) continue;
    const k = (1 - ed/R)*2.2; ax += ex/ed*k; ay += ey/ed*k;
    // slide sideways rather than straight back
    const side = (ex*dy - ey*dx) > 0 ? 1 : -1; ax += -dy*side*k*.8; ay += dx*side*k*.8;
    if (ed < e.r + 8){ d.x = e.x + ex/ed*(e.r + 8); d.y = e.y + ey/ed*(e.r + 8); }
  }
  let ux = dx + ax, uy = dy + ay; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
  const k = Math.min(1, dt*7);
  d.vx += (ux*sp - d.vx)*k; d.vy += (uy*sp - d.vy)*k;
  d.x += d.vx*dt; d.y += d.vy*dt;
}
function take(d, s, o){
  if (o.core) d.cores.push(o.core); else d.cargo += o.v*(1 + (s.yield || 0));
  if (d.load.length < 5) d.load.push(o.core ? 'core' : o.tier);
}
// plasma pulses stun drones close by
export function stunDrones(x, y, r, t){ for (const d of miners) if (d.state !== 'home' && Math.hypot(d.x - x, d.y - y) < r) d.stunT = t; }

export function updMining(dt){
  syncDrones();
  for (let i = ores.length - 1; i >= 0; i--){
    const o = ores[i]; o.t += dt; o.rot += dt*1.5;
    const f = Math.exp(-1.6*dt); o.vx *= f; o.vy *= f;
    // cores sink slowly toward Earth on their own: without a miner they still arrive, just late
    if (o.core){ const dc0 = distC(o.x, o.y) || 1; o.x -= (o.x - V.cx)/dc0*ORE.coreDrift*V.spd*dt; o.y -= (o.y - V.cy)/dc0*ORE.coreDrift*V.spd*dt; }
    // the shield's magnet: close ore is pulled in and counts as soon as it touches
    const dc = distC(o.x, o.y);
    if (dc < V.SR + G.magnet){ const k = 260*dt/(dc || 1); o.vx -= (o.x - V.cx)*k; o.vy -= (o.y - V.cy)*k; }
    if (!pullOre(o, dt)){ if (o.claim) o.claim.tgt = null; ores.splice(i, 1); continue; }
    o.x += o.vx*dt; o.y += o.vy*dt;
    if (distC(o.x, o.y) < V.SR - 4){ deposit(o.x, o.y, o.v, o.core ? [o.core] : []); ores.splice(i, 1); continue; }
    if (o.t >= o.life){ if (o.claim) o.claim.tgt = null; sprite(o.x, o.y, 10, [255,170,90], .5); ores.splice(i, 1); }
  }
  for (const d of miners) updDrone(d, dt);
}

/* ----- drawing ----- */
export function drawOres(){
  for (const o of ores){
    const left = o.life - o.t, blink = left < 2.5 ? (Math.sin(time*18) > 0 ? 1 : .35) : 1;
    if (o.core){
      const c = coreCol(o.core), gc = gradeOf(o.core).col, r = 8 + Math.sin(time*5)*1;
      sprite(o.x, o.y, 26, c, .35*blink); neonCircle(o.x, o.y, 15 + (time*20 % 10), c, 1, .4*blink);
      neonPath(() => { for (let k = 0; k < 6; k++){ const a = k/6*TAU + time; k ? ctx.lineTo(o.x + Math.cos(a)*r, o.y + Math.sin(a)*r) : ctx.moveTo(o.x + Math.cos(a)*r, o.y + Math.sin(a)*r); } ctx.closePath(); }, c, 1.4, blink);
      sprite(o.x, o.y, 4, [255,255,255], blink);
      if (o.core.grade !== 'low' && o.core.grade !== 'lowest') neonCircle(o.x, o.y, 11, gc, 1, .8*blink);
      continue;
    }
    const tr = o.tier || 1, col = ORE.tiers[tr - 1].col, r = 2.4 + tr*.5 + Math.min(2, o.v*.2), ca = Math.cos(o.rot), sa = Math.sin(o.rot);
    sprite(o.x, o.y, r*3, col, (.25 + tr*.05)*blink);
    neonPath(() => { ctx.moveTo(o.x + ca*r*1.6, o.y + sa*r*1.6); ctx.lineTo(o.x - sa*r, o.y + ca*r); ctx.lineTo(o.x - ca*r*1.6, o.y - sa*r*1.6); ctx.lineTo(o.x + sa*r, o.y - ca*r); ctx.closePath(); }, col, .9 + tr*.12, .9*blink);
    if (tr >= 3) sprite(o.x, o.y, 1.5 + tr*.3, [255,255,255], blink);
  }
}
export function drawMiners(){
  for (const d of miners){
    if (d.state === 'home') continue;
    const col = d.owner ? d.owner.T.col : [200,215,235], a = Math.atan2(d.vy, d.vx) || -Math.PI/2;
    const st = d.owner ? { tier:tierOf(d.owner), evo:d.owner.evo } : { tier:1 };
    // tractor beams to the ore being reeled in
    if (d.beams && d.beams.length){ ctx.globalCompositeOperation = 'lighter'; for (const o of d.beams) neonPath(() => { ctx.moveTo(d.x, d.y); ctx.lineTo(o.x, o.y); }, col, 1.2, .6); }
    if (d.stunT > 0 && Math.random() < .5) sprite(d.x + rand(-6, 6), d.y + rand(-6, 6), 6, [210,160,255], .8);
    drawWorker(d.x, d.y, a, col, d.load, d.owner ? 2.1 : 1.8, d.state === 'go' && d.tgt && Math.hypot(d.tgt.x - d.x, d.tgt.y - d.y) < 40, st);
  }
}
// a work drone, top-down, nose along +x. It grows with its miner: MK I a small worker, MK II gets lights and a
// second pair of claws, MK III a bigger frame with twin engines; the evolution decides the final shape
// (hauler: wide with a big hold, runner: slim with long engines, tractor: a beam dish instead of claws)
const KCOL = k => k === 'core' ? ORE.core.col : ORE.tiers[(k || 1) - 1].col;
function rrect(x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawWorker(x, y, a, col, load, s, grab, st = { tier:1 }){
  const evo = st.evo, tier = st.tier || 1;
  const K = evo === 'hauler' ? 1.3 : evo === 'runner' ? .95 : tier === 3 ? 1.22 : tier === 2 ? 1.1 : 1;
  // body box per shape: x0, half-height, length
  const shape = evo === 'hauler' ? { x0:-9, hh:6.4, w:15 } : evo === 'runner' ? { x0:-7, hh:3.2, w:12 } : { x0:-7, hh:4.6, w:11.5 };
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s*K, s*K);
  // engines
  ctx.globalCompositeOperation = 'lighter';
  const eng = evo === 'runner' ? [[-12, 0, 6]] : (tier >= 3 || evo) ? [[shape.x0 - 2.5, -shape.hh*.55, 4.2], [shape.x0 - 2.5, shape.hh*.55, 4.2]] : [[-9.5, 0, 4.5]];
  for (const [ex, ey, r] of eng) sprite(ex, ey, r + Math.random()*1.5, evo === 'runner' ? [120,220,255] : [255,170,80], .85);
  if (evo === 'runner') sprite(-17, 0, 5, [90,170,255], .4);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  // claws (or the tractor's dish): open while flying, closing on the ore; MK II and up has two pairs
  const fx = shape.x0 + shape.w;
  if (evo === 'tractor'){
    ctx.strokeStyle = '#9aa6bd'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(fx + 5, 0, 5, Math.PI*.6, Math.PI*1.4); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; sprite(fx + 2, 0, 3.5, col, .9); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  } else {
    const o = grab ? 1.2 : 2.4, pairs = tier >= 2 || evo ? [1, .55] : [1];
    ctx.strokeStyle = '#9aa6bd'; ctx.lineCap = 'round';
    for (const p of pairs){ ctx.lineWidth = 1.3*p; ctx.beginPath();
      for (const k of [-1, 1]){ ctx.moveTo(fx - .5, k*3*p); ctx.lineTo(fx + 4*p + (1 - p)*2, k*(2 + o)*p); ctx.lineTo(fx + 7*p + (1 - p)*3, k*(o - .4)*p); }
      ctx.stroke(); }
  }
  // fins on the runner, treads on the rest
  if (evo === 'runner'){ ctx.fillStyle = '#3a4660'; for (const k of [-1, 1]){ ctx.beginPath(); ctx.moveTo(-6, k*3); ctx.lineTo(-10, k*7); ctx.lineTo(-2, k*3); ctx.closePath(); ctx.fill(); } }
  else { ctx.fillStyle = '#1a202c'; ctx.fillRect(shape.x0 - .5, -shape.hh - 1.4, shape.w + .5, 1.6); ctx.fillRect(shape.x0 - .5, shape.hh - .2, shape.w + .5, 1.6); }
  // body
  rrect(shape.x0, -shape.hh, shape.w, shape.hh*2, 2.2); ctx.fillStyle = tier >= 3 || evo ? '#3a465c' : '#323c50'; ctx.fill(); ctx.strokeStyle = '#090c12'; ctx.lineWidth = .8; ctx.stroke();
  // cargo bin with whatever it carries (the hauler's is big)
  const bw = evo === 'hauler' ? 8.5 : evo === 'runner' ? 3.6 : 5.6, bh = shape.hh*2 - 2.4;
  rrect(shape.x0 + .8, -bh/2, bw, bh, 1); ctx.fillStyle = '#0b0f17'; ctx.fill();
  const cols = evo === 'hauler' ? 5 : evo === 'runner' ? 2 : 3;
  load.forEach((k, i) => { ctx.fillStyle = rgb(KCOL(k)); const px = shape.x0 + 2 + (i % cols)*1.7, py = -bh/2 + 1.2 + ((i/cols)|0)*2.4 + (i % 2)*.6; ctx.fillRect(px, py, 1.5, 1.5); });
  // hazard stripes and the cab window
  const sx = shape.x0 + bw + 1.6;
  ctx.fillStyle = '#ffc94a'; ctx.fillRect(sx, -shape.hh, .9, shape.hh*2); if (evo !== 'runner') ctx.fillRect(sx + 1.6, -shape.hh, .5, shape.hh*2);
  rrect(fx - 2.6, -Math.min(2.4, shape.hh - .8), 1.8, Math.min(4.8, shape.hh*2 - 1.6), .8); ctx.fillStyle = rgb(col); ctx.fill();
  ctx.restore();
  ctx.globalCompositeOperation = 'lighter';
  const c = Math.cos(a), si = Math.sin(a), L = s*K;
  sprite(x + c*(fx + 3)*L, y + si*(fx + 3)*L, 6, [255,250,220], .5);
  // MK II+: running lights on the flanks
  if (tier >= 2 || evo){ const blink = .5 + .5*Math.sin(time*6 + x*.01); for (const k of [-1, 1]) sprite(x - si*k*(shape.hh + 1)*L, y + c*k*(shape.hh + 1)*L, 3, k > 0 ? [120,255,160] : [255,90,80], .5 + .4*blink); }
  if (load.length) sprite(x - c*3*L, y - si*3*L, 5, KCOL(load[0]), .5);
}
export function drawWorkerIcon(canvas, col, load = [], st){
  const g = canvas.getContext('2d'), keep = ctx; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
  setCtx(g); drawWorker(canvas.width/2, canvas.height/2, -Math.PI/2, col, load, canvas.width/(st && (st.evo || st.tier > 1) ? 44 : 34), false, st); setCtx(keep);
}
export function drawOreIcon(canvas, kind){
  const g = canvas.getContext('2d'), keep = ctx, c = canvas.width/2; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
  setCtx(g); g.globalCompositeOperation = 'lighter';
  const r = canvas.width*(.08 + (kind === 'core' ? 3 : kind)*.012), col = KCOL(kind);
  sprite(c, c, r*3.2, col, .4);
  neonPath(() => { ctx.moveTo(c + r*1.6, c); ctx.lineTo(c, c + r); ctx.lineTo(c - r*1.6, c); ctx.lineTo(c, c - r); ctx.closePath(); }, col, 3, 1);
  setCtx(keep);
}
export const coreIcon = (g, core, cx, cy, r) => {
  const c = coreCol(core), gc = gradeOf(core).col; g.save(); g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r*1.8); gr.addColorStop(0, rgb(c, .5)); gr.addColorStop(1, rgb(c, 0)); g.fillStyle = gr; g.fillRect(cx - r*2, cy - r*2, r*4, r*4);
  const hex = k => { g.beginPath(); for (let i = 0; i < 6; i++){ const a = i/6*TAU - Math.PI/2; g.lineTo(cx + Math.cos(a)*r*k, cy + Math.sin(a)*r*k); } g.closePath(); };
  hex(1); g.strokeStyle = rgb(c, .35); g.lineWidth = r*.4; g.stroke(); g.strokeStyle = `rgb(${c.map(v => Math.min(255, v + 80))})`; g.lineWidth = r*.12; g.stroke();
  // the grade shows as an outer frame (none for common)
  if (core.grade !== 'low' && core.grade !== 'lowest'){ hex(1.32); g.strokeStyle = rgb(gc, .9); g.lineWidth = r*.07; g.stroke(); if (core.grade === 'highest' || core.grade === 'named'){ hex(1.48); g.strokeStyle = rgb(gc, .5); g.lineWidth = r*.05; g.stroke(); } }
  g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, r*.22, 0, TAU); g.fill(); g.restore();
};
