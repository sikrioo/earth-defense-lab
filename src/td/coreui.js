/* ---------- fortress mode: the energy-core dialog — pick which turret gets the core, or keep it for later ---------- */
import { CORES, TIERS } from './data.js';
import { G } from './state.js';
import { coreUseful, drawTurretIcon, installCore, levelOf, slotsOf, turrets } from './turrets.js';
import { coreIcon } from './mining.js';

const el = document.getElementById('coredlg'), list = el.querySelector('.cd-list');
let current = null;

const rgbs = c => `rgb(${c})`;
export function openCoreDialog(){
  if (!G.cores.length) return false;
  current = G.cores[G.cores.length - 1];
  const C = CORES[current];
  G.coreOpen = true; el.hidden = false; el.style.setProperty('--c', rgbs(C.col));
  const cv = el.querySelector('.cd-core canvas'), g = cv.getContext('2d'); g.clearRect(0, 0, 96, 96); coreIcon(g, current, 48, 48, 26);
  el.querySelector('.cd-name').textContent = C.ko;
  el.querySelector('.cd-desc').textContent = C.d;
  el.querySelector('.cd-store').textContent = G.cores.length > 1 ? `보관 중인 코어 ${G.cores.length}개 중 하나` : '';
  list.innerHTML = '';
  for (const t of [...turrets].sort((a, b) => levelOf(b) - levelOf(a))){
    const n = slotsOf(t), full = t.cores.length >= n, useful = coreUseful(t, current), lv = levelOf(t);
    const next = n < 3 ? `강화 ${TIERS[n]}회면 슬롯 ${n + 1}개` : '';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'cd-row'; b.style.setProperty('--t', rgbs(t.T.col));
    b.disabled = full || !useful;
    b.innerHTML = `<canvas width="88" height="88" aria-hidden="true"></canvas><span><b>${t.T.ko}</b> <small>+${lv} · ${!useful ? '이 코어는 효과 없음' : full ? `슬롯 가득${next ? ' · ' + next : ''}` : `빈 슬롯 ${n - t.cores.length}${next ? ' · ' + next : ''}`}</small></span>
      <span class="cd-slots" aria-label="코어 슬롯 ${t.cores.length}/${n}">${Array.from({ length:n }, (_, i) => t.cores[i] ? `<i class="on" style="--k:${rgbs(CORES[t.cores[i]].col)}"></i>` : '<i></i>').join('')}</span>`;
    drawTurretIcon(b.querySelector('canvas'), t.type);
    b.addEventListener('click', () => fit(t));
    list.appendChild(b);
  }
  (list.querySelector('button:not(:disabled)') || el.querySelector('.cd-keep')).focus({ preventScroll:true });
  return true;
}
function fit(t){
  if (!installCore(t, current)) return;
  G.cores.splice(G.cores.lastIndexOf(current), 1);
  close();
}
function close(){ el.hidden = true; G.coreOpen = false; current = null; }
el.querySelector('.cd-keep').addEventListener('click', close);
addEventListener('keydown', e => { if (G.coreOpen && e.key === 'Escape'){ e.stopImmediatePropagation(); close(); } }, true);

// test bots: fit into the most upgraded turret that has room and can use it
export function autoFitCores(){
  for (let i = G.cores.length - 1; i >= 0; i--){
    const c = G.cores[i], t = [...turrets].sort((a, b) => levelOf(b) - levelOf(a)).find(x => x.cores.length < slotsOf(x) && coreUseful(x, c));
    if (t){ installCore(t, c); G.cores.splice(i, 1); }
  }
}
export const resetCoreUi = close;
