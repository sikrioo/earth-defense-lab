/* ---------- fortress mode: turrets on the platform, their shots, and the revolver drones ---------- */
import { RS, TAU, ctx, rand, setCtx, time } from '../core/canvas.js';
import { emit, sprite, streak } from '../core/particles.js';
import { boltWithForks } from '../core/lightning.js';
import { AFFIX, CORE_KEYS, EVO, TIERS, TURRET, UPG, slotsFor, tierFor } from './data.js';
import { coreCol, linksOf } from './cores.js';
import { SRC, setSrc } from './src.js';
import { G, enemies, fx, shots } from './state.js';
import { sfx } from './sfx.js';
import { addShake } from '../core/lights.js';
import { PW, V, distC, inWorld, threat } from './view.js';
import { alive, chill, hitSpark, hurt, hurtArea, isChilled, targetable } from './enemies.js';
import { bendShot, collectWells } from './bosses.js';
import { burst, explode, mixc, neonCircle, neonLine, neonPath, rgb, ringFx } from './fx.js';

export const turrets = [];
export const turretAt = i => turrets.find(t => t.m === i);
export function resetTurrets(){ turrets.length = 0; shots.length = 0; }
export function addTurret(type){
  const used = new Set(turrets.map(t => t.m)); const m = V.mounts.findIndex((_, i) => !used.has(i));
  if (m < 0) return null;
  const T = TURRET[type], p = V.mounts[m];
  const t = { type, T, s:{ ...T.base }, lv:{}, cores:[], m, cd:rand(0, .4), ang:p.a, ramp:0, rampOn:null, drones:[], born:time };
  place(t); turrets.push(t); recompute(t); ringFx(p.x, p.y, 6, 60, .5, T.col, 3);
  return t;
}
// stats are always rebuilt from the base: upgrades (adding slices of base), then the evolution, then cores
export function recompute(t){
  const b = t.T.base, s = { ...b };
  for (const u of UPG[t.type]) for (let i = 0; i < (t.lv[u.id] || 0); i++) u.apply(s, b);
  if (t.evo){ const e = EVO[t.type].find(x => x.id === t.evo); if (e) e.apply(s, b); }
  // cores: stat affixes scale the gun; the rest become per-hit modifiers, and the elements switch on links
  const mods = {}, active = t.cores.filter(c => !(c.sync > 0));      // a core still settling in does nothing yet
  for (const c of active) for (const a of c.affixes){
    if (CORE_KEYS[a.k]){ const f = 1 + a.v/100; for (const k of CORE_KEYS[a.k].up) if (k in s) s[k] *= f; for (const k of CORE_KEYS[a.k].down) if (k in s) s[k] /= f; }
    else mods[a.k] = (mods[a.k] || 0) + a.v;
  }
  // one link runs per turret: the one the player picked, else the first one the cores allow
  t.linkOpts = linksOf(active);
  const sel = t.linkOpts.find(L => L.id === t.linkSel) || t.linkOpts[0];
  t.mods = mods; t.links = new Set(sel ? [sel.id] : []);
  // intervals and the like never drop below a quarter of base
  for (const k of ['every', 'charge', 'recharge', 'cool', 'rearm', 'heatPer', 'spread']) if (k in s) s[k] = Math.max(b[k]*.25, s[k]);
  t.s = s;
  G.shatter = Math.max(0, ...turrets.filter(x => x.type === 'cryo').map(x => x.s.shatter));
}
export const tierOf = t => tierFor(levelOf(t));
export function applyUpgrade(t, up){
  const before = tierOf(t);
  t.lv[up.id] = (t.lv[up.id] || 0) + 1; recompute(t);
  ringFx(t.x, t.y, 6, 46, .45, t.T.col, 2);
  // a new tier: another core slot (offer waiting cores again); Mk III also opens the evolution choice
  if (tierOf(t) > before){
    ringFx(t.x, t.y, 10, 90, .8, [255,255,255], 4); sprite(t.px, t.py, 60, t.T.col, .9);
    G.banner = { title:`${t.T.ko} MK ${['I', 'II', 'III'][tierOf(t) - 1]}`, sub:tierOf(t) === 3 ? '진화 경로를 고를 수 있어요 · 코어 슬롯 +1' : '코어 슬롯 +1', warn:false }; G.bannerT = 1.8;
    if (G.cores.length) G.coreQueue++;
    if (tierOf(t) === 3 && !t.evo && EVO[t.type]) G.evoQueue.push(t);
  }
}
export function evolve(t, id){ t.evo = id; recompute(t); ringFx(t.x, t.y, 10, 120, 1, t.T.col, 5); sprite(t.px, t.py, 90, [255,255,255], .9); }
export const evoOf = t => t.evo ? EVO[t.type].find(x => x.id === t.evo) : null;
export const levelOf = t => Object.values(t.lv).reduce((a, b) => a + b, 0);
// energy cores: each turret has 1–3 slots (by how upgraded it is); a core scales its stats for good
export const slotsOf = t => slotsFor(levelOf(t));
// slots are numbered 0..2; a core fitted or moved needs a few seconds to settle before it works
export const SYNC = 3;
export const coreAt = (t, i) => t.cores.find(c => c.slot === i) || null;
export const freeSlots = t => [...Array(slotsOf(t)).keys()].filter(i => !coreAt(t, i));
export function installCore(t, core, slot = freeSlots(t)[0]){
  if (slot === undefined || slot >= slotsOf(t) || coreAt(t, slot)) return false;
  core.slot = slot; core.sync = SYNC; t.cores.push(core); recompute(t); ringFx(t.x, t.y, 6, 70, .6, coreCol(core), 4);
  return true;
}
export function removeCore(t, core){
  const i = t.cores.indexOf(core); if (i < 0) return null;
  t.cores.splice(i, 1); delete core.slot; core.sync = 0; recompute(t);
  return core;
}
export function moveCore(t, core, slot){
  if (slot >= slotsOf(t) || coreAt(t, slot)) return false;
  core.slot = slot; core.sync = SYNC; recompute(t); return true;
}
export function setLink(t, id){ t.linkSel = id; recompute(t); }
// keep turret positions in step with the view (resizes move the platform)
// each turret stands on its pad facing out from Earth: (nx, ny) is that outward direction, (px, py) the gun's pivot
function place(t){
  const p = V.mounts[t.m]; t.a = p.a; t.nx = Math.cos(p.a); t.ny = Math.sin(p.a);
  t.x = p.x + t.nx*4; t.y = p.y + t.ny*4; t.px = t.x + t.nx*PIVOT; t.py = t.y + t.ny*PIVOT;
}
// a new view moves the pads (and may add more): turrets keep their pad index
export function placeTurrets(){ for (const t of turrets){ if (t.m >= V.mounts.length) t.m = V.mounts.length - 1; place(t); t.ang = t.a; for (const d of t.drones){ d.x = t.px; d.y = t.py; d.vx = d.vy = 0; } } }
const along = (t, k) => ({ x:t.x + t.nx*k, y:t.y + t.ny*k });

