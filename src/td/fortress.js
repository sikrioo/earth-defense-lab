/* ---------- fortress mode: Earth, the defence platform, its turret pads and the shield ---------- */
import { H, RS, TAU, W, ctx, setCtx, time } from '../core/canvas.js';
import { addShake } from '../core/lights.js';
import { sprite } from '../core/particles.js';
import { srng } from '../core/util.js';
import capUrl from '../../assets/cap.webp';
import { G, enemies } from './state.js';
import { SECTORS, sectorOf } from './data.js';
import { sfx } from './sfx.js';
import { PW, V, angC, shieldAt } from './view.js';
import { explode, neonPath, rgb } from './fx.js';

const CYAN = [90,230,255];
const cap = new Image(); cap.src = capUrl; cap.onload = () => { backdrop = null; };
let backdrop = null, hits = [], bakedSector = -1;
export const invalidateBackdrop = () => { backdrop = null; platLayer = null; };

export function hitFortress(e){
  const dmg = Math.round(e.T.dmg*(1 + (G.wave - 1)*.05));
  G.hp = Math.max(0, G.hp - dmg); G.hitT = 1;
  const a = angC(e.x, e.y), p = shieldAt(a);
  explode(p.x, p.y, e.r*1.8 + 20, [255,110,70]);
  // a crack across the shield where it was hit: a few jagged lines out from the impact
  const cr = [], n = 3 + Math.min(4, dmg/15 | 0);
  for (let i = 0; i < n; i++){ let x = p.x, y = p.y; const seg = [[x, y]], dir = a + Math.PI/2*(i % 2 ? 1 : -1) + (Math.random() - .5)*1.2;
    for (let j = 0; j < 4; j++){ const d = 6 + Math.random()*10, b = dir + (Math.random() - .5)*.9; x += Math.cos(b)*d; y += Math.sin(b)*d; seg.push([x, y]); } cr.push(seg); }
  hits.push({ a, t:0, cr, life:e.T.boss ? 1.4 : .9 });
  addShake(e.T.boss ? 14 : e.T.comet ? 11 : 2 + Math.min(6, dmg/12));
  sfx.shield(e.T.boss || dmg > 40);
  if (e.T.boss || e.T.comet) G.hitStop = Math.max(G.hitStop || 0, e.T.boss ? .12 : .08);
  if (e.T.comet){ explode(p.x, p.y, 90, [255,180,90]); G.hitT = 1.6; }
}
export function updFortress(dt){
  if (G.regen && G.hp > 0) G.hp = Math.min(G.hpMax, G.hp + G.regen*dt);
  G.hitT = Math.max(0, G.hitT - dt*2);
  for (let i = hits.length - 1; i >= 0; i--){ hits[i].t += dt; if (hits[i].t > hits[i].life) hits.splice(i, 1); }
}

// the arc of the shield / platform ring that matters in each view
function ringArc(){
  if (V.mode === 'line'){ const h = Math.asin(Math.min(1, (PW/2 + 40)/V.PR)); return [-Math.PI/2 - h, -Math.PI/2 + h]; }
  if (V.mode === 'half') return [-Math.PI - .12, .12];
  return [0, TAU];
}

