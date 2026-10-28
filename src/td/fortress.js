/* ---------- fortress mode: Earth, the defence platform, its turret pads and the shield ---------- */
import { H, RS, TAU, W, ctx, setCtx, time } from '../core/canvas.js';
import { addShake } from '../core/lights.js';
import { sprite } from '../core/particles.js';
import { srng } from '../core/util.js';
import capUrl from '../../assets/cap.webp';
import { G } from './state.js';
import { PW, V, shieldY } from './view.js';
import { explode, neonPath, rgb } from './fx.js';

const CYAN = [90,230,255];
const cap = new Image(); cap.src = capUrl; cap.onload = () => { backdrop = null; };
let backdrop = null, hits = [];
export const invalidateBackdrop = () => { backdrop = null; shieldLayer = null; };

export function hitFortress(e){
  const dmg = Math.round(e.T.dmg*(1 + (G.wave - 1)*.03));
  G.hp = Math.max(0, G.hp - dmg); G.hitT = 1;
  const y = shieldY(e.x);
  explode(e.x, y, e.r*1.8 + 20, [255,110,70]);
  hits.push({ x:e.x, t:0 });
  addShake(e.T.boss ? 14 : 2 + Math.min(6, dmg/12));
}
export function updFortress(dt){
  if (G.regen && G.hp > 0) G.hp = Math.min(G.hpMax, G.hp + G.regen*dt);
  G.hitT = Math.max(0, G.hitT - dt*2);
  for (let i = hits.length - 1; i >= 0; i--){ hits[i].t += dt; if (hits[i].t > .6) hits.splice(i, 1); }
}

