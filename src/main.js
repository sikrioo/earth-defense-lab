import './style.css';
import { setup as setup_ui_paper } from './ui/paper.js';
import { setup as setup_core_particles } from './core/particles.js';
import { setup as setup_assets_index } from './assets/index.js';
import { setup as setup_skills_sorceress } from './skills/sorceress.js';
import { setup as setup_weapons_rings } from './weapons/rings.js';
import { setup as setup_weapons_levelup } from './weapons/levelup.js';
import { setup as setup_ui_skillbar } from './ui/skillbar.js';
import { setup as setup_ui_deck } from './ui/deck.js';
import { setup as setup_ui_hud } from './ui/hud.js';
import { setup as setup_game_input } from './game/input.js';
import { DPR, DPR_CAP, ELL, H, MOBILE, Q, RS, TAU, W, ZOOM, bar, ctx, cv, lerp, origin, rand, setDPR, setDPR_CAP, setH, setQ, setRS, setShX, setShY, setShake, setTime, setW, setZOOM, shX, shY, shake, time } from './core/canvas.js';
import { softSprite } from './core/sprites.js';
import { MAXP, drawParts, parts, setMAXP, updParts } from './core/particles.js';
import { flashes, light, lights, rings } from './core/lights.js';
import { boltT, boltTick, setBoltT, setBoltTick, setJagCall } from './core/lightning.js';
import { enemies } from './enemies/list.js';
import { buildEarth, drawEarth, drawHero, drawHeroBody, earth, gameOver, mapMode, setMapMode } from './world/earth.js';
import { initEnemies, kills } from './enemies/spawn.js';
import { debris, earthHits, hpDirty, level, restart, setHpDirty, setXpDirty, xp, xpDirty, xpNeed } from './game/progress.js';
import { updEnemies } from './enemies/update.js';
import { drawEnemy, drawEnemyFx, drawFloats, sprCache } from './enemies/render.js';
import { GFX, setGFX } from './assets/index.js';
import { S, earthMax } from './loot/items.js';
import { updCores } from './loot/cores.js';
import { drawPickups, slotsDirty, updPickups } from './loot/drops.js';
import { jamT, setJamT } from './skills/hunter.js';
import { drawCities, updCities } from './world/cities.js';
import { drawRings, updRings } from './weapons/rings.js';
import { setSim, simMax } from './game/sim.js';
import { openPick, pickQ, picking } from './weapons/levelup.js';
import { drawEvents, updEvents } from './game/events.js';
import { CLASSES, active } from './skills/index.js';
import { btns, cls, sel } from './ui/skillbar.js';
import { paused, renderSlots, setToastT, toastEl, toastT } from './ui/deck.js';
import { MANA_MAX, MANA_REGEN, drawOrbs, mana, mpT, noManaT, renderMskill, setMana, setNoManaT } from './ui/hud.js';
import { cast, holding, tgt } from './game/input.js';
import { runDemo } from './game/demo.js';

