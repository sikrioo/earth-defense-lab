import { ELL, TAU, rand } from '../core/canvas.js';
import { LIGHT, PAL } from '../core/palette.js';
import { emit } from '../core/particles.js';
import { addShake, flash, ring } from '../core/lights.js';

/* ---------- shared bursts ---------- */
export function sparks(x, y, pal, n, sp = 340, size = 2.5){
  for (let k = 0; k < n; k++){ const a = rand(0, TAU), s = rand(sp*.35, sp); emit({ x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, drag:3, life:rand(.15,.4), s0:size, s1:.6, streak:3, pal }); }
}
export function fireBurst(x, y, sc = 1){
  for (let i = 0; i < 70*sc; i++){ const a = rand(0, TAU), sp = rand(60, 380)*sc; emit({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp*.7, drag:3.2, life:rand(.35,.85), s0:rand(12,22)*Math.sqrt(sc), s1:2, pal:PAL.fire }); }
  for (let i = 0; i < 26*sc; i++){ const a = rand(0, TAU), sp = rand(250, 650)*Math.sqrt(sc); emit({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp*.7 - 120, ay:700, drag:1, life:rand(.4,1), s0:3, s1:1.5, streak:3, pal:PAL.fire }); }
  ring(x, y, 6, 110*sc, .45, PAL.fire[1], 6); flash(x, y, 320*sc, LIGHT.fire, 1.6, .5); addShake(5*sc);
}
export function iceBurst(x, y, sc = 1){
  for (let i = 0; i < 36*sc; i++){ const a = i/(36*sc)*TAU + rand(-.05,.05), sp = rand(300, 520)*sc; emit({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp*ELL, drag:1.5, life:rand(.35,.6), s0:6, s1:2, streak:3, pal:PAL.ice }); }
  for (let i = 0; i < 14*sc; i++){ const a = rand(0, TAU), sp = rand(20, 90); emit({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp*ELL, drag:1.5, life:rand(.8,1.4), s0:rand(18,30)*sc, s1:8, a:.25, pal:PAL.ice }); }
  ring(x, y, 6, 130*sc, .5, PAL.ice[1], 5); flash(x, y, 280*sc, LIGHT.ice, 1.3, .4); addShake(3*sc);
}
export function holyBurst(x, y, sc = 1){
  for (let i = 0; i < 30*sc; i++){ const a = rand(0, TAU), sp = rand(80, 300)*sc; emit({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp*.8, drag:3, life:rand(.3,.7), s0:rand(6,12), s1:1, pal:PAL.holy }); }
  sparks(x, y, PAL.holy, 14*sc, 380);
  ring(x, y, 4, 70*sc, .35, PAL.holy[1], 4); flash(x, y, 200*sc, LIGHT.holy, 1.1, .3);
}
