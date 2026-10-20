/* ---------- frame loop: update the world, draw it, refresh the HUD ---------- */
import { ELL, MOBILE, RS, TAU, ctx, cv, decayShake, lerp, lowerQuality, rollShake, shX, shY, tickClock, time } from '../core/canvas.js';
import { softSprite } from '../core/sprites.js';
import { MAXP, drawParts, parts, setMAXP, updParts } from '../core/particles.js';
import { flashes, light, lights, rings } from '../core/lights.js';
import { resetJag, tickBolts } from '../core/lightning.js';
import { enemies } from '../enemies/list.js';
import { updEnemies } from '../enemies/update.js';
import { drawEnemy, drawEnemyFx, drawFloats } from '../enemies/render.js';
import { kills } from '../enemies/spawn.js';
import { drawEarth, drawHero, earth, gameOver } from '../world/earth.js';
import { drawCities, updCities } from '../world/cities.js';
import { debris, earthHits, hpDirty, level, setHpDirty, setXpDirty, xp, xpDirty, xpNeed } from './progress.js';
import { cast, holding, tgt } from './input.js';
import { drawEvents, updEvents } from './events.js';
import { simMax } from './sim.js';
import { resize } from './view.js';
import { S, earthMax } from '../loot/items.js';
import { updCores } from '../loot/cores.js';
import { drawPickups, slotsDirty, updPickups } from '../loot/drops.js';
import { CLASSES, active } from '../skills/index.js';
import { tickJam } from '../skills/hunter.js';
import { drawRings, updRings } from '../weapons/rings.js';
import { openPick, pickQ, picking } from '../weapons/levelup.js';
import { btns, cls, sel } from '../ui/skillbar.js';
import { paused, renderSlots } from '../ui/deck.js';
import { drawOrbs, mana, mpT, renderMskill, tickMana } from '../ui/hud.js';

function update(dt){
  lights.length = 0; resetJag();
  if (paused) return;
  tickMana(dt, !gameOver); tickJam(dt); tickBolts(dt);
  for (const c of CLASSES) for (const s of c.skills) s.cdLeft = Math.max(0, s.cdLeft - dt);
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
  decayShake(dt);
}

function render(){
  rollShake();
  ctx.setTransform(1,0,0,1,0,0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(RS, 0, 0, RS, RS*shX, RS*shY);
  ctx.globalCompositeOperation = 'lighter';
  if (lights.length > (MOBILE ? 6 : 40)){ lights.sort((p, q) => q.i - p.i); lights.length = MOBILE ? 6 : 40; }
  for (const L of lights){ ctx.globalAlpha = Math.min(.28, L.i*.14); const r = L.r*.6; ctx.drawImage(softSprite(L.c), L.x - r, L.y - r, r*2, r*2); }
  ctx.globalCompositeOperation = 'source-over';
  drawEarth();
  drawCities();
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

const ehpT = document.getElementById('ehpt');
const statsEl = document.getElementById('stats'), lvEl = document.getElementById('lv'), xpEl = document.getElementById('xpfill'), xptEl = document.getElementById('xpt');
let last = performance.now(), fpsT = 0, fpsN = 0, slow = 0, errShown = false;

function hud(){
  CLASSES[cls].skills.forEach((s, k) => { const b = btns[k]; if (!b) return; const v = Math.round(s.cdLeft/s.cd*40)/40; if (b._cd !== v){ b._cd = v; b.lastChild.style.transform = `scaleX(${v})`; } });
  if (slotsDirty) renderSlots();
  if (hpDirty){ setHpDirty(false); ehpT.textContent = `${Math.floor(earth.hp)}`; }
  { const mv = Math.floor(mana); if (mpT._v !== mv){ mpT._v = mv; mpT.textContent = mv; } }
  drawOrbs(); renderMskill();
  if (xpDirty){ setXpDirty(false); xpEl.style.width = `${Math.min(100, xp/xpNeed(level)*100)}%`; lvEl.textContent = `LV ${level}`; xptEl.textContent = `${xp} / ${xpNeed(level)}`; }
}

function frame(now){
  requestAnimationFrame(frame);
  const dt = Math.min(.033, (now - last)/1000); last = now; tickClock(dt);
  try { update(dt); render(); }
  catch (err){ if (!errShown){ errShown = true; console.error(err); } ctx.setTransform(1,0,0,1,0,0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  hud();
  fpsT += dt; fpsN++;
  if (fpsT >= .5){
    // two slow half-seconds in a row: lower the quality a notch
    slow = fpsN/fpsT < 40 ? slow + 1 : 0;
    if (slow >= 2 && time > 2){
      slow = 0;
      const step = lowerQuality();
      if (step === 'dpr') resize();
      else if (step === 'particles') setMAXP(Math.max(1000, MAXP*.75|0));
    }
    statsEl.textContent = `처치 ${kills} · 지구 피격 ${earthHits} · 입자 ${parts.length.toLocaleString()} · ${Math.round(fpsN/fpsT)} fps`; fpsT = 0; fpsN = 0;
  }
}
export function startLoop(){ requestAnimationFrame(frame); }
