/* ---------- fortress mode: the armory — every turret's core slots, its link, and the core store ----------
   Tap a turret on the field (or the 코어 button) to open it. Cores can be fitted, taken out or moved between
   slots by tapping or by dragging; whatever is fitted or moved settles for a few seconds before it works.
   One link runs per turret: pick it from the ones its cores allow. The game is paused while this is open. */
import { ELEMENTS, LINKS } from './data.js';
import { G } from './state.js';
import { SYNC, coreAt, drawTurretIcon, evoOf, freeSlots, installCore, levelOf, moveCore, removeCore, setLink, slotsOf, tierOf, turrets } from './turrets.js';
import { coreIcon } from './mining.js';
import { affixText, coreCol, coreName, gradeOf, linksOf } from './cores.js';
import { TIERS } from './data.js';

const el = document.getElementById('armory');
const $ = s => el.querySelector(s);
let cur = null, sel = null;          // the turret on show, the selected core
const rgbs = c => `rgb(${c})`;

export function openArmory(t){
  if (!turrets.length) return;
  cur = t && turrets.includes(t) ? t : cur && turrets.includes(cur) ? cur : turrets[0];
  sel = null; G.armoryOpen = true; el.hidden = false; render();
  $('.am-close').focus({ preventScroll:true });
}
export function closeArmory(){ el.hidden = true; G.armoryOpen = false; sel = null; }
$('.am-close').addEventListener('click', closeArmory);
el.addEventListener('click', e => { if (e.target === el) closeArmory(); });
addEventListener('keydown', e => { if (G.armoryOpen && e.key === 'Escape'){ e.stopImmediatePropagation(); closeArmory(); } }, true);

function chip(c){
  const b = document.createElement('button'); b.type = 'button'; b.className = 'am-core' + (sel === c ? ' sel' : '');
  b.dataset.id = c.id; b.style.setProperty('--k', rgbs(coreCol(c))); b.style.setProperty('--g', rgbs(gradeOf(c).col));
  b.setAttribute('aria-label', `${gradeOf(c).ko} ${coreName(c)}`);
  b.innerHTML = `<canvas width="128" height="128"></canvas>${c.sync > 0 ? `<span class="am-sync">안정화 ${c.sync.toFixed(1)}s</span>` : ''}`;
  coreIcon(b.querySelector('canvas').getContext('2d'), c, 64, 64, 30);
  return b;
}
const where = c => cur.cores.includes(c) ? 'slot' : G.cores.includes(c) ? 'store' : null;

