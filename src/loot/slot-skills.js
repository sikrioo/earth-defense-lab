import { S, itemId, setItemId } from './items.js';
import { CLASSES } from '../skills/index.js';

// ---- skills mapped into slots: cast automatically at the nearest rock ----
const AUTO_CD = { 'Fan Fire':1.2, 'Scattergun':1.4, 'Harpoon':2.2, 'Prox Mine':2, 'Orbital Strike':3.4, 'Long Shot':2.4, 'Micro Missiles':2.6, 'Air Strafe':4.5, 'Jam Session':9, 'Fire Wall':4, 'Meteor':2.4, 'Hydra':3.2, 'Blizzard':3.4, 'Frost Nova':2, 'Nova':1.8, 'Frozen Orb':1.8,
  'Holy Fire':5.5, 'Holy Freeze':5.5, 'Holy Shock':5.5, 'Fist of Heavens':1.8, 'Blessed Hammer':.5,
  'Amplify Damage':6, 'Poison Nova':2.2, 'Corpse Explosion':1.6, 'Plague Javelin':2.2, 'Lightning Fury':1.6,
  'Battle Orders':4, 'War Cry':3, 'Whirlwind':1.6, 'Leap Attack':2 };
export function skillRef(ci, k){ const sk = CLASSES[ci].skills[k]; return { id:(setItemId(itemId + 1) - 1), base:'skill', ci, k, plus:0, name:sk.ko, elem:sk.elem, afx:[] }; }
export const skillOf = it => CLASSES[it.ci].skills[it.k];
export function autoCdOf(it){ const sk = skillOf(it); return (AUTO_CD[sk.en] ?? Math.max(.7, sk.cd*3))*(1 - .06*it.plus)*(1 - (S.cdr || 0)/100); }
