/* ---------- fortress mode: turrets on the platform, their shots, and the revolver drones ---------- */
import { RS, TAU, ctx, rand, setCtx, time } from '../core/canvas.js';
import { emit, sprite, streak } from '../core/particles.js';
import { boltWithForks } from '../core/lightning.js';
import { TURRET } from './data.js';
import { G, enemies, fx, shots } from './state.js';
import { PW, V } from './view.js';
import { alive, chill, hitSpark, hurt, hurtArea, isChilled } from './enemies.js';
import { burst, explode, mixc, neonCircle, neonLine, neonPath, rgb, ringFx } from './fx.js';

export const turrets = [];
export const turretAt = i => turrets.find(t => t.m === i);
export function resetTurrets(){ turrets.length = 0; shots.length = 0; }
export function addTurret(type){
  const used = new Set(turrets.map(t => t.m)); const m = [0, 1, 2, 3, 4, 5].find(i => !used.has(i));
  if (m === undefined) return null;
  const T = TURRET[type], p = V.mounts[m];
  const t = { type, T, s:{ ...T.base }, lv:{}, m, x:p.x, y:p.y - 4, cd:rand(0, .4), ang:-Math.PI/2, ramp:0, rampOn:null, drones:[], born:time };
  turrets.push(t); ringFx(p.x, p.y, 6, 60, .5, T.col, 3);
  return t;
}
export function applyUpgrade(t, up){
  up.apply(t.s); t.lv[up.id] = (t.lv[up.id] || 0) + 1;
  G.shatter = Math.max(0, ...turrets.filter(x => x.type === 'cryo').map(x => x.s.shatter));
  ringFx(t.x, t.y, 6, 46, .45, t.T.col, 2);
}
export const levelOf = t => Object.values(t.lv).reduce((a, b) => a + b, 0);
// keep turret positions in step with the view (resizes move the platform)
export function placeTurrets(){ for (const t of turrets){ const p = V.mounts[t.m]; t.x = p.x; t.y = p.y - 4; } }

// target: the rock closest to the shield inside range, skipping ones already taken
function target(t, range, skip, minRange = 0){
  let best = null, by = -1e9;
  for (const e of enemies){
    if (!alive(e) || (skip && skip.has(e)) || e.y < -e.r) continue;
    const d = Math.hypot(e.x - t.x, e.y - t.y); if (d > range || d < minRange) continue;
    if (e.y > by){ by = e.y; best = e; }
  }
  return best;
}
const aimAt = (t, e, dt) => { const a = Math.atan2(e.y - (t.y - PIVOT), e.x - t.x); let d = a - t.ang; d = Math.atan2(Math.sin(d), Math.cos(d)); t.ang += d*Math.min(1, dt*14); };
const muzzle = (t, len = BARREL[t.type] || 18) => ({ x:t.x + Math.cos(t.ang)*len, y:t.y - PIVOT + Math.sin(t.ang)*len });