// target: the rock closest to the shield inside range, skipping ones already taken
function target(t, range, skip, minRange = 0){
  let best = null, by = -1e9;
  for (const e of enemies){
    if (!alive(e) || (skip && skip.has(e)) || !inWorld(e.x, e.y, e.r) || !targetable(e)) continue;
    const d = Math.hypot(e.x - t.x, e.y - t.y); if (d > range || d < minRange) continue;
    const th = threat(e); if (th > by){ by = th; best = e; }
  }
  return best;
}
const aimAt = (t, e, dt) => { const a = Math.atan2(e.y - t.py, e.x - t.px); let d = a - t.ang; d = Math.atan2(Math.sin(d), Math.cos(d)); t.ang += d*Math.min(1, dt*14); };
const muzzle = (t, len = BARREL[t.type] || 18) => ({ x:t.px + Math.cos(t.ang)*len, y:t.py + Math.sin(t.ang)*len });

export function updTurrets(dt){
  for (const t of turrets){
    setSrc(t); const n0 = shots.length; turretStep(t, dt); for (let i = n0; i < shots.length; i++) if (!shots[i].src) shots[i].src = t;
  }
  setSrc(null);
}
function turretStep(t, dt){
  {
    for (const c of t.cores) if (c.sync > 0){ c.sync -= dt; if (c.sync <= 0){ c.sync = 0; recompute(t); ringFx(t.x, t.y, 6, 50, .4, coreCol(c), 3); } }
    const s = t.s; t.cd -= dt; t.kick = Math.max(0, (t.kick || 0) - dt*7);
    if (t.emp > 0){ t.emp -= dt; t.beams = []; t.firing = false; return; }      // knocked out by a plasma pulse
    if (t.type === 'gatling'){
      // overheat: firing builds heat; at 100 the barrels must cool before firing again
      t.heat = t.heat || 0;
      if (t.over > 0){ t.over -= dt; if (t.over <= 0) t.heat = 0; if (Math.random() < dt*25){ const m = muzzle(t); emit({ x:m.x, y:m.y, vx:rand(-15, 15), vy:rand(-50, -25), drag:1, life:.7, s0:3, s1:9, a:.3, pal:[[200,210,220],[120,130,150]] }); } return; }
      const e = target(t, s.range); if (!e){ t.heat = Math.max(0, t.heat - 30*dt); return; } aimAt(t, e, dt);
      if (t.cd <= 0){
        t.cd = 1/s.rate; t.kick = .7; sfx.gun();
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
      if (t.charging){ t.beams = []; t.bat += s.cap/s.recharge*dt; if (t.bat >= s.cap){ t.bat = s.cap; t.charging = false; } return; }
      const skip = new Set(); t.beams = [];
      for (let b = 0; b < s.beams; b++){ const e = target(t, s.range, skip); if (!e) break; skip.add(e); t.beams.push(e); }
      if (!t.beams.length){ t.ramp = 0; t.rampOn = null; t.bat = Math.min(s.cap, t.bat + s.cap/s.recharge*dt); return; }
      aimAt(t, t.beams[0], dt);
      t.bat -= dt*(1 + (t.beams.length - 1)*(s.prism ? .08 : .5));
      if (t.bat <= 0){ t.bat = 0; t.charging = true; t.ramp = 0; t.rampOn = null; }
      if (t.rampOn !== t.beams[0]){ t.rampOn = t.beams[0]; t.ramp = 0; }
      t.ramp += dt; t.mult = 1 + (s.rampMax - 1)*Math.min(1, t.ramp/s.ramp);
      t.beams.forEach((e, i) => hurt(e, s.dps*(i ? 1 : t.mult)*dt, { chillBonus:s.melt })); sfx.laser();
      if (Math.random() < dt*20){ const e = t.beams[0]; hitSpark(e.x + rand(-4, 4), e.y + rand(-4, 4), t.T.col); }
    } else if (t.type === 'missile'){
      const e = target(t, s.range, null, s.minRange); if (!e) return; aimAt(t, e, dt);
      if (t.cd <= 0){
        t.cd = s.every; t.kick = 1; sfx.missile(); if (s.count >= 4) addShake(1.2);
        for (let i = 0; i < s.count; i++){
          const off = i - (s.count - 1)/2, a = t.a + off*.32, o = along(t, PIVOT + 10);
          shots.push({ k:'missile', x:o.x - t.ny*off*4, y:o.y + t.nx*off*4, vx:Math.cos(a)*240, vy:Math.sin(a)*240, tgt:e, dmg:s.dmg, blast:s.blast, cluster:s.cluster, life:3, delay:i*.05, col:t.T.col });
        }
      }
    } else if (t.type === 'cryo'){
      const e = target(t, s.range); if (!e) return; aimAt(t, e, dt);
      if (t.cd <= 0){
        t.cd = s.every; t.kick = 1; sfx.frost(); const m = muzzle(t);
        const lead = .45, tx = e.x + (e.vx || 0)*lead, ty = e.y + (e.vy || 0)*lead;
        shots.push({ k:'frost', x:m.x, y:m.y, sx:m.x, sy:m.y, tx, ty, t:0, dur:lead, s:{ ...s }, col:t.T.col });
      }
    } else if (t.type === 'tesla'){
      const e = target(t, s.range); if (!e || t.cd > 0) return;
      t.cd = s.every; sfx.zap();
      const o = along(t, 34*TS), pts = [[o.x, o.y]], seen = new Set(); let cur = e;
      for (let j = 0; j <= s.jumps && cur; j++){
        seen.add(cur); pts.push([cur.x, cur.y]);
        hurt(cur, s.dmg*(s.conduct ? 1 : Math.pow(s.falloff, j)), { chillBonus:isChilled(cur) ? s.conduct : 0 });
        if (s.stun && alive(cur)) cur.stunT = Math.max(cur.stunT, s.stun);
        let nx = null, nd = s.hop; for (const o of enemies){ if (!targetable(o) || seen.has(o)) return; const d = Math.hypot(o.x - cur.x, o.y - cur.y); if (d < nd){ nd = d; nx = o; } }
        cur = nx;
      }
      let life = .2;
      fx.push({ update(dt2){ life -= dt2; return life > 0; }, draw(){ for (let j = 1; j < pts.length; j++) boltWithForks(pts[j - 1][0], pts[j - 1][1], pts[j][0], pts[j][1], life/.2, 1.6, [[255,255,255],[226,220,255],[176,156,255],[120,90,240],[60,40,170]], 1); } });
      for (let j = 1; j < pts.length; j++) burst(pts[j][0], pts[j][1], t.T.col, 4, 140, 1.6);
    } else if (t.type === 'drone') updDrones(t, dt);
    else if (t.type === 'rail') updRail(t, s, dt);
    else if (t.type === 'flame') updFlame(t, s, dt);
    else if (t.type === 'carrier') updCarrier(t, s, dt);
    else if (t.type === 'flak') updFlak(t, s, dt);
    else if (t.type === 'storm') updStorm(t, s, dt);
  }
}

/* ----- interceptor carrier: small craft fly out anywhere, strafe, come home to rearm ----- */
function craftTarget(t, c, claimed){
  let best = null, bs = -1e9;
  for (const e of enemies){
    if (!alive(e) || !inWorld(e.x, e.y, e.r) || !targetable(e)) continue;
    const big = e.T.boss || e.T.elite;
    const sc = threat(e) - (claimed.has(e) ? 500 : 0) + (t.s.hunter && big ? 3000 : 0) - Math.hypot(e.x - c.x, e.y - c.y)*.6;
    if (sc > bs){ bs = sc; best = e; }
  }
  return best;
}
function updCarrier(t, s, dt){
  t.craft = t.craft || [];
  while (t.craft.length < s.craft) t.craft.push({ x:t.px, y:t.py, ang:t.a, state:'dock', ammo:0, cd:0, tgt:null, re:0, rearm:1 + t.craft.length*.3 });
  const claimed = new Set(turrets.flatMap(o => o.craft || []).map(c => c.state === 'out' && c.tgt).filter(Boolean));
  const any = enemies.some(e => alive(e) && inWorld(e.x, e.y, e.r));
  t.launch = Math.max(0, (t.launch || 0) - dt);
  t.craft.forEach((c, i) => {
    const dock = along(t, 8 + i*7);
    if (c.state === 'dock'){
      c.x = dock.x; c.y = dock.y; c.ang = t.a; c.rearm -= dt;
      if (c.rearm <= 0 && any && t.launch <= 0){ c.state = 'out'; c.ammo = s.ammo; c.tgt = null; c.re = 0; c.v = s.speed*.4; t.launch = .3; }
      return;
    }
    let gx, gy, sp = s.speed*V.spd;
    if (c.state === 'out'){
      c.re -= dt;
      if (!alive(c.tgt) || c.re <= 0){ claimed.delete(c.tgt); c.tgt = craftTarget(t, c, claimed); c.re = .5; if (c.tgt) claimed.add(c.tgt); }
      if (!c.tgt || c.ammo <= 0){ c.state = 'home'; return; }
      // a strafing run: aim for a point just short of the target, then swing round
      const e = c.tgt, dx = e.x - c.x, dy = e.y - c.y, d = Math.hypot(dx, dy) || 1;
      gx = e.x - dx/d*70; gy = e.y - dy/d*70;
      c.cd -= dt;
      let da = Math.atan2(dy, dx) - c.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
      if (d < 280 && Math.abs(da) < .8 && c.cd <= 0){
        c.cd = s.every; c.ammo--; sfx.craft();
        const lead = d/1000, a = Math.atan2(e.y + (e.vx !== undefined ? e.vy : 0)*lead - c.y, e.x + (e.vx || 0)*lead - c.x) + rand(-.03, .03);
        shots.push({ k:'bullet', x:c.x, y:c.y, vx:Math.cos(a)*1000, vy:Math.sin(a)*1000, dmg:s.dmg, hunt:s.hunter, pierce:0, hit:new Set(), life:.4, col:t.T.col, small:true });
      }
      if (d < 120) sp *= .7;
    } else {
      gx = dock.x; gy = dock.y;
      if (Math.hypot(gx - c.x, gy - c.y) < 16){ c.state = 'dock'; c.rearm = s.rearm; return; }
    }
    // fly like a fighter: limited turn rate, speed easing up
    let want = Math.atan2(gy - c.y, gx - c.x) - c.ang; want = Math.atan2(Math.sin(want), Math.cos(want));
    c.ang += Math.max(-8*dt, Math.min(8*dt, want));
    c.v = Math.min(sp, (c.v || 0) + sp*2*dt);
    c.x += Math.cos(c.ang)*c.v*dt; c.y += Math.sin(c.ang)*c.v*dt;
    if (Math.random() < dt*30) emit({ x:c.x - Math.cos(c.ang)*6, y:c.y - Math.sin(c.ang)*6, vx:-Math.cos(c.ang)*40, vy:-Math.sin(c.ang)*40, drag:3, life:.3, s0:2.4, s1:.8, a:.7, pal:[[220,255,250],[120,255,230],[40,140,160]] });
  });
}

/* ----- flak: a shell that bursts just short of where the target will be, throwing a cone of fragments ----- */
function updFlak(t, s, dt){
  const e = target(t, s.range); if (!e) return; aimAt(t, e, dt);
  if (t.cd > 0) return;
  t.cd = s.every; t.kick = 1;
  const m = muzzle(t), d0 = Math.hypot(e.x - m.x, e.y - m.y), tt = d0/760;
  const lx = e.x + (e.vx || 0)*tt, ly = e.y + (e.vy || 0)*tt;
  const a = Math.atan2(ly - m.y, lx - m.x) + rand(-1, 1)*.04*d0/s.range, dist = Math.max(40, Math.hypot(lx - m.x, ly - m.y) - 34);
  shots.push({ k:'flak', x:m.x, y:m.y, vx:Math.cos(a)*760, vy:Math.sin(a)*760, left:dist, s:{ ...s }, col:t.T.col });
}
function flakBurst(x, y, ang, n, s, col){
  for (let i = 0; i < n; i++){
    const a = ang + (i/(n - 1 || 1) - .5)*s.spread + rand(-.05, .05), v = rand(620, 760);
    shots.push({ k:'bullet', x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, dmg:s.dmg, ap:s.ap, pierce:0, hit:new Set(), life:.3, col, frag:true, src:SRC });
  }
  sprite(x, y, 30, [255,255,230], .9); sprite(x, y, 60, col, .45); sfx.flak();
  ringFx(x, y, 4, 40, .25, col, 2);
}

/* ----- storm generator: a lightning field over the thickest knot of rocks ----- */
function updStorm(t, s, dt){
  if (t.cd > 0){ const e = target(t, s.range); if (e) aimAt(t, e, dt); return; }
  let best = null, bn = 0;
  for (const e of enemies){
    if (!alive(e) || !inWorld(e.x, e.y, 0) || !targetable(e)) continue;
    if (Math.hypot(e.x - t.x, e.y - t.y) > s.range) continue;
    let n = 0; for (const o of enemies) if (alive(o) && Math.hypot(o.x - e.x, o.y - e.y) < s.radius) n += o.T.boss ? 4 : 1;
    n += threat(e)/2000;
    if (n > bn){ bn = n; best = e; }
  }
  if (!best) return;
  aimAt(t, best, dt);
  t.cd = s.every; t.kick = 1; sfx.storm();
  const lead = s.delay + .4, m = muzzle(t);
  let x = best.x + (best.vx || 0)*lead, y = best.y + (best.vy || 0)*lead;
  // never over the shield itself: hold the storm just outside it
  const dc = distC(x, y), lim = V.SR + s.radius*.5; if (dc < lim){ const k = lim/(dc || 1); x = V.cx + (x - V.cx)*k; y = V.cy + (y - V.cy)*k; }
  shots.push({ k:'storm', x, y, t:-s.delay, s:{ ...s }, col:t.T.col, seed:Math.random()*99 });
  let life = .25; const sx = m.x, sy = m.y;
  fx.push({ update(d){ life -= d; return life > 0; }, draw(){ neonLine(sx, sy, x, y, t.T.col, 1.4, life/.25*.8); } });
}

/* ----- railgun: charge, lock the aim near the end, then one line through everything ----- */
function updRail(t, s, dt){
  const e = target(t, s.range);
  if (!e){ t.chg = Math.max(0, (t.chg || 0) - dt/s.charge); t.locked = false; return; }
  t.chg = (t.chg || 0) + dt/s.charge;
  if (t.chg < s.lockAt){ aimAt(t, e, dt); t.locked = false; } else t.locked = true;
  if (t.chg < 1) return;
  t.chg = 0; t.locked = false; t.kick = 1; sfx.rail(); addShake(3);
  const m = muzzle(t), dx = Math.cos(t.ang), dy = Math.sin(t.ang), L = 3200, ex = m.x + dx*L, ey = m.y + dy*L;
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
  aimAt(t, e, dt); t.firing = true; sfx.flame();
  const m = muzzle(t);
  for (const o of enemies){
    if (!alive(o)) continue;
    const dx = o.x - m.x, dy = o.y - m.y, d = Math.hypot(dx, dy); if (d > s.range + o.r) continue;
    let da = Math.atan2(dy, dx) - t.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > s.cone/2 + Math.atan2(o.r, d)) continue;
    hurt(o, s.dps*dt, { organicBonus:s.organic });
    o.burn = Math.min(s.stacks, (o.burn || 0) + dt*3); o.burnT = 3; o.burnDps = s.burn*(o.T.organic || o.T.icy ? 1 + s.organic : 1);
  }
  for (let i = 0; i < 3; i++){ if (Math.random() > dt*60) continue;
    const a = t.ang + rand(-s.cone/2, s.cone/2), v = s.range*rand(1.6, 2.2);
    emit({ x:m.x, y:m.y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, drag:2.4, life:rand(.35, .5), s0:rand(5, 8), s1:rand(14, 22), a:.55, pal:[[255,250,220],[255,190,80],[255,110,40],[180,40,20]] }); }
}

