/* ---------- fortress mode: boot, frame loop, HUD ---------- */
import './style.css';
import { RS, ZOOM, cv, ctx, decayShake, rollShake, shX, shY, tickClock } from '../core/canvas.js';
import { drawParts, parts, setMAXP, updParts } from '../core/particles.js';
import { resetJag, tickBolts } from '../core/lightning.js';
import { FORT, LINKS, ORE, ROCK, TURRET, UPG, WAVES } from './data.js';
import { coreName, gradeOf, linksOf, namedCore, rollCore } from './cores.js';
import { G, enemies, fx, shots } from './state.js';
import { MODES, fitView, modeFor, startCamera, tickCamera, V } from './view.js';
import { drawRocks, hurt, spawnRock, updRocks } from './enemies.js';
import { bossAlive, startWave, updWaves } from './waves.js';
import { drawBackdrop, drawFortress, invalidateBackdrop, updFortress } from './fortress.js';
import { addTurret, drawTurrets, evoOf, levelOf, placeTurrets, resetTurrets, tierOf, turretAt, turrets, updShots, updTurrets } from './turrets.js';
import { checkEnergy, choose, needFor, open as openPick, openEvo, resetCards, smartPick } from './cards.js';
import { openCodex } from './codex.js';
import { drawMiners, drawOres, resetMining, sweepOres, updMining } from './mining.js';
import { autoFitCores, openCoreDialog, resetCoreUi } from './coreui.js';
import { closeArmory, openArmory } from './armory.js';
import { resetTipUi, tip, updTips } from './tips.js';
import { OPTS, openOptions } from './options.js';
import { clearSave, readSave, writeSave } from './save.js';
import { getFortLv, setFortLv } from './cards.js';
import { recompute } from './turrets.js';
import { bumpUid } from './cores.js';
import { SECTORS, sectorOf } from './data.js';
import { isMuted, setMuted, sfx } from './sfx.js';

// test hooks: ?auto=1 picks cards by itself, ?speed=4 runs faster, ?wave=12 starts later, ?view=full locks the view
const QS = new URLSearchParams(location.search);
const AUTO = QS.get('auto'), TEST_SPEED = +QS.get('speed') || 0, START_WAVE = Math.max(1, Math.min(30, +QS.get('wave') || 1));
const QS_BOSS = { colossus:10, hive:15, planet:20, saturn:25, blackhole:30 }[QS.get('boss')] || 0;
const QS_VIEW = ['line', 'half', 'full'].includes(QS.get('view')) ? QS.get('view') : null;

const $ = id => document.getElementById(id);
const hud = { wn:$('wn'), wfill:$('wfill'), hpfill:$('hpfill'), hpn:$('hpn'), enfill:$('enfill'), boss:$('boss'), bossName:$('bossname'), bfill:$('bfill'),
  banner:$('banner'), vig:$('vig'), spd:$('spd'), pause:$('pausebtn'), pausebox:$('pausebox'), build:$('build'), over:$('over') };

// the view (line → half → full) follows the wave unless the stage select locked one
const wantView = () => G.viewLock || modeFor(G.wave || 1);
function setView(mode, animate){
  if (mode !== V.mode) sweepOres();       // floating ore is in the old view's coordinates: bank it
  const from = fitView(mode); placeTurrets(); invalidateBackdrop();
  if (animate){ startCamera(from); sfx.view(); const M = MODES[mode]; G.banner = { title:`${M.en}`, sub:`시야 확장 · ${M.ko} 방어 · 포탑 자리 ${M.pads}개 · 새 포탑 1개`, warn:false }; G.bannerT = 2.6; G.bonusPick = true; }
}
// run setup: start = first wave, view = locked view or null for automatic, freePicks = cards handed out for skipped waves
// testRun: bots, URL test options, stage select and boss test are never saved
const QS_TEST = !!(AUTO || QS.get('wave') || QS.get('view') || QS.get('boss'));
function newRun(start = START_WAVE, view = QS_VIEW, freePicks = start > 1, autoPicks = !!AUTO, bossTest = !!QS_BOSS, testRun = QS_TEST){
  enemies.length = 0; fx.length = 0; parts.length = 0; resetTurrets(); resetCards(); resetMining(); resetCoreUi(); closeArmory(); resetTipUi();
  Object.assign(G, { phase:'wave', wave:0, paused:false, picking:false, hp:FORT.hp, hpMax:FORT.hp, regen:0, hitT:0,
    energy:0, picks:0, need:needFor(0), energyMul:1, shatter:0, kills:0, runTime:0, banner:null, bannerT:0, viewLock:view, swallowed:false, bossTest, testRun, savedWave:0, menu:false, god:G.god || false, evoQueue:[], hitStop:0, pickQueue:0, bonusPick:false, cores:[], coreQueue:0, magnet:ORE.magnet });
  G.wave = start; setView(wantView(), false);
  addTurret('gatling');
  hud.over.hidden = true; hud.pausebox.hidden = true;
  startWave(start);
  // skipped waves: the cards you would have earned, one after another (the bots pick for themselves)
  if (freePicks && start > 1){
    if (autoPicks){
      for (let i = 0; i < start; i++){ G.energy += G.need; checkEnergy(); choose(AUTO === 'smart' || !AUTO ? smartPick() : 0); }
      // the new-pad turrets the skipped view changes would have handed out
      for (let i = 0; i < (start > 10) + (start > 20); i++){ openPick(true); choose(smartPick()); }
      for (let i = 0; i < 6 && G.evoQueue.length; i++){ const t = G.evoQueue.shift(); if (!t.evo){ openEvo(t); choose(0); } }
    }
    else G.pickQueue = start;
  }
  if (start === 1 && !testRun) tip('start');
}

