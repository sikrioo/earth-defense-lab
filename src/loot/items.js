import { rint } from '../core/util.js';
import { EARTH_MAX } from '../world/earth.js';
import { level } from '../game/progress.js';

/* ---------- slots, items, materials (Diablo-style affixes, hidden behind a small UI) ---------- */
export const SLOT_LV = [1, 3, 6, 10, 15, 20];
                 // level that opens each slot
export const slots = [null, null, null, null, null, null];
export const stash = [];
export const mats = { shard:0, metal:0, core:0 };
export const MAT_NAME = { shard:'운석 파편', metal:'별금속', core:'항성 핵' };
export const RAR = [
  { n:'일반', c:[216,210,198] },
  { n:'고급', c:[111,155,255] },
  { n:'희귀', c:[242,209,90] },
  { n:'전설', c:[255,154,60] },
];
export const CORE = {
  magic:{ name:'마력탄 코어', short:'마', dmg:14, rate:3.2, elem:'magic', pal:'magic', fx:'빠르게 연사하는 기본 마력탄' },
  fire: { name:'화염 코어',   short:'화', dmg:20, rate:2.0, elem:'fire',  pal:'fire',  fx:'맞은 자리가 폭발해 주변에도 피해 40%' },
  ice:  { name:'냉기 코어',   short:'냉', dmg:12, rate:2.6, elem:'ice',   pal:'ice',   fx:'얼음 송곳 · 맞은 운석과 주변을 3초간 65% 느리게' },
  bolt: { name:'번개 코어',   short:'번', dmg:11, rate:2.8, elem:'bolt',  pal:'bolt',  fx:'맞으면 가까운 운석 1개에 번개가 튐 (피해 60%)' },
};
// k: stat key, f: line text, r: roll by item level, flat: not scaled by upgrades, core: only on cores
const AFX = [
  { k:'dmg',    f:v => `피해 +${v}%`,             r:il => rint(6, 12) + il },
  { k:'fire',   f:v => `화염 피해 +${v}%`,        r:il => rint(10, 20) + il*2 },
  { k:'ice',    f:v => `냉기 피해 +${v}%`,        r:il => rint(10, 20) + il*2 },
  { k:'bolt',   f:v => `번개 피해 +${v}%`,        r:il => rint(10, 20) + il*2 },
  { k:'aspd',   f:v => `자동 공격 속도 +${v}%`,   r:il => rint(5, 12) + il },
  { k:'crit',   f:v => `치명타 확률 +${v}%`,      r:il => rint(2, 5) + (il >> 2) },
  { k:'critd',  f:v => `치명타 피해 +${v}%`,      r:il => rint(12, 28) + il*2 },
  { k:'proj',   f:v => `투사체 +${v}`,            r:() => 1, flat:true, core:true, rare:true },
  { k:'pierce', f:v => `관통 +${v}`,              r:() => 1, flat:true, core:true, rare:true },
  { k:'xp',     f:v => `경험치 +${v}%`,           r:() => rint(5, 15) },
  { k:'mat',    f:v => `재료 획득 +${v}%`,        r:() => rint(10, 30) },
  { k:'regen',  f:v => `지구 재생 초당 +${v}`,    r:il => rint(1, 3) + (il >> 2) },
  { k:'hp',     f:v => `지구 최대 체력 +${v}`,    r:il => rint(40, 90) + il*10 },
  { k:'cdr',    f:v => `스킬 재사용 대기 -${v}%`, r:() => rint(4, 10) },
];
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
