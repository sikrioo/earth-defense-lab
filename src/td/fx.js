/* ---------- fortress mode: neon drawing helpers and short-lived effects ---------- */
import { TAU, ctx, rand } from '../core/canvas.js';
import { emit, sprite } from '../core/particles.js';
import { fx } from './state.js';

export const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
export const mixc = (a, b, t) => [a[0] + (b[0] - a[0])*t | 0, a[1] + (b[1] - a[1])*t | 0, a[2] + (b[2] - a[2])*t | 0];
const WHITE = [255, 255, 255];

// a neon stroke: wide soft halo, then a thin bright core (call inside 'lighter')
export function neonPath(build, c, w = 2, a = 1){
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); build();
  ctx.strokeStyle = rgb(c, .22*a); ctx.lineWidth = w*4; ctx.stroke();
  ctx.strokeStyle = rgb(mixc(c, WHITE, .35), .9*a); ctx.lineWidth = w; ctx.stroke();
}
export const neonLine = (x1, y1, x2, y2, c, w, a) => neonPath(() => { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }, c, w, a);
export const neonCircle = (x, y, r, c, w, a) => neonPath(() => ctx.arc(x, y, r, 0, TAU), c, w, a);

// expanding ring
export function ringFx(x, y, r0, r1, life, c, w = 2){
  let t = 0;
  fx.push({ update(dt){ t += dt; return t < life; },
    draw(){ const k = t/life, r = r0 + (r1 - r0)*(1 - (1 - k)**3); neonCircle(x, y, r, c, w*(1 - k) + .5, 1 - k); } });
}
// burst of sparks and a flash
export function burst(x, y, c, n = 12, sp = 260, size = 2.4){
  for (let i = 0; i < n; i++){ const a = rand(0, TAU), v = rand(.3, 1)*sp; emit({ x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, drag:3, life:rand(.25, .5), s0:size, s1:.5, streak:2.2, pal:[mixc(c, WHITE, .6), c] }); }
  fx.push(flashFx(x, y, n*3, c));
}
export function flashFx(x, y, r, c){ let t = 0; return { update(dt){ t += dt; return t < .18; }, draw(){ sprite(x, y, r*(1 + t*3), c, .55*(1 - t/.18)); } }; }
export function explode(x, y, r, c){
  burst(x, y, c, Math.min(26, 8 + r*.25), 120 + r*3, 3);
  ringFx(x, y, r*.2, r, .35, c, 3);
  for (let i = 0; i < Math.min(16, 4 + r*.15); i++){ const a = rand(0, TAU), v = rand(30, 120); emit({ x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, drag:2, life:rand(.3, .6), s0:rand(8, 14), s1:2, a:.6, pal:[[255,240,210], c, mixc(c, [0,0,0], .5)] }); }
}
// floating number for big hits
export function bigNumber(x, y, v, c){
  let t = 0; const s = String(Math.round(v));
  fx.push({ update(dt){ t += dt; return t < .8; }, draw(){
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = t < .6 ? 1 : (1 - (t - .6)/.2);
    ctx.font = '700 16px "Chakra Petch", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = rgb(mixc(c, WHITE, .5)); ctx.fillText(s, x, y - t*30);
    ctx.globalCompositeOperation = 'lighter'; } });
}
