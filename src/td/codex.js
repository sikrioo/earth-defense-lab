/* ---------- fortress mode: the codex — every gun (strengths, trade-off, stats, cards) and every enemy met so far ---------- */
import { ROCK, TURRET, UPG, WAVES } from './data.js';
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
