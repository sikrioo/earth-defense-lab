import { reduce, setShake, shake } from './canvas.js';

/* ---------- glow lights, flashes, rings ---------- */
export const lights = [];
export const light = (x, y, r, c, i) => lights.push({x, y, r, c, i});
export const flashes = [];
export const flash = (x, y, r, c, i, life) => flashes.push({x, y, r, c, i, life, age:0});
export const rings = [];
export const ring = (x, y, r0, r1, life, c, w, a = 1) => rings.push({x, y, r0, r1, life, age:0, c, w, a});
export const addShake = v => { if (!reduce) setShake(Math.min(14, shake + v)); };
