import { H, TAU, W, ctx, rand } from '../core/canvas.js';
import { addShake } from '../core/lights.js';
import { ETYPE } from '../data/enemy-types.js';
import { enemies } from '../enemies/list.js';
import { earth, gameOver, mapMode } from '../world/earth.js';
import { makeEnemy } from '../enemies/spawn.js';
import { skewTag } from '../weapons/rings.js';
import { simMax } from './sim.js';
import { spawnTemp } from '../enemies/special.js';
import { logEvent, paused } from '../ui/deck.js';

/* ---------- events: meteor showers on a timer, a rogue planet now and then ---------- */
var EV = { shower:35, planet:70, banner:null, bannerT:0 };
export function resetEvents(){ EV.shower = simMax ? 8 : 35; EV.planet = simMax ? 4 : 70; EV.banner = null; EV.bannerT = 0; }
function banner(title, sub){ EV.banner = { title, sub }; EV.bannerT = 2.6; }
function meteorShower(){
  const n = simMax ? 28 : 14, left = Math.random() < .5;
  for (let i = 0; i < n; i++){
    let x, y, vx, vy;
    if (mapMode === 'orbit'){
      const a = rand(0, TAU)*.15 + (left ? 0 : Math.PI), far = Math.hypot(W, H)*.5 + 80 + i*22;
      x = earth.cx + Math.cos(a)*far; y = earth.cy + Math.sin(a)*far; const d = Math.hypot(earth.cx - x, earth.cy - y); vx = (earth.cx - x)/d*150; vy = (earth.cy - y)/d*150;
    } else { x = (left ? rand(-100, W*.4) : rand(W*.6, W + 100)) ; y = -30 - i*26 - rand(0, 30); vx = (left ? 1 : -1)*rand(50, 90); vy = rand(130, 170); }
    spawnTemp('pebble', x, y, vx, vy);
  }
  banner('METEOR SHOWER', `유성우 · ${n}개`);
  logEvent('유성우 접근', `작은 운석 ${n}개가 한꺼번에 쏟아짐`, [232,163,61]);
}
function rogueIncoming(){
  const e = makeEnemy('planet'); e.temp = true; e.variant = 1; e.r = ETYPE.planet.r; e.h = e.r*2; e.m = (e.r/11)**2;
  if (mapMode === 'orbit'){ const a = rand(0, TAU), far = Math.hypot(W, H)*.5 + e.r; e.x = earth.cx + Math.cos(a)*far; e.y = earth.cy + Math.sin(a)*far; e.aimX = earth.cx; e.aimY = earth.cy; }
  else { e.x = rand(W*.3, W*.7); e.y = e.r*.95; e.aimX = earth.cx + rand(-.15, .15)*W; e.aimY = earth.top + 60; }
  e.hx = e.wx = e.x; e.hy = e.wy = e.y; e.vx = 0; e.vy = e.fallSp; e.spin = .05; e.spawnT = .4;
  enemies.push(e);
  banner('ROGUE PLANET', '떠돌이 행성 접근 · 지구 충돌 시 큰 피해'); addShake(3);
  logEvent('떠돌이 행성 접근', '집중 사격으로 부숴야 함', [216,57,43]);
}
export function updEvents(dt){
  EV.bannerT = Math.max(0, EV.bannerT - dt);
  if (gameOver || paused) return;
  EV.shower -= dt; if (EV.shower <= 0){ EV.shower = simMax ? 12 : rand(38, 50); meteorShower(); }
  const planetUp = enemies.some(e => e.type === 'planet' && !e.dead);
  if (!planetUp){ EV.planet -= dt; if (EV.planet <= 0){ EV.planet = simMax ? 20 : rand(100, 130); rogueIncoming(); } }
}
export function drawEvents(){
  ctx.globalCompositeOperation = 'source-over';
  // rogue planet health, poster bar across the top
  const pl = enemies.find(e => e.type === 'planet' && !e.dead);
  if (pl){
    const bw = Math.min(W*.5, 420), bx = W/2 - bw/2, by = 104;
    ctx.globalAlpha = .92; ctx.fillStyle = '#0a0a0c'; ctx.fillRect(bx - 4, by - 4, bw + 8, 16);
    ctx.fillStyle = '#3a1a16'; ctx.fillRect(bx, by, bw, 8);
    ctx.fillStyle = '#d8392b'; ctx.fillRect(bx, by, bw*Math.max(0, pl.hp/pl.max), 8);
    ctx.globalAlpha = 1; skewTag(bx - 6, by - 14, 'ROGUE PLANET', 16, '#d8392b', '#f1ece0');
    ctx.font = '11px "Courier Prime", ui-monospace, monospace'; ctx.fillStyle = '#f1ece0'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const txt = `${Math.ceil(pl.hp)} / ${pl.max}`; ctx.fillText(txt, bx + bw - ctx.measureText(txt).width, by - 12);
  }
  if (EV.bannerT > 0 && EV.banner){
    const t = 2.6 - EV.bannerT, k = Math.min(1, t*5)*Math.min(1, EV.bannerT*2.5), slide = (1 - Math.min(1, t*5))*-60;
    ctx.globalAlpha = k;
    const w = skewTag(W/2 - 170 + slide, H*.32, EV.banner.title, 44, '#d8392b', '#f1ece0');
    skewTag(W/2 - 170 + slide + 8, H*.32 + 36, EV.banner.sub, 15, '#0a0a0c', '#f1ece0');
    ctx.globalAlpha = 1;
  }
}
