/* ---------- drops and pickups flying to the hero ---------- */
import { TAU, origin, rand, time } from '../core/canvas.js';
import { rint } from '../core/util.js';
import { sprite, streak } from '../core/particles.js';
import { flash } from '../core/lights.js';
import { DROP, MAT_COL, RAR } from '../data/loot.js';
import { level } from '../game/progress.js';
import { S, mats, rollItem, stash } from './items.js';
import { bagNew, logEvent, setBagNew } from '../ui/deck.js';

// ---- drops & pickups ----
export const pickups = [];
export function dropLoot(e){
  const d = DROP[e.type]; if (!d) return;
  const cx = e.x, cy = e.y - e.r, boost = 1 + (S.mat || 0)/100;
  const put = (kind, n, item) => { const a = rand(0, TAU), sp = rand(60, 160); pickups.push({ x:cx, y:cy, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, kind, n, item, age:0, src:e.type }); };
  for (const k of ['shard', 'metal', 'core']){
    if (d[k] && Math.random() < d[k]){ const n = Math.max(1, Math.round((k === 'shard' ? rint(1, 2) : 1)*boost*rand(.8, 1.2))); put(k, n); }
  }
  if (d.item && Math.random() < d.item) put('item', 1, rollItem(Math.max(1, level + rint(-1, 1)), d.minRar || 0));
}
export function updPickups(dt){
  const hx = origin.x, hy = origin.y - 8;
  for (let i = pickups.length - 1; i >= 0; i--){
    const p = pickups[i]; p.age += dt;
    if (p.age < .45){ const f = Math.exp(-4*dt); p.vx *= f; p.vy *= f; }
    else { const dx = hx - p.x, dy = hy - p.y, d = Math.hypot(dx, dy) || 1, acc = 900 + p.age*900; p.vx += dx/d*acc*dt; p.vy += dy/d*acc*dt; const f = Math.exp(-2*dt); p.vx *= f; p.vy *= f; if (d < 16){ collect(p); pickups.splice(i, 1); continue; } }
    p.x += p.vx*dt; p.y += p.vy*dt;
  }
}
function collect(p){
  if (p.kind !== 'item'){ mats[p.kind] += p.n; slotsDirty = true; return; }
  const it = p.item;
  stash.unshift(it); setBagNew(bagNew + 1);
  logEvent(`${RAR[it.rar].n} ${it.name}`, `${p.src === 'boss' ? '보스' : '엘리트'} 처치 · 가방에 추가`, RAR[it.rar].c);
  flash(origin.x, origin.y - 8, 120, RAR[it.rar].c, .8, .25);
  slotsDirty = true;
}
export function drawPickups(){
  for (const p of pickups){
    const c = p.kind === 'item' ? RAR[p.item.rar].c : MAT_COL[p.kind], s = p.kind === 'item' ? 7 : p.kind === 'shard' ? 3.5 : 5;
    sprite(p.x, p.y, s*2.6, c, .45); sprite(p.x, p.y, s*.9, c, 1);
    if (p.kind === 'item' && p.item.rar >= 2) streak(p.x, p.y, time*4, s*2.2, 2, c, .7);
  }
}
export let slotsDirty = true;
export function setSlotsDirty(v){ return slotsDirty = v; }
