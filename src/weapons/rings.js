import { H, TAU, W, ctx, origin, rand, time } from '../core/canvas.js';
import { LIGHT, PAL } from '../core/palette.js';
import { emit } from '../core/particles.js';
import { addShake, flash, ring } from '../core/lights.js';
import { ECOL } from '../data/enemy-types.js';
import { enemies } from '../enemies/list.js';
import { earth, gameOver, mapMode } from '../world/earth.js';
import { alive, ectr } from '../enemies/spawn.js';
import { hurt, hurtArea } from '../enemies/damage.js';
import { sparks } from '../fx/bursts.js';
import { simMax } from '../game/sim.js';
import { closePick, picking, setPickQ } from './levelup.js';
import { paused } from '../ui/deck.js';

/* ---------- auto revs: six-shooter reticles that hunt rocks on their own; level-ups grow them ---------- */
const RANKS = [
  { k:'D', w:'DRY',   at:0 },  { k:'C', w:'COOL',  at:3 },  { k:'B', w:'BLUE',  at:6 },
  { k:'A', w:'ACE',   at:10 }, { k:'S', w:'SWING', at:15 }, { k:'SS', w:'BEBOP', at:22 },
];
// every upgrade a level-up can offer; lv counts how many times it was taken
export const RUP = {
  ring:  { tag:'RING',    ko:'링 추가',      d:l => `리볼버 링 ${l + 1}개 → ${l + 2}개`, max:7 },
  dmg:   { tag:'FIRE',    ko:'화력',        d:l => `피해 +25% (현재 +${l*25}%)`, max:8 },
  rate:  { tag:'RATE',    ko:'연사',        d:l => `발사 간격 ${ringTick(l).toFixed(2)}초 → ${ringTick(l + 1).toFixed(2)}초`, max:6 },
  size:  { tag:'BORE',    ko:'구경',        d:l => `링 범위 +20% (현재 +${l*20}%)`, max:5 },
  move:  { tag:'DRIVE',   ko:'기동',        d:l => `링 이동 속도 +25% (현재 +${l*25}%)`, max:4 },
  cold:  { tag:'SPECIAL', ko:'냉각탄',      d:l => `맞은 운석 ${[1.5, 2.5, 3.5][l]}초 감속`, max:3, sp:true },
  chain: { tag:'SPECIAL', ko:'도탄',        d:l => `맞은 운석에서 ${l + 1}발이 튀어 근처 운석 타격 (50%)`, max:3, sp:true },
  boom:  { tag:'SPECIAL', ko:'폭발탄',      d:l => `처치 시 폭발 · 범위 ${60 + l*20} · 피해 ${60 + l*20}%`, max:3, sp:true },
  pull:  { tag:'SPECIAL', ko:'견인',        d:l => `링 안의 운석을 중심으로 끌어당김 (세기 ${l + 1})`, max:3, sp:true },
};
export const rup = {};
const ringTick = l => .6*Math.pow(.85, l);
const ringR = () => 30*(1 + rup.size*.2);
const ringSpeed = () => 300*(1 + rup.move*.25);
const ringDmg = rk => Math.round(14*(1 + rup.dmg*.25)*(1 + rk*.1));
export const revs = [], casings = [], zaps = [];
export function newRing(i){
  return { x:origin.x + (i % 2 ? 1 : -1)*(20 + i*16), y:origin.y - 120 - i*10, vx:0, vy:0, t:rand(0, .3), tgt:null, retarget:0,
    rot:0, rotTo:0, pulse:0, recoil:0, combo:0, rank:0, rankPop:0, bang:0, bangN:0 };
}
export function resetRings(){ for (const k in RUP) rup[k] = 0; revs.length = 0; revs.push(newRing(0)); casings.length = 0; zaps.length = 0; setPickQ(0); if (picking) closePick();
  if (simMax){ for (const k in RUP) rup[k] = RUP[k].max; revs.length = 0; for (let i = 0; i <= rup.ring; i++) revs.push(newRing(i)); }
}
// how close a rock is to landing: lower = more urgent
function threat(e){
  return mapMode === 'line' ? (earth.top - e.y) : Math.hypot(e.x - earth.cx, e.y - e.r - earth.cy) - earth.R;
}
function assignTargets(){
  const pool = enemies.filter(alive).sort((a, b) => threat(a) - threat(b));
  const taken = new Set();
  for (const r of revs){
    if (r.retarget > 0 && r.tgt && alive(r.tgt)) { taken.add(r.tgt); continue; }
    r.retarget = .35;
    // nearest of the most urgent few that no other ring has claimed
    let best = null, bs = 1e9;
    for (let i = 0; i < Math.min(pool.length, revs.length + 4); i++){
      const e = pool[i]; if (taken.has(e) && pool.length > revs.length) continue;
      const c = ectr(e), s = Math.hypot(c.x - r.x, c.y - r.y)*.6 + i*60;
      if (s < bs){ bs = s; best = e; }
    }
    r.tgt = best; if (best) taken.add(best);
  }
}
function ringFire(r){
  const R = ringR(); let n = 0;
  for (const e of enemies){
    if (!alive(e)) continue;
    const c = ectr(e);
    if (Math.hypot(c.x - r.x, c.y - r.y) > R + e.r*.25) continue;
    const dmg = ringDmg(r.rank);
    hurt(e, dmg, 'hand', null);
    sparks(c.x, c.y, [[255,255,255],[241,236,224],[244,196,96]], 7, 240, 2);
    if (rup.cold && alive(e)) e.chill = Math.max(e.chill || 0, [1.5, 2.5, 3.5][rup.cold - 1]);
    if (rup.chain){
      let from = e;
      for (let j = 0; j < rup.chain; j++){
        const fc = ectr(from); let nx = null, nd = 140;
        for (const o of enemies){ if (!alive(o) || o === e || o === from) continue; const oc = ectr(o), d = Math.hypot(oc.x - fc.x, oc.y - fc.y); if (d < nd){ nd = d; nx = o; } }
        if (!nx) break;
        const nc = ectr(nx); zaps.push({ x1:fc.x, y1:fc.y, x2:nc.x, y2:nc.y, age:0 });
        hurt(nx, Math.round(dmg*.5), 'hand', null); from = nx;
      }
    }
    if (rup.boom && !alive(e)){
      const br = 60 + (rup.boom - 1)*20;
      hurtArea(c.x, c.y, br, Math.round(dmg*(.6 + (rup.boom - 1)*.2)), 'gun');
      ring(c.x, c.y, 4, br, .35, PAL.gun[1], 3); flash(c.x, c.y, br*2, LIGHT.gun, 1, .25);
      for (let k = 0; k < 14; k++){ const a = rand(0, TAU), sp = rand(60, 220); emit({ x:c.x, y:c.y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, drag:3, life:rand(.2,.4), s0:rand(6,10), s1:1, pal:PAL.fire }); }
    }
    n++;
  }
  const prev = r.rank;
  if (n){
    r.combo++; r.pulse = 1; r.recoil = 1; addShake(Math.min(1.4, .4 + n*.25)/Math.sqrt(revs.length));
    if (casings.length < 30) casings.push({ x:r.x + R*.7, y:r.y - 4, vx:rand(120, 200), vy:rand(-320, -220), rr:rand(0, TAU), vr:rand(-18, 18), age:0 });
    if (n >= 3){ r.bang = 1; r.bangN = n; }
  } else r.combo = 0;
  let k = 0; for (let i = 0; i < RANKS.length; i++) if (r.combo >= RANKS[i].at) k = i;
  r.rank = k; if (k > prev) r.rankPop = 1;
}
export function updRings(dt){
  for (let i = casings.length - 1; i >= 0; i--){ const c = casings[i]; c.age += dt; c.vy += 900*dt; c.x += c.vx*dt; c.y += c.vy*dt; c.rr += c.vr*dt; if (c.age > .7) casings.splice(i, 1); }
  for (let i = zaps.length - 1; i >= 0; i--){ zaps[i].age += dt; if (zaps[i].age > .14) zaps.splice(i, 1); }
  if (gameOver || paused) return;
  if (!revs.length) revs.push(newRing(0));
  for (const r of revs) r.retarget -= dt;
  assignTargets();
  const sp = ringSpeed(), tick = ringTick(rup.rate), R = ringR();
  for (const r of revs){
    r.pulse = Math.max(0, r.pulse - dt*5); r.bang = Math.max(0, r.bang - dt*2.6); r.rankPop = Math.max(0, r.rankPop - dt*3); r.recoil = Math.max(0, r.recoil - dt*9);
    r.rot += (r.rotTo - r.rot)*Math.min(1, dt*18);
    // steer: a damped spring toward the target, leading it a little
    let gx, gy;
    if (r.tgt && alive(r.tgt)){ const c = ectr(r.tgt); gx = c.x + r.tgt.vx*.15; gy = c.y + r.tgt.vy*.15; }
    else { gx = origin.x + Math.cos(time*.7 + revs.indexOf(r)*2)*90; gy = origin.y - 140 + Math.sin(time*.9 + revs.indexOf(r))*30; }
    const ax = (gx - r.x)*28 - r.vx*9, ay = (gy - r.y)*28 - r.vy*9;
    r.vx += ax*dt; r.vy += ay*dt;
    const v = Math.hypot(r.vx, r.vy); if (v > sp){ r.vx *= sp/v; r.vy *= sp/v; }
    r.x += r.vx*dt; r.y += r.vy*dt;
    // rings stay on screen, so they can't camp the spawn line above it
    const m = ringR()*.6; r.x = Math.max(m, Math.min(W - m, r.x)); r.y = Math.max(m + 30, Math.min(H - m, r.y));
    // revs keep a little distance from each other
    for (const o of revs){ if (o === r) continue; const dx = r.x - o.x, dy = r.y - o.y, d = Math.hypot(dx, dy); if (d > 0 && d < R*1.2){ r.x += dx/d*(R*1.2 - d)*.5*dt*8; r.y += dy/d*(R*1.2 - d)*.5*dt*8; } }
    if (rup.pull){
      for (const e of enemies){ if (!alive(e)) continue; const c = ectr(e), dx = r.x - c.x, dy = r.y - c.y, d = Math.hypot(dx, dy);
        if (d < R*1.6 && d > 2){ const f = rup.pull*90/(e.m || 1); e.vx += dx/d*f*dt; e.vy += dy/d*f*dt; e.vx *= Math.exp(-rup.pull*.8*dt); e.vy *= Math.exp(-rup.pull*.8*dt); } }
    }
    r.t += dt;
    if (r.t >= tick){ r.t -= tick; r.rotTo += TAU/6; ringFire(r); }
  }
}
export function skewTag(x, y, text, size, bg, fg, skew = -.22){
  ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, skew, 1, 0, 0);
  ctx.font = `${size}px "Bebas Neue", "Arial Narrow", sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const w = ctx.measureText(text).width + size*.5, h = size*.95;
  if (bg){ ctx.fillStyle = bg; ctx.fillRect(0, -h/2, w, h); }
  ctx.fillStyle = fg; ctx.fillText(text, size*.25, size*.04);
  ctx.restore();
  return w;
}
function drawRing(r, i){
  const OFF = '#f1ece0', RED = '#d8392b', BLK = '#0a0a0c', AMB = '#e8a33d';
  const x = r.x, y = r.y, p = r.pulse, R = ringR()*(1 - r.recoil*.12), prog = r.t/ringTick(rup.rate);
  ctx.lineWidth = 4; ctx.strokeStyle = BLK; ctx.globalAlpha = .55; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = p > .3 ? RED : OFF; ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
  for (let k = 0; k < 6; k++){
    const a = -Math.PI/2 + k*TAU/6 + (r.rot - r.rotTo), cx = x + Math.cos(a)*R, cy = y + Math.sin(a)*R;
    ctx.fillStyle = BLK; ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(cx, cy, 4.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = OFF; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, 4.2, 0, TAU); ctx.stroke();
    if (k === 0){ ctx.fillStyle = prog > .92 ? RED : AMB; ctx.beginPath(); ctx.arc(cx, cy, 3*Math.min(1, prog), 0, TAU); ctx.fill(); }
  }
  ctx.strokeStyle = OFF; ctx.lineWidth = 1.5; ctx.globalAlpha = .9; ctx.beginPath();
  for (let k = 0; k < 4; k++){ const a = k*Math.PI/2, r0 = R*.32, r1 = R*.62; ctx.moveTo(x + Math.cos(a)*r0, y + Math.sin(a)*r0); ctx.lineTo(x + Math.cos(a)*r1, y + Math.sin(a)*r1); }
  ctx.stroke();
  ctx.fillStyle = p > .3 ? RED : OFF; ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
  if (p > .55){
    const k = (p - .55)/.45, s = R*.9*k;
    ctx.fillStyle = '#fff'; ctx.globalAlpha = k; ctx.beginPath();
    for (let j = 0; j < 8; j++){ const a = j*Math.PI/4 + .4, rr = j % 2 ? s*.22 : s; ctx.lineTo(x + Math.cos(a)*rr, y + Math.sin(a)*rr); }
    ctx.closePath(); ctx.fill();
  }
  if (p > 0){ ctx.globalAlpha = p*.85; ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, R + (1 - p)*18, 0, TAU); ctx.stroke(); }
  // the lead ring carries the readout; the rest just wear their rank letter
  const rk = RANKS[r.rank];
  ctx.globalAlpha = r.combo ? 1 : .5;
  ctx.save(); ctx.translate(x + R + 8, y - R*.7); const pop = 1 + r.rankPop*.5; ctx.scale(pop, pop);
  const w = skewTag(0, 0, rk.k, 15, r.rank >= 4 ? RED : BLK, r.rank >= 4 ? OFF : (r.combo ? RED : OFF));
  if (i === 0) skewTag(w + 2, 1, rk.w, 10, null, OFF);
  ctx.restore();
  if (r.combo >= 2){ ctx.globalAlpha = .9; skewTag(x + R + 8, y - R*.7 + 15, `×${r.combo}`, 11, null, AMB); }
  if (r.bang > 0){
    const k = r.bang, sc = 1 + (1 - k)*.25;
    ctx.globalAlpha = Math.min(1, k*2.2); ctx.save(); ctx.translate(x - R*.5, y - R - 14); ctx.scale(sc, sc); ctx.rotate(-.12);
    skewTag(-30, 0, r.bangN >= 5 ? 'BANG BANG!' : 'BANG!', 20, RED, OFF);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
export function drawRings(){
  ctx.globalCompositeOperation = 'source-over';
  for (const c of casings){
    ctx.globalAlpha = Math.min(1, (.7 - c.age)*4); ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rr);
    ctx.fillStyle = '#e8a33d'; ctx.fillRect(-1.5, -3.5, 3, 7); ctx.fillStyle = '#7a4e17'; ctx.fillRect(-1.5, 2, 3, 1.5); ctx.restore();
  }
  // ricochet lines: flat white strokes, a frame or two long
  for (const z of zaps){ ctx.globalAlpha = 1 - z.age/.14; ctx.strokeStyle = '#f1ece0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(z.x1, z.y1); ctx.lineTo(z.x2, z.y2); ctx.stroke(); }
  ctx.globalAlpha = 1;
  if (gameOver) return;
  revs.forEach(drawRing);
}

// runs once at boot, from main.js, in the original file order
export function setup(){
   for (const k in RUP) rup[k] = 0;
  ECOL.hand = [241,236,224];
}
