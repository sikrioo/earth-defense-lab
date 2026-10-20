/* ---------- small helpers: colour mix, distances, seeded random, html escaping ---------- */
import { lerp } from './canvas.js';

export function mix(a, b, t){ return [lerp(a[0],b[0],t)|0, lerp(a[1],b[1],t)|0, lerp(a[2],b[2],t)|0]; }
export function segDist(px, py, ax, ay, bx, by){
  const dx = bx-ax, dy = by-ay, L2 = dx*dx + dy*dy || 1, t = Math.max(0, Math.min(1, ((px-ax)*dx + (py-ay)*dy)/L2));
  return Math.hypot(px - (ax + dx*t), py - (ay + dy*t));
}
// plain training dummy: stand, post, padded body, crossbar, head
// Flat space-rock orbs (in the spirit of "A Game About Feeding A Black Hole"):
// a solid disc, a soft shadow crescent, a few craters and a thin light rim. No ink outline.
export function srng(seed){ let v = seed % 2147483647 || 1; return () => (v = v*16807 % 2147483647)/2147483647; }
export const rint = (a, b) => a + Math.floor(Math.random()*(b - a + 1));   // old toast hook, now unused
export const rgb = c => `rgb(${c})`;
export const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[ch]);