export function updTurrets(dt){
  for (const t of turrets){
    const s = t.s; t.cd -= dt; t.kick = Math.max(0, (t.kick || 0) - dt*7);
    if (t.type === 'gatling'){
      // overheat: firing builds heat; at 100 the barrels must cool before firing again
      t.heat = t.heat || 0;
      if (t.over > 0){ t.over -= dt; if (t.over <= 0) t.heat = 0; if (Math.random() < dt*25){ const m = muzzle(t); emit({ x:m.x, y:m.y, vx:rand(-15, 15), vy:rand(-50, -25), drag:1, life:.7, s0:3, s1:9, a:.3, pal:[[200,210,220],[120,130,150]] }); } continue; }
      const e = target(t, s.range); if (!e){ t.heat = Math.max(0, t.heat - 30*dt); continue; } aimAt(t, e, dt);
      if (t.cd <= 0){
        t.cd = 1/s.rate; t.kick = .7;
        t.heat += s.heatPer; if (t.heat >= 100){ t.heat = 100; t.over = s.cool; }
        // lead the target: where it will be when a bullet gets there
        const m0 = muzzle(t), d0 = Math.hypot(e.x - m0.x, e.y - m0.y)/1100;
        const lx = e.x + (e.T.comet ? e.vx : e.vx + e.px)*d0, ly = e.y + (e.T.comet ? e.vy : e.vy + e.py)*d0;
        const aim = Math.atan2(ly - m0.y, lx - m0.x);
        for (let b = 0; b < s.bullets; b++){
          const a = aim + (b - (s.bullets - 1)/2)*.05 + rand(-.012, .012), m = muzzle(t);
          const crit = Math.random() < s.crit;
          shots.push({ k:'bullet', x:m.x, y:m.y, vx:Math.cos(a)*1100, vy:Math.sin(a)*1100, dmg:s.dmg*(crit ? 3 : 1), crit, pierce:s.pierce, hit:new Set(), life:.8, col:t.T.col });
        }
      }
    } else if (t.type === 'laser'){
      // battery: firing drains it; empty means a full recharge before the next beam
      if (t.bat === undefined) t.bat = s.cap;
      if (t.charging){ t.beams = []; t.bat += s.cap/s.recharge*dt; if (t.bat >= s.cap){ t.bat = s.cap; t.charging = false; } continue; }
      const skip = new Set(); t.beams = [];
      for (let b = 0; b < s.beams; b++){ const e = target(t, s.range, skip); if (!e) break; skip.add(e); t.beams.push(e); }
      if (!t.beams.length){ t.ramp = 0; t.rampOn = null; t.bat = Math.min(s.cap, t.bat + s.cap/s.recharge*dt); continue; }
      aimAt(t, t.beams[0], dt);
      t.bat -= dt*(1 + (t.beams.length - 1)*.5);
      if (t.bat <= 0){ t.bat = 0; t.charging = true; t.ramp = 0; t.rampOn = null; }
      if (t.rampOn !== t.beams[0]){ t.rampOn = t.beams[0]; t.ramp = 0; }
      t.ramp += dt; t.mult = 1 + (s.rampMax - 1)*Math.min(1, t.ramp/s.ramp);
      t.beams.forEach((e, i) => hurt(e, s.dps*(i ? 1 : t.mult)*dt, { chillBonus:s.melt }));
      if (Math.random() < dt*20){ const e = t.beams[0]; hitSpark(e.x + rand(-4, 4), e.y + rand(-4, 4), t.T.col); }
    } else if (t.type === 'missile'){
      const e = target(t, s.range, null, s.minRange); if (!e) continue; aimAt(t, e, dt);
      if (t.cd <= 0){
        t.cd = s.every; t.kick = 1;
        for (let i = 0; i < s.count; i++){
          const a = -Math.PI/2 + (i - (s.count - 1)/2)*.32;
          shots.push({ k:'missile', minR:s.minRange, tx:t.x, ty:t.y, x:t.x + (i - (s.count - 1)/2)*4, y:t.y - PIVOT - 10, vx:Math.cos(a)*240, vy:Math.sin(a)*240, tgt:e, dmg:s.dmg, blast:s.blast, cluster:s.cluster, life:3, delay:i*.05, col:t.T.col });
        }
      }
    } else if (t.type === 'cryo'){
      const e = target(t, s.range); if (!e) continue; aimAt(t, e, dt);
      if (t.cd <= 0){
        t.cd = s.every; t.kick = 1; const m = muzzle(t);
        const lead = .45, tx = e.x + (e.T.comet ? e.vx : 0)*lead, ty = e.y + (e.T.comet ? e.vy : e.speed*(e.slowT > 0 ? 1 - e.slowAmt : 1))*lead;
        shots.push({ k:'frost', x:m.x, y:m.y, sx:m.x, sy:m.y, tx, ty, t:0, dur:lead, s:{ ...s }, col:t.T.col });
      }
    } else if (t.type === 'tesla'){
      const e = target(t, s.range); if (!e || t.cd > 0) continue;
      t.cd = s.every;
      const pts = [[t.x, t.y - 34*TS]], seen = new Set(); let cur = e;
      for (let j = 0; j <= s.jumps && cur; j++){
        seen.add(cur); pts.push([cur.x, cur.y]);
        hurt(cur, s.dmg*(s.conduct ? 1 : Math.pow(s.falloff, j)), { chillBonus:isChilled(cur) ? s.conduct : 0 });
        if (s.stun && alive(cur)) cur.stunT = Math.max(cur.stunT, s.stun);
        let nx = null, nd = s.hop; for (const o of enemies){ if (!alive(o) || seen.has(o)) continue; const d = Math.hypot(o.x - cur.x, o.y - cur.y); if (d < nd){ nd = d; nx = o; } }
        cur = nx;
      }
      let life = .2;
      fx.push({ update(dt2){ life -= dt2; return life > 0; }, draw(){ for (let j = 1; j < pts.length; j++) boltWithForks(pts[j - 1][0], pts[j - 1][1], pts[j][0], pts[j][1], life/.2, 1.6, [[255,255,255],[226,220,255],[176,156,255],[120,90,240],[60,40,170]], 1); } });
      for (let j = 1; j < pts.length; j++) burst(pts[j][0], pts[j][1], t.T.col, 4, 140, 1.6);
    } else if (t.type === 'drone') updDrones(t, dt);
    else if (t.type === 'rail') updRail(t, s, dt);
    else if (t.type === 'flame') updFlame(t, s, dt);
  }
}

