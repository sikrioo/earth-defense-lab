import { enemies } from '../enemies/list.js';
import { restart } from './progress.js';
import { revs } from '../weapons/rings.js';
import { logEvent } from '../ui/deck.js';

/* ---------- MAX sim: every upgrade maxed against the densest field; Earth can't fall so you can watch ---------- */
const SIM_MULT = 4;
export var simMax = false;
   // var: initEnemies can run before this line on first load
export function setSim(on){
  simMax = on; restart();
  const b = document.getElementById('simbtn'); b.textContent = on ? 'MAX 시뮬: 켜짐' : 'MAX 시뮬'; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
  if (on) logEvent('MAX 시뮬레이션', `운석 ${enemies.length} · 링 ${revs.length} · 모든 강화 최대 · 지구 무적`, [216,57,43]);
  else logEvent('MAX 시뮬레이션 종료', '처음 상태로 다시 시작', [241,236,224]);
}