/* ----- shots ----- */
export function updShots(dt){
  const wells = collectWells();
  for (let i = shots.length - 1; i >= 0; i--){
    const p = shots[i]; let keep = true; setSrc(p.src || null);
    if (wells && (p.k === 'bullet' || p.k === 'flak' || p.k === 'missile') && !(p.delay > 0) && !bendShot(p, dt)){ shots.splice(i, 1); continue; }
    if (p.k === 'bullet'){
      for (let sub = 0; sub < 2 && keep; sub++){
        p.x += p.vx*dt/2; p.y += p.vy*dt/2;
        for (const e of enemies){
          if (!alive(e) || p.hit.has(e) || Math.hypot(e.x - p.x, e.y - p.y) > e.r + 3) continue;
          hurt(e, p.dmg*(p.hunt && (e.T.boss || e.T.elite) ? 1 + p.hunt : 1), { crit:p.crit, pierceArmor:!!p.ap }); p.hit.add(e); if (!p.frag || Math.random() < .4) hitSpark(p.x, p.y, p.col);
          if (p.pierce-- <= 0){ keep = false; break; }
        }
      }
      p.life -= dt; if (p.life <= 0 || !inWorld(p.x, p.y, 40)) keep = false;
    } else if (p.k === 'missile'){
      if (p.delay > 0){ p.delay -= dt; continue; }
      if (!alive(p.tgt)){ let best = null, bd = 1e9; for (const e of enemies){ if (!alive(e)) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd){ bd = d; best = e; } } p.tgt = best; }
      const sp = Math.min(620, Math.hypot(p.vx, p.vy) + 700*dt);
      if (p.tgt){ const a = Math.atan2(p.tgt.y - p.y, p.tgt.x - p.x), cur = Math.atan2(p.vy, p.vx); let d = a - cur; d = Math.atan2(Math.sin(d), Math.cos(d)); const na = cur + Math.max(-7*dt, Math.min(7*dt, d)); p.vx = Math.cos(na)*sp; p.vy = Math.sin(na)*sp; }
      p.x += p.vx*dt; p.y += p.vy*dt; p.life -= dt;
      if (Math.random() < dt*45) emit({ x:p.x, y:p.y, vx:-p.vx*.1 + rand(-10, 10), vy:-p.vy*.1 + rand(-10, 10), drag:2, life:.4, s0:2.5, s1:6, a:.35, pal:[[150,160,190],[70,80,110]] });
      const hitE = p.tgt && Math.hypot(p.tgt.x - p.x, p.tgt.y - p.y) < p.tgt.r + 4;
      if (hitE || p.life <= 0 || !inWorld(p.x, p.y, 60)){ boom(p.x, p.y, p.blast, p.dmg, p.col); if (p.cluster) for (let j = 0; j < p.cluster; j++){ const a = rand(0, TAU), v = rand(90, 170); shots.push({ k:'bomblet', x:p.x, y:p.y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, life:rand(.35, .55), dmg:p.dmg*.35, blast:p.blast*.5, col:p.col, src:p.src }); } keep = false; }
    } else if (p.k === 'bomblet'){
      p.x += p.vx*dt; p.y += p.vy*dt; p.vx *= Math.exp(-2*dt); p.vy *= Math.exp(-2*dt); p.life -= dt;
      if (p.life <= 0){ boom(p.x, p.y, p.blast, p.dmg, p.col); keep = false; }
    } else if (p.k === 'frost'){
      p.t += dt; const k = Math.min(1, p.t/p.dur);
      p.x = p.sx + (p.tx - p.sx)*k; p.y = p.sy + (p.ty - p.sy)*k - Math.sin(k*Math.PI)*40;
      if (k >= 1){ frostBurst(p); keep = false; }
    } else if (p.k === 'flak'){
      const step = 760*dt; p.x += p.vx*dt; p.y += p.vy*dt; p.left -= step;
      if (p.left <= 0){
        const a = Math.atan2(p.vy, p.vx); flakBurst(p.x, p.y, a, p.s.frags, p.s, p.col);
        if (p.s.double){ const x = p.x + Math.cos(a)*60, y = p.y + Math.sin(a)*60, s2 = p.s, c = p.col; let w = .12; fx.push({ update(d){ w -= d; if (w <= 0){ flakBurst(x, y, a, Math.ceil(s2.frags/2), s2, c); return false; } return true; }, draw(){} }); }
        keep = false;
      }
    } else if (p.k === 'storm'){
      p.t += dt;
      if (p.t >= 0){
        if (p.s.drift){
          let sx = 0, sy = 0, n = 0;
          for (const e of enemies) if (alive(e) && Math.hypot(e.x - p.x, e.y - p.y) < p.s.radius*1.6){ sx += e.x; sy += e.y; n++; }
          if (n){ const dx = sx/n - p.x, dy = sy/n - p.y, d = Math.hypot(dx, dy); if (d > 2){ const v = Math.min(d, 70*dt); p.x += dx/d*v; p.y += dy/d*v; } }
        }
        // overlapping storms don't stack: each rock takes the strongest storm it is in
        for (const e of enemies){
          if (!alive(e) || Math.hypot(e.x - p.x, e.y - p.y) > p.s.radius + e.r*.5) continue;
          e.stDps = Math.max(e.stDps || 0, p.s.dps); if (p.s.slow) e.stSlow = Math.max(e.stSlow || 0, p.s.slow);
        }
        if (p.t >= p.s.dur) keep = false;
      }
    }
    if (!keep) shots.splice(i, 1);
  }
  setSrc(null);
  for (const e of enemies){
    if (!e.stDps) continue;
    if (alive(e)){ hurt(e, e.stDps*dt); if (e.stSlow) chill(e, e.stSlow, .3); if (Math.random() < dt*6) hitSpark(e.x, e.y, [200,190,255]); }
    e.stDps = 0; e.stSlow = 0;
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
  while (t.drones.length < s.drones) t.drones.push({ x:t.px, y:t.py, vx:t.nx*80, vy:t.ny*80, t:rand(0, .3), tgt:null, re:0, rot:0, rotTo:0, pulse:0 });
  const claimed = new Set(turrets.flatMap(o => o.drones).map(d => d.tgt).filter(Boolean));
  for (const d of t.drones){
    d.pulse = Math.max(0, d.pulse - dt*5); d.rot += (d.rotTo - d.rot)*Math.min(1, dt*18); d.re -= dt;
    if (!alive(d.tgt) || d.re <= 0){
      claimed.delete(d.tgt); d.re = .4; let best = null, by = -1e9;
      for (const e of enemies){ if (!alive(e) || !inWorld(e.x, e.y, e.r) || !targetable(e)) continue; const score = threat(e) - (claimed.has(e) ? 400 : 0) - Math.hypot(e.x - d.x, e.y - d.y)*.3; if (score > by){ by = score; best = e; } }
      d.tgt = best; if (best) claimed.add(best);
    }
    let gx = t.x + t.nx*120, gy = t.y + t.ny*120;
    if (d.tgt){ gx = d.tgt.x; gy = d.tgt.y; }
    d.vx += ((gx - d.x)*30 - d.vx*9)*dt; d.vy += ((gy - d.y)*30 - d.vy*9)*dt;
    const v = Math.hypot(d.vx, d.vy), mx = s.speed*V.spd*1.4; if (v > mx){ d.vx *= mx/v; d.vy *= mx/v; }
    d.x += d.vx*dt; d.y += d.vy*dt;
    // stay on screen and outside the shield
    d.x = Math.max(-V.ox + 10, Math.min(PW + V.ox - 10, d.x)); d.y = Math.max(30, Math.min(V.PH - 30, d.y));
    const dc = distC(d.x, d.y), lim = V.SR + 16; if (dc < lim){ const k = lim/(dc || 1); d.x = V.cx + (d.x - V.cx)*k; d.y = V.cy + (d.y - V.cy)*k; }
    if (s.pull) for (const e of enemies){ if (!alive(e) || e.T.boss) continue; const dx = d.x - e.x, dy = d.y - e.y, dd = Math.hypot(dx, dy); if (dd < s.radius*1.6 && dd > 2){ e.px += dx/dd*90*s.pull*dt; e.py += dy/dd*60*s.pull*dt; } }
    d.t = Math.min(d.t + dt, s.every*1.01);
    d.moving = Math.hypot(d.vx, d.vy) > s.hoverSpeed;
    if (d.t >= s.every && !d.moving){
      d.t -= s.every; d.rotTo += TAU/6;
      const n = hurtArea(d.x, d.y, s.radius, s.dmg);
      if (n){ d.pulse = 1; sfx.gun(); sprite(d.x, d.y, s.radius*.9, [255,255,255], .5); emit({ x:d.x + s.radius*.6, y:d.y, vx:rand(80, 140), vy:rand(-220, -160), ay:700, life:.6, s0:2.2, s1:2, pal:[[232,163,61]] }); }
    }
  }
}

