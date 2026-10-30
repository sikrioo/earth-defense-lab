/* ---------- fortress mode: energy cores as jewels — grade, element, random affixes in fixed ranges, links ---------- */
import { AFFIX, ELEMENTS, GRADES, LINKS, NAMED } from './data.js';

let uid = 0;
const pick = list => list[(Math.random()*list.length)|0];
function weighted(){
  const ks = Object.keys(GRADES).filter(k => GRADES[k].w > 0), tot = ks.reduce((a, k) => a + GRADES[k].w, 0);
  let r = Math.random()*tot; for (const k of ks){ if ((r -= GRADES[k].w) <= 0) return k; } return ks[0];
}
const rollValue = (k, lo) => { const A = AFFIX[k], t = lo + Math.random()*(1 - lo); return Math.round(A.lo + (A.hi - A.lo)*t); };

export function rollCore(grade = weighted()){
  const g = GRADES[grade], keys = Object.keys(AFFIX).filter(k => !AFFIX[k].rare).sort(() => Math.random() - .5);
  return { id:++uid, grade, el:pick(Object.keys(ELEMENTS)), affixes:keys.slice(0, g.n).map(k => ({ k, v:rollValue(k, g.lo) })) };
}
export function namedCore(key){
  const N = NAMED[key], have = new Set(N.fixed.map(([k]) => k));
  const extra = pick(Object.keys(AFFIX).filter(k => !AFFIX[k].rare && !have.has(k)));
  return { id:++uid, grade:'named', named:key, el:N.el, affixes:[...N.fixed.map(([k, v]) => ({ k, v, fixed:true })), { k:extra, v:rollValue(extra, GRADES.named.lo) }] };
}
// what a dying enemy leaves: elites one core (rarely the named crystal), bosses their named core plus a good one
export function dropFor(e){
  if (e.T.boss) return [NAMED[e.type] ? namedCore(e.type) : rollCore('flawless'), rollCore(Math.random() < .3 ? 'flawless' : 'pure')];
  if (e.T.elite) return [Math.random() < .05 ? namedCore('elite') : rollCore()];
  return [];
}
export const coreName = c => c.named ? NAMED[c.named].ko : `${ELEMENTS[c.el].ko} 코어`;
export const coreCol = c => ELEMENTS[c.el].col;
export const gradeOf = c => GRADES[c.grade];
export const affixText = a => `${AFFIX[a.k].ko} +${a.v}${AFFIX[a.k].pct ? '%' : ''}`;
// links that a set of cores switches on (an element can only count once per link)
export function linksOf(cores){
  const els = cores.map(c => c.el);
  return LINKS.filter(L => { const pool = [...els]; return L.els.every(x => { const i = pool.indexOf(x); if (i < 0) return false; pool.splice(i, 1); return true; }); });
}
