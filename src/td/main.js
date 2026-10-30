/* ---------- fortress mode: boot, frame loop, HUD ---------- */
import './style.css';
import { RS, cv, ctx, decayShake, rollShake, shX, shY, tickClock } from '../core/canvas.js';
import { drawParts, parts, setMAXP, updParts } from '../core/particles.js';
import { resetJag, tickBolts } from '../core/lightning.js';
import { FORT, ROCK, TURRET, UPG, WAVES } from './data.js';
import { G, enemies, fx, shots } from './state.js';
import { fitView, V } from './view.js';
import { drawRocks, updRocks } from './enemies.js';
import { bossAlive, startWave, updWaves } from './waves.js';
import { drawBackdrop, drawFortress, invalidateBackdrop, updFortress } from './fortress.js';
import { addTurret, drawTurrets, levelOf, placeTurrets, resetTurrets, turretAt, turrets, updShots, updTurrets } from './turrets.js';
import { checkEnergy, choose, needFor, resetCards, smartPick } from './cards.js';
import { openCodex } from './codex.js';

// test hooks: ?auto=1 picks cards by itself, ?speed=4 runs faster, ?wave=12 starts later
const QS = new URLSearchParams(location.search);
const AUTO = QS.get('auto'), TEST_SPEED = +QS.get('speed') || 0, START_WAVE = Math.max(1, +QS.get('wave') || 1);

const $ = id => document.getElementById(id);
const hud = { wn:$('wn'), wfill:$('wfill'), hpfill:$('hpfill'), hpn:$('hpn'), enfill:$('enfill'), boss:$('boss'), bossName:$('bossname'), bfill:$('bfill'),
  banner:$('banner'), spd:$('spd'), pause:$('pausebtn'), pausebox:$('pausebox'), build:$('build'), over:$('over') };

function newRun(){
  enemies.length = 0; fx.length = 0; parts.length = 0; resetTurrets(); resetCards();
  Object.assign(G, { phase:'wave', wave:0, paused:false, picking:false, hp:FORT.hp, hpMax:FORT.hp, regen:0, hitT:0,
    energy:0, picks:0, need:needFor(0), energyMul:1, shatter:0, kills:0, runTime:0, banner:null, bannerT:0 });
  addTurret('gatling');
  hud.over.hidden = true; hud.pausebox.hidden = true;
  startWave(START_WAVE);
  if (START_WAVE > 1) for (let i = 0; i < START_WAVE; i++){ G.energy += G.need; checkEnergy(); if (AUTO) choose(AUTO === 'smart' ? smartPick() : 0); }
}

function update(dt){
  updWaves(dt);
  updRocks(dt);
  updTurrets(dt);
  updShots(dt);
  updFortress(dt);
  updParts(dt);
  for (let i = fx.length - 1; i >= 0; i--) if (!fx[i].update(dt)) fx.splice(i, 1);
  G.runTime += dt;
  checkEnergy();
  if (G.picking && AUTO) choose(AUTO === 'smart' ? smartPick() : (Math.random()*3)|0);
  if (G.hp <= 0 && G.phase !== 'over'){ G.phase = 'over'; endRun(false); }
  if (G.phase === 'win' && hud.over.hidden) endRun(true);
  decayShake(dt);
}

function render(){
  rollShake();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = '#04050c'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(RS, 0, 0, RS, RS*shX, RS*shY);
  drawBackdrop();
  ctx.globalCompositeOperation = 'lighter';
  drawFortress(turretAt);
  drawRocks();
  drawTurrets();
  drawParts();
  for (const f of fx) f.draw();
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}