/* ----- save and continue: a checkpoint at the start of each wave ----- */
const canSave = () => !G.testRun && !G.god && !AUTO;
function snapshot(){
  return { wave:G.wave,
    G:{ hp:G.hp, hpMax:G.hpMax, regen:G.regen, energy:G.energy, picks:G.picks, need:G.need, energyMul:G.energyMul, magnet:G.magnet, kills:G.kills, runTime:G.runTime },
    fort:getFortLv(), cores:G.cores,
    turrets:turrets.map(t => ({ type:t.type, m:t.m, lv:t.lv, evo:t.evo || null, linkSel:t.linkSel || null, cores:t.cores })) };
}
function continueRun(sv){
  newRun(sv.wave, null, false, false, false, false);
  resetTurrets(); G.evoQueue = [];
  let maxId = 0;
  for (const st of sv.turrets){
    const t = addTurret(st.type, st.m); if (!t) continue;
    t.lv = { ...st.lv }; t.evo = st.evo || undefined; t.linkSel = st.linkSel || null;
    t.cores = st.cores.map(c => ({ ...c, sync:0 })); for (const c of t.cores) maxId = Math.max(maxId, c.id);
    recompute(t);
  }
  G.cores = sv.cores.map(c => ({ ...c, sync:0 })); for (const c of G.cores) maxId = Math.max(maxId, c.id);
  bumpUid(maxId); Object.assign(G, sv.G); setFortLv(sv.fort); G.savedWave = sv.wave;
}

// bots: keep choosing while a dialog is up (a choice can open the next one straight away)
function autoChoose(){ for (let i = 0; i < 6 && G.picking && AUTO; i++) choose(AUTO === 'smart' ? smartPick() : (Math.random()*3)|0); }
function update(dt){
  if (G.god && !G.swallowed) G.hp = G.hpMax;
  updWaves(dt);
  if (G.phase === 'wave' && G.wave !== G.savedWave && canSave()){ G.savedWave = G.wave; writeSave(snapshot()); }
  if (wantView() !== V.mode) setView(wantView(), true);
  updRocks(dt);
  updTurrets(dt);
  updShots(dt);
  updMining(dt);
  updFortress(dt);
  updParts(dt);
  for (let i = fx.length - 1; i >= 0; i--) if (!fx[i].update(dt)) fx.splice(i, 1);
  G.runTime += dt;
  checkEnergy();
  // a turret reached Mk III: offer its evolution
  if (G.evoQueue.length && !G.picking && !G.coreOpen){ const t = G.evoQueue.shift(); if (turrets.includes(t) && !t.evo) openEvo(t); }
  // a core came home (or a turret opened a new slot while cores wait): offer it
  if (G.coreQueue > 0 && !G.picking && !G.coreOpen){ G.coreQueue = 0; if (AUTO) autoFitCores(); else openCoreDialog(); }
  // a wider view comes with a free pick of new turrets for the new pads (once the zoom has settled)
  if (G.bonusPick && !G.picking && V.cam === 1){ G.bonusPick = false; openPick(true); }
  if (!G.picking && G.pickQueue > 0){ G.pickQueue--; G.picks++; G.need = needFor(G.picks); openPick(); }
  autoChoose();
  if (G.hp <= 0 && G.phase !== 'over'){ G.phase = 'over'; endRun(false); }
  if (G.phase === 'win' && hud.over.hidden) endRun(true);
  decayShake(dt);
}