// a living Earth for the pulled-back views (the horizon photo only works as a cap)
function paintGlobe(g, cx, cy, R){
  const atm = g.createRadialGradient(cx, cy, R*.96, cx, cy, R*1.16);
  atm.addColorStop(0, 'rgba(90,200,255,.55)'); atm.addColorStop(1, 'rgba(90,200,255,0)');
  g.fillStyle = atm; g.beginPath(); g.arc(cx, cy, R*1.16, 0, TAU); g.fill();
  const sea = g.createRadialGradient(cx - R*.3, cy - R*.35, R*.1, cx, cy, R);
  sea.addColorStop(0, '#2c6fb8'); sea.addColorStop(1, '#0d2a55');
  g.fillStyle = sea; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip();
  const rnd = srng(2026);
  // continents: clusters of blobs, foreshortened toward the rim
  for (let k = 0; k < 7; k++){
    const a = rnd()*TAU, d = Math.sqrt(rnd())*R*.85, bx = cx + Math.cos(a)*d, by = cy + Math.sin(a)*d, squash = 1 - (d/R)*.5;
    g.fillStyle = rnd() < .75 ? '#3f7a52' : '#8a7a52';
    for (let j = 0; j < 9; j++){ const r = R*(.05 + rnd()*.11); g.beginPath(); g.ellipse(bx + (rnd() - .5)*R*.35, by + (rnd() - .5)*R*.28, r, r*squash, a, 0, TAU); g.fill(); }
  }
  g.fillStyle = 'rgba(235,245,255,.85)'; g.beginPath(); g.ellipse(cx, cy - R*.97, R*.4, R*.09, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(cx, cy + R*.97, R*.35, R*.08, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,.2)';
  for (let i = 0; i < 16; i++){ const y = cy + (rnd() - .5)*R*1.8; g.beginPath(); g.ellipse(cx + (rnd() - .5)*R*1.6, y, R*(.1 + rnd()*.25), R*.025 + 1.5, (rnd() - .5)*.3, 0, TAU); g.fill(); }
  // night side
  const sh = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  sh.addColorStop(0, 'rgba(0,0,10,0)'); sh.addColorStop(.55, 'rgba(0,0,10,.1)'); sh.addColorStop(1, 'rgba(0,0,14,.7)');
  g.fillStyle = sh; g.fillRect(cx - R, cy - R, R*2, R*2);
  g.restore();
  g.strokeStyle = 'rgba(150,230,255,.8)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R - 1, 0, TAU); g.stroke();
}
// what is left of Jupiter and Saturn, far off in the pulled-back views
function husk(g, x, y, R, ringed){
  if (ringed){ g.save(); g.translate(x, y); g.rotate(-.35); g.strokeStyle = 'rgba(130,120,110,.28)'; g.lineWidth = R*.14;
    for (const [a0, a1] of [[.2, 1.3], [1.7, 2.5], [2.8, 3.9], [4.4, 5.9]]){ g.beginPath(); g.ellipse(0, 0, R*1.9, R*.5, 0, a0, a1); g.stroke(); } g.restore(); }
  const gr = g.createRadialGradient(x - R*.35, y - R*.35, R*.1, x, y, R);
  gr.addColorStop(0, 'rgba(96,88,80,.75)'); gr.addColorStop(1, 'rgba(26,22,22,.75)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,110,60,.3)'; g.lineWidth = 1.2; const rnd = srng(ringed ? 7 : 3); g.beginPath();
  for (let k = 0; k < 4; k++){ let px = x + (rnd() - .5)*R, py = y + (rnd() - .5)*R; g.moveTo(px, py); for (let j = 0; j < 4; j++){ px += (rnd() - .5)*R*.5; py += (rnd() - .5)*R*.5; g.lineTo(px, py); } }
  g.stroke();
}

// sky, nebulae and Earth never move: baked once per size and view into one screen canvas
function bake(){
  const c = document.createElement('canvas'); c.width = Math.ceil(W*RS); c.height = Math.ceil(H*RS);
  const g = c.getContext('2d'); g.scale(RS, RS); g.translate(V.ox, 0);
  const x0 = -V.ox, x1 = PW + V.ox, line = V.mode === 'line';
  const S = SECTORS[sectorOf(G.wave || 1)]; bakedSector = sectorOf(G.wave || 1);
  const sky = g.createLinearGradient(0, 0, 0, V.PH);
  if (line){ sky.addColorStop(0, S.sky[0]); sky.addColorStop(.6, S.sky[1]); sky.addColorStop(1, S.sky[2]); }
  else { sky.addColorStop(0, S.sky[0]); sky.addColorStop(.5, S.sky[1]); sky.addColorStop(1, S.sky[0]); }
  g.fillStyle = sky; g.fillRect(x0, 0, x1 - x0, V.PH);
  const blob = (x, y, r, c, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgb(c, a)); gr.addColorStop(1, rgb(c, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r*2, r*2); };
  const k = PW/540;
  blob(PW*.85, V.PH*.18, 360*k, S.neb[0], .18); blob(PW*.1, V.PH*.42, 300*k, S.neb[1], .14); blob(PW*.6, V.PH*.62, 260*k, S.neb[2], .08);
  blob(PW*.3, V.PH*.08, 240*k, S.neb[2], .07);
  // the last sector: something huge and dark bends the light at the top of the sky
  if (bakedSector === 5){ blob(PW*.5, -V.PH*.05, 520*k, [255,90,40], .14); g.strokeStyle = 'rgba(255,150,90,.12)'; g.lineWidth = 3; g.beginPath(); g.ellipse(PW*.5, -V.PH*.02, 420*k, 90*k, 0, 0, Math.PI); g.stroke(); }
  const rnd = srng(91), starH = line ? V.earthTop : V.PH;
  for (let i = 0; i < 160*k*k; i++){ g.fillStyle = `rgba(220,235,255,${.12 + rnd()*.35})`; g.fillRect(x0 + rnd()*(x1 - x0), rnd()*starH, 1, 1); }
  const R = V.ER, cx = V.cx, cy = V.cy;
  if (line){
    // Earth: the baked horizon cap (globe radius 1500 in its pixels), plus an atmosphere rim
    const atm = g.createRadialGradient(cx, cy, R*.98, cx, cy, R + 60);
    atm.addColorStop(0, 'rgba(90,200,255,.55)'); atm.addColorStop(1, 'rgba(90,200,255,0)');
    g.fillStyle = atm; g.beginPath(); g.arc(cx, cy, R + 60, 0, TAU); g.fill();
    if (cap.complete && cap.naturalWidth){ const sc = R/1500; g.drawImage(cap, cx - cap.naturalWidth*sc/2, V.earthTop, cap.naturalWidth*sc, cap.naturalHeight*sc); }
    else { g.fillStyle = '#123a6a'; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(4,8,20,.35)'; g.fillRect(x0, V.earthTop, x1 - x0, V.PH - V.earthTop);
  } else {
    if (V.mode === 'full'){ husk(g, PW*.12, V.PH*.1, 46, false); husk(g, PW*.86, V.PH*.88, 38, true); }
    else husk(g, PW*.1, V.PH*.12, 40, false);
    paintGlobe(g, cx, cy, R);
  }
  // outside the play column (wide screens): dim it and mark the edges
  if (V.ox > 1){
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x0, 0, -x0, V.PH); g.fillRect(PW, 0, V.ox, V.PH);
    g.fillStyle = 'rgba(90,230,255,.25)'; g.fillRect(-1, 0, 1, V.PH); g.fillRect(PW, 0, 1, V.PH);
  }
  return c;
}
// three layers of drifting stars give the sense of falling toward Earth
const STARS = (() => { const r = srng(5); return Array.from({ length:110 }, (_, i) => ({ x:r(), y:r(), l:i % 3 })); })();
export function drawBackdrop(){
  if (!backdrop || bakedSector !== sectorOf(G.wave || 1)) backdrop = bake();
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.drawImage(backdrop, -V.ox, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  const span = PW + V.ox*2, line = V.mode === 'line', lim = line ? V.earthTop : V.PH, ER2 = (V.ER + 30)**2;
  for (const s of STARS){
    const sp = [6, 14, 30][s.l]*V.spd, y = ((s.y*lim + time*sp) % lim), x = -V.ox + s.x*span;
    if (!line && (x - V.cx)**2 + (y - V.cy)**2 < ER2) continue;
    ctx.globalAlpha = [.25, .45, .8][s.l]; ctx.fillStyle = '#cfe6ff';
    const z = s.l === 2 ? 1.6 : 1; ctx.fillRect(x, y, z, s.l === 2 ? z*3 : z);
  }
}

// the platform ring with its pads is drawn once into a screen-sized canvas and blitted;
// the shield (one arc), the hit flares and the running lights are live
let platLayer = null, platKey = '';
export function drawFortress(turretAt){
  const key = V.mounts.map((m, i) => { const t = turretAt(i); return t ? t.type : '-'; }).join() + V.mode + V.PH + RS;
  if (!platLayer || platKey !== key){
    const c = document.createElement('canvas'); c.width = Math.ceil(W*RS); c.height = Math.ceil(H*RS);
    const g = c.getContext('2d'), keep = ctx; g.setTransform(RS, 0, 0, RS, V.ox*RS, 0);
    setCtx(g); paintPlatform(turretAt); setCtx(keep);
    platLayer = c; platKey = key;
  }
  const [a0, a1] = ringArc();
  // shield: faint, flaring where it was hit
  ctx.globalCompositeOperation = 'lighter';
  neonPath(() => ctx.arc(V.cx, V.cy, V.SR, a0, a1), CYAN, 1.5, .35 + .1*Math.sin(time*2.4) + G.hitT*.4);
  for (const h of hits){
    const k = Math.max(0, 1 - h.t/.6), kc = 1 - h.t/h.life, p = shieldAt(h.a);
    if (k > 0){ sprite(p.x, p.y, 60*(1 + h.t), [255,140,90], .6*k); sprite(p.x, p.y, 120, CYAN, .25*k); }
    neonPath(() => { for (const seg of h.cr){ ctx.moveTo(seg[0][0], seg[0][1]); for (let j = 1; j < seg.length; j++) ctx.lineTo(seg[j][0], seg[j][1]); } }, [255,200,170], 1, kc*(.6 + .4*Math.sin(h.t*40)));
  }
  // danger: the stretch of shield a rock is about to hit glows red, brighter the closer it is
  const warn = 200*V.spd;
  for (const e of enemies){
    if (e.dead) continue;
    const gap = Math.hypot(e.x - V.cx, e.y - V.cy) - V.SR; if (gap > warn) continue;
    const k = 1 - Math.max(0, gap)/warn, q = shieldAt(Math.atan2(e.y - V.cy, e.x - V.cx));
    sprite(q.x, q.y, 26 + e.r*1.2 + k*20, [255,60,50], (.12 + .4*k*k)*(e.T.boss ? 1.5 : 1));
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.drawImage(platLayer, -V.ox, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  const n = V.mode === 'line' ? 14 : V.mode === 'half' ? 20 : 30, span = a1 - a0;
  for (let i = 0; i < n; i++){
    const a = a0 + span*(i + .5)/n, on = (Math.floor(time*2) + i) % 4 === 0;
    sprite(V.cx + Math.cos(a)*V.PR, V.cy + Math.sin(a)*V.PR, on ? 5 : 3, on ? CYAN : [60,120,160], on ? .9 : .5);
  }
}
function paintPlatform(turretAt){
  const [a0, a1] = ringArc(), full = V.mode === 'full', rIn = V.PR - 16, rOut = V.PR + 12;
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.beginPath();
  if (full){ ctx.arc(V.cx, V.cy, rOut, 0, TAU); ctx.moveTo(V.cx + rIn, V.cy); ctx.arc(V.cx, V.cy, rIn, 0, TAU, true); }
  else { ctx.arc(V.cx, V.cy, rOut, a0, a1); ctx.arc(V.cx, V.cy, rIn, a1, a0, true); ctx.closePath(); }
  const band = ctx.createRadialGradient(V.cx, V.cy, rIn, V.cx, V.cy, rOut);
  band.addColorStop(0, '#0a0d14'); band.addColorStop(.5, '#141a26'); band.addColorStop(1, '#2b3446');
  ctx.fillStyle = band; ctx.fill('evenodd');
  ctx.globalCompositeOperation = 'lighter';
  neonPath(() => ctx.arc(V.cx, V.cy, rOut, a0, a1), CYAN, 1.2, .8);
  if (!full) neonPath(() => ctx.arc(V.cx, V.cy, rIn, a0, a1), CYAN, .8, .3);
  V.mounts.forEach((m, i) => {
    const t = turretAt(i), c = t ? t.T.col : [70,90,120];
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#0e121b';
    hex(m.x, m.y, 27, m.a); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    neonPath(() => hex(m.x, m.y, 27, m.a), c, 1.3, t ? .9 : .45);
    if (!t){ ctx.globalAlpha = .4; ctx.fillStyle = rgb(c); ctx.fillRect(m.x - 5, m.y - .75, 10, 1.5); ctx.fillRect(m.x - .75, m.y - 5, 1.5, 10); }
  });
}
// a pad: a hexagon, flat side facing out from Earth
function hex(x, y, r, a){ ctx.beginPath(); for (let i = 0; i < 6; i++){ const b = a + i/6*TAU + Math.PI/6; ctx.lineTo(x + Math.cos(b)*r, y + Math.sin(b)*r); } ctx.closePath(); }
