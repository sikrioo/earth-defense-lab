/* ---------- Earth: globe painting, horizon cap, background, far debris, the hero marker ---------- */
import { H, MOBILE, RS, TAU, W, ZOOM, bar, ctx, origin, time } from '../core/canvas.js';
import { srng } from '../core/util.js';
import { PAL } from '../core/palette.js';
import { sprite } from '../core/particles.js';
import { ASSET_IMG, GFX } from '../assets/index.js';

export const earth = { cx:0, cy:0, R:0, top:0, img:null, bg:null, flash:0, hp:1000 };
export let mapMode = 'line', gameOver = false;
export function setMapMode(v){ return mapMode = v; }
export function setGameOver(v){ return gameOver = v; }
function paintGlobe(g, cx, cy, R, seed){
  const atm = g.createRadialGradient(cx, cy, R*.97, cx, cy, R + Math.max(10, R*.08));
  atm.addColorStop(0, 'rgba(120,235,220,.6)'); atm.addColorStop(1, 'rgba(90,200,220,0)');
  g.fillStyle = atm; g.beginPath(); g.arc(cx, cy, R + Math.max(10, R*.08), 0, TAU); g.fill();
  g.fillStyle = 'rgb(34,78,140)'; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip();
  const rnd = srng(seed);
  for (let i = 0; i < 14; i++){
    const x = cx + (rnd() - .5)*R*2, y = cy - R + rnd()*R*2, rx = R*(.12 + rnd()*.25), ry = rx*(.25 + rnd()*.3);
    g.fillStyle = rnd() < .7 ? 'rgb(66,118,84)' : 'rgb(150,132,92)'; g.beginPath(); g.ellipse(x, y, rx, ry, rnd()*.6 - .3, 0, TAU); g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,.18)';
  for (let i = 0; i < 9; i++){ g.beginPath(); g.ellipse(cx + (rnd() - .5)*R*2, cy - R + rnd()*R*2, R*(.12 + rnd()*.2), R*.02 + 2, 0, 0, TAU); g.fill(); }
  const sh = g.createRadialGradient(cx - R*.35, cy - R*.35, R*.2, cx, cy, R*1.05);
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,12,.55)');
  g.fillStyle = sh; g.fillRect(cx - R, cy - R, R*2, R*2);
  g.restore();
  g.strokeStyle = 'rgba(170,255,236,.85)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R - .5, 0, TAU); g.stroke();
}
function deadPlanet(g, x, y, R, ringed){
  // a burnt-out husk: dull, banded, cracked, no atmosphere
  if (ringed){
    g.save(); g.translate(x, y); g.rotate(-.35);
    g.strokeStyle = 'rgba(120,112,100,.45)'; g.lineWidth = R*.16;
    for (const [a0, a1] of [[.15, 1.3], [1.6, 2.4], [2.75, 3.9], [4.3, 5.9]]){ g.beginPath(); g.ellipse(0, 0, R*1.9, R*.55, 0, a0, a1); g.stroke(); }
    g.restore();
    const rnd = srng(99);
    g.fillStyle = 'rgba(120,112,100,.5)';
    for (let i = 0; i < 26; i++){ const a = rnd()*TAU, d = R*(1.7 + rnd()*.6); g.fillRect(x + Math.cos(a)*d, y + Math.sin(a)*d*.35 - Math.cos(a)*d*.12, 2, 2); }
  }
  const gr = g.createRadialGradient(x - R*.35, y - R*.35, R*.1, x, y, R);
  gr.addColorStop(0, 'rgb(96,88,80)'); gr.addColorStop(1, 'rgb(30,26,24)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(x, y, R, 0, TAU); g.clip();
  g.fillStyle = 'rgba(0,0,0,.22)';
  for (let i = -3; i <= 3; i++){ g.fillRect(x - R, y + i*R*.26 - R*.05, R*2, R*.1); }
  g.strokeStyle = 'rgba(255,120,60,.35)'; g.lineWidth = 1.2;
  const rnd = srng(ringed ? 7 : 3); g.beginPath();
  for (let k = 0; k < 4; k++){ let px = x + (rnd() - .5)*R, py = y + (rnd() - .5)*R; g.moveTo(px, py); for (let j = 0; j < 4; j++){ px += (rnd() - .5)*R*.5; py += (rnd() - .5)*R*.5; g.lineTo(px, py); } }
  g.stroke(); g.restore();
}
export function buildEarth(){
  const bottom = origin.y;
  if (mapMode === 'line'){
    earth.R = Math.max(W*.9, 520); earth.top = bottom + 6; earth.cx = W/2; earth.cy = earth.top + earth.R;
    const pad = Math.ceil(Math.max(10, earth.R*.08)) + 8;           // room for the whole atmosphere glow
    const vis = Math.min(earth.R, H - earth.top + 20), w = Math.ceil(W), h = Math.ceil(vis + pad + 10);
    const c = document.createElement('canvas'); c.width = w*RS; c.height = h*RS;
    const g = c.getContext('2d'); g.scale(RS, RS);
    paintGlobe(g, earth.cx, earth.R + pad, earth.R, 2026);
    earth.img = { c, x:0, y:earth.top - pad, w, h }; earth.bg = null;
    // starfield for the art preview
    const st = document.createElement('canvas'); st.width = Math.ceil(W*RS); st.height = Math.ceil(H*RS);
    const sg = st.getContext('2d'); sg.scale(RS, RS); const rnd = srng(777);
    const neb = sg.createRadialGradient(W*.72, H*.22, 0, W*.72, H*.22, Math.max(W, H)*.5);
    neb.addColorStop(0, 'rgba(90,60,140,.22)'); neb.addColorStop(1, 'rgba(90,60,140,0)'); sg.fillStyle = neb; sg.fillRect(0, 0, W, H);
    for (let i = 0; i < 180; i++){ sg.fillStyle = `rgba(255,255,255,${.15 + rnd()*.5})`; const z = rnd() < .9 ? 1 : 1.8; sg.fillRect(rnd()*W, rnd()*earth.top, z, z); }
    earth.stars = st;
    return;
  }
  // orbit map: Earth in the middle of the play area, the dead outer system behind it
  const playH = H - (bar.offsetHeight || 120)/ZOOM;
  earth.R = Math.max(26, Math.min(W, playH)*.06); earth.cx = W/2; earth.cy = playH*.5 + 10; earth.top = earth.cy - earth.R;
  const bg = document.createElement('canvas'); bg.width = Math.ceil(W*RS); bg.height = Math.ceil(H*RS);
  const g = bg.getContext('2d'); g.scale(RS, RS);
  const rnd = srng(4040);
  for (let i = 0; i < 220; i++){ g.fillStyle = `rgba(255,255,255,${.15 + rnd()*.45})`; const z = rnd() < .9 ? 1 : 1.8; g.fillRect(rnd()*W, rnd()*H, z, z); }
  const sx = -Math.min(W, H)*.18, sy = earth.cy + playH*.08, D = Math.hypot(earth.cx - sx, earth.cy - sy);
  const sun = g.createRadialGradient(sx, sy, 0, sx, sy, D*.55);
  sun.addColorStop(0, 'rgba(255,240,200,1)'); sun.addColorStop(.12, 'rgba(255,200,110,.9)'); sun.addColorStop(.35, 'rgba(255,140,50,.25)'); sun.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = sun; g.beginPath(); g.arc(sx, sy, D*.55, 0, TAU); g.fill();
  g.fillStyle = 'rgb(255,236,190)'; g.beginPath(); g.arc(sx, sy, Math.min(W, H)*.12, 0, TAU); g.fill();
  const orbit = (r, a) => { g.strokeStyle = `rgba(160,180,220,${a})`; g.lineWidth = 1; g.setLineDash([3, 6]); g.beginPath(); g.arc(sx, sy, r, 0, TAU); g.stroke(); g.setLineDash([]); };
  const at = (r, ang) => [sx + Math.cos(ang)*r, sy + Math.sin(ang)*r];
  const eAng = Math.atan2(earth.cy - sy, earth.cx - sx);
  // inner planets
  orbit(D*.39, .12); orbit(D*.72, .12); orbit(D, .2);
  let [px, py] = at(D*.39, eAng - .55); g.fillStyle = 'rgb(170,160,150)'; g.beginPath(); g.arc(px, py, 3, 0, TAU); g.fill();
  [px, py] = at(D*.72, eAng + .4); g.fillStyle = 'rgb(232,200,140)'; g.beginPath(); g.arc(px, py, 5, 0, TAU); g.fill();
  orbit(D*1.3, .14); [px, py] = at(D*1.3, eAng - .32); g.fillStyle = 'rgb(200,96,60)'; g.beginPath(); g.arc(px, py, 4.5, 0, TAU); g.fill();
  // the two that vanished: grey husks where Jupiter and Saturn used to shield us
  orbit(D*1.62, .08); orbit(D*1.9, .08);
  const J = at(D*1.62, eAng - .38), S = at(D*1.9, eAng + .3);
  const pr = Math.min(W, playH);
  deadPlanet(g, Math.min(W - pr*.1, J[0]), Math.max(pr*.12, Math.min(playH*.3, J[1])), pr*.07, false);
  deadPlanet(g, Math.min(W - pr*.14, S[0]), Math.max(playH*.62, Math.min(playH - pr*.1, S[1])), pr*.055, true);
  earth.bg = bg;
  const ew = Math.ceil(earth.R*2 + 40), c = document.createElement('canvas'); c.width = c.height = Math.ceil(ew*RS);
  const eg = c.getContext('2d'); eg.scale(RS, RS); paintGlobe(eg, ew/2, ew/2, earth.R, 2026);
  earth.img = { c, x:earth.cx - ew/2, y:earth.cy - ew/2, w:ew, h:ew };
}
const farDebris = [];
function drawFarDebris(){
  if (!farDebris.length){ const r = srng(4242); for (let i = 0; i < (MOBILE ? 9 : 16); i++) farDebris.push({ x:r(), y:r(), s:10 + r()*r()*34, vx:(r() - .5)*.012, vy:.004 + r()*.01, rot:r()*TAU, vr:(r() - .5)*.25, k:(r()*5)|0, a:.45 + r()*.45 }); }
  const lim = mapMode === 'line' ? earth.top - 10 : H;
  for (const d of farDebris){
    const im = ASSET_IMG.debris[d.k]; if (!im.complete || !im.naturalWidth) continue;
    const x = (((d.x + d.vx*time) % 1) + 1) % 1*(W + 80) - 40, y = (((d.y + d.vy*time) % 1) + 1) % 1*(lim + 60) - 40;
    if (y > lim) continue;
    const w = d.s, h = w*im.naturalHeight/im.naturalWidth;
    ctx.save(); ctx.globalAlpha = d.a; ctx.translate(x, y); ctx.rotate(d.rot + d.vr*time); ctx.drawImage(im, -w/2, -h/2, w, h); ctx.restore();
  }
  ctx.globalAlpha = 1;
}
export function drawEarth(){
  if (!earth.img) return;
  ctx.globalAlpha = 1;
  const art = GFX === 'asset', ok = im => im && im.complete && im.naturalWidth;
  if (art && ok(ASSET_IMG.stars)){
    const im = ASSET_IMG.stars, sc = Math.max(W/im.naturalWidth, H/im.naturalHeight);
    ctx.drawImage(im, (W - im.naturalWidth*sc)/2, (H - im.naturalHeight*sc)/2, im.naturalWidth*sc, im.naturalHeight*sc);
  }
  if (earth.bg) ctx.drawImage(earth.bg, 0, 0, W, H);
  if (art && ASSET_IMG.debris) drawFarDebris();
  if (mapMode === 'orbit'){
    ctx.strokeStyle = 'rgba(180,200,240,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(earth.cx, earth.cy, earth.R*2.2, 0, TAU); ctx.stroke();
  }
  ctx.drawImage(earth.img.c, earth.img.x, earth.img.y, earth.img.w, earth.img.h);
  if (art && mapMode === 'line' && ok(ASSET_IMG.cap)){
    // baked cap: globe radius 1500px, 2400px wide, top edge = Earth's horizon
    const im = ASSET_IMG.cap, sc = earth.R/1500;
    ctx.drawImage(im, earth.cx - im.naturalWidth*sc/2, earth.top, im.naturalWidth*sc, im.naturalHeight*sc);
  }
  if (art && mapMode === 'orbit' && ok(ASSET_IMG.globe)){
    // 24-frame rotation strip, cross-faded so the spin is smooth
    const im = ASSET_IMG.globe, n = 24, f = (time*2) % n, i0 = Math.floor(f), i1 = (i0 + 1) % n, t = f - i0, d = earth.R*2;
    ctx.drawImage(im, i0*128, 0, 128, 128, earth.cx - earth.R, earth.cy - earth.R, d, d);
    ctx.globalAlpha = t; ctx.drawImage(im, i1*128, 0, 128, 128, earth.cx - earth.R, earth.cy - earth.R, d, d); ctx.globalAlpha = 1;
  }
  if (mapMode === 'orbit'){
    const ma = time*.35, mx = earth.cx + Math.cos(ma)*earth.R*2.2, my = earth.cy + Math.sin(ma)*earth.R*2.2;
    ctx.fillStyle = 'rgb(190,186,180)'; ctx.beginPath(); ctx.arc(mx, my, Math.max(3, earth.R*.22), 0, TAU); ctx.fill();
  }
  if (earth.flash > 0){ ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = earth.flash*.07; ctx.fillStyle = 'rgb(255,120,60)'; ctx.beginPath(); ctx.arc(earth.cx, earth.cy, earth.R, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
}
export function drawHero(){
  const x = origin.x, y = origin.y, pulse = .8 + .2*Math.sin(time*4);
  sprite(x, y - 6, 26*pulse, PAL.magic[3], .45); sprite(x, y - 6, 9, PAL.magic[1], .9); sprite(x, y - 6, 3.5, [255,255,255], 1);
}
