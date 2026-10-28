/* ---------- fortress mode: energy → pick one of three cards (new turret, turret upgrade, fortress) ---------- */
import { ENERGY, FORT, FORT_UPG, TURRET, UPG } from './data.js';
import { G } from './state.js';
import { addTurret, applyUpgrade, drawTurretIcon, turrets } from './turrets.js';

const el = document.getElementById('pick'), row = el.querySelector('.pk-row');
let options = [];
export const needFor = picks => Math.round(ENERGY.first + picks*ENERGY.step*Math.pow(ENERGY.grow, picks));
const fortLv = {};
export function resetCards(){ for (const k in fortLv) delete fortLv[k]; options = []; el.hidden = true; G.picking = false; }

function pool(){
  const out = [];
  const owned = new Set(turrets.map(t => t.type));
  if (turrets.length < FORT.mounts)
    for (const k in TURRET) if (!owned.has(k)) out.push({ kind:'new', type:k, w:turrets.length < 3 ? 2.2 : 1 });
  for (const t of turrets) for (const u of UPG[t.type]) if ((t.lv[u.id] || 0) < u.max) out.push({ kind:'up', t, u, w:u.max === 1 ? .7 : 1.2 });
  for (const f of FORT_UPG) if ((fortLv[f.id] || 0) < f.max) out.push({ kind:'fort', f, w:.45 });
  return out;
}
function roll(){
  const p = pool(), out = [];
  while (out.length < 3 && p.length){
    const tot = p.reduce((a, o) => a + o.w, 0); let r = Math.random()*tot, i = 0;
    for (; i < p.length - 1; i++) if ((r -= p[i].w) <= 0) break;
    out.push(p.splice(i, 1)[0]);
  }
  return out;
}
export function checkEnergy(){
  if (G.picking || G.phase === 'over' || G.phase === 'win') return;
  if (G.energy >= G.need){ G.energy -= G.need; G.picks++; G.need = needFor(G.picks); open(); }
}
export function open(){
  options = roll(); if (!options.length) return;
  G.picking = true; row.innerHTML = '';
  options.forEach((o, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'card';
    let col, tag, title, sub, desc, pips = '';
    if (o.kind === 'new'){ const T = TURRET[o.type]; col = T.col; tag = 'NEW TURRET'; title = T.ko; sub = T.en; desc = T.desc; }
    else if (o.kind === 'up'){ const T = o.t.T, n = o.t.lv[o.u.id] || 0; col = T.col; tag = o.u.max === 1 ? 'CORE' : 'UPGRADE'; title = o.u.ko; sub = T.ko; desc = o.u.d; pips = '◆'.repeat(n + 1) + '◇'.repeat(o.u.max - n - 1); }
    else { const n = fortLv[o.f.id] || 0; col = [120,255,190]; tag = 'FORTRESS'; title = o.f.ko; sub = '요새'; desc = o.f.d; pips = '◆'.repeat(n + 1) + '◇'.repeat(o.f.max - n - 1); }
    b.style.setProperty('--c', `rgb(${col})`);
    if (o.kind === 'up' && o.u.max === 1) b.classList.add('core');
    b.innerHTML = `<span class="ck">${i + 1}</span><canvas width="112" height="112" aria-hidden="true"></canvas>
      <span class="ctxt"><span class="ctag">${tag}</span><b>${title}</b><span class="csub">${sub}</span><span class="cdesc">${desc}</span>${pips ? `<span class="cpips">${pips}</span>` : ''}</span>`;
    const cv = b.querySelector('canvas');
    if (o.kind === 'fort') drawFortIcon(cv); else drawTurretIcon(cv, o.kind === 'new' ? o.type : o.t.type);
    b.addEventListener('click', () => choose(i));
    row.appendChild(b);
  });
  el.hidden = false; el.querySelector('.pk-title').textContent = G.picks === 1 ? 'FIRST UPGRADE' : 'ENERGY FULL';
  row.firstChild.focus({ preventScroll:true });
}
export function choose(i){
  const o = options[i]; if (!o || !G.picking) return;
  if (o.kind === 'new') addTurret(o.type);
  else if (o.kind === 'up') applyUpgrade(o.t, o.u);
  else {
    fortLv[o.f.id] = (fortLv[o.f.id] || 0) + 1;
    if (o.f.id === 'f_hp'){ G.hpMax = Math.round(G.hpMax*1.2); G.hp = Math.min(G.hpMax, G.hp + G.hpMax*.3); }
    if (o.f.id === 'f_regen') G.regen += 3;
    if (o.f.id === 'f_energy') G.energyMul += .2;
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
