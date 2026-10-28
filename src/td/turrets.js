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
function target(t, range, skip){
  let best = null, by = -1e9;
  for (const e of enemies){
    if (!alive(e) || (skip && skip.has(e)) || e.y < -e.r) continue;
    if (Math.hypot(e.x - t.x, e.y - t.y) > range) continue;
    if (e.y > by){ by = e.y; best = e; }
  }
  return best;
}
const aimAt = (t, e, dt) => { const a = Math.atan2(e.y - t.y, e.x - t.x); let d = a - t.ang; d = Math.atan2(Math.sin(d), Math.cos(d)); t.ang += d*Math.min(1, dt*14); };
const muzzle = (t, len = 18) => ({ x:t.x + Math.cos(t.ang)*len, y:t.y + Math.sin(t.ang)*len });

export function updTurrets(dt){
  for (const t of turrets){
    const s = t.s; t.cd -= dt;
    if (t.type === 'gatling'){
      const e = target(t, s.range); if (!e) continue; aimAt(t, e, dt);
      if (t.cd <= 0){
        t.cd = 1/s.rate;
        // lead the target: where it will be when a bullet gets there
        const m0 = muzzle(t), d0 = Math.hypot(e.x - m0.x, e.y - m0.y)/1100;
        const lx = e.x + (e.T.comet ? e.vx : e.vx + e.px)*d0, ly = e.y + (e.T.comet ? e.vy : e.vy + e.py)*d0;
        const aim = Math.atan2(ly - m0.y, lx - m0.x);
        for (let b = 0; b < s.bullets; b++){
          const a = aim + (b - (s.bullets - 1)/2)*.05 + rand(-.012, .012), m = muzzle(t);
          const crit = Math.random() < s.crit;
          shots.push({ k:'bullet', x:m.x, y:m.y, vx:Math.cos(a)*1100, vy:Math.sin(a)*1100, dmg:s.dmg*(crit ? 3 : 1), crit, pierce:s.pierce, hit:new Set(), life:.8, col:t.T.col });
        }
        sprite(muzzle(t, 22).x, muzzle(t, 22).y, 10, t.T.col, .8);
      }
    } else if (t.type === 'laser'){
      const skip = new Set(); t.beams = [];
      for (let b = 0; b < s.beams; b++){ const e = target(t, s.range, skip); if (!e) break; skip.add(e); t.beams.push(e); }
      if (!t.beams.length){ t.ramp = 0; t.rampOn = null; continue; }
      aimAt(t, t.beams[0], dt);
      if (t.rampOn !== t.beams[0]){ t.rampOn = t.beams[0]; t.ramp = 0; }
      t.ramp += dt; t.mult = 1 + (s.rampMax - 1)*Math.min(1, t.ramp/s.ramp);
      t.beams.forEach((e, i) => hurt(e, s.dps*(i ? 1 : t.mult)*dt, { chillBonus:s.melt }));
      if (Math.random() < dt*20){ const e = t.beams[0]; hitSpark(e.x + rand(-4, 4), e.y + rand(-4, 4), t.T.col); }
    } else if (t.type === 'missile'){
      const e = target(t, s.range); if (!e) continue; aimAt(t, e, dt);
      if (t.cd <= 0){
        t.cd = s.every;
        for (let i = 0; i < s.count; i++){
          const a = -Math.PI/2 + (i - (s.count - 1)/2)*.32;
          shots.push({ k:'missile', x:t.x + (i - (s.count - 1)/2)*4, y:t.y - 6, vx:Math.cos(a)*240, vy:Math.sin(a)*240, tgt:e, dmg:s.dmg, blast:s.blast, cluster:s.cluster, life:3, delay:i*.05, col:t.T.col });
        }
      }
    } else if (t.type === 'cryo'){
      const e = target(t, s.range); if (!e) continue; aimAt(t, e, dt);
      if (t.cd <= 0){
        t.cd = s.every; const m = muzzle(t);
        const lead = .45, tx = e.x + (e.T.comet ? e.vx : 0)*lead, ty = e.y + (e.T.comet ? e.vy : e.speed*(e.slowT > 0 ? 1 - e.slowAmt : 1))*lead;
        shots.push({ k:'frost', x:m.x, y:m.y, sx:m.x, sy:m.y, tx, ty, t:0, dur:lead, s:{ ...s }, col:t.T.col });
      }
    } else if (t.type === 'tesla'){
      const e = target(t, s.range); if (!e || t.cd > 0) continue;
      t.cd = s.every;
      const pts = [[t.x, t.y - 16]], seen = new Set(); let cur = e;
      for (let j = 0; j <= s.jumps && cur; j++){
        seen.add(cur); pts.push([cur.x, cur.y]);
        hurt(cur, s.dmg*(j ? .85 : 1), { chillBonus:isChilled(cur) ? s.conduct : 0 });
        if (s.stun && alive(cur)) cur.stunT = Math.max(cur.stunT, s.stun);
        let nx = null, nd = s.hop; for (const o of enemies){ if (!alive(o) || seen.has(o)) continue; const d = Math.hypot(o.x - cur.x, o.y - cur.y); if (d < nd){ nd = d; nx = o; } }
        cur = nx;
      }
      let life = .2;
      fx.push({ update(dt2){ life -= dt2; return life > 0; }, draw(){ for (let j = 1; j < pts.length; j++) boltWithForks(pts[j - 1][0], pts[j - 1][1], pts[j][0], pts[j][1], life/.2, 1.6, [[255,255,255],[226,220,255],[176,156,255],[120,90,240],[60,40,170]], 1); } });
      for (let j = 1; j < pts.length; j++) burst(pts[j][0], pts[j][1], t.T.col, 4, 140, 1.6);
    } else if (t.type === 'drone') updDrones(t, dt);
  }
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
    d.t += dt;
    if (d.t >= s.every){
      d.t -= s.every; d.rotTo += TAU/6;
      const n = hurtArea(d.x, d.y, s.radius, s.dmg);
      if (n){ d.pulse = 1; sprite(d.x, d.y, s.radius*.9, [255,255,255], .5); emit({ x:d.x + s.radius*.6, y:d.y, vx:rand(80, 140), vy:rand(-220, -160), ay:700, life:.6, s0:2.2, s1:2, pal:[[232,163,61]] }); }
    }
  }
}

