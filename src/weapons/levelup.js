import { origin } from '../core/canvas.js';
import { ring } from '../core/lights.js';
import { level } from '../game/progress.js';
import { RUP, newRing, revs, rup } from './rings.js';
import { invEl, logEvent, panelEl, pauseOn, setPaused } from '../ui/deck.js';

/* ---------- level-up pick: three poster cards, the game waits ---------- */
export let pickQ = 0, picking = false, pickOpts = [];
export function setPickQ(v){ return pickQ = v; }
const pickEl = document.getElementById('pick');
function rollPicks(){
  const pool = Object.keys(RUP).filter(k => rup[k] < RUP[k].max);
  const out = [];
  // a new ring is offered often early, so the swarm grows
  if (rup.ring < RUP.ring.max && Math.random() < .55) out.push('ring');
  while (out.length < 3 && out.length < pool.length){ const k = pool[(Math.random()*pool.length)|0]; if (!out.includes(k)) out.push(k); }
  return out;
}
export function openPick(){
  pickOpts = rollPicks(); if (!pickOpts.length){ pickQ = 0; return; }
  picking = true; pauseOn();
  pickEl.querySelector('.pk-lv').textContent = `LV ${level - pickQ + 1}`;
  const row = pickEl.querySelector('.pk-row'); row.innerHTML = '';
  pickOpts.forEach((k, i) => {
    const u = RUP[k], b = document.createElement('button');
    b.type = 'button'; b.className = 'pk-card' + (u.sp ? ' sp' : '') + (k === 'ring' ? ' rg' : '');
    b.innerHTML = `<span class="pk-key">${i + 1}</span><span class="pk-tag">${u.tag}</span><b>${u.ko}</b><span class="pk-d">${u.d(rup[k])}</span><span class="pk-pips">${'■'.repeat(rup[k] + 1)}${'□'.repeat(u.max - rup[k] - 1)}</span>`;
    b.addEventListener('click', () => choosePick(i));
    row.appendChild(b);
  });
  pickEl.hidden = false; row.children[0]?.focus?.({ preventScroll:true });
}
function choosePick(i){
  const k = pickOpts[i]; if (!k || !picking) return;
  rup[k]++;
  if (k === 'ring'){ const r = newRing(revs.length); r.x = origin.x; r.y = origin.y - 30; revs.push(r); ring(r.x, r.y, 4, 60, .4, [241,236,224], 3); }
  logEvent(`${RUP[k].ko}${RUP[k].max > 1 ? ' ' + rup[k] : ''}`, RUP[k].d(rup[k] - 1), k === 'ring' ? [241,236,224] : RUP[k].sp ? [216,57,43] : [232,163,61]);
  pickQ--; closePick();
}
export function closePick(){
  if (!pickEl) return;
  picking = false; pickEl.hidden = true;
  if (panelEl.hidden && invEl.hidden) setPaused(false);
}

// runs once at boot, from main.js, in the original file order
export function setup(){
  addEventListener('keydown', e => {
    if (!picking) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= pickOpts.length){ e.stopImmediatePropagation(); e.preventDefault(); choosePick(n - 1); }
  }, true);
}
