/* ---------- placing rocks: spawn positions, aim at Earth, the starting field ---------- */
import { ELL, H, TAU, W, origin, rand } from '../core/canvas.js';
import { ETYPE, VSIZE } from '../data/enemy-types.js';
import { enemies } from './list.js';
import { placeComet } from './special.js';
import { earth, mapMode } from '../world/earth.js';
import { level, setEarthHits } from '../game/progress.js';
import { simMax } from '../game/sim.js';

export let kills = 0;
export function setKills(v){ return kills = v; }
export const ectr = e => ({ x:e.x, y:e.y - e.h*.5 });
export const alive = e => !e.dead && e.spawnT > .3;
function spawnPos(r){
  const top = 100, bot = Math.max(top + 60, origin.y - 70);
  for (let t = 0; t < 60; t++){
    const x = rand(50, W - 50), y = rand(top, bot);
    if (Math.hypot(x - origin.x, y - origin.y) < 160) continue;
    if (enemies.some(e => !e.dead && Math.hypot(e.x - x, (e.y - y)/ELL) < e.r + r + 22)) continue;
    return { x, y };
  }
  return { x:rand(50, W - 50), y:rand(top, bot) };
}
export function place(e, initial = false){
  // new rocks enter from above the screen; the opening wave is already on its way down
  let p;
  if (mapMode === 'orbit'){
    const a = rand(0, TAU), far = Math.hypot(W, H)*.5 + 60, d = initial ? rand(far*.5, far*1.3) : far + rand(0, 80);
    p = { x:earth.cx + Math.cos(a)*d, y:earth.cy + Math.sin(a)*d + e.r };
  } else p = initial ? { x:rand(30, W - 30), y:rand(-H*.5, Math.max(80, earth.top*.45)) } : { x:rand(30, W - 30), y:rand(-140, -40) };
  e.x = e.hx = e.wx = p.x; e.y = e.hy = e.wy = p.y;
  e.max = Math.round(e.T.hp*(.3 + .07*(level - 1))); e.hp = e.max; e.dead = false; e.deadT = 0; e.spawnT = 0; e.chill = e.stun = e.amp = e.tintT = e.flash = 0;
  const a = rand(0, TAU), sp = rand(3, 9)*(e.T.speed || 1)/Math.sqrt(e.m || 1);
  e.vx = Math.cos(a)*sp; e.vy = Math.sin(a)*sp; e.drift = { x:e.vx, y:e.vy };
  e.rot = rand(0, TAU); e.spin = rand(-.25, .25)/Math.sqrt(e.m || 1);
  e.aimX = mapMode === 'orbit' ? earth.cx + rand(-1, 1)*earth.R*.6 : earth.cx + rand(-1, 1)*W*.3;
  e.aimY = mapMode === 'orbit' ? earth.cy + rand(-1, 1)*earth.R*.6 : earth.top + 60;
  e.fallSp = e.T.fall*rand(.85, 1.2);
  e.seen = false;
  if (e.type === 'comet') placeComet(e);
}
export function makeEnemy(type){ const T = ETYPE[type]; const variant = (Math.random()*3)|0, r = T.r*VSIZE[variant];
  const e = { type, T, max:T.hp, r, h:r*2, seed:rand(0, 100), variant, m:(r/11)**2 }; place(e, true); return e; }
export function initEnemies(){
  enemies.length = 0; kills = 0; setEarthHits(0);
  // MAX sim: the densest field the game is meant to throw at you (4× the normal mix, 3 bosses)
  const m = simMax ? 4 : 1;
  for (let i = 0; i < 13*m; i++) enemies.push(makeEnemy('normal'));
  for (let i = 0; i < 4*m; i++) enemies.push(makeEnemy('meteor'));
  for (let i = 0; i < 5*m; i++) enemies.push(makeEnemy('runner'));
  for (let i = 0; i < 3*m; i++) enemies.push(makeEnemy('brute'));
  for (let i = 0; i < 4*m; i++) enemies.push(makeEnemy('elite'));
  for (let i = 0; i < (m > 1 ? 3 : 1); i++) enemies.push(makeEnemy('boss'));
  for (let i = 0; i < 3*m; i++) enemies.push(makeEnemy('comet'));
  for (let i = 0; i < 3*m; i++) enemies.push(makeEnemy('splitter'));
}