/* ----- railgun: charge, lock the aim near the end, then one line through everything ----- */
function updRail(t, s, dt){
  const e = target(t, s.range);
  if (!e){ t.chg = Math.max(0, (t.chg || 0) - dt/s.charge); t.locked = false; return; }
  t.chg = (t.chg || 0) + dt/s.charge;
  if (t.chg < s.lockAt){ aimAt(t, e, dt); t.locked = false; } else t.locked = true;
  if (t.chg < 1) return;
  t.chg = 0; t.locked = false; t.kick = 1;
  const m = muzzle(t), dx = Math.cos(t.ang), dy = Math.sin(t.ang), L = 2000, ex = m.x + dx*L, ey = m.y + dy*L;
  for (const o of enemies){
    if (!alive(o)) continue;
    const px = o.x - m.x, py = o.y - m.y, along = px*dx + py*dy; if (along < 0) continue;
    if (Math.abs(px*dy - py*dx) > o.r + s.width/2) continue;
    hurt(o, s.dmg, { pierceArmor:true });
    if (s.shock){ hurtArea(o.x, o.y, 50, s.dmg*s.shock); explode(o.x, o.y, 40, t.T.col); } else burst(o.x, o.y, t.T.col, 10, 300, 2.4);
  }
  let life = .3;
  fx.push({ update(d){ life -= d; return life > 0; }, draw(){ const k = life/.3; neonLine(m.x, m.y, ex, ey, t.T.col, s.width*.5*k + 1, k); neonLine(m.x, m.y, ex, ey, [255,255,255], 1.2*k, k); } });
  sprite(m.x, m.y, 40, t.T.col, .9);
}
/* ----- flamethrower: a short cone that burns; burns stack and tick on their own ----- */
function updFlame(t, s, dt){
  const e = target(t, s.range); t.firing = false; if (!e) return;
  aimAt(t, e, dt); t.firing = true;
  const m = muzzle(t);
  for (const o of enemies){
    if (!alive(o)) continue;
    const dx = o.x - m.x, dy = o.y - m.y, d = Math.hypot(dx, dy); if (d > s.range + o.r) continue;
    let da = Math.atan2(dy, dx) - t.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > s.cone/2 + Math.atan2(o.r, d)) continue;
    hurt(o, s.dps*dt, { organicBonus:s.organic });
    o.burn = Math.min(s.stacks, (o.burn || 0) + dt*3); o.burnT = 3; o.burnDps = s.burn*(o.T.organic ? 1 + s.organic : 1);
  }
  for (let i = 0; i < 3; i++){ if (Math.random() > dt*60) continue;
    const a = t.ang + rand(-s.cone/2, s.cone/2), v = s.range*rand(1.6, 2.2);
    emit({ x:m.x, y:m.y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, drag:2.4, life:rand(.35, .5), s0:rand(5, 8), s1:rand(14, 22), a:.55, pal:[[255,250,220],[255,190,80],[255,110,40],[180,40,20]] }); }
}

