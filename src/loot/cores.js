/* ---------- auto-attack cores: firing at the nearest rock ---------- */
import { ELL, TAU, origin, rand } from '../core/canvas.js';
import { LIGHT, PAL } from '../core/palette.js';
import { emit, sprite } from '../core/particles.js';
import { flash, ring } from '../core/lights.js';
import { CORE } from '../data/loot.js';
import { alive, ectr } from '../enemies/spawn.js';
import { hurtArea, nearestEnemy } from '../enemies/damage.js';
import { enemies } from '../enemies/list.js';
import { gameOver } from '../world/earth.js';
import { sparks } from '../fx/bursts.js';
import { Proj } from '../fx/projectile.js';
import { S, coreDmg, slots, slotsOpen } from './items.js';
import { autoCdOf, skillOf } from './slot-skills.js';
import { active } from '../skills/index.js';
import { BoltChain } from '../skills/sorceress.js';
import { jamT } from '../skills/hunter.js';
import { chamberFire } from '../ui/deck.js';

// ---- auto-attack cores ----
function fireCore(it, target){
  const cb = CORE[it.kind], pal = PAL[cb.pal], dmg = coreDmg(it), n = 1 + (S.proj || 0);
  const sx = origin.x, sy = origin.y - 8, c = ectr(target), base = Math.atan2(c.y - sy, c.x - sx), dist = Math.hypot(c.x - sx, c.y - sy) + 120;
  for (let j = 0; j < n; j++){
    const ang = base + (j - (n - 1)/2)*.13;
    const o = { x:sx, y:sy, tx:c.x, ty:c.y, ang, max:dist, speed:it.kind === 'ice' ? 1050 : 920, kind:it.kind === 'ice' ? 'shard' : 'orb', small:true, pal,
      collide:true, dmg, elem:cb.elem, pierceN:S.pierce || 0,
      trail:(p, dt2) => { if (Math.random() < dt2*60) emit({ x:p.x, y:p.y, vx:rand(-15,15), vy:rand(-15,15), drag:3, life:.22, s0:3, s1:.5, a:.7, pal }); },
      onHit:(x, y) => sparks(x, y, pal, 6, 220, 1.8) };
    if (it.kind === 'fire') o.onHit = (x, y) => {
      for (let k = 0; k < 10; k++){ const a = rand(0, TAU), sp = rand(40, 160); emit({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp*.7, drag:3, life:rand(.25,.45), s0:rand(5,8), s1:1, pal:PAL.fire }); }
      flash(x, y, 90, LIGHT.fire, .7, .15); hurtArea(x, y, 30, Math.round(dmg*.4), 'fire');
    };
    if (it.kind === 'ice'){
      o.trail = (p, dt2) => { if (Math.random() < dt2*90) emit({ x:p.x, y:p.y, vx:rand(-20,20), vy:rand(-20,20), drag:2, life:rand(.25,.45), s0:rand(2,3.5), s1:.6, pal:PAL.ice }); };
      o.onHit = (x, y) => {
        for (let k = 0; k < 9; k++){ const a = k/9*TAU + rand(-.2,.2), sp = rand(120, 220); emit({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp*ELL, drag:2.5, life:rand(.3,.45), s0:4, s1:1.5, streak:2.6, pal:PAL.ice }); }
        ring(x, y, 3, 34, .3, PAL.ice[1], 2); flash(x, y, 80, LIGHT.ice, .7, .15);
        for (const e2 of enemies) if (alive(e2) && Math.hypot(e2.x - x, e2.y - e2.r - y) < 38 + e2.r) e2.chill = Math.max(e2.chill, 3);
      };
    }
    if (it.kind === 'bolt') o.onHit = (x, y, p, hitE) => {
      sparks(x, y, PAL.bolt, 6, 260, 1.8);
      const nx = nearestEnemy(x, y, 170, hitE ? new Set([hitE]) : null);
      if (nx){ const bc = new BoltChain([{ a:{x, y}, b:ectr(nx), e:nx, dmg:Math.round(dmg*.6), delay:0, w:.9 }]); bc.quiet = true; bc.alpha = .8; active.push(bc); }
    };
    active.push(new Proj(o));
  }
  sprite(sx, sy, 10, pal[1], .6); flash(sx, sy, 70, LIGHT[cb.pal], .5, .1);
}
export function updCores(dt){
  if (gameOver) return;
  for (let i = 0; i < slotsOpen(); i++){
    const it = slots[i]; if (!it || it.base === 'charm') continue;
    it.t = (it.t ?? .3) - dt; if (it.t > 0) continue;
    if (it.base === 'skill'){
      const tg = nearestEnemy(origin.x, origin.y - 8, 640);
      if (!tg){ it.t = .2; continue; }
      it.t = autoCdOf(it); const c = ectr(tg);
      skillOf(it).cast({ x:origin.x, y:origin.y }, { x:c.x, y:c.y }); chamberFire(i, true);
      continue;
    }
    const t = nearestEnemy(origin.x, origin.y - 8, 640);
    if (!t){ it.t = .15; continue; }
    it.t = 1/(CORE[it.kind].rate*(1 + ((S.aspd || 0) + (jamT > 0 ? 45 : 0))/100)) * (1 + i*.07);  // slight desync between slots
    fireCore(it, t); chamberFire(i, false);
  }
}
