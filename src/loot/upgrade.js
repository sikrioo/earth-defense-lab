import { calcStats, mats, stash } from './items.js';

// ---- upgrades & salvage ----
export const MAX_PLUS = 10;
export function upCost(it){ return { shard:4 + it.plus*4, metal:it.plus >= 3 ? it.plus - 2 : 0, core:it.plus >= 7 ? 1 : 0 }; }
export const canPay = c => mats.shard >= c.shard && mats.metal >= c.metal && mats.core >= c.core;
export function upgrade(it){
  const c = upCost(it); if (it.plus >= MAX_PLUS || !canPay(c)) return false;
  mats.shard -= c.shard; mats.metal -= c.metal; mats.core -= c.core; it.plus++; calcStats(); return true;
}
export function salvage(it){
  const i = stash.indexOf(it); if (i < 0) return;
  stash.splice(i, 1);
  mats.shard += [2, 5, 10, 20][it.rar] + it.plus*2; mats.metal += [0, 0, 1, 3][it.rar];
}