/* ----- shots ----- */
export function updShots(dt){
  for (let i = shots.length - 1; i >= 0; i--){
    const p = shots[i]; let keep = true;
    if (p.k === 'bullet'){
      for (let sub = 0; sub < 2 && keep; sub++){
        p.x += p.vx*dt/2; p.y += p.vy*dt/2;
        for (const e of enemies){
          if (!alive(e) || p.hit.has(e) || Math.hypot(e.x - p.x, e.y - p.y) > e.r + 3) continue;
          hurt(e, p.dmg, { crit:p.crit }); p.hit.add(e); hitSpark(p.x, p.y, p.col);
          if (p.pierce-- <= 0){ keep = false; break; }
        }
      }
      p.life -= dt; if (p.life <= 0 || p.y < -40 || p.x < -40 || p.x > PW + 40) keep = false;
    } else if (p.k === 'missile'){
      if (p.delay > 0){ p.delay -= dt; continue; }
      if (!alive(p.tgt)){ let best = null, bd = 1e9; for (const e of enemies){ if (!alive(e)) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd){ bd = d; best = e; } } p.tgt = best; }
      const sp = Math.min(620, Math.hypot(p.vx, p.vy) + 700*dt);
      if (p.tgt){ const a = Math.atan2(p.tgt.y - p.y, p.tgt.x - p.x), cur = Math.atan2(p.vy, p.vx); let d = a - cur; d = Math.atan2(Math.sin(d), Math.cos(d)); const na = cur + Math.max(-7*dt, Math.min(7*dt, d)); p.vx = Math.cos(na)*sp; p.vy = Math.sin(na)*sp; }
      p.x += p.vx*dt; p.y += p.vy*dt; p.life -= dt;
      if (Math.random() < dt*45) emit({ x:p.x, y:p.y, vx:-p.vx*.1 + rand(-10, 10), vy:-p.vy*.1 + rand(-10, 10), drag:2, life:.4, s0:2.5, s1:6, a:.35, pal:[[150,160,190],[70,80,110]] });
      const hitE = p.tgt && Math.hypot(p.tgt.x - p.x, p.tgt.y - p.y) < p.tgt.r + 4;
      if (hitE || p.life <= 0 || p.y < -60){ boom(p.x, p.y, p.blast, p.dmg, p.col); if (p.cluster) for (let j = 0; j < p.cluster; j++){ const a = rand(0, TAU), v = rand(90, 170); shots.push({ k:'bomblet', x:p.x, y:p.y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, life:rand(.35, .55), dmg:p.dmg*.35, blast:p.blast*.5, col:p.col }); } keep = false; }
    } else if (p.k === 'bomblet'){
      p.x += p.vx*dt; p.y += p.vy*dt; p.vx *= Math.exp(-2*dt); p.vy *= Math.exp(-2*dt); p.life -= dt;
      if (p.life <= 0){ boom(p.x, p.y, p.blast, p.dmg, p.col); keep = false; }
    } else if (p.k === 'frost'){
      p.t += dt; const k = Math.min(1, p.t/p.dur);
      p.x = p.sx + (p.tx - p.sx)*k; p.y = p.sy + (p.ty - p.sy)*k - Math.sin(k*Math.PI)*40;
      if (k >= 1){ frostBurst(p); keep = false; }
    }
    if (!keep) shots.splice(i, 1);
  }
}
function boom(x, y, r, dmg, col){ hurtArea(x, y, r, dmg); explode(x, y, r, col); }
function frostBurst(p){
  const s = p.s;
  for (const e of enemies){
    if (!alive(e) || Math.hypot(e.x - p.x, e.y - p.y) > s.radius + e.r*.7) continue;
    hurt(e, s.dmg); chill(e, s.slow, s.slowT);
    if (s.freeze && Math.random() < s.freeze && !e.T.boss) e.freezeT = Math.max(e.freezeT, 1.2);
  }
  ringFx(p.x, p.y, 4, s.radius, .4, [170,225,255], 3);
  for (let i = 0; i < 16; i++){ const a = rand(0, TAU), v = rand(.3, 1)*s.radius*1.4; emit({ x:p.x, y:p.y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, drag:3, life:rand(.3, .6), s0:rand(3, 6), s1:1, pal:[[245,252,255],[170,225,255],[90,150,230]] }); }
}