/* ----- drawing: a pedestal on the pad, a metal gun head on a pivot that turns to the aim and kicks back ----- */
const TS = 1.5;                                             // guns are drawn in a 1.5× local scale so they read on a phone
export const PIVOT = 13*TS;                                 // pivot height above the pad point
const BARREL = { miner:0, gatling:34*TS, laser:40*TS, missile:20*TS, cryo:28*TS, tesla:0, drone:0, rail:46*TS, flame:26*TS, carrier:0, flak:30*TS, storm:24*TS };
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
  if (type === 'miner'){
    // a squat refinery with a crane arm and a docking cradle for the drones
    metal(() => { ctx.moveTo(-18, 8); ctx.lineTo(18, 8); ctx.lineTo(14, -12); ctx.lineTo(-14, -12); ctx.closePath(); }, -18, -12, 18, 8);
    metal(() => rr(-12, -20, 14, 9, 2), -12, -20, 2, -11);
    metal(() => { ctx.moveTo(4, -12); ctx.lineTo(7, -12); ctx.lineTo(14, -30); ctx.lineTo(11, -31); ctx.closePath(); }, 4, -31, 14, -12);
    metal(() => rr(8, -34, 9, 5, 2), 8, -34, 17, -29);
    accent(() => { ctx.moveTo(-10, -2); ctx.lineTo(10, -2); }, col, 1.2, .9);
    accent(() => { ctx.moveTo(-9, -15.5); ctx.lineTo(-1, -15.5); }, col, 1, .8);
    accent(() => { ctx.arc(12.5, -38, 4, Math.PI*.1, Math.PI*.9, true); }, col, 1, .7);
    return;
  }
  if (type === 'carrier'){
    // a flat-topped hangar with a launch deck pointing out into space
    metal(() => { ctx.moveTo(-19, 8); ctx.lineTo(19, 8); ctx.lineTo(14, -26); ctx.lineTo(-10, -26); ctx.lineTo(-14, -18); ctx.closePath(); }, -19, -26, 19, 8);
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#05070b'; ctx.beginPath(); rr(-9, -2, 18, 8, 2); ctx.fill();
    accent(() => { ctx.moveTo(-9, -2); ctx.lineTo(9, -2); }, col, 1.2, .9);
    accent(() => { for (let y = -8; y >= -24; y -= 5){ ctx.moveTo(-1, y); ctx.lineTo(1, y); } }, col, 1.1, .8);
    accent(() => { ctx.moveTo(-7, -25); ctx.lineTo(-7, -6); ctx.moveTo(9, -25); ctx.lineTo(9, -6); }, col, .7, .45);
    metal(() => rr(10, -16, 7, 12, 2), 10, -16, 17, -4);
    accent(() => { ctx.moveTo(11.5, -13); ctx.lineTo(15.5, -13); }, col, 1, .9);
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
  } else if (type === 'flak'){
    // twin stubby barrels with muzzle brakes behind a shield plate
    for (const x of [-5.5, 5.5]){ metal(() => rr(x - 3, -30, 6, 26, 1.5), x - 3, 0, x + 3, 0); metal(() => rr(x - 4, -31, 8, 6, 1.5), x - 4, -31, x + 4, -25); }
    metal(() => { ctx.moveTo(-14, -6); ctx.lineTo(14, -6); ctx.lineTo(12, 8); ctx.lineTo(-12, 8); ctx.closePath(); }, -14, -6, 14, 8);
    metal(() => rr(-15, -11, 30, 6, 2), -15, -11, 15, -5);
    accent(() => { ctx.moveTo(-10, -8); ctx.lineTo(10, -8); }, col, 1.2, .9);
    accent(() => { ctx.moveTo(-6, 3); ctx.lineTo(6, 3); }, col, 1, .6);
  } else if (type === 'storm'){
    // a dish with an emitter spike: the storm is thrown from the tip
    metal(() => { ctx.arc(0, 4, 16, Math.PI*1.08, Math.PI*1.92); ctx.arc(0, 10, 13, Math.PI*1.9, Math.PI*1.1, true); ctx.closePath(); }, -16, -12, 16, 4);
    metal(() => rr(-2, -24, 4, 22, 1.5), -2, 0, 2, 0);
    for (const y of [-10, -16]) metal(() => rr(-5, y - 1.5, 10, 3, 1.5), -5, y - 1.5, 5, y + 1.5);
    metal(() => rr(-8, -2, 16, 10, 4), -8, -2, 8, 8);
    accent(() => { ctx.arc(0, 4, 13.5, Math.PI*1.15, Math.PI*1.85); }, col, 1.1, .8);
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
const blitAt = (s, x, y, ang = 0, k = 1) => { ctx.save(); ctx.translate(x, y); if (ang) ctx.rotate(ang); if (k !== 1) ctx.scale(k, k); ctx.drawImage(s.c, -s.h, -s.h, s.h*2, s.h*2); ctx.restore(); };

export function drawTurrets(){
  for (const t of turrets){
    const px = t.px, py = t.py, rot = t.ang + Math.PI/2, k = t.kick || 0;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // higher tiers stand a little bigger; Mk III gets a tier halo, an evolved gun a brighter one in its colour
    const tier = tierOf(t), sc = [1, 1.08, 1.16][tier - 1];
    if (tier === 3){ ctx.globalCompositeOperation = 'lighter'; sprite(t.px, t.py, 40 + Math.sin(time*3)*4, t.evo ? t.T.col : [255,255,255], t.evo ? .35 : .15); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    blitAt(cached('base', t.type), t.x, t.y, t.a + Math.PI/2, sc);
    if (BARREL[t.type]) blitAt(cached('head', t.type), px - Math.cos(t.ang)*k*7, py - Math.sin(t.ang)*k*7, rot, sc);
    ctx.globalCompositeOperation = 'lighter';
    // live glows: muzzle flash, charged lens, tesla orb, hangar light
    if (t.type === 'tesla'){ const o = along(t, 34*TS); sprite(o.x, o.y, 12 + Math.sin(time*20)*2.5, [226,220,255], .9); }
    else if (t.type === 'drone'){ const o = along(t, 21*TS); sprite(o.x, o.y, 6, t.T.col, .6 + .4*Math.sin(time*6)); }
    else if (k > .55){ const m = muzzle(t, BARREL[t.type] + 4); sprite(m.x, m.y, t.type === 'gatling' ? 10 : 16, [255,255,255], k*.8); sprite(m.x, m.y, 22, t.T.col, k*.5); }
    if (t.type === 'laser' && t.beams && t.beams.length){ const m = muzzle(t); sprite(m.x, m.y, 9 + (t.mult || 1)*2, t.T.col, .9); }
    if (t.type === 'gatling' && t.heat > 30){ const m = muzzle(t, BARREL.gatling*.6), h = t.heat/100; sprite(m.x, m.y, 8 + h*8, [255, 120 - h*60, 40], h*.8); }
    if (t.type === 'rail' && t.chg > 0){
      const m = muzzle(t), k = t.chg;
      sprite(m.x, m.y, 6 + k*18, t.T.col, .3 + k*.6);
      const L = 900; neonLine(m.x, m.y, m.x + Math.cos(t.ang)*L, m.y + Math.sin(t.ang)*L, t.locked ? [255,90,70] : t.T.col, .6, t.locked ? .7 : .15 + k*.25);
    }
    if (t.emp > 0){ sprite(t.px + rand(-14, 14), t.py + rand(-14, 14), 8, [210,160,255], .8); if (Math.random() < .3) neonLine(t.px + rand(-16, 16), t.py + rand(-16, 16), t.px + rand(-16, 16), t.py + rand(-16, 16), [220,180,255], .8, .9); }
    if (t.type === 'storm'){ const m = muzzle(t), r = 1 - Math.max(0, t.cd)/t.s.every; sprite(m.x, m.y, 5 + r*10 + Math.sin(time*25)*1.5, r >= 1 ? [230,225,255] : t.T.col, .4 + r*.5); }
    if (t.type === 'carrier') for (const c of t.craft || []) drawCraft(c, t.T.col);
    if (t.type === 'flame'){ const m = muzzle(t); sprite(m.x, m.y, t.firing ? 16 : 5, [255,150,60], t.firing ? .8 : .6 + .3*Math.sin(time*9)); }
    // state bars under the pad: laser battery, gatling heat, railgun charge
    const bar = t.type === 'laser' ? [(t.bat ?? t.s.cap)/t.s.cap, t.charging ? [255,90,220] : [255,170,240]] : t.type === 'gatling' ? [t.over > 0 ? 1 : (t.heat || 0)/100, t.over > 0 ? [255,80,60] : [255,190,90]] : t.type === 'rail' ? [t.chg || 0, [150,255,190]] : null;
    if (bar){ const o = along(t, -31); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(o.x - 16, o.y - 2, 32, 4); ctx.fillStyle = rgb(bar[1]); ctx.fillRect(o.x - 16, o.y - 2, 32*Math.max(0, Math.min(1, bar[0])), 4); if (t.charging || t.over > 0){ ctx.globalAlpha = .5 + .5*Math.sin(time*12); ctx.strokeStyle = rgb(bar[1]); ctx.lineWidth = 1; ctx.strokeRect(o.x - 16.5, o.y - 2.5, 33, 5); } ctx.globalCompositeOperation = 'lighter'; }
    const lv = levelOf(t);
    if (lv){ const o = along(t, -21); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.font = '700 10px "Chakra Petch", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = lv >= 10 ? 24 : 20; ctx.fillStyle = '#05070c'; ctx.fillRect(o.x - w/2, o.y - 6, w, 12);
      if (tier > 1){ ctx.strokeStyle = tier === 3 ? '#ffd36a' : '#c9d6ea'; ctx.lineWidth = 1.2; ctx.strokeRect(o.x - w/2 + .5, o.y - 5.5, w - 1, 11); }
      ctx.fillStyle = rgb(t.T.col); ctx.fillText(`+${lv}`, o.x, o.y); ctx.globalCompositeOperation = 'lighter'; }
    // core slots: filled with the core's colour, empty ones as outlines
    { const n = slotsOf(t), o = along(t, -33 - (bar ? 9 : 0)); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      for (let i = 0; i < n; i++){ const x = o.x + (i - (n - 1)/2)*9 - 3, y = o.y - 3, c = coreAt(t, i);
        ctx.fillStyle = '#05070c'; ctx.globalAlpha = 1; ctx.fillRect(x - 1, y - 1, 8, 8);
        if (c){ ctx.globalAlpha = c.sync > 0 ? .35 + .35*Math.sin(time*14) : 1; ctx.fillStyle = rgb(coreCol(c)); ctx.fillRect(x, y, 6, 6); ctx.globalAlpha = 1; } else { ctx.strokeStyle = 'rgba(200,220,255,.45)'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, 5, 5); } }
      if (t.links && t.links.size){ ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .6 + .3*Math.sin(time*4); ctx.fillStyle = '#ffd36a'; ctx.fillRect(o.x - (n - 1)*4.5 - 3, o.y + 4, (n - 1)*9 + 6, 1.2); }
      ctx.globalCompositeOperation = 'lighter'; }
    if (t.type === 'laser' && t.beams) t.beams.forEach((e, i) => {
      const m = muzzle(t), w = i ? 1.6 : 1.2 + (t.mult || 1)*1.1;
      neonLine(m.x, m.y, e.x, e.y, t.T.col, w, .9); sprite(e.x, e.y, 10 + w*3, t.T.col, .7);
    });
    for (const d of t.drones) drawDrone(d, t.s.radius);
  }
  for (const p of shots){
    if (p.k === 'bullet') p.frag || p.small ? streak(p.x, p.y, Math.atan2(p.vy, p.vx), 6, 2.2, p.col, .9) : streak(p.x, p.y, Math.atan2(p.vy, p.vx), 9, 3.2, p.crit ? [255,230,120] : p.col, 1);
    else if (p.k === 'flak'){ sprite(p.x, p.y, 7, [255,250,220], 1); sprite(p.x, p.y, 14, p.col, .5); }
    else if (p.k === 'storm') drawStorm(p);
    else if (p.k === 'missile' && !(p.delay > 0)){ const a = Math.atan2(p.vy, p.vx); streak(p.x, p.y, a, 7, 3.5, [255,230,200], 1); sprite(p.x - Math.cos(a)*8, p.y - Math.sin(a)*8, 7, p.col, .9); }
    else if (p.k === 'bomblet') sprite(p.x, p.y, 4, p.col, .9);
    else if (p.k === 'frost'){ sprite(p.x, p.y, 9, [170,225,255], .9); sprite(p.x, p.y, 3, [255,255,255], 1); }
  }
}
function drawCraft(c, col){
  if (c.state === 'dock'){ sprite(c.x, c.y, 3, col, c.rearm > 0 ? .35 : .9); return; }
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.ang);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#1a2230';
  ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, -6.5); ctx.lineTo(-3, 0); ctx.lineTo(-6, 6.5); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'lighter'; neonPath(() => { ctx.moveTo(9, 0); ctx.lineTo(-6, -6.5); ctx.lineTo(-3, 0); ctx.lineTo(-6, 6.5); ctx.closePath(); }, col, 1, .95);
  ctx.restore();
  sprite(c.x - Math.cos(c.ang)*5, c.y - Math.sin(c.ang)*5, 5, col, .8);
}
function drawStorm(p){
  const R = p.s.radius;
  if (p.t < 0){ const k = 1 + p.t/p.s.delay; neonCircle(p.x, p.y, R*k, p.col, 1, .25 + k*.4); return; }
  const fade = Math.min(1, (p.s.dur - p.t)*3, p.t*6);
  sprite(p.x, p.y, R*1.05, p.col, .22*fade); sprite(p.x, p.y, R*.5, [220,210,255], .12*fade);
  neonCircle(p.x, p.y, R, p.col, 1.2, .55*fade);
  // a couple of fresh bolts inside every frame
  for (let i = 0; i < 2; i++){
    const a = rand(0, TAU), b = a + rand(1.2, 2.6), r1 = R*rand(.2, .95), r2 = R*rand(.2, .95);
    boltWithForks(p.x + Math.cos(a)*r1, p.y + Math.sin(a)*r1, p.x + Math.cos(b)*r2, p.y + Math.sin(b)*r2, fade*.8, 1, [[255,255,255],[226,220,255],[176,156,255],[120,90,240],[60,40,170]], 1);
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