let shown = {};
function drawHud(){
  const set = (k, v, f) => { if (shown[k] !== v){ shown[k] = v; f(v); } };
  set('wn', G.wave, v => hud.wn.textContent = v);
  set('wf', Math.round((G.waveTotal ? G.waveDone/G.waveTotal : 0)*100), v => hud.wfill.style.width = v + '%');
  set('hp', Math.ceil(G.hp), v => { hud.hpn.textContent = v; hud.hpfill.style.width = (v/G.hpMax*100) + '%'; });
  set('hit', G.hitT > .5, v => hud.hpfill.parentNode.classList.toggle('hit', v));
  set('en', Math.round(Math.min(1, G.energy/G.need)*200), v => hud.enfill.style.width = (v/2) + '%');
  const b = bossAlive();
  set('boss', b ? b.T.ko : '', v => { hud.boss.hidden = !v; hud.bossName.textContent = v; });
  if (b) set('bf', Math.round(b.hp/b.max*200), v => hud.bfill.style.width = (v/2) + '%');
  const bn = G.bannerT > 0 && G.banner ? G.banner.title + '|' + G.banner.sub : '';
  set('bn', bn, v => {
    hud.banner.classList.toggle('show', !!v); if (!v) return;
    hud.banner.classList.toggle('warn', G.banner.warn);
    hud.banner.innerHTML = `<b>${G.banner.title}</b>${G.banner.sub ? `<span>${G.banner.sub}</span>` : ''}`;
  });
}

function buildList(){
  if (!turrets.length) return '';
  return turrets.map(t => {
    const ups = UPG[t.type].filter(u => t.lv[u.id]).map(u => `${u.ko}${u.max > 1 ? ' ' + t.lv[u.id] : ''}`).join(' · ') || '강화 없음';
    return `<li style="--c:rgb(${t.T.col})"><b>${t.T.ko}</b> <em>+${levelOf(t)}</em><span>${ups}</span></li>`;
  }).join('');
}
function endRun(win){
  const m = Math.floor(G.runTime/60), s = Math.floor(G.runTime % 60);
  hud.over.querySelector('h2').textContent = win ? 'EARTH HOLDS' : 'FORTRESS DOWN';
  hud.over.querySelector('.osub').textContent = win ? `30웨이브를 모두 막았어요` : `웨이브 ${G.wave}에서 무너졌어요`;
  hud.over.querySelector('.ostats').innerHTML = `<span><b>${G.wave}</b>웨이브</span><span><b>${G.kills}</b>처치</span><span><b>${m}:${String(s).padStart(2, '0')}</b>시간</span>`;
  hud.over.querySelector('.obuild').innerHTML = buildList();
  hud.over.classList.toggle('win', win); hud.over.hidden = false;
}
function setPaused(p){
  G.paused = p; hud.pausebox.hidden = !p; hud.pause.setAttribute('aria-pressed', p);
  if (p) hud.build.innerHTML = buildList() || '<li>포탑 없음</li>';
}

hud.spd.addEventListener('click', () => { G.speed = G.speed === 1 ? 2 : 1; hud.spd.textContent = `×${G.speed}`; hud.spd.setAttribute('aria-pressed', G.speed > 1); });
hud.pause.addEventListener('click', () => setPaused(!G.paused));
$('resume').addEventListener('click', () => setPaused(false));
$('restart').addEventListener('click', () => { setPaused(false); newRun(); });
$('again').addEventListener('click', newRun);
$('codexbtn').addEventListener('click', () => openCodex());
$('pcodex').addEventListener('click', () => openCodex());
addEventListener('keydown', e => {
  if (G.codexOpen) return;
  if (e.key === 'Escape' || e.key === 'p') setPaused(!G.paused);
  if (e.key === 'c') openCodex();
  if (e.key === ' '){ e.preventDefault(); hud.spd.click(); }
});
addEventListener('resize', () => { fitView(); placeTurrets(); invalidateBackdrop(); });

let last = performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const dt = Math.max(0, Math.min(.033, (now - last)/1000)); last = now;   // the first rAF stamp can predate `last`
  resetJag();
  const running = !G.paused && !G.picking && !G.codexOpen && (G.phase === 'wave' || G.phase === 'break');
  if (running){
    const steps = TEST_SPEED || G.speed;
    for (let i = 0; i < steps; i++){ tickClock(dt); tickBolts(dt); update(dt); }
  } else { for (let i = fx.length - 1; i >= 0; i--) if (!fx[i].update(0)) fx.splice(i, 1); }
  render();
  drawHud();
}

setMAXP(innerWidth < 700 ? 900 : 2600);
fitView();
newRun();
requestAnimationFrame(frame);
// for tests and tinkering in the console
window.__td = { G, enemies, turrets, shots, ROCK, TURRET, WAVES, V, addTurret };
