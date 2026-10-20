import { H, W, ctx, origin, rand, time } from '../core/canvas.js';
import { PAL } from '../core/palette.js';
import { emit, sprite } from '../core/particles.js';
import { ring } from '../core/lights.js';
import { enemies } from '../enemies/list.js';
import { earth, gameOver, mapMode } from './earth.js';
import { alive } from '../enemies/spawn.js';
import { logEvent } from '../ui/deck.js';

/* ---------- rotating Earth: cities ride the spin, a hit on a city costs double ---------- */
const CITY_DEF = [
  ['서울', 127], ['도쿄', 139.7], ['시드니', 151.2], ['호놀룰루', -157.8], ['로스앤젤레스', -118.2], ['뉴욕', -74],
  ['상파울루', -46.6], ['런던', -.1], ['카이로', 31.2], ['두바이', 55.3], ['뭄바이', 72.9], ['쿠알라룸푸르', 101.7],
];
export const CITY_HP = 3, CITY_MULT = 2;
const SPIN = { line:2, orbit:6 };
            // degrees per second
const cities = CITY_DEF.map(([n, lon]) => ({ n, lon, hp:CITY_HP, x:0, y:0, a:0, vis:false, danger:0, hitT:0 }));
let spinDeg = 0;
const wrap180 = d => ((d + 180) % 360 + 360) % 360 - 180;
export function resetCities(){ for (const c of cities){ c.hp = CITY_HP; c.danger = 0; c.hitT = 0; } spinDeg = 0; }
function placeCities(){
  const sub = 127 - spinDeg;                 // longitude under the hero; Earth turns east, so cities drift right
  for (const c of cities){
    const rel = wrap180(c.lon - sub);
    if (mapMode === 'line'){
      c.x = earth.cx + rel/90*W;
      const dx = c.x - earth.cx;
      c.vis = Math.abs(dx) < earth.R*.98;
      c.y = c.vis ? earth.cy - Math.sqrt(earth.R*earth.R - dx*dx) : H*2;
      c.vis = c.vis && c.y < origin.y + 34 && c.x > -20 && c.x < W + 20;
    } else {
      c.a = -Math.PI/2 + rel*Math.PI/180;
      c.x = earth.cx + Math.cos(c.a)*earth.R; c.y = earth.cy + Math.sin(c.a)*earth.R; c.vis = true;
    }
  }
}
export function updCities(dt){
  if (!gameOver) spinDeg += SPIN[mapMode]*dt;
  placeCities();
  for (const c of cities){
    c.hitT = Math.max(0, c.hitT - dt); c.danger = 0;
    if (!c.vis || c.hp <= 0) continue;
    for (const e of enemies){
      if (!alive(e)) continue;
      if (mapMode === 'line'){ if (Math.abs(e.x - c.x) < 46 && e.y > earth.top - 260){ c.danger = 1; break; } }
      else { const d = Math.hypot(e.x - c.x, e.y - e.r - c.y); if (d < 150){ c.danger = 1; break; } }
    }
  }
}
// which living city an impact at (x, y) lands on, if any
export function cityAt(x, y){
  let best = null, bd = 1e9;
  for (const c of cities){
    if (!c.vis || c.hp <= 0) continue;
    let d;
    if (mapMode === 'line') d = Math.abs(x - c.x) < 46 ? Math.abs(x - c.x) : 1e9;
    else { const a = Math.atan2(y - earth.cy, x - earth.cx); d = Math.abs(wrap180((a - c.a)*180/Math.PI)) < 14 ? 1 : 1e9; }
    if (d < bd){ bd = d; best = c; }
  }
  return best;
}
export function cityHit(c){
  c.hp--; c.hitT = .8;
  ring(c.x, c.y, 4, 60, .5, [255,90,70], 3);
  if (c.hp <= 0){
    logEvent(`${c.n} 함락`, '도시 피격은 지구 피해 2배', [216,57,43]);
    for (let i = 0; i < 30; i++){ const a = rand(Math.PI*1.1, Math.PI*1.9), sp = rand(60, 220); emit({ x:c.x, y:c.y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, drag:2, life:rand(.6, 1.2), s0:rand(8, 16), s1:2, pal:PAL.fire }); }
  } else logEvent(`${c.n} 피격`, `남은 방어 ${c.hp}/${CITY_HP}`, [255,140,90]);
}
export function drawCities(){
  ctx.globalCompositeOperation = 'source-over';
  const blink = (time*6 % 1) < .5, orbit = mapMode === 'orbit';
  const fs = orbit ? 20 : 12;
  ctx.font = `700 ${fs}px "IBM Plex Sans KR", "Black Han Sans", sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  for (const c of cities){
    if (!c.vis) continue;
    const dead = c.hp <= 0;
    // city lights: a small cluster on the surface
    ctx.globalCompositeOperation = 'lighter';
    if (!dead){
      const k = c.hitT > 0 ? 1.6 : 1;
      sprite(c.x, c.y, (orbit ? 26 : 18)*k, c.danger && blink ? [255,80,60] : [255,200,120], .55);
      for (let i = -2; i <= 2; i++) sprite(c.x + i*(orbit ? 5 : 4), c.y + Math.abs(i)*.6, orbit ? 3.5 : 2.6, [255,236,190], .9);
    } else sprite(c.x, c.y, orbit ? 16 : 11, [120,60,40], .35);
    ctx.globalCompositeOperation = 'source-over';
    // label chip: flat poster tag above the surface (outside the rim on the orbit map)
    if (orbit && !(c.danger && !dead) && c.hitT <= 0) continue;   // orbit view is crowded: name a city only when it matters
    let lx = c.x, ly = c.y - (orbit ? 26 : 20);
    if (orbit){ lx = earth.cx + Math.cos(c.a)*(earth.R + 34); ly = earth.cy + Math.sin(c.a)*(earth.R + 34); }
    const tw = ctx.measureText(c.n).width, pw = tw + 10 + CITY_HP*(orbit ? 9 : 6), ph = fs + 6;
    ctx.globalAlpha = dead ? .45 : .92;
    ctx.fillStyle = c.danger && blink && !dead ? '#d8392b' : '#0a0a0c';
    ctx.fillRect(lx - pw/2, ly - ph/2, pw, ph);
    ctx.fillStyle = dead ? '#8a8378' : '#f1ece0';
    ctx.fillText(c.n, lx - pw/2 + 5, ly + 1);
    if (dead){ ctx.fillRect(lx - pw/2 + 3, ly, pw - 6, orbit ? 2 : 1.5); }
    else for (let i = 0; i < CITY_HP; i++){
      const s = orbit ? 6 : 4, px = lx - pw/2 + 8 + tw + i*(s + (orbit ? 3 : 2)), py = ly - s/2;
      ctx.fillStyle = i < c.hp ? '#f4c460' : '#3a352e'; ctx.fillRect(px, py, s, s);
    }
    ctx.globalAlpha = 1;
  }
}