/* ----- revolver drones: chase the most urgent rock, fire one chamber per tick at everything in the ring ----- */
function updDrones(t, dt){
  const s = t.s;
  while (t.drones.length < s.drones) t.drones.push({ x:t.x, y:t.y - 20, vx:0, vy:-80, t:rand(0, .3), tgt:null, re:0, rot:0, rotTo:0, pulse:0 });
  const claimed = new Set(turrets.flatMap(o => o.drones).map(d => d.tgt).filter(Boolean));
  for (const d of t.drones){
    d.pulse = Math.max(0, d.pulse - dt*5); d.rot += (d.rotTo - d.rot)*Math.min(1, dt*18); d.re -= dt;
    if (!alive(d.tgt) || d.re <= 0){
      claimed.delete(d.tgt); d.re = .4; let best = null, by = -1e9;
      for (const e of enemies){ if (!alive(e) || e.y < -e.r) continue; const score = e.y - (claimed.has(e) ? 400 : 0) - Math.hypot(e.x - d.x, e.y - d.y)*.3; if (score > by){ by = score; best = e; } }
      d.tgt = best; if (best) claimed.add(best);
    }
    let gx = t.x, gy = t.y - 120;
    if (d.tgt){ gx = d.tgt.x; gy = d.tgt.y; }
    d.vx += ((gx - d.x)*30 - d.vx*9)*dt; d.vy += ((gy - d.y)*30 - d.vy*9)*dt;
    const v = Math.hypot(d.vx, d.vy), mx = s.speed*V.spd*1.4; if (v > mx){ d.vx *= mx/v; d.vy *= mx/v; }
    d.x += d.vx*dt; d.y += d.vy*dt;
    d.x = Math.max(10, Math.min(PW - 10, d.x)); d.y = Math.max(30, Math.min(V.defY, d.y));
    if (s.pull) for (const e of enemies){ if (!alive(e) || e.T.boss) continue; const dx = d.x - e.x, dy = d.y - e.y, dd = Math.hypot(dx, dy); if (dd < s.radius*1.6 && dd > 2){ e.px += dx/dd*90*s.pull*dt; e.py += dy/dd*60*s.pull*dt; } }
    d.t = Math.min(d.t + dt, s.every*1.01);
    d.moving = Math.hypot(d.vx, d.vy) > s.hoverSpeed;
    if (d.t >= s.every && !d.moving){
      d.t -= s.every; d.rotTo += TAU/6;
      const n = hurtArea(d.x, d.y, s.radius, s.dmg);
      if (n){ d.pulse = 1; sprite(d.x, d.y, s.radius*.9, [255,255,255], .5); emit({ x:d.x + s.radius*.6, y:d.y, vx:rand(80, 140), vy:rand(-220, -160), ay:700, life:.6, s0:2.2, s1:2, pal:[[232,163,61]] }); }
    }
  }
}

