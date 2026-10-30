/* ---------- fortress mode: options — sound volume, screen shake, hit flash, the guide, the saved run ---------- */
import { G } from './state.js';
import { setShakeScale } from '../core/lights.js';
import { getVolume, isMuted, setMuted, setVolume, sfx } from './sfx.js';
import { resetTips, setTipsEnabled } from './tips.js';
import { clearSave, hasSave } from './save.js';

const KEY = 'edl.opts.v1';
export const OPTS = { vol:.8, shake:1, flash:1, tips:1 };
try { Object.assign(OPTS, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (_){ /* defaults */ }
const store = () => { try { localStorage.setItem(KEY, JSON.stringify(OPTS)); } catch (_){ /* fine */ } };
const apply = () => { setVolume(OPTS.vol); setShakeScale(OPTS.shake); setTipsEnabled(!!OPTS.tips); };
apply();

const el = document.getElementById('options'), $ = s => el.querySelector(s);
let onClose = null;
export function openOptions(after){
  onClose = after || null; G.optsOpen = true; el.hidden = false; render();
  $('.op-close').focus({ preventScroll:true });
}
function close(){ el.hidden = true; G.optsOpen = false; if (onClose) onClose(); onClose = null; }
function seg(sel, val){ el.querySelectorAll(`${sel} button`).forEach(b => b.setAttribute('aria-checked', String(+b.dataset.v === val))); }
function render(){
  $('#opvol').value = Math.round(OPTS.vol*100); $('.op-volv').textContent = isMuted() ? '음소거' : `${Math.round(OPTS.vol*100)}%`;
  $('#opmute').setAttribute('aria-pressed', isMuted()); $('#opmute').textContent = isMuted() ? '소리 켜기' : '음소거';
  seg('#opshake', OPTS.shake); seg('#opflash', OPTS.flash); seg('#optips', OPTS.tips);
  $('#opsave').disabled = !hasSave(); $('#opsave').textContent = hasSave() ? '저장된 진행 지우기' : '저장된 진행 없음';
}
$('.op-close').addEventListener('click', close);
el.addEventListener('click', e => { if (e.target === el) close(); });
addEventListener('keydown', e => { if (G.optsOpen && e.key === 'Escape'){ e.stopImmediatePropagation(); close(); } }, true);
$('#opvol').addEventListener('input', e => { OPTS.vol = e.target.value/100; setVolume(OPTS.vol); store(); render(); });
$('#opvol').addEventListener('change', () => sfx.pick());
$('#opmute').addEventListener('click', () => { setMuted(!isMuted()); render(); document.dispatchEvent(new CustomEvent('mute-changed')); });
for (const [id, key] of [['#opshake', 'shake'], ['#opflash', 'flash'], ['#optips', 'tips']])
  $(id).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; OPTS[key] = +b.dataset.v; apply(); store(); render(); });
$('#optipsreset').addEventListener('click', () => { resetTips(); OPTS.tips = 1; apply(); store(); render(); $('#optipsreset').textContent = '처음부터 다시 보여줄게요'; });
$('#opsave').addEventListener('click', () => { clearSave(); render(); });
document.addEventListener('tips-off', () => { OPTS.tips = 0; store(); });
export const resetOptionsUi = () => { el.hidden = true; G.optsOpen = false; };
void getVolume;
