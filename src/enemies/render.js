/* ---------- drawing rocks: sprite cache, baked-art sprites, hit flashes, bars, tails ---------- */
import { MOBILE, TAU, ZOOM, ctx, setCtx, time } from '../core/canvas.js';
import { mix } from '../core/util.js';
import { LIGHT, PAL } from '../core/palette.js';
import { sprite } from '../core/particles.js';
import { light } from '../core/lights.js';
import { ECOL, ETYPE, VSIZE } from '../data/enemy-types.js';
import { ASSET_IMG, GFX } from '../assets/index.js';
import { demonPose } from './update.js';
import { CUSTOM_PAINT, paintDemon } from './painters.js';
import { drawTail } from './special.js';
import { floats } from './list.js';

// Each demon pose is painted once into an offscreen sprite; per frame we only blit it.
const SPR_RES = 2;
export const sprCache = new Map();
// which render each enemy type wears, its tint (null = keep the original colour), and whether it may spin
const ASSET_MAP = {
  normal:{ k:'normal', tint:null, rot:true, s:2.35 },
  runner:{ k:'runner', tint:null, rot:true, s:2.6 },
  brute: { k:'brute',  tint:null, rot:true, s:2.3 },
  meteor:{ k:'meteor', tint:null, rot:true, s:2.4 },
  elite: { k:'elite',  tint:null, rot:true, s:2.35 },
  boss:  { k:'boss',   tint:null, rot:true, s:2.25 },
};
function assetSprite(type, variant){
  const m = ASSET_MAP[type], img = ASSET_IMG[m.k] && ASSET_IMG[m.k][variant % 3];
  if (!img || !img.complete || !img.naturalWidth) return null;
  const R = ETYPE[type].r*VSIZE[variant], w = R*m.s, h = w*img.naturalHeight/img.naturalWidth, k = SPR_RES;
  const c = document.createElement('canvas'); c.width = Math.ceil(w*k); c.height = Math.ceil(h*k);
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
  if (m.tint){
    // keep the render's shading, swap its hue: desaturate, multiply by the tint, restore the alpha
    g.globalCompositeOperation = 'saturation'; g.fillStyle = '#808080'; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgb(${m.tint.map(v => Math.min(255, v*1.25)|0)})`; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(img, 0, 0, c.width, c.height);
  }
  return { c, w, h, ox:w/2, oy:h/2, masks:new Map(), norot:!m.rot };
}
export function demonSprite(type, dir, variant){
  const key = GFX + type + variant; let sp = sprCache.get(key); if (sp) return sp;
  if (GFX === 'asset' && ASSET_MAP[type]){ sp = assetSprite(type, variant); if (sp){ sprCache.set(key, sp); return sp; } }
  const T = ETYPE[type], R = T.r*VSIZE[variant], k = SPR_RES, w = Math.ceil((R*2 + 14)*k);
  const c = document.createElement('canvas'); c.width = c.height = w;
  const g = c.getContext('2d'), keep = ctx; setCtx(g);
  g.translate(w/2, w/2); g.scale(k, k);
  if (CUSTOM_PAINT[type]) CUSTOM_PAINT[type](g, R, 11 + variant*97); else paintDemon(T, type, variant, R);
  setCtx(keep);
  sp = { c, w:w/k, h:w/k, ox:w/2/k, oy:w/2/k, masks:new Map() };
  sprCache.set(key, sp); return sp;
}
function spriteMask(sp, col){
  const key = col.join(); let m = sp.masks.get(key); if (m) return m;
  m = document.createElement('canvas'); m.width = sp.c.width; m.height = sp.c.height;
  const g = m.getContext('2d'); g.drawImage(sp.c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = `rgb(${col})`; g.fillRect(0, 0, m.width, m.height);
  sp.masks.set(key, m); return m;
}
export function drawEnemy(e){
  const T = e.T, p = demonPose(e); if (p.a <= 0) return;
  const sp = demonSprite(e.type, p.dir, e.variant);
  ctx.save();
  const st = Math.min(1, e.spawnT/.45), grow = e.dead ? 1 : 1 + 2.7*(st - 1)**3 + 1.7*(st - 1)**2;
  const sh = (1 - p.fall*.7)*grow; ctx.translate(e.x, e.y - e.r + p.bob*.5); ctx.scale(p.sx*sh, p.sy*sh); if (!sp.norot) ctx.rotate(e.rot || 0);
  ctx.globalAlpha = p.a; ctx.drawImage(sp.c, -sp.ox, -sp.oy, sp.w, sp.h);
  const over = (col, al) => { ctx.globalAlpha = p.a*al; ctx.drawImage(spriteMask(sp, col), -sp.ox, -sp.oy, sp.w, sp.h); };
  if (e.chill > 0) over([120,175,240], .45);
  if (e.tintT > 0 && e.tint && e.tint !== 'ice') over(ECOL[e.tint], e.tintT/.45*.45);
  if (e.heat > .03) over([255,128,48], Math.min(.6, e.heat*.6));
  if (e.flash > 0) over([255,255,255], e.flash/.12*.8);
  ctx.restore();

  if (!e.dead && e.hp < e.max){
    const bw = e.r*2 + 10, bx = e.x - bw/2, by = e.y - e.h - 7;
    ctx.globalAlpha = p.a*.92; ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 6);
    ctx.fillStyle = `rgb(${T.bar})`; ctx.fillRect(bx, by, bw*Math.max(0, e.hp/e.max), 4);
    if (e.amp > 0){ ctx.strokeStyle = `rgb(${PAL.blood[1]})`; ctx.lineWidth = 1; ctx.strokeRect(bx - 1.5, by - 1.5, bw + 3, 7); }
  }
}
// elite/boss ground ring, drawn under the stone so it never washes over it
function drawEnemyBase(e){
  if (e.dead || !e.T.ring) return;
  const a = Math.min(1, e.spawnT/.4);
  ctx.globalAlpha = (.5 + .15*Math.sin(time*3 + e.seed))*a; ctx.strokeStyle = `rgb(${e.T.ring})`; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(e.x, e.y - e.r, e.r + 5, 0, TAU); ctx.stroke();
  sprite(e.x, e.y - e.r, e.r*2.1, e.T.ring, .22*a);
}
export function drawEnemyFx(e){
  if (e.dead) return;
  drawTail(e);
  const a = demonPose(e).a;
  if (e.heat > .03){
    // bow shock: a hot glow on the leading face
    const sp = Math.hypot(e.vx, e.vy) || 1, cx = e.x + e.vx/sp*e.r*.55, cy = e.y - e.r + e.vy/sp*e.r*.55;
    sprite(cx, cy, e.r*(1.3 + e.heat), PAL.fire[2], .55*e.heat);
    sprite(cx, cy, e.r*.7, PAL.fire[0], .5*e.heat);
    light(cx, cy, e.r*5, LIGHT.fire, .5*e.heat);
  }
  if (e.dead) return;
  if (e.amp > 0) sprite(e.x, e.y - e.h - 4, 14, PAL.blood[2], .5);
  if (e.stun > 0) for (let k = 0; k < 3; k++){ const o = time*5 + k*TAU/3; sprite(e.x + Math.cos(o)*e.r, e.y - e.h - 8 + Math.sin(o)*4, 3.5, PAL.shout[1], .9); }
}
export function drawFloats(){
  ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  for (const f of floats){
    const t = f.age/.9, y = f.y - 34*t;
    ctx.globalAlpha = t < .7 ? 1 : 1 - (t - .7)/.3;
    ctx.font = `600 ${((f.big ? 15 : 12)/Math.sqrt(ZOOM)).toFixed(1)}px 'IBM Plex Sans KR', system-ui, sans-serif`;
    if (!MOBILE){ ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.lineWidth = 3; ctx.strokeText(f.v, f.x, y); }
    ctx.fillStyle = `rgb(${mix(f.c, [255,255,255], .35)})`; ctx.fillText(f.v, f.x, y);
  }
}
