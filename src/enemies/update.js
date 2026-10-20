/* ---------- moving rocks: steering, atmospheric burn, walls, impacts, shoving ---------- */
import { W, origin, rand, time } from '../core/canvas.js';
import { PAL } from '../core/palette.js';
import { emit } from '../core/particles.js';
import { enemies, floats } from './list.js';
import { place } from './spawn.js';
import { impact } from './damage.js';
import { offscreen } from './special.js';
import { earth, mapMode } from '../world/earth.js';
import { debris } from '../game/progress.js';

export function updEnemies(dt){
  for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].gone) enemies.splice(i, 1);
  for (const e of enemies){
    if (e.gone) continue;
    if (e.dead){ e.deadT += dt; if (e.deadT > (e.impacted ? .8 : 1.6)){ if (e.temp) e.gone = true; else { e.impacted = false; place(e); } } continue; }
    e.spawnT += dt;
    e.squash = (e.squash || 0)*Math.exp(-14*dt); e.lean = (e.lean || 0)*Math.exp(-9*dt); e.flash = Math.max(0, e.flash - dt); e.tintT = Math.max(0, e.tintT - dt);
    e.chill = Math.max(0, e.chill - dt); e.stun = Math.max(0, e.stun - dt); e.amp = Math.max(0, e.amp - dt);
    // heavy drift: knockback bleeds off, then it eases back to its slow wander
    const slow = e.stun > 0 ? 0 : e.chill > 0 ? .35 : 1, f = Math.exp(-3*dt);
    e.spin *= Math.exp(-.8*dt);
    // steer toward Earth; knockback bleeds off and the fall resumes
    const ax = e.aimX - e.x, ay = e.aimY - (e.y - e.r), al = Math.hypot(ax, ay) || 1;
    const want = e.fallSp*slow;
    if (!e.T.ballistic){ e.vx = e.vx*f + ax/al*want*(1 - f); e.vy = e.vy*f + ay/al*want*(1 - f); }
    const ms = e.T.ballistic ? slow : 1;
    e.x += e.vx*dt*ms; e.y += e.vy*dt*ms; e.rot += e.spin*dt;
    if (e.T.free){ if (!e.seen && !offscreen(e, -10)) e.seen = true; else if (e.seen && offscreen(e, 160)){ if (e.temp){ e.dead = true; e.gone = true; } else place(e); continue; } }
    { // atmospheric entry
      const atm = mapMode === 'line' ? 120 : earth.R*1.4, depth = Math.hypot(e.x - earth.cx, e.y - e.r - earth.cy) - earth.R;
      const heat = depth < atm ? Math.min(1, 1 - depth/atm) : 0;
      e.heat = heat;
      if (heat > 0){
        const sp = Math.hypot(e.vx, e.vy) || 1, dx = e.vx/sp, dy = e.vy/sp, cx = e.x, cy = e.y - e.r;
        const n = dt*(30 + e.r*2.2)*heat;
        for (let k = 0; k < n || Math.random() < n - k; k++){
          const off = rand(-.6, .6)*e.r;
          emit({ x:cx - dx*e.r*.4 - dy*off, y:cy - dy*e.r*.4 + dx*off, vx:-dx*rand(40, 120)*heat + rand(-12,12), vy:-dy*rand(40, 120)*heat + rand(-12,12),
            drag:2.2, life:rand(.3,.6)*(.6 + heat), s0:e.r*rand(.45,.8)*(.5 + heat*.7), s1:1, pal:PAL.fire });
        }
        if (Math.random() < dt*12*heat) emit({ x:cx - dx*e.r, y:cy - dy*e.r, vx:-dx*80 + rand(-20,20), vy:-dy*80 + rand(-20,20), drag:1, life:rand(.8,1.3), s0:e.r*.6, s1:e.r*1.6, a:.18, pal:[[90,80,74],[50,44,40]] });
      }
    }
    if (mapMode === 'line'){
      if (!e.T.free && e.x < e.r){ e.x = e.r; e.vx = Math.abs(e.vx)*.5; }
      if (!e.T.free && e.x > W - e.r){ e.x = W - e.r; e.vx = -Math.abs(e.vx)*.5; }
      // reaching the horizon counts as a hit, even where the globe curves away under the HUD
      if (e.y - e.r*.5 > earth.top + 8 || Math.hypot(e.x - earth.cx, e.y - e.r - earth.cy) < earth.R + e.r*.4){ impact(e); continue; }
    } else if (Math.hypot(e.x - earth.cx, e.y - e.r - earth.cy) < earth.R + e.r*.5){ impact(e); continue; }
    e.moving = false;
  }
  // orbs shove each other apart by mass
  for (let i = 0; i < enemies.length; i++){
    const p = enemies[i]; if (p.dead || p.T.ballistic) continue;
    for (let j = i + 1; j < enemies.length; j++){
      const q = enemies[j]; if (q.dead || q.T.ballistic) continue;
      const dx = q.x - p.x, dy = (q.y - q.r) - (p.y - p.r), d = Math.hypot(dx, dy), min = p.r + q.r + 2;
      if (d >= min || d === 0) continue;
      const nx = dx/d, ny = dy/d, over = min - d, tm = p.m + q.m;
      p.x -= nx*over*q.m/tm; p.y -= ny*over*q.m/tm; q.x += nx*over*p.m/tm; q.y += ny*over*p.m/tm;
      const rv = (q.vx - p.vx)*nx + (q.vy - p.vy)*ny;
      if (rv < 0){ const jimp = -1.4*rv/tm; p.vx -= nx*jimp*q.m; p.vy -= ny*jimp*q.m; q.vx += nx*jimp*p.m; q.vy += ny*jimp*p.m; }
    }
  }
  for (let i = debris.length - 1; i >= 0; i--){
    const d = debris[i]; d.age += dt; if (d.age >= d.life){ debris.splice(i, 1); continue; }
    const f = Math.exp(-2.6*dt); d.vx *= f; d.vy *= f; d.x += d.vx*dt; d.y += d.vy*dt; d.rot += d.vr*dt;
  }
  for (let i = floats.length - 1; i >= 0; i--){ floats[i].age += dt; if (floats[i].age > .9) floats.splice(i, 1); }
}
// local space: ground at y=0, up is negative, the demon faces +x
export function demonPose(e){
  const T = e.T, dir = e.x < origin.x ? 1 : -1;
  let fall = 0, a = 1;
  if (e.dead){ const t = Math.min(1, e.deadT/.6); fall = t; a = 1 - Math.max(0, (t - .35)/.65); }
  else if (e.spawnT < .4) a = e.spawnT/.4;
  const sq = e.squash || 0;
  return { dir, s:T.s, a, fall, sx:1 + .12*sq, sy:1 - .1*sq, lean:-(e.lean || 0)*.28 - fall*1.35,
    bob:Math.sin(time*3 + e.seed)*.7, walk:e.moving ? Math.sin(time*9 + e.seed) : 0 };
}
function toWorld(e, p, lx, ly){
  // same transform as drawEnemy, for placing additive glows (eyes)
  const c = Math.cos(p.lean), sn = Math.sin(p.lean);
  const x0 = lx*p.sx, y0 = (ly + (ly < -12 ? p.bob : 0))*p.sy;
  const xr = x0*c - y0*sn, yr = x0*sn + y0*c;
  return { x:e.x + xr*p.dir*p.s, y:e.y + yr*p.s };
}
