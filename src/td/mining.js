/* ---------- fortress mode: mining — ore from broken rocks, drones that carry it home, energy cores ----------
   A broken rock leaves ore floating where it died. It only becomes energy once it is brought home:
   by the fortress's two slow drones, by miner turrets' faster ones, or by the shield's magnet when it
   drifts close. Ore burns up after a while. Elites and bosses also drop energy cores (see CORES). */
import { TAU, ctx, rand, setCtx, time } from '../core/canvas.js';
import { emit, sprite } from '../core/particles.js';
import { CORES, ORE } from './data.js';
import { G, enemies } from './state.js';
import { V, distC } from './view.js';
import { neonCircle, neonPath, rgb, ringFx } from './fx.js';
import { turrets } from './turrets.js';
import { sfx } from './sfx.js';

export const ores = [];
export const miners = [];
const ORE_COL = ORE.kinds.ore.col, CRY_COL = ORE.kinds.crystal.col;
const COMMON = ['power', 'speed', 'reach'];

export function resetMining(){ ores.length = 0; miners.length = 0; }

// called when a rock breaks
export function dropLoot(e){
  const total = e.T.energy*ORE.yieldMul, n = Math.max(1, Math.min(e.T.boss ? 10 : 5, Math.ceil(e.T.energy/2.5)));
  // armoured rocks, elites and bosses give half their worth as crystal: fewer, richer pieces only miners can carry
  const rich = e.T.armor || e.T.elite || e.T.boss, nc = rich ? Math.max(1, Math.round(n*.4)) : 0, crys = rich ? total*ORE.kinds.crystal.share : 0;
  const put = (kind, v) => { const a = rand(0, TAU), sp = rand(10, 40) + (e.T.boss ? 60 : 0);
    ores.push({ kind, x:e.x + Math.cos(a)*e.r*.3, y:e.y + Math.sin(a)*e.r*.3, vx:(e.vx || 0)*.2 + Math.cos(a)*sp, vy:(e.vy || 0)*.2 + Math.sin(a)*sp, v, t:0, life:ORE.life*(kind === 'crystal' ? 1.4 : 1), rot:rand(0, TAU), claim:null }); };
  for (let i = 0; i < n; i++) put('ore', (total - crys)/n);
  for (let i = 0; i < nc; i++) put('crystal', crys/nc);
  const cores = e.T.boss ? ['prime', COMMON[(Math.random()*3)|0]] : e.T.elite ? [COMMON[(Math.random()*3)|0]] : [];
  for (const c of cores) ores.push({ kind:'core', x:e.x + rand(-10, 10), y:e.y + rand(-10, 10), vx:rand(-30, 30), vy:rand(-30, 30), v:0, core:c, t:0, life:ORE.coreLife, rot:0, claim:null });
}

