/* ---------- fortress mode: energy → pick one of three cards (new turret, turret upgrade, fortress) ---------- */
import { ENERGY, EVO, FORT_UPG, TURRET, UPG } from './data.js';
import { G } from './state.js';
import { V } from './view.js';
import { sfx } from './sfx.js';
import { addTurret, applyUpgrade, drawTurretIcon, evolve, levelOf, tierOf, turrets } from './turrets.js';
import { TIERS } from './data.js';

const el = document.getElementById('pick'), row = el.querySelector('.pk-row');
let options = [];
export const needFor = picks => Math.round(ENERGY.first + picks*ENERGY.step*Math.pow(ENERGY.grow, picks));
const fortLv = {};
export function resetCards(){ for (const k in fortLv) delete fortLv[k]; options = []; el.hidden = true; G.picking = false; }

function pool(){
  const out = [];
  const owned = new Set(turrets.map(t => t.type));
  // new turrets are the rare card: none for the first two picks, then one shared weight for all of them
  // (so at most one new-turret card shows up at a time) that shrinks as the platform fills;
  // a wider view with lots of empty pads makes them a little more likely again
  const free = V.mounts.length - turrets.length;
  if (free > 0 && G.picks > 2){
    const types = Object.keys(TURRET).filter(k => !owned.has(k));
    const w = (turrets.length === 1 ? 2 : turrets.length === 2 ? 1 : .5) + (V.mode !== 'line' && free > V.mounts.length/2 ? .5 : 0);
    if (types.length) out.push({ kind:'new', types, w });
  }
  for (const t of turrets) for (const u of UPG[t.type]) if ((t.lv[u.id] || 0) < u.max) out.push({ kind:'up', t, u, w:u.max === 1 ? .7 : 1.2 });
  for (const f of FORT_UPG) if ((fortLv[f.id] || 0) < f.max) out.push({ kind:'fort', f, w:.45 });
  return out;
}
function roll(onlyNew){
  if (onlyNew){
    const owned = new Set(turrets.map(t => t.type)), types = Object.keys(TURRET).filter(k => !owned.has(k)).sort(() => Math.random() - .5);
    return V.mounts.length > turrets.length ? types.slice(0, 3).map(type => ({ kind:'new', type })) : [];
  }
  const p = pool(), out = [];
  while (out.length < 3 && p.length){
    const tot = p.reduce((a, o) => a + o.w, 0); let r = Math.random()*tot, i = 0;
    for (; i < p.length - 1; i++) if ((r -= p[i].w) <= 0) break;
    const o = p.splice(i, 1)[0];
    out.push(o.kind === 'new' ? { kind:'new', type:o.types[(Math.random()*o.types.length)|0] } : o);
  }
  return out;
}
export function checkEnergy(){
  if (G.picking || G.coreOpen || G.phase === 'over' || G.phase === 'win') return;
  if (G.energy >= G.need){ G.energy -= G.need; G.picks++; G.need = needFor(G.picks); open(); }
}
// evolution: a turret just reached Mk III — pick one of its two paths
export function openEvo(t){ return open(false, t); }
export function open(onlyNew = false, evoT = null){
  options = evoT ? EVO[evoT.type].map(e => ({ kind:'evo', t:evoT, e })) : roll(onlyNew); if (!options.length) return false;
  G.picking = true; row.innerHTML = ''; sfx.card();
  options.forEach((o, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'card';
    let col, tag, title, sub, desc, pips = '';
    if (o.kind === 'new'){ const T = TURRET[o.type]; col = T.col; tag = 'NEW TURRET'; title = T.ko; sub = `${T.en} · ${T.role}`; desc = `${T.desc}<span class="ccons">단점 · ${T.cons}</span>`; }
    else if (o.kind === 'evo'){ const T = o.t.T; col = T.col; tag = 'EVOLUTION'; title = o.e.ko; sub = `${T.ko} → ${o.e.en}`; desc = o.e.d; }
    else if (o.kind === 'up'){ const T = o.t.T, n = o.t.lv[o.u.id] || 0, lv = levelOf(o.t), tr = tierOf(o.t), next = TIERS[tr];
      col = T.col; tag = o.u.max === 1 ? 'KEY UPGRADE' : 'UPGRADE'; title = o.u.ko; desc = o.u.d;
      sub = `${T.ko} · MK ${['I', 'II', 'III'][tr - 1]}${next ? ` · MK ${['I', 'II', 'III'][tr]}까지 ${next - lv}` : ''}`; pips = '◆'.repeat(n + 1) + '◇'.repeat(o.u.max - n - 1); }
    else { const n = fortLv[o.f.id] || 0; col = [120,255,190]; tag = 'FORTRESS'; title = o.f.ko; sub = '요새'; desc = o.f.d; pips = '◆'.repeat(n + 1) + '◇'.repeat(o.f.max - n - 1); }
    b.style.setProperty('--c', `rgb(${col})`);
    if ((o.kind === 'up' && o.u.max === 1) || o.kind === 'evo') b.classList.add('core');
    b.innerHTML = `<span class="ck">${i + 1}</span><canvas width="112" height="112" aria-hidden="true"></canvas>
      <span class="ctxt"><span class="ctag">${tag}</span><b>${title}</b><span class="csub">${sub}</span><span class="cdesc">${desc}</span>${pips ? `<span class="cpips">${pips}</span>` : ''}</span>`;
    const cv = b.querySelector('canvas');
    if (o.kind === 'fort') drawFortIcon(cv); else drawTurretIcon(cv, o.kind === 'new' ? o.type : o.t.type);
    b.addEventListener('click', () => choose(i));
    row.appendChild(b);
  });
  el.hidden = false; el.querySelector('.pk-title').textContent = evoT ? 'MK III · EVOLUTION' : onlyNew ? 'NEW PADS ONLINE' : G.picks === 1 ? 'FIRST UPGRADE' : 'ENERGY FULL';
  row.firstChild.focus({ preventScroll:true });
}
// test bot that plays like a focused player: a few turrets, stack their upgrades, take core cards
export function smartPick(){
  const score = o => {
    if (o.kind === 'evo') return 5;
    if (o.kind === 'new' && o.type === 'miner') return turrets.length >= 2 ? 3.6 : 1;
    if (o.kind === 'new') return turrets.length < 3 ? 4 : V.mode !== 'line' && turrets.length < V.mounts.length*.6 ? 3 : .6;
    if (o.kind === 'fort') return o.f.id === 'f_hp' && G.hp < G.hpMax*.5 ? 4 : o.f.id === 'f_energy' && G.picks < 8 ? 2.5 : .8;
    if (o.u.max === 1) return 5;
    const lv = Object.values(o.t.lv).reduce((a, b) => a + b, 0);
    return 2.5 + lv*.4 + (/dmg|dps|rate|count|chain|twin|split|drone|craft|frags/.test(o.u.id) ? 1 : 0);
  };
  let best = 0; options.forEach((o, i) => { if (score(o) > score(options[best])) best = i; });
  return best;
}
export function choose(i){
  const o = options[i]; if (!o || !G.picking) return;
  sfx.pick();
  if (o.kind === 'evo'){ evolve(o.t, o.e.id); el.hidden = true; G.picking = false; options = []; checkEnergy(); return; }
  if (o.kind === 'new') addTurret(o.type);
  else if (o.kind === 'up') applyUpgrade(o.t, o.u);
  else {
    fortLv[o.f.id] = (fortLv[o.f.id] || 0) + 1;
    if (o.f.id === 'f_hp'){ G.hpMax = Math.round(G.hpMax + 1000*.15); G.hp = Math.min(G.hpMax, G.hp + G.hpMax*.3); }
    if (o.f.id === 'f_regen') G.regen += 2;
    if (o.f.id === 'f_energy') G.energyMul += .12;
    if (o.f.id === 'f_magnet') G.magnet *= 1.6;
  }
  el.hidden = true; G.picking = false; options = [];
  checkEnergy();       // a big kill can fill the bar twice
}
function drawFortIcon(cv){
  const g = cv.getContext('2d'), s = cv.width/56; g.setTransform(s, 0, 0, s, 0, 0);
  g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round';
  g.strokeStyle = 'rgba(120,255,190,.25)'; g.lineWidth = 6; g.beginPath(); g.moveTo(28, 10); g.lineTo(44, 16); g.lineTo(42, 34); g.lineTo(28, 46); g.lineTo(14, 34); g.lineTo(12, 16); g.closePath(); g.stroke();
  g.strokeStyle = 'rgb(200,255,230)'; g.lineWidth = 1.6; g.stroke();
  g.beginPath(); g.moveTo(28, 20); g.lineTo(28, 36); g.moveTo(20, 28); g.lineTo(36, 28); g.stroke();
}
addEventListener('keydown', e => { if (!G.picking) return; const n = parseInt(e.key, 10); if (n >= 1 && n <= options.length){ e.preventDefault(); choose(n - 1); } });
