import { MOBILE, ctx } from './canvas.js';
import { PAL } from './palette.js';

/* ---------- lightning ---------- */
/* Lightning shapes are precomputed once in unit space (start 0,0 → end 1,0) and only
   stretched onto the real endpoints each frame. Each call site keeps the same shape for
   ~45ms (boltTick), so bolts still crackle but nothing is regenerated per frame. */
let pstate = 1;
export function pseed(n){ pstate = ((n | 0) * 2654435761 >>> 0) || 1; }
export function prand(a, b){ pstate ^= pstate << 13; pstate >>>= 0; pstate ^= pstate >>> 17; pstate ^= pstate << 5; pstate >>>= 0; return a + (pstate/4294967296)*(b - a); }
function unitJag(rough, depth){
  let pts = [0, 0, 1, 0], disp = rough;
  for (let g = 0; g < depth; g++){
    const np = [0, 0];
    for (let i = 0; i < pts.length - 2; i += 2){
      const ax = pts[i], ay = pts[i+1], bx = pts[i+2], by = pts[i+3];
      const dx = bx-ax, dy = by-ay, L = Math.hypot(dx, dy) || 1, o = (Math.random()*2 - 1)*disp;
      np.push((ax+bx)/2 - dy/L*o, (ay+by)/2 + dx/L*o, bx, by);
    }
    pts = np; disp *= .55;
  }
  return Float32Array.from(pts);
}
const JAG_R = [.16, .22, .3], JAG_N = 16;
const JAG_POOL = JAG_R.map(r => { const byDepth = []; for (let d = 1; d <= 7; d++){ byDepth[d] = []; for (let k = 0; k < JAG_N; k++) byDepth[d].push(unitJag(r, d)); } return byDepth; });
export let boltTick = 0, boltT = 0, jagCall = 0;
export function setBoltTick(v){ return boltTick = v; }
export function setBoltT(v){ return boltT = v; }
export function setJagCall(v){ return jagCall = v; }
export function jag(x1, y1, x2, y2, rough = .18){
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
  const depth = Math.max(1, Math.min(7, Math.ceil(Math.log2(Math.max(2, L/9)))));
  const ri = rough < .19 ? 0 : rough < .26 ? 1 : 2;
  const pool = JAG_POOL[ri][depth];
  const u = pool[((jagCall++)*7 + boltTick*13) % JAG_N];
  const out = new Array(u.length);
  for (let i = 0; i < u.length; i += 2){ const t = u[i], v = u[i+1]; out[i] = x1 + dx*t - dy*v; out[i+1] = y1 + dy*t + dx*v; }
  return out;
}
function tracePts(p){ ctx.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i+1]); }
function strokePts(p){ ctx.beginPath(); tracePts(p); ctx.stroke(); }
// many bolts with the same look: one path, four strokes total instead of four per bolt
export function drawBolts(list, a, w = 1.6, pal = PAL.bolt){
  if (!list.length || a <= 0) return;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); for (const p of list) tracePts(p);
  const passes = MOBILE ? [[w*4.5, pal[2], .35], [w*1.2, pal[0], 1]] : [[w*7, pal[3], .12], [w*3.2, pal[2], .4], [w*1.6, pal[1], .8], [w*.8, pal[0], 1]];
  for (const [lw, c, al] of passes){ ctx.globalAlpha = a*al; ctx.strokeStyle = `rgb(${c})`; ctx.lineWidth = lw; ctx.stroke(); }
}
export function drawBolt(pts, a, w = 1.6, pal = PAL.bolt){
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const passes = MOBILE ? [[w*4.5, pal[2], .35], [w*1.2, pal[0], 1]] : [[w*7, pal[3], .12], [w*3.2, pal[2], .4], [w*1.6, pal[1], .8], [w*.8, pal[0], 1]];
  for (const [lw, c, al] of passes){ ctx.globalAlpha = a*al; ctx.strokeStyle = `rgb(${c})`; ctx.lineWidth = lw; strokePts(pts); }
}
export function boltWithForks(x1, y1, x2, y2, a, w, pal = PAL.bolt, forks = 2){
  const pts = jag(x1, y1, x2, y2); drawBolt(pts, a, w, pal);
  const d = Math.hypot(x2-x1, y2-y1), base = Math.atan2(y2-y1, x2-x1), n = pts.length/2;
  pseed(jagCall*31 + boltTick*977);
  const fl = [];
  for (let f = 0; f < forks; f++){
    const i = Math.floor(prand(n*.2, n*.85))*2, fx = pts[i], fy = pts[i+1];
    const ang = base + prand(-.9, .9), L = d*prand(.1, .28);
    fl.push(jag(fx, fy, fx + Math.cos(ang)*L, fy + Math.sin(ang)*L, .22));
  }
  drawBolts(fl, a*.7, w*.5, pal);
}
