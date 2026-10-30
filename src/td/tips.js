/* ---------- fortress mode: first-play guide — a short card the first time each thing happens ----------
   Each tip shows once (remembered in the browser) and pauses the game while it is up. Off in the options. */
import { G } from './state.js';

const KEY = 'edl.tips.v1';
export const TIPS = {
  start:    { t:'지구를 지켜요', d:'포탑은 알아서 쏴요. 운석이 방어막에 닿으면 아래 FORTRESS 체력이 깎이고, 0이 되면 끝나요. 30웨이브를 버티면 이겨요.' },
  ore:      { t:'광석을 실어 와요', d:'부서진 운석은 광석을 남겨요. 드론이 실어 오거나 방어막 자석에 끌려와야 ENERGY가 차요. 오래 두면 타서 사라져요.' },
  card:     { t:'카드 고르기', d:'ENERGY가 가득 차면 카드를 하나 골라요. 처음엔 강화 위주로 나오고, 새 포탑은 가끔 나와요. 강화 6회에 MK II, 14회에 MK III가 돼요.' },
  comet:    { t:'빨간 점선은 혜성 경로', d:'혜성은 경고가 뜬 뒤 엄청 빠르게 돌진해요. 맞으면 크게 깎이니 그쪽 포탑을 키워 두세요.' },
  surge:    { t:'운석 떼', d:'웨이브 중간에 두 방향에서 운석이 한꺼번에 몰려와요. 범위 무기(미사일·테슬라·플락포)가 든든해요.' },
  core:     { t:'에너지 코어', d:'엘리트와 보스가 떨구는 코어를 포탑 슬롯에 끼우면 옵션이 붙어요. 필드의 포탑을 탭하면 코어를 빼고 끼우고 옮길 수 있어요.' },
  mk2:      { t:'MK II · 코어 슬롯과 링크', d:'슬롯이 2개가 되면 코어끼리 연결돼요. 속성 조합(예: 열+냉기)이 맞으면 링크 효과가 켜져요. 포탑을 탭해서 링크를 고르세요.' },
  evo:      { t:'MK III · 진화', d:'포탑이 MK III가 되면 진화 경로 두 개 중 하나를 골라요. 무기의 성격이 크게 바뀌어요.' },
  boss:     { t:'보스', d:'보스는 체력이 많고 졸개를 뿌려요. 위쪽 바에 보스 체력이 보여요. 잡으면 좋은 코어를 떨궈요.' },
  blackhole:{ t:'블랙홀', d:'멈추지 않고 지구로 다가와요. 둘레를 도는 불안정 핵을 모두 부숴야 본체가 7초 동안 드러나요. 방어막에 닿으면 끝이에요.' },
};
const seen = new Set();
try { for (const k of JSON.parse(localStorage.getItem(KEY) || '[]')) seen.add(k); } catch (_){ /* private mode */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...seen])); } catch (_){ /* fine */ } };
let enabled = true, queue = [];
export const setTipsEnabled = v => { enabled = v; if (!v) queue = []; };
export function resetTips(){ seen.clear(); save(); }

export function tip(id){ if (!enabled || seen.has(id) || queue.includes(id) || !TIPS[id]) return; queue.push(id); }
const el = document.getElementById('tip');
// show the next one when nothing else is on screen
export function updTips(free){
  if (G.tipOpen || !queue.length || !free) return;
  const id = queue.shift(); if (seen.has(id)) return;
  seen.add(id); save();
  el.querySelector('b').textContent = TIPS[id].t; el.querySelector('p').textContent = TIPS[id].d;
  G.tipOpen = true; el.hidden = false; el.querySelector('.tip-ok').focus({ preventScroll:true });
}
const close = () => { el.hidden = true; G.tipOpen = false; };
el.querySelector('.tip-ok').addEventListener('click', close);
el.querySelector('.tip-off').addEventListener('click', () => { close(); setTipsEnabled(false); document.dispatchEvent(new CustomEvent('tips-off')); });
export const resetTipUi = close;
