/* ---------- slots, items, materials (Diablo-style affixes, hidden behind a small UI) ---------- */
import { AFX, CORE, SLOT_LV } from '../data/loot.js';
import { EARTH_MAX } from '../data/world.js';
import { level } from '../game/progress.js';

export const slots = [null, null, null, null, null, null];
export const stash = [];
export const mats = { shard:0, metal:0, core:0 };
export let itemId = 1;
export function setItemId(v){ return itemId = v; }
const pick = arr => arr[(Math.random()*arr.length)|0];
function makeCore(kind, rar = 0, ilvl = 1){ return { id:itemId++, base:'core', kind, rar, ilvl, plus:0, afx:[], name:CORE[kind].name }; }
export function rollItem(ilvl, minRar = 0){
  const r = Math.random();
  let rar = Math.max(minRar, r < .03 ? 3 : r < .2 ? 2 : r < .6 ? 1 : 0);
  const isCore = Math.random() < .55;
  if (!isCore) rar = Math.max(1, rar);
  const it = isCore ? makeCore(pick(Object.keys(CORE)), rar, ilvl) : { id:itemId++, base:'charm', kind:null, rar, ilvl, plus:0, afx:[] };
  const n = [0, 1 + (Math.random() < .5 ? 1 : 0), 3 + (Math.random() < .4 ? 1 : 0), 5][rar];
  const pool = AFX.filter(a => (isCore || !a.core) && (!a.rare || rar >= 2));
  for (let i = 0; i < n && pool.length; i++){
    const a = pool.splice((Math.random()*pool.length)|0, 1)[0];
    it.afx.push({ k:a.k, v:a.r(ilvl) });
  }
  it.name = isCore ? CORE[it.kind].name : '부적';
  return it;
}
export const AFX_BY = Object.fromEntries(AFX.map(a => [a.k, a]));
export const afxVal = (it, a) => AFX_BY[a.k].flat ? a.v : Math.round(a.v*(1 + .1*it.plus));
export const coreDmg = it => Math.round(CORE[it.kind].dmg*(1 + .08*(it.ilvl - 1))*(1 + .12*it.plus));
export const slotsOpen = () => SLOT_LV.filter(l => level >= l).length;
export let S = {};
export function calcStats(){
  S = { dmg:0, fire:0, ice:0, bolt:0, aspd:0, crit:5, critd:50, proj:0, pierce:0, xp:0, mat:0, regen:0, hp:0, cdr:0 };
  for (let i = 0; i < slotsOpen(); i++){ const it = slots[i]; if (!it) continue; for (const a of it.afx) S[a.k] += afxVal(it, a); }
  S.cdr = Math.min(60, S.cdr);
}
export const earthMax = () => EARTH_MAX + (S.hp || 0);
