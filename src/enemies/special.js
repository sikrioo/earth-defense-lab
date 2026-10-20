import { H, MOBILE, TAU, W, rand, time } from '../core/canvas.js';
import { sprite } from '../core/particles.js';
import { light, ring } from '../core/lights.js';
import { enemies } from './list.js';
import { earth, mapMode } from '../world/earth.js';
import { ectr, makeEnemy } from './spawn.js';

// comets cross the sky fast; about half are aimed at Earth, the rest are fly-bys you can still shoot down
export function placeComet(e){
  e.flyby = Math.random() < .5;
  if (mapMode === 'orbit'){
    const a = rand(0, TAU), far = Math.hypot(W, H)*.5 + 120 + rand(0, 900);
    e.x = earth.cx + Math.cos(a)*far; e.y = earth.cy + Math.sin(a)*far + e.r;
    if (e.flyby){ const p = a + Math.PI/2, off = earth.R*rand(3, 5)*(Math.random() < .5 ? 1 : -1); e.aimX = earth.cx - Math.cos(a)*far + Math.cos(p)*off; e.aimY = earth.cy - Math.sin(a)*far + Math.sin(p)*off; }
    else { e.aimX = earth.cx; e.aimY = earth.cy; }
  } else {
    const left = Math.random() < .5;
    e.x = left ? -40 - rand(0, 900) : W + 40 + rand(0, 900); e.y = rand(-60, H*.3) + e.r;
    if (e.flyby){ e.aimX = left ? W + 600 : -600; e.aimY = e.y + rand(H*.25, H*.6); }
    else { e.aimX = earth.cx + rand(-1, 1)*W*.3; e.aimY = earth.top + 60; }
  }
  const dx = e.aimX - e.x, dy = e.aimY - e.y, d = Math.hypot(dx, dy) || 1;
  e.vx = dx/d*e.fallSp; e.vy = dy/d*e.fallSp; e.spin = rand(-2, 2);
  e.hx = e.wx = e.x; e.hy = e.wy = e.y;
}
export function offscreen(e, m){
  if (mapMode === 'orbit') return Math.hypot(e.x - earth.cx, e.y - earth.cy) > Math.hypot(W, H)*.5 + m + 900;
  return e.x < -m || e.x > W + m || e.y > H + m;
}
// a temporary rock (fragments, shower pebbles, the rogue planet) leaves the pool when it dies
export function spawnTemp(type, x, y, vx, vy){
  const e = makeEnemy(type);
  e.temp = true; e.x = e.hx = e.wx = x; e.y = e.hy = e.wy = y; e.vx = vx; e.vy = vy; e.spawnT = .3;
  if (mapMode === 'orbit'){ e.aimX = earth.cx + rand(-1, 1)*earth.R*.5; e.aimY = earth.cy + rand(-1, 1)*earth.R*.5; }
  else { e.aimX = x + vx*.6; e.aimY = earth.top + 60; }
  enemies.push(e); return e;
}
export function splitRock(e){
  const c = ectr(e);
  for (let i = 0; i < 3; i++){
    const a = -Math.PI/2 + (i - 1)*.9 + rand(-.2, .2), sp = rand(120, 180);
    const s = spawnTemp('shard', c.x + Math.cos(a)*6, c.y + Math.sin(a)*6 + 6, Math.cos(a)*sp, Math.sin(a)*sp);
    if (mapMode === 'line') s.aimX = c.x + Math.cos(a)*220;
  }
  ring(c.x, c.y, 4, 46, .3, [110,236,255], 3);
}
// tails: comets wear a long ion tail and a curved dust tail; shower pebbles leave short streaks
export function drawTail(e){
  const c = ectr(e), sp = Math.hypot(e.vx, e.vy) || 1, dx = -e.vx/sp, dy = -e.vy/sp, px = -dy, py = dx, R = e.r;
  if (e.type === 'comet'){
    sprite(c.x, c.y, R*3.4, [255,110,70], .55); light(c.x, c.y, R*9, [255,110,60], .5);
    const n = MOBILE ? 8 : 14, L = R*18;
    for (let i = 1; i <= n; i++){
      const t = i/n;
      sprite(c.x + dx*L*t, c.y + dy*L*t, R*(2.4 - t*1.6), [255,72,44], .46*(1 - t));
      sprite(c.x + dx*L*t*.8 + px*t*t*R*5, c.y + dy*L*t*.8 + py*t*t*R*5, R*(2.8 - t*1.5), [255,186,110], .22*(1 - t));
    }
  } else if (e.type === 'pebble'){
    for (let i = 1; i <= 4; i++){ const t = i/4; sprite(c.x + dx*R*7*t, c.y + dy*R*7*t, R*(1.6 - t), [255,190,120], .35*(1 - t)); }
  } else if (e.type === 'planet'){
    sprite(c.x, c.y, R*2.6, [255,110,60], .12 + .04*Math.sin(time*2));
  }
}