// sky, nebulae and Earth never move: baked once per size into one screen canvas
function bake(){
  const c = document.createElement('canvas'); c.width = Math.ceil(W*RS); c.height = Math.ceil(H*RS);
  const g = c.getContext('2d'); g.scale(RS, RS); g.translate(V.ox, 0);
  const x0 = -V.ox, x1 = PW + V.ox;
  const sky = g.createLinearGradient(0, 0, 0, V.PH);
  sky.addColorStop(0, '#04050c'); sky.addColorStop(.6, '#070a1a'); sky.addColorStop(1, '#0b1630');
  g.fillStyle = sky; g.fillRect(x0, 0, x1 - x0, V.PH);
  const blob = (x, y, r, c, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgb(c, a)); gr.addColorStop(1, rgb(c, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r*2, r*2); };
  blob(PW*.85, V.PH*.18, 360, [120,60,200], .16); blob(PW*.1, V.PH*.42, 300, [40,140,220], .12); blob(PW*.6, V.PH*.62, 260, [200,60,140], .07);
  const rnd = srng(91);
  for (let i = 0; i < 160; i++){ g.fillStyle = `rgba(220,235,255,${.12 + rnd()*.35})`; g.fillRect(x0 + rnd()*(x1 - x0), rnd()*V.earthTop, 1, 1); }
  // Earth: the baked horizon cap (globe radius 1500 in its pixels), plus an atmosphere rim
  const cx = PW/2, R = V.earthR, cy = V.earthTop + R;
  const atm = g.createRadialGradient(cx, cy, R*.98, cx, cy, R + 60);
  atm.addColorStop(0, 'rgba(90,200,255,.55)'); atm.addColorStop(1, 'rgba(90,200,255,0)');
  g.fillStyle = atm; g.beginPath(); g.arc(cx, cy, R + 60, 0, TAU); g.fill();
  if (cap.complete && cap.naturalWidth){ const sc = R/1500; g.drawImage(cap, cx - cap.naturalWidth*sc/2, V.earthTop, cap.naturalWidth*sc, cap.naturalHeight*sc); }
  else { g.fillStyle = '#123a6a'; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(4,8,20,.35)'; g.fillRect(x0, V.earthTop, x1 - x0, V.PH - V.earthTop);
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
  if (!backdrop) backdrop = bake();
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.drawImage(backdrop, -V.ox, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  const span = PW + V.ox*2;
  for (const s of STARS){
    const sp = [6, 14, 30][s.l]*V.spd, y = ((s.y*V.earthTop + time*sp) % V.earthTop);
    ctx.globalAlpha = [.25, .45, .8][s.l]; ctx.fillStyle = '#cfe6ff';
    const z = s.l === 2 ? 1.6 : 1; ctx.fillRect(-V.ox + s.x*span, y, z, s.l === 2 ? z*3 : z);
  }
}

const curve = x => Math.pow((x/PW - .5)*2, 2)*16;
// the shield line and the platform with its pads are drawn once into offscreen canvases and blitted;
// only the hit flares, the running lights and the shield's pulse are live
let shieldLayer = null, platLayer = null, platKey = '';
function offscreen(y0, h, paint){
  const c = document.createElement('canvas'); c.width = Math.ceil((PW + 40)*RS); c.height = Math.ceil(h*RS);
  const g = c.getContext('2d'), keep = ctx; g.setTransform(RS, 0, 0, RS, 20*RS, -y0*RS);
  setCtx(g); paint(); setCtx(keep);
  return { c, y0, h };
}
const blit = L => ctx.drawImage(L.c, -20, L.y0, PW + 40, L.h);
export function drawFortress(turretAt){
  const key = V.mounts.map((m, i) => { const t = turretAt(i); return t ? t.type : '-'; }).join() + V.PH + RS;
  if (!shieldLayer || platKey !== key){
    shieldLayer = offscreen(V.defY - 20, 80, () => { ctx.globalCompositeOperation = 'lighter';
      neonPath(() => { for (let x = 0; x <= PW; x += 12) x ? ctx.lineTo(x, shieldY(x)) : ctx.moveTo(x, shieldY(x)); }, CYAN, 1.5, 1); });
    platLayer = offscreen(V.platY - 40, 80, () => paintPlatform(turretAt));
    platKey = key;
  }
  // shield: faint, flaring where it was hit
  ctx.globalAlpha = .35 + .1*Math.sin(time*2.4) + G.hitT*.4; blit(shieldLayer);
  for (const h of hits){ const k = 1 - h.t/.6; sprite(h.x, shieldY(h.x), 60*(1 + h.t), [255,140,90], .6*k); sprite(h.x, shieldY(h.x), 120, CYAN, .25*k); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; blit(platLayer);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++){ const x = PW*(i + .5)/14, on = (Math.floor(time*2) + i) % 4 === 0; sprite(x, V.platY + 6 + curve(x), on ? 5 : 3, on ? CYAN : [60,120,160], on ? .9 : .5); }
}
function paintPlatform(turretAt){
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.beginPath();
  for (let x = -12; x <= PW + 12; x += 12) ctx.lineTo(x, V.platY - 12 + curve(x));
  for (let x = PW + 12; x >= -12; x -= 12) ctx.lineTo(x, V.platY + 16 + curve(x));
  ctx.closePath();
  const band = ctx.createLinearGradient(0, V.platY - 12, 0, V.platY + 16);
  band.addColorStop(0, '#2b3446'); band.addColorStop(.5, '#141a26'); band.addColorStop(1, '#0a0d14');
  ctx.fillStyle = band; ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  neonPath(() => { for (let x = -12; x <= PW + 12; x += 12) x > -12 ? ctx.lineTo(x, V.platY - 12 + curve(x)) : ctx.moveTo(x, V.platY - 12 + curve(x)); }, CYAN, 1.2, .8);
  V.mounts.forEach((m, i) => {
    const t = turretAt(i), c = t ? t.T.col : [70,90,120];
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#0e121b';
    hex(m.x, m.y, 21); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    neonPath(() => hex(m.x, m.y, 21), c, 1.3, t ? .9 : .45);
    if (!t){ ctx.globalAlpha = .4; ctx.fillStyle = rgb(c); ctx.fillRect(m.x - 5, m.y - .75, 10, 1.5); ctx.fillRect(m.x - .75, m.y - 5, 1.5, 10); }
  });
}
function hex(x, y, r){ ctx.beginPath(); for (let i = 0; i < 6; i++){ const a = i/6*TAU + Math.PI/6; ctx.lineTo(x + Math.cos(a)*r, y + Math.sin(a)*r*.8); } ctx.closePath(); }