function render(){
  rollShake();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = '#04050c'; ctx.fillRect(0, 0, cv.width, cv.height);
  // camera: during a view change the scene is drawn scaled about Earth, easing out to the new view
  const c = V.cam, ex = V.cx + V.ox, ey = V.cy;
  ctx.setTransform(RS*c, 0, 0, RS*c, RS*(c*shX + ex*(1 - c)), RS*(c*shY + ey*(1 - c)));
  drawBackdrop();
  ctx.globalCompositeOperation = 'lighter';
  drawFortress(turretAt);
  drawRocks();
  drawOres();
  drawTurrets();
  drawMiners();
  drawParts();
  for (const f of fx) f.draw();
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}

let shown = {};
function drawHud(){
  const set = (k, v, f) => { if (shown[k] !== v){ shown[k] = v; f(v); } };
  // vignette: a red flash when the shield is hit, a heartbeat below 30% fortress
  let vig = G.hitT*.55*OPTS.flash;
  if (G.hp > 0 && G.hp < G.hpMax*.3 && G.phase === 'wave'){
    const ph = (G.runTime % 1.1)/1.1, beat = Math.exp(-ph*12) + (ph > .2 ? .7*Math.exp(-(ph - .2)*12) : 0);
    vig = Math.max(vig, .25 + .45*beat*(1 - G.hp/(G.hpMax*.3))*.8 + .1);
    if (ph < .08 && !G.paused && !G.picking) sfx.heart();
  }
  set('vig', Math.round(vig*50), v => hud.vig.style.opacity = v/50);
  set('wn', G.wave, v => hud.wn.textContent = v);
  set('cb', G.cores.length, v => { const b = $('corebadge'); b.hidden = !v; b.textContent = v; });
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
    const ups = UPG[t.type].filter(u => t.lv[u.id]).map(u => `${u.ko}${u.max > 1 ? ' ' + t.lv[u.id] : ''}`).join(' · ') || '강화 없음', ev = evoOf(t);
    const lk = [...(t.links || [])].map(id => LINKS.find(L => L.id === id)), cores = t.cores.length ? `<span>코어 · ${t.cores.map(c => `${gradeOf(c).ko} ${coreName(c)}`).join(' · ')}${lk.length ? ` · 링크: ${lk.map(L => L.ko).join(', ')}` : ''}</span>` : '';
    return `<li style="--c:rgb(${t.T.col})"><b>${ev ? ev.ko : t.T.ko}</b> <em>MK ${['I', 'II', 'III'][tierOf(t) - 1]} · +${levelOf(t)}</em><span>${ups}</span>${cores}</li>`;
  }).join('');
}
function endRun(win){
  if (!G.testRun) clearSave();
  const m = Math.floor(G.runTime/60), s = Math.floor(G.runTime % 60);
  hud.over.querySelector('h2').textContent = win ? 'EARTH HOLDS' : G.swallowed ? 'SWALLOWED' : 'FORTRESS DOWN';
  hud.over.querySelector('.osub').textContent = win ? `30웨이브를 모두 막았어요` : G.swallowed ? '지구가 블랙홀에 삼켜졌어요' : `웨이브 ${G.wave}에서 무너졌어요`;
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
$('again').addEventListener('click', () => newRun());
// test: stage select in the pause sheet — start wave, view lock, what to do about the skipped waves' cards
const stage = { wave:1, view:'', cards:'auto' };
const BAND = { line:'rgba(90,230,255,.55)', half:'rgba(176,156,255,.6)', full:'rgba(255,206,110,.6)' };
$('stgrid').innerHTML = Array.from({ length:WAVES.last }, (_, i) => { const w = i + 1, boss = WAVES.extra(w).some(k => ROCK[k].boss);
  return `<button type="button" style="--band:${BAND[modeFor(w)]}" class="${boss ? 'bw' : ''}" aria-pressed="${w === 1}" aria-label="웨이브 ${w}${boss ? ' 보스' : ''}">${w}</button>`; }).join('');
$('stgrid').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; stage.wave = +b.textContent; $('stwave').textContent = stage.wave;
  $('stgrid').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
for (const [id, key] of [['stview', 'view'], ['stcards', 'cards']]) $(id).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; stage[key] = b.dataset.v;
  $(id).querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', x === b)); });
$('stboss').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
  G.god = $('stgod').checked; setPaused(false); $('stage').open = false; newRun(+b.dataset.w, null, true, true, true, true); });
