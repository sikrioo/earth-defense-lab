/* ---------- hitting rocks: damage, knockback, crits, kills, area hits, Earth impacts ---------- */
import { ELL, TAU, rand } from '../core/canvas.js';
import { mix } from '../core/util.js';
import { LIGHT, PAL } from '../core/palette.js';
import { emit } from '../core/particles.js';
import { addShake, flash, ring } from '../core/lights.js';
import { ECOL } from '../data/enemy-types.js';
import { CITY_MULT } from '../data/world.js';
import { enemies, floats } from './list.js';
import { alive, ectr, kills, setKills } from './spawn.js';
import { splitRock } from './special.js';
import { demonSprite } from './render.js';
import { earth, gameOver } from '../world/earth.js';
import { cityAt, cityHit } from '../world/cities.js';
import { debris, earthHits, endGame, gainXp, setEarthHits, setHpDirty } from '../game/progress.js';
import { S } from '../loot/items.js';
import { dropLoot } from '../loot/drops.js';
import { orbState } from '../ui/hud.js';

let hitSrc = null;   // optional {x,y} of what struck, for knockback direction
export function hurt(e, dmg, elem, src = hitSrc){
  if (!alive(e) || !dmg) return;
  if (src && !e.T.ballistic){
    const cx = e.x, cy = e.y - e.r, dx = cx - src.x, dy = cy - src.y, d = Math.hypot(dx, dy) || 1;
    const imp = Math.min(260, 40 + dmg*2.2)/e.m;
    e.vx += dx/d*imp; e.vy += dy/d*imp; e.spin += rand(-1, 1)*imp*.01;
  }
  const amp = e.amp > 0 ? 2 : 1, crit = Math.random()*100 < (S.crit || 0);
  const mult = (1 + ((S.dmg || 0) + (S[elem] || 0))/100)*(crit ? 1 + (S.critd || 0)/100 : 1);
  const d = Math.max(1, Math.round(dmg*amp*mult));
  e.hp -= d; e.flash = .12; e.squash = 1; e.lean = 1; e.tint = elem; e.tintT = .45;
  if (elem === 'ice') e.chill = Math.max(e.chill, 3);
  if (floats.length < 90) floats.push({ x:e.x + rand(-9, 9), y:e.y - e.h - 12, v:crit ? `${d}!` : d, c:crit ? [255,224,90] : ECOL[elem] || [255,255,255], age:0, big:crit || e.type === 'elite' || e.type === 'boss' || amp > 1 });
  if (e.hp <= 0){ kill(e, elem); dropLoot(e); gainXp(Math.round((e.T.xp || 0)*(1 + (S.xp || 0)/100))); }
}
export function impact(e){
  e.dead = true; e.impacted = true; e.deadT = 0; setEarthHits(earthHits + 1);
  const city = cityAt(e.x, e.y - e.r*.5), dmgE = (e.T.hit || 20)*(city ? CITY_MULT : 1); if (city) cityHit(city);
  earth.hp = Math.max(0, earth.hp - dmgE); setHpDirty(true); orbState.hp.hit = 1;
  floats.push({ x:e.x, y:e.y - e.r - 10, v:`-${dmgE}`, c:[255,90,70], age:0, big:true });
  if (earth.hp <= 0 && !gameOver) endGame();
  const x = e.x, y = e.y - e.r*.5, sc = Math.min(1.4, .45 + e.r/30);
  for (let i = 0; i < 28*sc; i++){ const a = rand(Math.PI*1.05, Math.PI*1.95), sp = rand(80, 300)*sc; emit({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, ay:420, drag:1.6, life:rand(.35,.75), s0:rand(6,12)*sc, s1:1.5, pal:PAL.fire }); }
  for (let i = 0; i < 10; i++){ const a = rand(Math.PI*1.1, Math.PI*1.9), sp = rand(120, 320); emit({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, ay:700, drag:1, life:rand(.4,.8), s0:2.5, s1:1, streak:2, pal:[e.T.body, mix(e.T.body, [0,0,0], .4)] }); }
  ring(x, y, 4, 70*sc, .45, PAL.fire[1], 3); flash(x, y, 220*sc, LIGHT.fire, 1.3, .35); addShake(2 + 3*sc);
  earth.flash = 1;
  if (e.type === 'planet'){ addShake(14); ring(x, y, 10, 260, .9, PAL.fire[1], 6); }
}
function kill(e, elem){
  if (e.T.split) splitRock(e);
  e.dead = true; e.deadT = 0; setKills(kills + 1);
  const nd = e.type === 'boss' ? 8 : e.type === 'elite' ? 5 : 3 + ((Math.random()*2)|0);
  for (let i = 0; i < nd; i++){
    const a = rand(0, TAU), sp = rand(60, 170);
    debris.push({ x:e.x, y:e.y - e.r, vx:Math.cos(a)*sp + e.vx, vy:Math.sin(a)*sp + e.vy, r:e.r*rand(.28, .45), age:0, life:rand(.7, 1.1), sp:demonSprite(e.type, 1, e.variant), rot:rand(0, TAU), vr:rand(-6, 6) });
  }
  const c = ectr(e), pal = [mix(e.T.body, [255,255,255], .4), e.T.body, mix(e.T.body, [0,0,0], .5)], n = e.type === 'boss' ? 70 : e.type === 'elite' ? 40 : 24;
  for (let i = 0; i < n; i++){
    const a = rand(0, TAU), s = rand(80, 320);
    emit({ x:c.x + rand(-e.r, e.r), y:c.y + rand(-e.h/2, e.h/2), vx:Math.cos(a)*s, vy:Math.sin(a)*s - 120, ay:750, drag:1, life:rand(.4,.9), s0:rand(2.5,4.5), s1:1, streak:1.5, pal });
  }
  const ec = ECOL[elem] || mix(e.T.body, [255,255,255], .4);
  ring(e.x, e.y, e.r, e.r*4.5, .45, ec, 3); flash(c.x, c.y, 150, ec, 1, .25);
  if (e.type === 'boss'){ addShake(7); ring(e.x, e.y, e.r, 220, .7, mix(e.T.body, [255,255,255], .4), 5); }
}
export function hurtArea(x, y, r, dmg, elem, skip){
  hitSrc = { x, y };
  for (const e of enemies){
    if (!alive(e) || (skip && skip.has(e))) continue;
    if (Math.hypot(e.x - x, (e.y - y)/ELL) < r + e.r){ hurt(e, dmg, elem); if (skip) skip.add(e); }
  }
  hitSrc = null;
}
// expanding-ring hit: each enemy is struck once when the ring reaches it
export function ringHit(set, x, y, r, dmg, elem){
  for (const e of enemies){
    if (!alive(e) || set.has(e)) continue;
    if (Math.hypot(e.x - x, (e.y - y)/ELL) < r + e.r){ set.add(e); hurt(e, dmg, elem, { x, y }); }
  }
}
export function enemyAt(x, y, pad = 6){
  for (const e of enemies){
    if (!alive(e)) continue;
    if (Math.hypot(x - e.x, y - (e.y - e.r)) < e.r + pad) return e;
  }
  return null;
}
export function nearestEnemy(x, y, maxR, skip){
  let best = null, bd = maxR;
  for (const e of enemies){
    if (!alive(e) || (skip && skip.has(e))) continue;
    const d = Math.hypot(e.x - x, e.y - e.h*.5 - y);
    if (d < bd){ bd = d; best = e; }
  }
  return best;
}