/* ----- drawing ----- */
export function drawTurrets(){
  for (const t of turrets){
    // the body is a cached sprite turned to the aim; small live glows go on top
    const sp = bodySprite(t.type), spin = t.type === 'tesla' || t.type === 'drone' ? 0 : t.ang + Math.PI/2;
    ctx.globalAlpha = 1; ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(spin); ctx.drawImage(sp.c, -sp.h, -sp.h, sp.h*2, sp.h*2); ctx.restore();
    const tip = (len) => ({ x:t.x + Math.cos(t.ang)*len, y:t.y + Math.sin(t.ang)*len });
    if (t.type === 'gatling' && t.cd > 1/t.s.rate - .05){ const m = tip(22); sprite(m.x, m.y, 9, [255,255,255], .6); }
    else if (t.type === 'laser'){ const m = tip(6); sprite(m.x, m.y, 7, t.T.col, .7); }
    else if (t.type === 'tesla') sprite(t.x, t.y - 18, 7 + Math.sin(time*20)*1.5, [226,220,255], .9);
    const lv = levelOf(t);
    if (lv){ ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.font = '700 10px "Chakra Petch", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#05070c'; ctx.fillRect(t.x - 9, t.y + 15, 18, 11); ctx.fillStyle = rgb(t.T.col); ctx.fillText(`+${lv}`, t.x, t.y + 21); ctx.globalCompositeOperation = 'lighter'; }
    if (t.type === 'laser' && t.beams) t.beams.forEach((e, i) => {
      const m = muzzle(t, 14), w = i ? 1.6 : 1.2 + (t.mult || 1)*1.1;
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

// turret bodies, also used for card icons (pass another context through setCtx)
const bodies = new Map();
function bodySprite(type){
  const key = type + RS; let s = bodies.get(key); if (s) return s;
  const h = 30, c = document.createElement('canvas'); c.width = c.height = Math.ceil(h*2*RS);
  const g = c.getContext('2d'), keep = ctx; g.setTransform(RS, 0, 0, RS, 0, 0); g.globalCompositeOperation = 'lighter';
  setCtx(g); drawTurretBody(type, h, h, -Math.PI/2, TURRET[type].col, 1, false); setCtx(keep);
  s = { c, h }; bodies.set(key, s); return s;
}
export function drawTurretBody(type, x, y, ang, col, a, live = true){
  const W2 = [255,255,255];
  ctx.save(); ctx.translate(x, y);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a;
  ctx.fillStyle = '#161c2a'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  neonCircle(0, 0, 13, col, 1.2, a);
  ctx.rotate(ang + Math.PI/2);
  if (type === 'gatling'){
    neonPath(() => { ctx.rect(-6, -8, 12, 12); ctx.moveTo(-3, -8); ctx.lineTo(-3, -22); ctx.moveTo(3, -8); ctx.lineTo(3, -22); }, col, 1.5, a);
    if (live && time % .2 < .1) sprite(0, -22, 4, W2, .4*a);
  } else if (type === 'laser'){
    neonPath(() => { ctx.moveTo(0, -20); ctx.lineTo(8, -4); ctx.lineTo(0, 6); ctx.lineTo(-8, -4); ctx.closePath(); }, col, 1.5, a);
    sprite(0, -6, 8, mixc(col, W2, .5), .9*a);
  } else if (type === 'missile'){
    neonPath(() => { ctx.rect(-9, -11, 18, 16); ctx.moveTo(0, -11); ctx.lineTo(0, 5); ctx.moveTo(-9, -3); ctx.lineTo(9, -3); }, col, 1.4, a);
  } else if (type === 'cryo'){
    neonPath(() => { ctx.arc(0, -4, 7, 0, TAU); ctx.moveTo(0, -11); ctx.lineTo(0, -21); for (let k = 0; k < 3; k++){ const aa = k*TAU/3; ctx.moveTo(Math.cos(aa)*7, -4 + Math.sin(aa)*7); ctx.lineTo(Math.cos(aa)*12, -4 + Math.sin(aa)*12); } }, col, 1.4, a);
    sprite(0, -4, 7, [200,240,255], .6*a);
  } else if (type === 'tesla'){
    ctx.rotate(-(ang + Math.PI/2));
    neonPath(() => { for (let k = 0; k < 3; k++){ ctx.moveTo(-8 + k*2, -2 - k*6); ctx.lineTo(8 - k*2, -2 - k*6); } ctx.moveTo(0, 4); ctx.lineTo(0, -16); }, col, 1.4, a);
    if (live) sprite(0, -18, 7 + Math.sin(time*20)*1.5, mixc(col, W2, .4), .9*a);
  } else if (type === 'drone'){
    ctx.rotate(-(ang + Math.PI/2));
    neonPath(() => { ctx.arc(0, 0, 8, 0, TAU); for (let k = 0; k < 6; k++){ const aa = k*TAU/6 + (live ? time : 0); ctx.moveTo(Math.cos(aa)*8, Math.sin(aa)*8); ctx.arc(Math.cos(aa)*8, Math.sin(aa)*8, 1.5, 0, TAU); } }, col, 1.2, a);
  }
  ctx.restore();
}
export function drawTurretIcon(canvas, type){
  const g = canvas.getContext('2d'), s = canvas.width/56;
  g.setTransform(s, 0, 0, s, 0, 0); g.clearRect(0, 0, 56, 56);
  const keep = ctx; setCtx(g); g.globalCompositeOperation = 'lighter';
  sprite(28, 30, 26, TURRET[type].col, .25);
  drawTurretBody(type, 28, 32, -Math.PI/2, TURRET[type].col, 1);
  setCtx(keep);
}
