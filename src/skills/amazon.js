/* ---------- Amazon skills ---------- */
import { TAU, rand } from '../core/canvas.js';
import { LIGHT, PAL } from '../core/palette.js';
import { emit } from '../core/particles.js';
import { addShake, flash, light, ring } from '../core/lights.js';
import { DMG } from '../data/damage.js';
import { hurtArea, nearestEnemy } from '../enemies/damage.js';
import { enemies } from '../enemies/list.js';
import { alive, ectr } from '../enemies/spawn.js';
import { fireBurst, iceBurst, sparks } from '../fx/bursts.js';
import { Proj, trailOf } from '../fx/projectile.js';
import { active } from './index.js';
import { BurningGround, PoisonCloud } from './areas.js';
import { BoltChain } from './sorceress.js';

/* ================= AMAZON ================= */
export function multiShot(ox, oy, tx, ty){
  const base = Math.atan2(ty-oy, tx-ox), dist = Math.max(380, Math.hypot(tx-ox, ty-oy) + 60);
  for (let i = 0; i < 11; i++){
    const a = base + (i - 5)*.15;
    active.push(new Proj({ x:ox, y:oy, tx, ty, ang:a, max:dist, speed:1250, len:22, pal:PAL.bow, collide:true, dmg:DMG.multishot, elem:'bow',
      trail:(o, dt) => { if (Math.random() < dt*40) emit({ x:o.x, y:o.y, vx:rand(-10,10), vy:rand(-10,10), life:.25, s0:2.5, s1:.5, a:.6, pal:PAL.bow }); },
      onHit:(x, y) => sparks(x, y, PAL.bow, 5, 200, 2) }));
  }
}
export function guidedArrow(ox, oy, tx, ty){
  const a = Math.atan2(ty-oy, tx-ox) + (Math.random() < .5 ? -1 : 1)*rand(.7, 1.2);
  active.push(new Proj({ x:ox, y:oy, tx, ty, ang:a, home:2.5, speed:720, len:24, pal:PAL.magic, collide:true, dmg:DMG.guided, elem:'magic', targetE:nearestEnemy(tx, ty, 220),
    trail:trailOf(PAL.magic, 220, 7, .45, 12),
    onHit:(x, y) => { sparks(x, y, PAL.magic, 18, 420); ring(x, y, 4, 60, .3, PAL.magic[1], 3); flash(x, y, 180, LIGHT.magic, 1.1, .25); } }));
}
export function freezingArrow(ox, oy, tx, ty){
  active.push(new Proj({ x:ox, y:oy, tx, ty, speed:1050, len:24, pal:PAL.ice,
    collide:true, trail:trailOf(PAL.ice, 260, 7, .45, 20), onHit:(x, y) => { iceBurst(x, y, 1.15); hurtArea(x, y, 110, DMG.freezing, 'ice'); } }));
}
export function immolationArrow(ox, oy, tx, ty){
  active.push(new Proj({ x:ox, y:oy, tx, ty, speed:1000, len:24, pal:PAL.fire,
    collide:true, trail:trailOf(PAL.fire, 300, 9, .45, 25), onHit:(x, y) => { fireBurst(x, y, 1.1); hurtArea(x, y, 90, DMG.immolation, 'fire'); active.push(new BurningGround(x, y, 85, 3.4, DMG.immolationBurn)); } }));
}
export function lightningFury(ox, oy, tx, ty){
  active.push(new Proj({ x:ox, y:oy, tx, ty, speed:1100, kind:'javelin', pal:PAL.bolt, collide:true, dmg:DMG.fury, elem:'bolt',
    trail:(o, dt) => { if (Math.random() < dt*50) emit({ x:o.x + rand(-6,6), y:o.y + rand(-6,6), vx:rand(-60,60), vy:rand(-60,60), drag:4, life:.2, s0:2.5, s1:.5, streak:2, pal:PAL.bolt }); light(o.x, o.y, 140, LIGHT.bolt, .8); },
    onHit:(x, y) => {
      flash(x, y, 300, LIGHT.bolt, 1.6, .35); addShake(4); ring(x, y, 6, 90, .35, PAL.bolt[1], 4);
      const segs = [];
      const near = enemies.filter(e => alive(e) && Math.hypot(e.x - x, e.y - y) < 340).sort((p, q) => Math.hypot(p.x - x, p.y - y) - Math.hypot(q.x - x, q.y - y)).slice(0, 10);
      near.forEach((e, i) => segs.push({ a:{x, y}, b:ectr(e), e, dmg:DMG.furyBolt, delay:i*.035, w:1.3 }));
      for (let i = near.length; i < 12; i++){ const a = rand(0, TAU), d = rand(150, 330); segs.push({ a:{x, y}, b:{ x:x + Math.cos(a)*d, y:y + Math.sin(a)*d*.75 }, delay:i*.035, w:1.3 }); }
      active.push(new BoltChain(segs));
    } }));
}
export function plagueJavelin(ox, oy, tx, ty){
  active.push(new Proj({ x:ox, y:oy, tx, ty, speed:900, kind:'javelin', pal:PAL.poison, collide:true, dmg:DMG.plague, elem:'poison',
    trail:(o, dt) => { const n = Math.ceil(dt*50); for (let i = 0; i < n; i++) emit({ x:o.x + rand(-5,5), y:o.y + rand(-5,5), vx:rand(-20,20), vy:rand(-20,10), drag:.8, life:rand(.8,1.3), s0:rand(10,18), s1:rand(16,24), a:.2, pal:PAL.poison }); light(o.x, o.y, 120, LIGHT.poison, .7); },
    onHit:(x, y) => { flash(x, y, 220, LIGHT.poison, 1.1, .35); ring(x, y, 6, 120, .5, PAL.poison[2], 4); sparks(x, y, PAL.poison, 20, 300); active.push(new PoisonCloud(x, y)); } }));
}
