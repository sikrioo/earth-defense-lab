/* ---------- fortress mode: mining — ore from broken rocks, drones that carry it home, energy cores ----------
   A broken rock leaves ore floating where it died. It only becomes energy once it is brought home:
   by the fortress's two slow drones, by miner turrets' faster ones, or by the shield's magnet when it
   drifts close. Ore burns up after a while. Elites and bosses also drop energy cores (see CORES). */
import { TAU, ctx, rand, time } from '../core/canvas.js';
import { emit, sprite } from '../core/particles.js';
import { CORES, ORE } from './data.js';
import { G, enemies } from './state.js';
import { V, distC } from './view.js';
import { neonCircle, neonPath, rgb, ringFx } from './fx.js';
import { turrets } from './turrets.js';
import { sfx } from './sfx.js';

export const ores = [];
export const miners = [];
const ORE_COL = [120,255,220];
const COMMON = ['power', 'speed', 'reach'];

export function resetMining(){ ores.length = 0; miners.length = 0; }

// called when a rock breaks
export function dropLoot(e){
  const total = e.T.energy*ORE.yieldMul, n = Math.max(1, Math.min(e.T.boss ? 10 : 5, Math.ceil(e.T.energy/2.5)));
  for (let i = 0; i < n; i++){
    const a = rand(0, TAU), v = rand(10, 40) + (e.T.boss ? 60 : 0);
    ores.push({ x:e.x + Math.cos(a)*e.r*.3, y:e.y + Math.sin(a)*e.r*.3, vx:(e.vx || 0)*.2 + Math.cos(a)*v, vy:(e.vy || 0)*.2 + Math.sin(a)*v,
      v:total/n, t:0, life:ORE.life, rot:rand(0, TAU), claim:null });
  }
  const cores = e.T.boss ? ['prime', COMMON[(Math.random()*3)|0]] : e.T.elite ? [COMMON[(Math.random()*3)|0]] : [];
  for (const c of cores) ores.push({ x:e.x + rand(-10, 10), y:e.y + rand(-10, 10), vx:rand(-30, 30), vy:rand(-30, 30), v:0, core:c, t:0, life:ORE.coreLife, rot:0, claim:null });
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
    for (let i = have; i < w.n; i++){ const d = { owner:w.owner, i, state:'home', x:0, y:0, vx:0, vy:0, tgt:null, cargo:0, cores:[], trips:0, downT:0 }; const h = homeOf(d); d.x = h.x; d.y = h.y; miners.push(d); }
  }
}
function pickOre(d, s){
  let best = null, bs = 1e9;
  for (const o of ores){
    if (o.claim && o.claim !== d) continue;
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
    o.claim = d; d.tgt = o; d.state = 'go'; d.trips = 0;
  }
  let gx = home.x, gy = home.y;
  if (d.state === 'go'){
    if (!ores.includes(d.tgt)){ const o = pickOre(d, s); if (o){ o.claim = d; d.tgt = o; } else { d.tgt = null; d.state = 'back'; } }
    if (d.tgt){ gx = d.tgt.x; gy = d.tgt.y; }
    if (d.tgt && Math.hypot(gx - d.x, gy - d.y) < 8){
      // scoop up everything in reach
      const r = s.scoop;
      for (let i = ores.length - 1; i >= 0; i--){
        const o = ores[i]; if (Math.hypot(o.x - d.x, o.y - d.y) > r) continue;
        if (o.core) d.cores.push(o.core); else d.cargo += o.v*(1 + (s.yield || 0));
        ores.splice(i, 1);
      }
      sprite(d.x, d.y, r, ORE_COL, .25);
      d.trips++; d.tgt = null;
      const next = d.trips < s.trips ? pickOre(d, s) : null;
      if (next && Math.hypot(next.x - d.x, next.y - d.y) < 220){ next.claim = d; d.tgt = next; } else d.state = 'back';
    }
  }
  if (d.state === 'back' && Math.hypot(home.x - d.x, home.y - d.y) < 10){
    deposit(d.x, d.y, d.cargo, d.cores); d.cargo = 0; d.cores = []; d.state = 'home'; return;
  }
  const dx = gx - d.x, dy = gy - d.y, dd = Math.hypot(dx, dy) || 1, k = Math.min(1, dt*7);
  d.vx += (dx/dd*sp - d.vx)*k; d.vy += (dy/dd*sp - d.vy)*k;
  d.x += d.vx*dt; d.y += d.vy*dt;
  // rocks swat drones out of the sky (and whatever they carried falls back out as ore)
  if (!s.armor) for (const e of enemies){
    if (e.dead || Math.hypot(e.x - d.x, e.y - d.y) > e.r + 5) continue;
    if (d.cargo > 0) ores.push({ x:d.x, y:d.y, vx:rand(-30, 30), vy:rand(-30, 30), v:d.cargo, t:0, life:ORE.life*.6, rot:0, claim:null });
    for (const c of d.cores) ores.push({ x:d.x, y:d.y, vx:rand(-30, 30), vy:rand(-30, 30), v:0, core:c, t:0, life:ORE.coreLife, rot:0, claim:null });
    if (d.tgt) d.tgt.claim = null;
    d.cargo = 0; d.cores = []; d.tgt = null; d.state = 'down'; d.downT = 4;
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
    const r = 2.6 + Math.min(3, o.v*.6), ca = Math.cos(o.rot), sa = Math.sin(o.rot);
    sprite(o.x, o.y, r*3, ORE_COL, .3*blink);
    neonPath(() => { ctx.moveTo(o.x + ca*r*1.6, o.y + sa*r*1.6); ctx.lineTo(o.x - sa*r, o.y + ca*r); ctx.lineTo(o.x - ca*r*1.6, o.y - sa*r*1.6); ctx.lineTo(o.x + sa*r, o.y - ca*r); ctx.closePath(); }, ORE_COL, 1, .9*blink);
  }
}
export function drawMiners(){
  for (const d of miners){
    if (d.state === 'home' || d.state === 'down') continue;
    const col = d.owner ? d.owner.T.col : [200,225,255], a = Math.atan2(d.vy, d.vx);
    neonCircle(d.x, d.y, 4.5, col, 1.2, .95);
    neonPath(() => { for (const s of [-1, 1]){ const b = a + s*2.3; ctx.moveTo(d.x + Math.cos(b)*4.5, d.y + Math.sin(b)*4.5); ctx.lineTo(d.x + Math.cos(b)*8, d.y + Math.sin(b)*8); } }, col, 1, .8);
    if (d.cargo > 0 || d.cores.length){ sprite(d.x, d.y, 6 + Math.min(6, d.cargo*.3), d.cores.length ? CORES[d.cores[0]].col : ORE_COL, .9); }
    else sprite(d.x, d.y, 3, col, .7);
  }
}
export const coreIcon = (g, type, cx, cy, r) => {
  const c = CORES[type].col; g.save(); g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r*1.8); gr.addColorStop(0, rgb(c, .5)); gr.addColorStop(1, rgb(c, 0)); g.fillStyle = gr; g.fillRect(cx - r*2, cy - r*2, r*4, r*4);
  g.beginPath(); for (let k = 0; k < 6; k++){ const a = k/6*TAU - Math.PI/2; g.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r); } g.closePath();
  g.strokeStyle = rgb(c, .35); g.lineWidth = r*.4; g.stroke(); g.strokeStyle = `rgb(${c.map(v => Math.min(255, v + 80))})`; g.lineWidth = r*.12; g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, r*.22, 0, TAU); g.fill(); g.restore();
};
