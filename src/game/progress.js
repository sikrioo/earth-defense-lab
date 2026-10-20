/* ---------- level, xp, game over and restart ---------- */
import { TAU, origin, rand, time } from '../core/canvas.js';
import { LIGHT, PAL } from '../core/palette.js';
import { emit } from '../core/particles.js';
import { addShake, flash, ring } from '../core/lights.js';
import { SLOT_LV } from '../data/loot.js';
import { MANA_MAX } from '../data/world.js';
import { floats } from '../enemies/list.js';
import { initEnemies, kills } from '../enemies/spawn.js';
import { earth, mapMode, setGameOver } from '../world/earth.js';
import { resetCities } from '../world/cities.js';
import { setHolding } from './input.js';
import { resetEvents } from './events.js';
import { calcStats, earthMax } from '../loot/items.js';
import { setSlotsDirty } from '../loot/drops.js';
import { active } from '../skills/index.js';
import { pickQ, setPickQ } from '../weapons/levelup.js';
import { resetRings } from '../weapons/rings.js';
import { logEvent, resetLoadout } from '../ui/deck.js';
import { setMana } from '../ui/hud.js';

const overEl = document.getElementById('over');

export let level = 1, xp = 0;
export const xpNeed = l => Math.round(18*Math.pow(l, 1.45));
export function gainXp(n){
  xp += n;
  while (xp >= xpNeed(level)){ xp -= xpNeed(level); level++; levelUpFx(); setPickQ(pickQ + 1); }
  xpDirty = true;
}
export let xpDirty = true;
export function setXpDirty(v){ return xpDirty = v; }
function levelUpFx(){
  const x = origin.x, y = origin.y - 10;
  ring(x, y, 6, 120, .6, PAL.holy[1], 4); ring(x, y, 6, 70, .45, PAL.holy[0], 2);
  flash(x, y, 260, LIGHT.holy, 1.4, .5);
  for (let i = 0; i < 40; i++){ const a = rand(0, TAU), sp = rand(40, 160); emit({ x:x + Math.cos(a)*14, y:y + Math.sin(a)*6, vx:Math.cos(a)*sp*.4, vy:-rand(80, 220), drag:1.2, life:rand(.6,1.1), s0:rand(2.5,4.5), s1:.6, pal:PAL.holy }); }
  floats.push({ x, y:y - 26, v:`LEVEL ${level}`, c:[255,214,110], age:0, big:true });
  const si = SLOT_LV.indexOf(level); if (si > 0){ logEvent(`슬롯 ${si + 1} 개방`, `레벨 ${level} 달성`, [255,214,110]); calcStats(); setSlotsDirty(true); }
}
export const debris = [];
export let earthHits = 0, hpDirty = true;
export function setEarthHits(v){ return earthHits = v; }
export function setHpDirty(v){ return hpDirty = v; }
export function endGame(){
  setGameOver(true); setHolding(false);
  flash(earth.cx, earth.cy, 600, LIGHT.fire, 2.4, 1.2); addShake(14);
  for (let i = 0; i < 160; i++){ const a = rand(0, TAU), sp = rand(80, 520); emit({ x:earth.cx + Math.cos(a)*earth.R*.5, y:(mapMode === 'line' ? earth.top : earth.cy) + Math.sin(a)*earth.R*.2, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, drag:1.4, life:rand(.6,1.6), s0:rand(6,16), s1:2, pal:PAL.fire }); }
  overEl.hidden = false; overEl.querySelector('p').textContent = `레벨 ${level} · 처치 ${kills} · 버틴 시간 ${Math.floor(time - runStart)}초`;
}
let runStart = 0;
export function restart(){
  initEnemies(); level = 1; xp = 0; xpDirty = true; resetLoadout(); earth.hp = earthMax(); setMana(MANA_MAX); hpDirty = true; setGameOver(false); runStart = time; resetCities(); resetRings(); resetEvents();
  active.length = 0; overEl.hidden = true;
}
