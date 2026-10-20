/* ---------- class tabs and the manual skill buttons ---------- */
import { CLASSES } from '../skills/index.js';

export let cls = 0, sel = 0;
/* ---------- HUD ---------- */
export const tabsEl = document.getElementById('tabs'), rowEl = document.getElementById('row');
let tabs;
export let btns = [];
export function setClass(i){
  cls = i; sel = Math.min(sel, CLASSES[i].skills.length - 1);
  tabs.forEach((t, k) => t.setAttribute('aria-selected', k === i ? 'true' : 'false'));
  rowEl.innerHTML = '';
  btns = CLASSES[i].skills.map((s, k) => {
    const b = document.createElement('button');
    b.className = 'spell e-' + s.elem; b.type = 'button'; b.id = `spell-${CLASSES[i].id}-${k}`;
    b.innerHTML = `<kbd>${(k+1) % 10}</kbd><span class="gem"></span><span class="ko">${s.ko}</span><span class="en">${s.en}</span><span class="mp">${Math.round(6 + s.cd*18)}</span><span class="cd"></span>`;
    b.addEventListener('click', () => select(k)); rowEl.appendChild(b); return b;
  });
  select(sel);
}
export function select(k){ sel = k; btns.forEach((b, j) => b.setAttribute('aria-pressed', j === k ? 'true' : 'false')); }

// runs once at boot, from main.js, in the original file order
export function setup(){
  CLASSES.forEach(c => c.skills.forEach(s => s.cdLeft = 0));
  tabs = CLASSES.map((c, i) => {
    const b = document.createElement('button');
    b.className = 'tab'; b.type = 'button'; b.id = 'tab-' + c.id; b.setAttribute('role', 'tab');
    b.innerHTML = `<span class="en">${c.en}</span><span class="ko">${c.ko}</span><kbd>${c.key.toUpperCase()}</kbd>`;
    b.addEventListener('click', () => setClass(i)); tabsEl.appendChild(b); return b;
  });
  setClass(0);
}
