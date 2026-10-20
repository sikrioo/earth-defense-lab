/* ---------- view: window size, map zoom, where the hero stands ---------- */
import { H, W, ZOOM, bar, origin, setViewport } from '../core/canvas.js';
import { enemies } from '../enemies/list.js';
import { initEnemies } from '../enemies/spawn.js';
import { buildEarth, earth, mapMode } from '../world/earth.js';
import { tgt } from './input.js';

export function layout(){
  origin.x = W/2; origin.y = H - (bar.offsetHeight || 120)/ZOOM - 30;
  if (W) buildEarth();
  if (mapMode === 'orbit'){ origin.x = earth.cx; origin.y = earth.cy - earth.R - 2; }
}
export function resize(){
  // the solar-system map is zoomed out so rocks from every side fit
  setViewport(mapMode === 'orbit' ? (Math.min(innerWidth, innerHeight) < 600 ? .5 : .6) : 1);
  layout();
  if (!tgt.x){ tgt.x = W*.5; tgt.y = H*.18; }
  if (!enemies.length) initEnemies();
}