/* ---------- loop ---------- */
function layout(){
  origin.x = W/2; origin.y = H - (bar.offsetHeight || 120)/ZOOM - 30;
  if (W) buildEarth();
  if (mapMode === 'orbit'){ origin.x = earth.cx; origin.y = earth.cy - earth.R - 2; }
}
function resize(){ setZOOM(mapMode === 'orbit' ? (Math.min(innerWidth, innerHeight) < 600 ? .5 : .6) : 1); setDPR(Math.min(DPR_CAP, devicePixelRatio || 1)); setRS(DPR*ZOOM); setW(innerWidth/ZOOM); setH(innerHeight/ZOOM); cv.width = Math.round(innerWidth*DPR); cv.height = Math.round(innerHeight*DPR); layout(); if (!tgt.x){ tgt.x = W*.5; tgt.y = H*.18; } if (!enemies.length) initEnemies(); }
export const overEl = document.getElementById('over');
const gfxBtn = document.getElementById('gfxbtn'), creditEl = document.getElementById('credit');
const mapBtn = document.getElementById('mapbtn');
function update(dt){
  lights.length = 0; setJagCall(0);
  if (toastT > 0){ setToastT(toastT - (dt)); if (toastT <= 0) toastEl.classList.remove('show'); }
  if (paused) return;
  if (!gameOver){ setMana(Math.min(MANA_MAX, mana + MANA_REGEN*dt)); } setNoManaT(noManaT - (dt)); setJamT(Math.max(0, jamT - dt));
  setBoltT(boltT + (dt)); if (boltT >= .045){ setBoltT(0); setBoltTick(boltTick + 1); }
  for (const c of CLASSES) for (const s of c.skills) s.cdLeft = Math.max(0, s.cdLeft - dt);
  runDemo();
  if (holding && !gameOver && !paused) cast(cls, sel, tgt.x, tgt.y);
  updCores(dt);
  updCities(dt); updRings(dt); updEvents(dt);
  if (pickQ > 0 && !picking && !gameOver) openPick();
  if (simMax && earth.hp < earthMax()){ earth.hp = earthMax(); setHpDirty(true); }
  updPickups(dt);
  if (!gameOver && S.regen && earth.hp < earthMax()){ earth.hp = Math.min(earthMax(), earth.hp + S.regen*dt); setHpDirty(true); }
  earth.flash = Math.max(0, earth.flash - dt*2.5);
  for (let i = active.length - 1; i >= 0; i--) if (!active[i].update(dt)) active.splice(i, 1);
  if (!gameOver) updEnemies(dt);
  updParts(dt);
  for (let i = flashes.length - 1; i >= 0; i--){ const f = flashes[i]; f.age += dt; if (f.age >= f.life){ flashes.splice(i, 1); continue; } const t = f.age/f.life; light(f.x, f.y, f.r*(1 + .3*t), f.c, f.i*(1-t)*(1-t)); }
  for (let i = rings.length - 1; i >= 0; i--){ rings[i].age += dt; if (rings[i].age >= rings[i].life) rings.splice(i, 1); }
  setShake(shake * (Math.exp(-9*dt))); if (shake < .05) setShake(0);
}
function render(){
  setShX(shake ? rand(-1,1)*shake : 0); setShY(shake ? rand(-1,1)*shake : 0);
  ctx.setTransform(1,0,0,1,0,0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(RS, 0, 0, RS, RS*shX, RS*shY);
  ctx.globalCompositeOperation = 'lighter';
  if (lights.length > (MOBILE ? 6 : 40)){ lights.sort((p, q) => q.i - p.i); lights.length = MOBILE ? 6 : 40; }
  for (const L of lights){ ctx.globalAlpha = Math.min(.28, L.i*.14); const r = L.r*.6; ctx.drawImage(softSprite(L.c), L.x - r, L.y - r, r*2, r*2); }
  ctx.globalCompositeOperation = 'source-over';
  drawEarth();
  drawCities();
  drawHeroBody();
  for (const d of debris){
    const t = d.age/d.life, rr = d.r*(1 - t*.4);
    ctx.globalAlpha = 1 - t*t; ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot);
    ctx.drawImage(d.sp.c, -rr*1.3, -rr*1.3, rr*2.6, rr*2.6); ctx.restore();
  }
  enemies.slice().sort((p, q) => p.y - q.y).forEach(drawEnemy);
  ctx.globalCompositeOperation = 'lighter';
  for (const e of enemies) drawEnemyFx(e);
  drawHero();
  drawParts();
  drawPickups();
  for (const r of rings){
    const t = r.age/r.life, rr = lerp(r.r0, r.r1, 1 - (1-t)**3);
    ctx.strokeStyle = `rgb(${r.c})`;
    ctx.globalAlpha = (1-t)*.25*r.a; ctx.lineWidth = r.w*3; ctx.beginPath(); ctx.ellipse(r.x, r.y, rr, rr*ELL, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = (1-t)*.8*r.a; ctx.lineWidth = r.w*(1-t) + 1; ctx.beginPath(); ctx.ellipse(r.x, r.y, rr, rr*ELL, 0, 0, TAU); ctx.stroke();
  }
  for (const s of active) s.draw && s.draw();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  drawRings();
  drawEvents();
  drawFloats(); ctx.globalAlpha = 1;
}
let last = performance.now(), fpsT = 0, fpsN = 0, slow = 0;
const ehpT = document.getElementById('ehpt');
const statsEl = document.getElementById('stats'), lvEl = document.getElementById('lv'), xpEl = document.getElementById('xpfill'), xptEl = document.getElementById('xpt');
let errShown = false;
function frame(now){
  requestAnimationFrame(frame);
  const dt = Math.min(.033, (now - last)/1000); last = now; setTime(time + (dt));
  try { update(dt); render(); }
  catch (err){ if (!errShown){ errShown = true; console.error(err); } ctx.setTransform(1,0,0,1,0,0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  CLASSES[cls].skills.forEach((s, k) => { const b = btns[k]; if (!b) return; const v = Math.round(s.cdLeft/s.cd*40)/40; if (b._cd !== v){ b._cd = v; b.lastChild.style.transform = `scaleX(${v})`; } });
  if (slotsDirty) renderSlots();
  if (hpDirty){ setHpDirty(false); ehpT.textContent = `${Math.floor(earth.hp)}`; }
  { const mv = Math.floor(mana); if (mpT._v !== mv){ mpT._v = mv; mpT.textContent = mv; } }
  drawOrbs(); renderMskill();
  if (xpDirty){ setXpDirty(false); lvEl.textContent = `Lv ${level}`; xpEl.style.width = `${Math.min(100, xp/xpNeed(level)*100)}%`; lvEl.textContent = `LV ${level}`; xptEl.textContent = `${xp} / ${xpNeed(level)}`; }
  fpsT += dt; fpsN++;
  if (fpsT >= .5){
    const fps = fpsN/fpsT;
    slow = fps < 40 ? slow + 1 : 0;
    if (slow >= 2 && time > 2){
      slow = 0;
      if (DPR_CAP > 1){ setDPR_CAP(1); resize(); }
      else if (Q > .3){ setQ(Math.max(.3, Q - .15)); setMAXP(Math.max(1000, MAXP*.75|0)); }
    }
    statsEl.textContent = `처치 ${kills} · 지구 피격 ${earthHits} · 입자 ${parts.length.toLocaleString()} · ${Math.round(fpsN/fpsT)} fps`; fpsT = 0; fpsN = 0; }
}

/* ---------- boot: every module sets itself up in the original order, then the loop starts ---------- */
setup_ui_paper();
setup_core_particles();
setup_assets_index();
setup_skills_sorceress();
setup_weapons_rings();
setup_weapons_levelup();
setup_ui_skillbar();
setup_ui_deck();
setup_ui_hud();
setup_game_input();
addEventListener('resize', resize);
document.getElementById('respawn').addEventListener('click', restart);
document.getElementById('again').addEventListener('click', restart);
gfxBtn.addEventListener('click', () => {
  setGFX(GFX === 'asset' ? 'code' : 'asset'); sprCache.clear();
  gfxBtn.textContent = GFX === 'asset' ? '그래픽: 에셋' : '그래픽: 코드'; creditEl.hidden = GFX !== 'asset';
});
document.getElementById('simbtn').addEventListener('click', () => setSim(!simMax));
mapBtn.addEventListener('click', () => {
  setMapMode(mapMode === 'line' ? 'orbit' : 'line');
  mapBtn.textContent = mapMode === 'line' ? '맵: 지구 방어선' : '맵: 궤도 방어';
  resize(); restart();
});
if (window.ResizeObserver) new ResizeObserver(layout).observe(bar);
resize();
requestAnimationFrame(frame);
