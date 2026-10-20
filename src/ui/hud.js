import { bar } from '../core/canvas.js';
import { ECOL } from '../data/enemy-types.js';
import { earth } from '../world/earth.js';
import { earthMax } from '../loot/items.js';
import { CLASSES } from '../skills/index.js';
import { cls, rowEl, sel } from './skillbar.js';
import { invEl, panelEl } from './deck.js';

/* ---------- Diablo-style orbs in a brass revolver-cylinder bezel + mana + the manual-skill picker ---------- */
export const MANA_MAX = 100, MANA_REGEN = 8;
export let mana = MANA_MAX, mpDirty = true, noManaT = 0;
export function setMana(v){ return mana = v; }
export function setNoManaT(v){ return noManaT = v; }
export const manaCost = s => Math.round(6 + s.cd*18);
const gHp = document.getElementById('g-hp'), gMp = document.getElementById('g-mp');
const hpFill = document.getElementById('hpfill'), mpFill = document.getElementById('mpfill');
export const mpT = document.getElementById('mpt'), mskill = document.getElementById('mskill'), skillPop = document.getElementById('skillpop');
export const orbState = { hp:{ hit:0, v:-1 }, mp:{ hit:0, v:-1 } };
function gauge(el, fill, st, f){
  const v = Math.round(Math.max(0, Math.min(1, f))*200)/200;
  if (st.v !== v){ st.v = v; fill.style.transform = `scaleX(${v})`; el.classList.toggle('low', v < .3); }
  if (st.hit > 0){ el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); st.hit = 0; }
}
export function drawOrbs(){ gauge(gHp, hpFill, orbState.hp, earth.hp/earthMax()); gauge(gMp, mpFill, orbState.mp, mana/MANA_MAX); }
/* manual skill tag + picker */
let mskillKey = '';
export function renderMskill(){
  const s = CLASSES[cls].skills[sel], c = ECOL[s.elem] || [220,220,220], key = cls + ':' + sel;
  if (key !== mskillKey){
    mskillKey = key;
    mskill.style.setProperty('--c', `rgb(${c})`);
    mskill.innerHTML = `<span class="tl">SKILL <kbd>S</kbd></span><b>${s.ko}</b><span class="mcost">MP ${manaCost(s)}</span><i class="mcd"></i>`;
    mskill.setAttribute('aria-label', `수동 스킬: ${s.ko}, 마나 ${manaCost(s)}. 눌러서 바꾸기`);
  }
  const cdv = Math.round(s.cdLeft/s.cd*20)/20;
  if (mskill._cd !== cdv){ mskill._cd = cdv; mskill.lastChild.style.transform = `scaleX(${cdv})`; }
  mskill.classList.toggle('dry', mana < manaCost(s));
}
function placePop(){ skillPop.style.bottom = `${(bar.offsetHeight || 140) + 6}px`; }
function openPop(){ placePop(); skillPop.hidden = false; mskill.setAttribute('aria-expanded', 'true'); }
function closePop(){ skillPop.hidden = true; mskill.setAttribute('aria-expanded', 'false'); }

// runs once at boot, from main.js, in the original file order
export function setup(){
  mskill.addEventListener('click', () => skillPop.hidden ? openPop() : closePop());
  rowEl.addEventListener('click', ev => { if (ev.target.closest('.spell')) closePop(); });
  skillPop.querySelector('.popclose').addEventListener('click', closePop);
  addEventListener('pointerdown', ev => { if (!skillPop.hidden && !skillPop.contains(ev.target) && !mskill.contains(ev.target)) closePop(); }, true);
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && !skillPop.hidden){ closePop(); return; }
    if ((e.key === 's' || e.key === 'S') && panelEl.hidden && invEl.hidden){ skillPop.hidden ? openPop() : closePop(); }
  });
}
