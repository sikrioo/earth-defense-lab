/* ---------- fortress mode: the energy-core dialog — read the core, see what links it would make, fit it or keep it ---------- */
import { ELEMENTS, TIERS } from './data.js';
import { G } from './state.js';
import { coreAt, drawTurretIcon, evoOf, installCore, levelOf, slotsOf, turrets } from './turrets.js';
import { LINKS } from './data.js';
import { coreIcon } from './mining.js';
import { affixText, coreCol, coreName, gradeOf, linksOf } from './cores.js';

const el = document.getElementById('coredlg'), list = el.querySelector('.cd-list');
let current = null;
const rgbs = c => `rgb(${c})`;

export function openCoreDialog(){
  if (!G.cores.length) return false;
  current = G.cores[G.cores.length - 1];
  const c = current, gr = gradeOf(c), E = ELEMENTS[c.el];
  G.coreOpen = true; el.hidden = false; el.style.setProperty('--c', rgbs(coreCol(c))); el.style.setProperty('--g', rgbs(gr.col));
  const cv = el.querySelector('.cd-core canvas'), g = cv.getContext('2d'); g.clearRect(0, 0, 96, 96); coreIcon(g, c, 48, 48, 24);
  el.querySelector('.cd-name').innerHTML = `<span class="cd-grade">${gr.ko}</span> ${coreName(c)} <span class="cd-el">${E.ko} · ${E.en}</span>`;
  el.querySelector('.cd-desc').innerHTML = c.affixes.map(a => `<span class="cd-aff${a.fixed ? ' fixed' : ''}">${affixText(a)}</span>`).join('');
  el.querySelector('.cd-store').textContent = G.cores.length > 1 ? `보관 중인 코어 ${G.cores.length}개 중 하나` : '';
  list.innerHTML = '';
  const order = [...turrets].sort((a, b) => levelOf(b) - levelOf(a));
  for (const t of order){
    const n = slotsOf(t), full = t.cores.length >= n, lv = levelOf(t);
    const now = linksOf(t.cores).map(L => L.id), after = linksOf([...t.cores, c]).filter(L => !now.includes(L.id));
    const next = n < 3 ? `강화 ${TIERS[n]}회면 슬롯 ${n + 1}개` : '';
    const status = full ? `슬롯 가득${next ? ' · ' + next : ''}` : `빈 슬롯 ${n - t.cores.length}${next ? ' · ' + next : ''}`;
    const links = [...(t.links || [])].map(id => LINKS.find(L => L.id === id));
    const b = document.createElement('button'); b.type = 'button'; b.className = 'cd-row'; b.style.setProperty('--t', rgbs(t.T.col));
    b.disabled = full;
    b.innerHTML = `<canvas width="88" height="88" aria-hidden="true"></canvas><span><b>${(evoOf(t) || t.T).ko}</b> <small>+${lv} · ${status}</small>
        ${links.length ? `<small class="cd-link">켜진 링크 · ${links.map(L => L.ko).join(' · ')}</small>` : ''}
        ${!full && after.length ? `<small class="cd-new">끼우면 고를 수 있는 링크 · ${after.map(L => `${L.ko} (${L.d})`).join(' · ')}</small>` : ''}</span>
      <span class="cd-slots" aria-label="코어 슬롯 ${t.cores.length}/${n}">${Array.from({ length:n }, (_, i) => coreAt(t, i) ? `<i class="on" style="--k:${rgbs(coreCol(coreAt(t, i)))}"></i>` : '<i></i>').join('')}</span>`;
    drawTurretIcon(b.querySelector('canvas'), t.type, t);
    b.addEventListener('click', () => fit(t));
    list.appendChild(b);
  }
  (list.querySelector('button:not(:disabled)') || el.querySelector('.cd-keep')).focus({ preventScroll:true });
  return true;
}
function fit(t){
  if (!installCore(t, current)) return;
  G.cores.splice(G.cores.indexOf(current), 1);
  close();
}
function close(){ el.hidden = true; G.coreOpen = false; current = null; }
el.querySelector('.cd-keep').addEventListener('click', close);
addEventListener('keydown', e => { if (G.coreOpen && e.key === 'Escape'){ e.stopImmediatePropagation(); close(); } }, true);

// test bots: fit where the core opens the most new links, else into the most upgraded turret with room
export function autoFitCores(){
  for (let i = G.cores.length - 1; i >= 0; i--){
    const c = G.cores[i], room = turrets.filter(x => x.cores.length < slotsOf(x));
    if (!room.length) continue;
    const score = x => (linksOf([...x.cores, c]).length - linksOf(x.cores).length)*100 + levelOf(x);
    const t = room.sort((a, b) => score(b) - score(a))[0];
    installCore(t, c); G.cores.splice(i, 1);
  }
}
export const resetCoreUi = close;