function render(){
  if (!cur) return;
  // turret tabs
  const tabs = $('.am-turrets'); tabs.innerHTML = '';
  for (const t of turrets){
    const b = document.createElement('button'); b.type = 'button'; b.className = 'am-tab'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', t === cur);
    b.style.setProperty('--t', rgbs(t.T.col));
    b.innerHTML = `<canvas width="72" height="72"></canvas><span>${(evoOf(t) || t.T).ko}</span><em>MK ${['I', 'II', 'III'][tierOf(t) - 1]} · ${t.cores.length}/${slotsOf(t)}</em>`;
    drawTurretIcon(b.querySelector('canvas'), t.type);
    b.addEventListener('click', () => { cur = t; sel = null; render(); });
    tabs.appendChild(b);
  }
  const box = $('.am-turret'); box.style.setProperty('--t', rgbs(cur.T.col));
  const n = slotsOf(cur), lv = levelOf(cur);
  $('.am-title').innerHTML = `<b>${(evoOf(cur) || cur.T).ko}</b><span>MK ${['I', 'II', 'III'][tierOf(cur) - 1]} · +${lv} · 슬롯 ${n}/3</span>`;
  // slots with the link chain between them
  const slots = $('.am-slots'); slots.innerHTML = '';
  const live = cur.links && cur.links.size;
  for (let i = 0; i < 3; i++){
    if (i){ const ch = document.createElement('i'); ch.className = 'am-chain' + (live && i < n ? ' on' : ''); slots.appendChild(ch); }
    const s = document.createElement('div'); s.className = 'am-slot'; s.dataset.slot = i;
    if (i >= n){ s.classList.add('locked'); s.textContent = `강화 ${TIERS[i]}회 · MK ${['I', 'II', 'III'][i]}에 열림`; }
    else { const c = coreAt(cur, i); if (c) s.appendChild(chip(c)); else s.innerHTML = '<span class="am-empty">빈 슬롯</span>'; }
    slots.appendChild(s);
  }
  // links: the one running (pick another if several are possible); ones still settling shown faded
  const lk = $('.am-links'); lk.innerHTML = '';
  const later = linksOf(cur.cores).filter(L => !cur.linkOpts.some(o => o.id === L.id));
  if (!cur.linkOpts.length && !later.length) lk.textContent = '켜진 링크 없음 · 속성 조합이 맞으면 켜져요 (도감 › 코어)';
  for (const L of cur.linkOpts){
    const b = document.createElement('button'); b.type = 'button'; b.className = 'am-link'; b.setAttribute('aria-pressed', cur.links.has(L.id));
    b.title = L.d; b.textContent = `${L.ko} · ${L.els.map(k => ELEMENTS[k].ko).join('+')}`;
    b.addEventListener('click', () => { setLink(cur, L.id); render(); });
    lk.appendChild(b);
  }
  for (const L of later){ const b = document.createElement('span'); b.className = 'am-link later'; b.textContent = `${L.ko} (안정화 뒤)`; lk.appendChild(b); }
  if (cur.links.size){ const L = LINKS.find(x => cur.links.has(x.id)); const p = document.createElement('span'); p.style.flexBasis = '100%'; p.style.textAlign = 'center'; p.textContent = L.d; lk.appendChild(p); }
  // selected core
  const d = $('.am-detail'); d.innerHTML = '';
  const w = sel && where(sel);
  if (!w){ sel = null; d.className = 'am-detail none'; d.textContent = '코어를 탭하면 옵션이 보여요'; }
  else {
    d.className = 'am-detail';
    const gr = gradeOf(sel), E = ELEMENTS[sel.el];
    d.innerHTML = `<canvas width="104" height="104"></canvas><div><b style="color:${rgbs(gr.col)}">${gr.ko}</b> <b>${coreName(sel)}</b> <span style="color:${rgbs(E.col)}">${E.ko}</span>${sel.sync > 0 ? ` <span style="color:#ffd36a">· 안정화 ${sel.sync.toFixed(1)}초</span>` : ''}
      ${sel.affixes.map(a => `<span class="aff${a.fixed ? ' fixed' : ''}">${affixText(a)}</span>`).join('')}</div>`;
    coreIcon(d.querySelector('canvas').getContext('2d'), sel, 52, 52, 24);
    const btn = document.createElement('button'); btn.type = 'button';
    if (w === 'slot'){ btn.textContent = '빼기'; btn.addEventListener('click', () => { G.cores.push(removeCore(cur, sel)); render(); }); }
    else { btn.textContent = '끼우기'; btn.className = 'primary'; btn.disabled = !freeSlots(cur).length; btn.addEventListener('click', () => equip(sel, freeSlots(cur)[0])); }
    d.appendChild(btn);
  }
  // the store
  $('.am-count').textContent = `${G.cores.length}개`;
  const chips = $('.am-chips'); chips.innerHTML = '';
  for (const c of G.cores) chips.appendChild(chip(c));
}
function equip(c, slot){
  if (slot === undefined) return;
  const i = G.cores.indexOf(c); if (i < 0) return;
  if (installCore(cur, c, slot)) G.cores.splice(i, 1);
  render();
}
const findCore = id => cur.cores.find(c => c.id === id) || G.cores.find(c => c.id === id);

/* ----- drag and drop (pointer events, so it works with a finger too) ----- */
let drag = null;
el.addEventListener('pointerdown', e => {
  const b = e.target.closest('.am-core'); if (!b) return;
  drag = { c:findCore(+b.dataset.id), x:e.clientX, y:e.clientY, ghost:null, b }; b.setPointerCapture(e.pointerId);
});
el.addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.ghost && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6){
    drag.ghost = drag.b.cloneNode(true); drag.ghost.classList.add('am-ghost'); document.body.appendChild(drag.ghost);
    const src = drag.b.querySelector('canvas'), dst = drag.ghost.querySelector('canvas'); dst.getContext('2d').drawImage(src, 0, 0);
  }
  if (drag.ghost){
    drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px';
    const t = dropTarget(e); el.querySelectorAll('.drop').forEach(x => x.classList.remove('drop')); if (t) t.classList.add('drop');
  }
});
function dropTarget(e){
  const under = document.elementsFromPoint(e.clientX, e.clientY);
  for (const u of under){
    const s = u.closest && u.closest('.am-slot');
    if (s && !s.classList.contains('locked') && !coreAt(cur, +s.dataset.slot)) return s;
    const st = u.closest && u.closest('[data-drop="store"]'); if (st) return st;
  }
  return null;
}
el.addEventListener('pointerup', e => {
  if (!drag) return;
  const { c, ghost } = drag; drag = null;
  el.querySelectorAll('.drop').forEach(x => x.classList.remove('drop'));
  if (!ghost){ sel = sel === c ? null : c; render(); return; }      // a tap: select
  ghost.remove();
  const t = dropTarget(e); if (!t || !c) return;
  if (t.classList.contains('am-slot')){
    const slot = +t.dataset.slot;
    if (where(c) === 'store') equip(c, slot);
    else if (where(c) === 'slot'){ moveCore(cur, c, slot); render(); }
  } else if (where(c) === 'slot'){ G.cores.push(removeCore(cur, c)); render(); }
});
el.addEventListener('pointercancel', () => { if (drag && drag.ghost) drag.ghost.remove(); drag = null; });
export { SYNC };