/* ----- drawing: a pedestal on the pad, a metal gun head on a pivot that turns to the aim and kicks back ----- */
const TS = 1.5;                                             // guns are drawn in a 1.5× local scale so they read on a phone
export const PIVOT = 13*TS;                                 // pivot height above the pad point
const BARREL = { gatling:34*TS, laser:40*TS, missile:20*TS, cryo:28*TS, tesla:0, drone:0, rail:46*TS, flame:26*TS };
let METAL = ['#4a5568', '#262d3b', '#11151e'];
const METAL_ICON = ['#8d9ab3', '#4d586e', '#232a38'];       // brighter for card and codex art on dark panels
function metal(build, x0, y0, x1, y1){
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, METAL[0]); g.addColorStop(.45, METAL[1]); g.addColorStop(1, METAL[2]);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.beginPath(); build(); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#07090e'; ctx.lineWidth = 1.2; ctx.stroke();
}
const rr = (x, y, w, h, r) => { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
const accent = (build, col, w = 1.2, a = 1) => { ctx.globalCompositeOperation = 'lighter'; neonPath(build, col, w, a); };

// pedestal, drawn with its foot at (0,0)
function paintBase(type, col){
  if (type === 'tesla'){
    metal(() => { ctx.moveTo(-15, 8); ctx.lineTo(15, 8); ctx.lineTo(7, -30); ctx.lineTo(-7, -30); ctx.closePath(); }, -15, -30, 15, 8);
    for (let k = 0; k < 4; k++){ const y = -4 - k*7.5, w = 15 - k*2.4; metal(() => rr(-w, y - 2.5, w*2, 5, 2.5), -w, y - 3, w, y + 3); accent(() => { ctx.moveTo(-w + 2, y); ctx.lineTo(w - 2, y); }, col, 1, .8); }
    metal(() => ctx.arc(0, -34, 6, 0, TAU), -6, -40, 6, -28);
    return;
  }
  if (type === 'drone'){
    metal(() => { ctx.moveTo(-20, 8); ctx.lineTo(20, 8); ctx.lineTo(16, -4); ctx.arc(0, -4, 16, 0, Math.PI, true); ctx.closePath(); }, -20, -20, 20, 8);
    accent(() => { ctx.arc(0, -4, 11, Math.PI*1.1, Math.PI*1.9); }, col, 1.4, .9);
    metal(() => rr(-4, -24, 8, 6, 2), -4, -24, 4, -18);
    return;
  }
  metal(() => { ctx.moveTo(-17, 8); ctx.lineTo(17, 8); ctx.lineTo(11, -6); ctx.lineTo(-11, -6); ctx.closePath(); }, -17, -6, 17, 8);
  accent(() => { ctx.moveTo(-12, -4); ctx.lineTo(12, -4); }, col, 1, .7);
  metal(() => ctx.arc(0, -13, 10, 0, TAU), -10, -23, 10, -3);
}
// gun head, pivot at (0,0), pointing up (−y)
function paintHead(type, col){
  if (type === 'gatling'){
    for (const x of [-5.5, 0, 5.5]) metal(() => rr(x - 2, -34, 4, 30, 1.5), x - 2, 0, x + 2, 0);
    metal(() => rr(-9, -31, 18, 4, 1.5), -9, -31, 9, -27);
    metal(() => rr(-11, -8, 22, 17, 5), -11, -8, 11, 9);
    accent(() => { ctx.moveTo(-7, -2); ctx.lineTo(7, -2); ctx.moveTo(-7, 3); ctx.lineTo(7, 3); }, col, 1.1, .9);
  } else if (type === 'laser'){
    metal(() => rr(-3, -40, 6, 36, 2), -3, 0, 3, 0);
    for (const y of [-14, -22, -30]){ metal(() => rr(-6, y - 2, 12, 4, 1.5), -6, y - 2, 6, y + 2); accent(() => { ctx.moveTo(-4, y); ctx.lineTo(4, y); }, col, 1, .9); }
    metal(() => rr(-10, -7, 20, 15, 4), -10, -7, 10, 8);
    accent(() => ctx.arc(0, 0, 4, 0, TAU), col, 1.2, .9);
  } else if (type === 'missile'){
    metal(() => rr(-14, -20, 28, 26, 4), -14, -20, 14, 6);
    for (const [x, y] of [[-6.5, -13], [6.5, -13], [-6.5, -3], [6.5, -3]]){
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#05070b'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
      accent(() => ctx.arc(x, y, 4, 0, TAU), col, 1, .9);
    }
    accent(() => { ctx.moveTo(-12, 4); ctx.lineTo(12, 4); }, col, 1, .6);
  } else if (type === 'rail'){
    for (const x of [-5, 5]) metal(() => rr(x - 2.2, -46, 4.4, 42, 1.5), x - 2.2, 0, x + 2.2, 0);
    for (const y of [-38, -28, -18]) accent(() => { ctx.moveTo(-5, y); ctx.lineTo(5, y); }, col, 1, .6);
    metal(() => rr(-11, -10, 22, 20, 4), -11, -10, 11, 10);
    accent(() => { ctx.moveTo(-7, -4); ctx.lineTo(7, -4); ctx.moveTo(-7, 2); ctx.lineTo(7, 2); }, col, 1.1, .9);
  } else if (type === 'flame'){
    metal(() => { ctx.moveTo(-3.5, -10); ctx.lineTo(-7, -27); ctx.lineTo(7, -27); ctx.lineTo(3.5, -10); ctx.closePath(); }, -7, -27, 7, -10);
    metal(() => rr(-8, -29, 16, 4, 2), -8, -29, 8, -25);
    for (const x of [-10, 10]) metal(() => rr(x - 5, -7, 10, 17, 5), x - 5, -7, x + 5, 10);
    metal(() => rr(-6, -12, 12, 14, 3), -6, -12, 6, 2);
    accent(() => { ctx.moveTo(-10, -3); ctx.lineTo(-10, 6); ctx.moveTo(10, -3); ctx.lineTo(10, 6); }, col, 1.2, .9);
  } else if (type === 'cryo'){
    for (const x of [-12, 12]){ metal(() => rr(x - 4, -8, 8, 16, 4), x - 4, -8, x + 4, 8); accent(() => { ctx.moveTo(x, -5); ctx.lineTo(x, 5); }, [200,240,255], 1.4, .9); }
    metal(() => rr(-6, -28, 12, 24, 3), -6, 0, 6, 0);
    metal(() => rr(-8, -29, 16, 5, 2), -8, -29, 8, -24);
    metal(() => rr(-9, -7, 18, 14, 5), -9, -7, 9, 7);
    accent(() => { ctx.moveTo(-4, -17); ctx.lineTo(4, -17); ctx.moveTo(-4, -12); ctx.lineTo(4, -12); }, col, 1, .9);
  }
}
const sprites = new Map();
function cached(kind, type){
  const key = kind + type + RS; let s = sprites.get(key); if (s) return s;
  const h = 48*TS, c = document.createElement('canvas'); c.width = c.height = Math.ceil(h*2*RS);
  const g = c.getContext('2d'), keep = ctx; g.setTransform(RS*TS, 0, 0, RS*TS, h*RS, h*RS);
  setCtx(g); (kind === 'base' ? paintBase : paintHead)(type, TURRET[type].col); setCtx(keep);
  s = { c, h }; sprites.set(key, s); return s;
}
const blitAt = (s, x, y, ang = 0) => { ctx.save(); ctx.translate(x, y); if (ang) ctx.rotate(ang); ctx.drawImage(s.c, -s.h, -s.h, s.h*2, s.h*2); ctx.restore(); };

export function drawTurrets(){
  for (const t of turrets){
    const px = t.x, py = t.y - PIVOT, rot = t.ang + Math.PI/2, k = t.kick || 0;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    blitAt(cached('base', t.type), t.x, t.y);
    if (BARREL[t.type]) blitAt(cached('head', t.type), px - Math.cos(t.ang)*k*7, py - Math.sin(t.ang)*k*7, rot);
    ctx.globalCompositeOperation = 'lighter';
    // live glows: muzzle flash, charged lens, tesla orb, hangar light
    if (t.type === 'tesla') sprite(t.x, t.y - 34*TS, 12 + Math.sin(time*20)*2.5, [226,220,255], .9);
    else if (t.type === 'drone') sprite(t.x, t.y - 21*TS, 6, t.T.col, .6 + .4*Math.sin(time*6));
    else if (k > .55){ const m = muzzle(t, BARREL[t.type] + 4); sprite(m.x, m.y, t.type === 'gatling' ? 10 : 16, [255,255,255], k*.8); sprite(m.x, m.y, 22, t.T.col, k*.5); }
    if (t.type === 'laser' && t.beams && t.beams.length){ const m = muzzle(t); sprite(m.x, m.y, 9 + (t.mult || 1)*2, t.T.col, .9); }
    if (t.type === 'gatling' && t.heat > 30){ const m = muzzle(t, BARREL.gatling*.6), h = t.heat/100; sprite(m.x, m.y, 8 + h*8, [255, 120 - h*60, 40], h*.8); }
    if (t.type === 'rail' && t.chg > 0){
      const m = muzzle(t), k = t.chg;
      sprite(m.x, m.y, 6 + k*18, t.T.col, .3 + k*.6);
      const L = 900; neonLine(m.x, m.y, m.x + Math.cos(t.ang)*L, m.y + Math.sin(t.ang)*L, t.locked ? [255,90,70] : t.T.col, .6, t.locked ? .7 : .15 + k*.25);
    }
    if (t.type === 'flame'){ const m = muzzle(t); sprite(m.x, m.y, t.firing ? 16 : 5, [255,150,60], t.firing ? .8 : .6 + .3*Math.sin(time*9)); }
    // state bars under the pad: laser battery, gatling heat, railgun charge
    const bar = t.type === 'laser' ? [(t.bat ?? t.s.cap)/t.s.cap, t.charging ? [255,90,220] : [255,170,240]] : t.type === 'gatling' ? [t.over > 0 ? 1 : (t.heat || 0)/100, t.over > 0 ? [255,80,60] : [255,190,90]] : t.type === 'rail' ? [t.chg || 0, [150,255,190]] : null;
    if (bar){ ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(t.x - 16, t.y + 29, 32, 4); ctx.fillStyle = rgb(bar[1]); ctx.fillRect(t.x - 16, t.y + 29, 32*Math.max(0, Math.min(1, bar[0])), 4); if (t.charging || t.over > 0){ ctx.globalAlpha = .5 + .5*Math.sin(time*12); ctx.strokeStyle = rgb(bar[1]); ctx.lineWidth = 1; ctx.strokeRect(t.x - 16.5, t.y + 28.5, 33, 5); } ctx.globalCompositeOperation = 'lighter'; }
    const lv = levelOf(t);
    if (lv){ ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.font = '700 10px "Chakra Petch", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#05070c'; ctx.fillRect(t.x - 10, t.y + 15, 20, 12); ctx.fillStyle = rgb(t.T.col); ctx.fillText(`+${lv}`, t.x, t.y + 21); ctx.globalCompositeOperation = 'lighter'; }
    if (t.type === 'laser' && t.beams) t.beams.forEach((e, i) => {
      const m = muzzle(t), w = i ? 1.6 : 1.2 + (t.mult || 1)*1.1;
      neonLine(m.x, m.y, e.x, e.y, t.T.col, w, .9); sprite(e.x, e.y, 10 + w*3, t.T.col, .7);
    });
    for (const d of t.drones) drawDrone(d, t.s.radius);
  }
  for (const p of shots){
    if (p.k === 'bullet') streak(p.x, p.y, Math.atan2(p.vy, p.vx), 9, 3.2, p.crit ? [255,230,120] : p.col, 1);
    else if (p.k === 'missile' && !(p.delay > 0)){ const a = Math.atan2(p.vy, p.vx); streak(p.x, p.y, a, 7, 3.5, [255,230,200], 1); sprite(p.x - Math.cos(a)*8, p.y - Math.sin(a)*8, 7, p.col, .9); }
    else if (p.k === 'bomblet') sprite(p.x, p.y, 4, p.col, .9);
    else if (p.k === 'frost'){ sprite(p.x, p.y, 9, [170,225,255], .9); sprite(p.x, p.y, 3, [255,255,255], 1); }
  }
}
function drawDrone(d, R){
  const p = d.pulse, OFF = [255,236,190], col = p > .3 ? [255,90,70] : [255,206,110];
  neonCircle(d.x, d.y, R, col, 1.3, .9);
  for (let k = 0; k < 6; k++){ const a = -Math.PI/2 + k*TAU/6 + (d.rot - d.rotTo); sprite(d.x + Math.cos(a)*R, d.y + Math.sin(a)*R, 3.4, k ? OFF : [255,170,60], .9); }
  neonPath(() => { for (let k = 0; k < 4; k++){ const a = k*Math.PI/2; ctx.moveTo(d.x + Math.cos(a)*R*.3, d.y + Math.sin(a)*R*.3); ctx.lineTo(d.x + Math.cos(a)*R*.6, d.y + Math.sin(a)*R*.6); } }, OFF, 1, .8);
  if (p > .55) sprite(d.x, d.y, R*.8*p, [255,255,255], p*.8);
}
// card art: the whole gun, pointing up
export function drawTurretIcon(canvas, type){
  const g = canvas.getContext('2d'), s = canvas.width/56;
  g.setTransform(s*.82, 0, 0, s*.82, s*28, s*50); g.clearRect(-40, -70, 80, 90);
  const keep = ctx, keepM = METAL; setCtx(g); METAL = METAL_ICON;
  g.globalCompositeOperation = 'lighter'; sprite(0, -20, 34, TURRET[type].col, .22);
  paintBase(type, TURRET[type].col);
  if (BARREL[type]){ g.save(); g.translate(0, -13); paintHead(type, TURRET[type].col); g.restore(); }
  if (type === 'tesla'){ g.globalCompositeOperation = 'lighter'; sprite(0, -34, 9, [226,220,255], .9); }
  setCtx(keep); METAL = keepM;
}