// bring something home: ore → energy, cores → the store (and offer to fit them)
function deposit(x, y, energy, cores){
  if (energy > 0){ G.energy += energy*G.energyMul; sprite(x, y, 14, ORE_COL, .8); sfx.ore(); }
  if (cores.length) sfx.core();
  for (const c of cores){ G.cores.push(c); G.coreQueue++; ringFx(x, y, 6, 50, .5, CORES[c].col, 3); }
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
function homeOf(d){
  if (d.owner) return { x:d.owner.px, y:d.owner.py };
  const a = -Math.PI/2 + (d.i ? .14 : -.14); return { x:V.cx + Math.cos(a)*V.PR, y:V.cy + Math.sin(a)*V.PR };
}
function syncDrones(){
  const want = [{ owner:null, n:ORE.base.drones }, ...turrets.filter(t => t.type === 'miner').map(t => ({ owner:t, n:t.s.drones }))];
  for (let i = miners.length - 1; i >= 0; i--){ const d = miners[i]; if (d.owner && !turrets.includes(d.owner)) miners.splice(i, 1); }
  for (const w of want){
    const have = miners.filter(d => d.owner === w.owner).length;
    for (let i = have; i < w.n; i++){ const d = { owner:w.owner, i, state:'home', x:0, y:0, vx:0, vy:0, tgt:null, cargo:0, cores:[], downT:0, load:[] }; const h = homeOf(d); d.x = h.x; d.y = h.y; miners.push(d); }
  }
}
function pickOre(d, s){
  let best = null, bs = 1e9;
  for (const o of ores){
    if ((o.claim && o.claim !== d) || !s.kinds.includes(o.kind)) continue;
    if (distC(o.x, o.y) < V.SR + G.magnet) continue;              // the magnet will get it
    const left = o.life - o.t, dd = Math.hypot(o.x - d.x, o.y - d.y);
    if (dd/(s.speed*V.spd) > left) continue;                      // would burn up before we got there
    const sc = dd - (o.core ? 900 : 0) - o.v*25;
    if (sc < bs){ bs = sc; best = o; }
  }
  return best;
}
function updDrone(d, dt){
  const s = d.owner ? d.owner.s : ORE.base, sp = s.speed*V.spd, home = homeOf(d);
  if (d.state === 'down'){ d.downT -= dt; if (d.downT <= 0){ d.state = 'home'; d.x = home.x; d.y = home.y; } return; }
  if (d.state === 'home'){
    d.x = home.x; d.y = home.y;
    const o = pickOre(d, s); if (!o) return;
    o.claim = d; d.tgt = o; d.state = 'go';
  }
  let gx = home.x, gy = home.y;
  if (d.state === 'go'){
    if (!ores.includes(d.tgt)){ const o = pickOre(d, s); if (o){ o.claim = d; d.tgt = o; } else { d.tgt = null; d.state = 'back'; } }
    if (d.tgt){ gx = d.tgt.x; gy = d.tgt.y; }
    if (d.tgt && Math.hypot(gx - d.x, gy - d.y) < 8){
      // scoop up everything in reach that this drone can carry, until the hold is full
      const r = s.scoop;
      for (let i = ores.length - 1; i >= 0 && d.cargo < s.cap; i--){
        const o = ores[i]; if (!s.kinds.includes(o.kind) || Math.hypot(o.x - d.x, o.y - d.y) > r) continue;
        if (o.core) d.cores.push(o.core); else d.cargo += o.v*(1 + (s.yield || 0));
        if (d.load.length < 5) d.load.push(o.kind);
        ores.splice(i, 1);
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
  const dx = gx - d.x, dy = gy - d.y, dd = Math.hypot(dx, dy) || 1, k = Math.min(1, dt*7);
  d.vx += (dx/dd*sp - d.vx)*k; d.vy += (dy/dd*sp - d.vy)*k;
  d.x += d.vx*dt; d.y += d.vy*dt;
  // rocks swat drones out of the sky (and whatever they carried falls back out as ore)
  if (!s.armor) for (const e of enemies){
    if (e.dead || Math.hypot(e.x - d.x, e.y - d.y) > e.r + 5) continue;
    if (d.cargo > 0) ores.push({ kind:'ore', x:d.x, y:d.y, vx:rand(-30, 30), vy:rand(-30, 30), v:d.cargo, t:0, life:ORE.life*.6, rot:0, claim:null });
    for (const c of d.cores) ores.push({ kind:'core', x:d.x, y:d.y, vx:rand(-30, 30), vy:rand(-30, 30), v:0, core:c, t:0, life:ORE.coreLife, rot:0, claim:null });
    if (d.tgt) d.tgt.claim = null;
    d.cargo = 0; d.cores = []; d.load = []; d.tgt = null; d.state = 'down'; d.downT = 4;
    sprite(d.x, d.y, 26, [255,140,90], .9);
    for (let i = 0; i < 8; i++){ const a = rand(0, TAU), v = rand(60, 160); emit({ x:d.x, y:d.y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, drag:2, life:.4, s0:2.5, s1:1, pal:[[255,220,180],[255,120,60]] }); }
    break;
  }
}

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
      const c = CORES[o.core].col, r = 8 + Math.sin(time*5)*1;
      sprite(o.x, o.y, 26, c, .35*blink); neonCircle(o.x, o.y, 15 + (time*20 % 10), c, 1, .4*blink);
      neonPath(() => { for (let k = 0; k < 6; k++){ const a = k/6*TAU + time; k ? ctx.lineTo(o.x + Math.cos(a)*r, o.y + Math.sin(a)*r) : ctx.moveTo(o.x + Math.cos(a)*r, o.y + Math.sin(a)*r); } ctx.closePath(); }, c, 1.4, blink);
      sprite(o.x, o.y, 4, [255,255,255], blink);
      continue;
    }
    const cry = o.kind === 'crystal', col = cry ? CRY_COL : ORE_COL, r = (cry ? 4 : 2.6) + Math.min(3, o.v*.4), ca = Math.cos(o.rot), sa = Math.sin(o.rot);
    sprite(o.x, o.y, r*3, col, (cry ? .45 : .3)*blink);
    neonPath(() => { ctx.moveTo(o.x + ca*r*1.6, o.y + sa*r*1.6); ctx.lineTo(o.x - sa*r, o.y + ca*r); ctx.lineTo(o.x - ca*r*1.6, o.y - sa*r*1.6); ctx.lineTo(o.x + sa*r, o.y - ca*r); ctx.closePath(); }, col, cry ? 1.3 : 1, .9*blink);
    if (cry) sprite(o.x, o.y, 2, [255,255,255], blink);
  }
}
export function drawMiners(){
  for (const d of miners){
    if (d.state === 'home' || d.state === 'down') continue;
    const col = d.owner ? d.owner.T.col : [200,215,235], a = Math.atan2(d.vy, d.vx);
    drawWorker(d.x, d.y, a, col, d.load, d.owner ? 2.1 : 1.8, d.state === 'go' && d.tgt && Math.hypot(d.tgt.x - d.x, d.tgt.y - d.y) < 40);
  }
}
// a little work drone, top-down, nose along +x: thruster, cargo bin (with what it carries), cab, two claws
const KCOL = k => k === 'crystal' ? CRY_COL : k === 'core' ? ORE.kinds.core.col : ORE_COL;
function rrect(x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawWorker(x, y, a, col, load, s, grab){
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
  ctx.globalCompositeOperation = 'lighter';
  sprite(-9.5, 0, 4.5 + Math.random()*1.5, [255,170,80], .85);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  // claws: open while flying, closing on the ore
  const o = grab ? 1.2 : 2.4;
  ctx.strokeStyle = '#9aa6bd'; ctx.lineWidth = 1.3; ctx.lineCap = 'round'; ctx.beginPath();
  for (const k of [-1, 1]){ ctx.moveTo(4, k*3); ctx.lineTo(8.5, k*(2 + o)); ctx.lineTo(11.5, k*(o - .4)); }
  ctx.stroke();
  // body and treads
  ctx.fillStyle = '#1a202c'; ctx.fillRect(-7.5, -6, 12, 1.6); ctx.fillRect(-7.5, 4.4, 12, 1.6);
  rrect(-7, -4.6, 11.5, 9.2, 2.2); ctx.fillStyle = '#323c50'; ctx.fill(); ctx.strokeStyle = '#090c12'; ctx.lineWidth = .8; ctx.stroke();
  // cargo bin with whatever it carries
  rrect(-6.2, -3.4, 5.6, 6.8, 1); ctx.fillStyle = '#0b0f17'; ctx.fill();
  load.forEach((k, i) => { ctx.fillStyle = rgb(KCOL(k)); const px = -5 + (i % 3)*1.7, py = -2.2 + ((i/3)|0)*2.4 + (i % 2)*.6; ctx.fillRect(px, py, 1.5, 1.5); });
  // hazard stripes and the cab window
  ctx.fillStyle = '#ffc94a'; ctx.fillRect(.2, -4.6, .9, 9.2); ctx.fillRect(1.8, -4.6, .5, 9.2);
  rrect(2.6, -2.4, 1.8, 4.8, .8); ctx.fillStyle = rgb(col); ctx.fill();
  ctx.restore();
  ctx.globalCompositeOperation = 'lighter';
  const hx = x + Math.cos(a)*12*s, hy = y + Math.sin(a)*12*s;
  sprite(hx, hy, 6, [255,250,220], .5); if (load.length) sprite(x - Math.cos(a)*3*s, y - Math.sin(a)*3*s, 5, KCOL(load[0]), .5);
}
export function drawWorkerIcon(canvas, col, load = []){
  const g = canvas.getContext('2d'), keep = ctx; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
  setCtx(g); drawWorker(canvas.width/2, canvas.height/2, -Math.PI/2, col, load, canvas.width/34, false); setCtx(keep);
}
export function drawOreIcon(canvas, kind){
  const g = canvas.getContext('2d'), keep = ctx, c = canvas.width/2; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
  setCtx(g); g.globalCompositeOperation = 'lighter';
  const r = canvas.width*(kind === 'crystal' ? .13 : .1), col = KCOL(kind);
  sprite(c, c, r*3.2, col, .4);
  neonPath(() => { ctx.moveTo(c + r*1.6, c); ctx.lineTo(c, c + r); ctx.lineTo(c - r*1.6, c); ctx.lineTo(c, c - r); ctx.closePath(); }, col, 3, 1);
  setCtx(keep);
}
export const coreIcon = (g, type, cx, cy, r) => {
  const c = CORES[type].col; g.save(); g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r*1.8); gr.addColorStop(0, rgb(c, .5)); gr.addColorStop(1, rgb(c, 0)); g.fillStyle = gr; g.fillRect(cx - r*2, cy - r*2, r*4, r*4);
  g.beginPath(); for (let k = 0; k < 6; k++){ const a = k/6*TAU - Math.PI/2; g.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r); } g.closePath();
  g.strokeStyle = rgb(c, .35); g.lineWidth = r*.4; g.stroke(); g.strokeStyle = `rgb(${c.map(v => Math.min(255, v + 80))})`; g.lineWidth = r*.12; g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, r*.22, 0, TAU); g.fill(); g.restore();
};
