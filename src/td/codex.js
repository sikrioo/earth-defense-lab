/* ---------- fortress mode: the codex — every gun (strengths, trade-off, stats, cards) and every enemy met so far ---------- */
import { CORES, ORE, ROCK, TURRET, UPG, WAVES } from './data.js';
import { coreIcon, drawOreIcon, drawWorkerIcon } from './mining.js';
import { G } from './state.js';
import { drawTurretIcon } from './turrets.js';
import { drawRockIcon } from './enemies.js';

const KEY = 'edl.codex.v1';
const seen = new Set();
try { for (const k of JSON.parse(localStorage.getItem(KEY) || '[]')) seen.add(k); } catch (_){ /* private mode: start empty */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...seen])); } catch (_){ /* fine */ } };

const el = document.getElementById('codex'), list = document.getElementById('cxlist'), toastEl = document.getElementById('toast');
let tab = 'weapons', toastT = null;

// first time a rock type shows up: remember it and say so
export function discover(type){
  if (seen.has(type)) return;
  seen.add(type); save();
  toastEl.innerHTML = `<b>도감 등록</b>${ROCK[type].ko}`; toastEl.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

const f1 = v => (Math.round(v*10)/10).toString();
function statRows(type, s){
  switch (type){
    case 'gatling': return [['피해', f1(s.dmg)], ['연사', `초당 ${f1(s.rate)}발`], ['사거리', s.range], ['과열', `약 ${f1(100/(s.heatPer*s.rate))}초 연사 → ${f1(s.cool)}초 휴식`]];
    case 'laser':   return [['초당 피해', `${f1(s.dps)} → 최대 ×${s.rampMax}`], ['전지', `${f1(s.cap)}초`], ['충전', `${f1(s.recharge)}초`], ['사거리', s.range]];
    case 'missile': return [['피해', `${f1(s.dmg)} × ${s.count}발`], ['폭발 반경', s.blast], ['장전', `${f1(s.every)}초`], ['사각지대', `${s.minRange} 이내`]];
    case 'cryo':    return [['피해', f1(s.dmg)], ['감속', `${Math.round(s.slow*100)}% · ${f1(s.slowT)}초`], ['범위', s.radius], ['간격', `${f1(s.every)}초`]];
    case 'tesla':   return [['피해', f1(s.dmg)], ['튀는 횟수', `${s.jumps}번 (-25%씩)`], ['간격', `${f1(s.every)}초`], ['사거리', s.range]];
    case 'drone':   return [['피해', f1(s.dmg)], ['간격', `${f1(s.every)}초`], ['사격 범위', s.radius], ['드론', `${s.drones}대`]];
    case 'rail':    return [['피해', `${s.dmg} · 장갑 무시`], ['충전', `${f1(s.charge)}초`], ['관통', '일직선 전부'], ['조준 고정', `충전 ${Math.round(s.lockAt*100)}%부터`]];
    case 'carrier': return [['피해', `${f1(s.dmg)} × 탄창 ${s.ammo}발`], ['인터셉터', `${s.craft}대`], ['재장전', `${f1(s.rearm)}초`], ['사거리', '화면 전체']];
    case 'flak':    return [['파편', `${f1(s.dmg)} × ${s.frags}개`], ['간격', `${f1(s.every)}초`], ['사거리', s.range], ['퍼짐', `${Math.round(s.spread*57)}°`]];
    case 'storm':   return [['초당 피해', f1(s.dps)], ['반경', Math.round(s.radius)], ['지속', `${f1(s.dur)}초`], ['재사용', `${f1(s.every)}초`]];
    case 'miner':   return droneRows(s);
    case 'flame':   return [['초당 피해', f1(s.dps)], ['화상', `초당 ${s.burn} × 최대 ${s.stacks}중첩`], ['사거리', s.range], ['생체형', `+${Math.round(s.organic*100)}%`]];
  }
  return [];
}
// the wave a rock type first appears in (bosses from their wave, fragments with their parents)
function firstWave(type){
  for (let w = 1; w <= WAVES.last; w++){
    if (WAVES.mix(w).some(([k, n]) => k === type && n > 0) || WAVES.extra(w).includes(type)) return w;
  }
  const parent = { shard:'splitter', spore:'pod' }[type];
  return parent ? firstWave(parent) : null;
}
const KO_KIND = { ore:'일반', crystal:'결정', core:'코어' };
function droneRows(s){ return [['드론', `${s.drones}대`], ['속도', Math.round(s.speed)], ['적재량', `광석 ${f1(s.cap)}`], ['집게 반경', Math.round(s.scoop)], ['운반 가능', s.kinds.map(k => KO_KIND[k]).join(' · ')], ...(s.yield ? [['정제', `+${Math.round(s.yield*100)}%`]] : [])]; }
function section(t){ const h = document.createElement('h3'); h.className = 'cx-sec'; h.textContent = t; list.appendChild(h); }
function item(col, name, en, desc, stats, icon, extra = ''){
  const a = document.createElement('article'); a.className = 'cx-item'; a.style.setProperty('--c', `rgb(${col})`);
  a.innerHTML = `<canvas width="144" height="144" aria-hidden="true"></canvas><div class="cx-body"><div class="cx-top"><b>${name}</b><span class="cx-en">${en}</span></div><p class="cx-desc">${desc}</p>${rows(stats)}${extra}</div>`;
  icon(a.querySelector('canvas')); list.appendChild(a);
}
const rows = r => `<dl class="cx-stats">${r.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;

function render(){
  el.querySelectorAll('.cx-tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab));
  list.innerHTML = '';
  if (tab === 'weapons'){
    for (const k in TURRET){
      const T = TURRET[k], a = document.createElement('article'); a.className = 'cx-item'; a.style.setProperty('--c', `rgb(${T.col})`);
      a.innerHTML = `<canvas width="144" height="144" aria-hidden="true"></canvas><div class="cx-body">
        <div class="cx-top"><b>${T.ko}</b><span class="cx-en">${T.en}</span><span class="cx-role">${T.role}</span></div>
        <p class="cx-desc">${T.desc}</p>
        <ul class="cx-pros">${T.pros.map(p => `<li>${p}</li>`).join('')}</ul>
        <p class="cx-cons"><span>단점</span>${T.cons}</p>
        ${rows(statRows(k, T.base))}
        <details><summary>강화 카드 ${UPG[k].length}종</summary><ul class="cx-ups">${UPG[k].map(u => `<li${u.max === 1 ? ' class="core"' : ''}><b>${u.ko}</b><span>${u.d}</span><em>${u.max === 1 ? '핵심' : '최대 ' + u.max}</em></li>`).join('')}</ul></details>
      </div>`;
      drawTurretIcon(a.querySelector('canvas'), k);
      list.appendChild(a);
    }
  } else if (tab === 'mining'){
    const note = document.createElement('div'); note.className = 'cx-note';
    note.innerHTML = `<p><b>채굴</b> 부서진 운석은 광물을 남기고, 요새로 실어 와야 에너지가 돼요. 방어막 가까이 떠다니는 건 자석이 끌어와요. 드론은 운석에 부딪히면 격추돼 4초 뒤 복귀하고, 싣고 있던 건 그 자리에 떨어져요.</p>
      <p><b>코어 슬롯</b> 처음 1개, 강화 4회에 2개, 8회에 3개. 한 번 끼운 코어는 빼지 못해요.</p>`;
    list.appendChild(note);
    section('채굴 드론');
    const M = TURRET.miner;
    item([200,215,235], '요새 기본 드론', 'BASE', '느리고 조금씩 실어 오는 요새의 일꾼 2대. 일반 광석만 나를 수 있어요.', droneRows(ORE.base), c => drawWorkerIcon(c, [200,215,235], ['ore', 'ore']));
    item(M.col, '채굴기 드론', 'MINER', `채굴기 포탑 하나에 딸린 드론. 빠르고 많이 싣고, 결정 광석과 에너지 코어까지 날라요. 정제기로 실어 온 광석 가치도 올려요.`, droneRows(M.base), c => drawWorkerIcon(c, M.col, ['crystal', 'ore', 'core']),
      `<details><summary>강화 카드 ${UPG.miner.length}종</summary><ul class="cx-ups">${UPG.miner.map(u => `<li${u.max === 1 ? ' class="core"' : ''}><b>${u.ko}</b><span>${u.d}</span><em>${u.max === 1 ? '핵심' : '최대 ' + u.max}</em></li>`).join('')}</ul></details>`);
    section('광물');
    const K = ORE.kinds;
    item(K.ore.col, K.ore.ko, 'ORE', '운석이 부서지면 남는 기본 광물.', [['나오는 곳', K.ore.from], ['사라짐', `${ORE.life}초`], ['운반', '모든 드론']], c => drawOreIcon(c, 'ore'));
    item(K.crystal.col, K.crystal.ko, 'CRYSTAL', '단단한 운석 속의 결정. 조각이 크고 값어치가 높아요.', [['나오는 곳', K.crystal.from], ['가치', `그 운석 몫의 ${Math.round(K.crystal.share*100)}%`], ['사라짐', `${Math.round(ORE.life*1.4)}초`], ['운반', '채굴기 드론만']], c => drawOreIcon(c, 'crystal'));
    section('에너지 코어');
    for (const k in CORES){
      const C = CORES[k];
      item(C.col, C.ko, C.en, C.d, [['나오는 곳', C.boss ? '보스' : '엘리트·보스'], ['운반', '채굴기 드론 · 자석'], ['사라짐', `${ORE.coreLife}초 (천천히 지구 쪽으로 떠내려옴)`]], c => coreIcon(c.getContext('2d'), k, 72, 72, 34));
    }
  } else {
    const n = Object.keys(ROCK).filter(k => seen.has(k)).length;
    const head = document.createElement('p'); head.className = 'cx-count'; head.textContent = `발견 ${n} / ${Object.keys(ROCK).length}`; list.appendChild(head);
    for (const k in ROCK){
      const T = ROCK[k], known = seen.has(k), a = document.createElement('article');
      a.className = 'cx-item' + (known ? '' : ' unknown'); a.style.setProperty('--c', `rgb(${T.col})`);
      const tags = [T.boss && '보스', T.elite && '엘리트', T.organic && '생체형', T.armor && `장갑 ${T.armor}`, T.comet && '고속 직선', T.split && `분열 ×${T.split}`, T.weave && '흔들림'].filter(Boolean);
      const fw = firstWave(k);
      a.innerHTML = `<canvas width="144" height="144" aria-hidden="true"></canvas><div class="cx-body">
        <div class="cx-top"><b>${known ? T.ko : '???'}</b>${known ? tags.map(t => `<span class="cx-role">${t}</span>`).join('') : ''}</div>
        <p class="cx-desc">${known ? T.desc : `아직 만나지 못한 적${fw ? ` · ${fw}웨이브쯤 나타남` : ''}`}</p>
        ${known ? rows([['체력', `${T.hp} (1웨이브 기준)`], ['속도', T.speed], ['요새 피해', T.dmg], ['에너지', T.energy], ['첫 등장', fw ? `${fw}웨이브` : '—']]) : ''}
      </div>`;
      drawRockIcon(a.querySelector('canvas'), k, !known);
      list.appendChild(a);
    }
  }
  list.scrollTop = 0;
}
export function openCodex(which){
  if (which) tab = which;
  G.codexOpen = true; el.hidden = false; render();
  el.querySelector('.cx-close').focus({ preventScroll:true });
}
export function closeCodex(){ G.codexOpen = false; el.hidden = true; }
el.querySelectorAll('.cx-tabs button').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
el.querySelector('.cx-close').addEventListener('click', closeCodex);
el.addEventListener('click', e => { if (e.target === el) closeCodex(); });
addEventListener('keydown', e => { if (G.codexOpen && e.key === 'Escape'){ e.stopImmediatePropagation(); closeCodex(); } }, true);