$('stgod').addEventListener('change', e => { G.god = e.target.checked; });
$('stgo').addEventListener('click', () => {
  G.god = $('stgod').checked;
  setPaused(false); $('stage').open = false;
  newRun(stage.wave, stage.view || null, stage.cards !== 'none', stage.cards === 'auto', false, true);
});
$('codexbtn').addEventListener('click', () => openCodex());
const muteBtn = $('mute');
const showMute = () => { muteBtn.setAttribute('aria-pressed', isMuted()); muteBtn.setAttribute('aria-label', isMuted() ? '소리 켜기' : '소리 끄기'); };
muteBtn.addEventListener('click', () => { setMuted(!isMuted()); showMute(); }); showMute();
$('pcodex').addEventListener('click', () => openCodex());
$('pcores').addEventListener('click', () => { setPaused(false); openArmory(); });
$('popts').addEventListener('click', () => openOptions());
document.addEventListener('mute-changed', () => showMute());
$('coresbtn').addEventListener('click', () => openArmory());
// tap a turret on the field to open its slots
cv.addEventListener('pointerup', e => {
  if (G.paused || G.picking || G.coreOpen || G.armoryOpen || G.codexOpen || G.tipOpen || G.optsOpen || G.menu || G.phase === 'over') return;
  const x = e.clientX/ZOOM - V.ox, y = e.clientY/ZOOM;
  let best = null, bd = 46; for (const t of turrets){ const d = Math.hypot(t.px - x, t.py - y); if (d < bd){ bd = d; best = t; } }
  if (best) openArmory(best);
});
addEventListener('keydown', e => {
  if (G.codexOpen || G.coreOpen || G.armoryOpen || G.tipOpen || G.optsOpen || G.menu) return;
  if (e.key === 'Escape' || e.key === 'p') setPaused(!G.paused);
  if (e.key === 'c') openCodex();
  if (e.key === 'm') muteBtn.click();
  if (e.key === ' '){ e.preventDefault(); hud.spd.click(); }
});
addEventListener('resize', () => setView(V.mode, false));

let last = performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const dt = Math.max(0, Math.min(.033, (now - last)/1000)); last = now;   // the first rAF stamp can predate `last`
  resetJag();
  autoChoose();
  updTips(!G.paused && !G.picking && !G.coreOpen && !G.armoryOpen && !G.codexOpen && !G.optsOpen && !G.menu && (G.phase === 'wave' || G.phase === 'break') && !AUTO);
  const running = !G.paused && !G.picking && !G.coreOpen && !G.armoryOpen && !G.codexOpen && !G.tipOpen && !G.optsOpen && !G.menu && (G.phase === 'wave' || G.phase === 'break');
  if (running && G.hitStop > 0){ G.hitStop -= dt; tickClock(dt*.1); }      // a beat of stillness on big kills and hits
  else if (running){
    const steps = TEST_SPEED || G.speed;
    for (let i = 0; i < steps; i++){ tickClock(dt); tickBolts(dt); update(dt); }
  } else { for (let i = fx.length - 1; i >= 0; i--) if (!fx[i].update(0)) fx.splice(i, 1); }
  tickCamera(dt);
  render();
  drawHud();
}

setMAXP(innerWidth < 700 ? 900 : 2600);
fitView();
newRun(QS_BOSS || START_WAVE);
// a saved run waiting: offer to pick it up
{ const sv = !QS_TEST && readSave();
  if (sv){
    G.menu = true; const T = $('title'); T.hidden = false;
    T.querySelector('.ti-sub').textContent = `웨이브 ${sv.wave} · ${SECTORS[sectorOf(sv.wave)].ko} · 포탑 ${sv.turrets.length}개 · ${new Date(sv.at).toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })} 저장`;
    $('ticont').addEventListener('click', () => { T.hidden = true; continueRun(sv); });
    $('tinew').addEventListener('click', () => { T.hidden = true; clearSave(); newRun(); });
    $('tiopts').addEventListener('click', () => openOptions());
    $('ticont').focus({ preventScroll:true });
  }
}
requestAnimationFrame(frame);
// for tests and tinkering in the console
window.__td = { G, enemies, turrets, shots, ROCK, TURRET, WAVES, V, addTurret, newRun, resetTurrets, spawnRock, hurt, rollCore, namedCore };
