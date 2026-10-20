/* ---------- loot numbers: slots, rarities, cores, affixes, drops, upgrades ---------- */
import { rint } from '../core/util.js';

export const SLOT_LV = [1, 3, 6, 10, 15, 20];   // level that opens each slot
export const MAT_NAME = { shard:'운석 파편', metal:'별금속', core:'항성 핵' };
export const MAT_COL = { shard:[214,196,170], metal:[140,205,255], core:[255,166,70] };
export const MAX_PLUS = 10;

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
export const AFX = [
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

// what each rock type can drop: chance per material, item chance and its lowest rarity
export const DROP = {
  normal:{ shard:.45 }, runner:{ shard:.35 }, brute:{ shard:1, metal:.25 },
  meteor:{ shard:1, metal:.3 }, elite:{ shard:1, metal:1, item:.5, minRar:1 }, boss:{ shard:1, metal:1, core:1, item:1, minRar:2 },
  comet:{ shard:1, metal:.5, core:.1 }, splitter:{ shard:.8 }, shard:{ shard:.15 }, pebble:{ shard:.15 }, planet:{ shard:1, metal:1, core:1, item:1, minRar:3 },
};
