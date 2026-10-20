
export const cv = document.getElementById('c');
export let ctx = cv.getContext('2d');
export function setCtx(v){ return ctx = v; }
export const bar = document.querySelector('.bar');
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const MOBILE = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;
export let Q = MOBILE ? .35 : 1;
export function setQ(v){ return Q = v; }
            // share of cosmetic particles actually emitted
export let DPR_CAP = MOBILE ? 1 : 2;
export function setDPR_CAP(v){ return DPR_CAP = v; }
export const TAU = Math.PI * 2;
export const rand = (a, b) => a + Math.random() * (b - a);
export const lerp = (a, b, t) => a + (b - a) * t;
export const ELL = .62;
 // ground-plane squash for rings and areas

export let ZOOM = 1, RS = 1;
export function setZOOM(v){ return ZOOM = v; }
export function setRS(v){ return RS = v; }
  // world → screen zoom, and the combined render scale (DPR*ZOOM)
export let W = 0, H = 0, DPR = 1, time = 0, shX = 0, shY = 0, shake = 0;
export function setW(v){ return W = v; }
export function setH(v){ return H = v; }
export function setDPR(v){ return DPR = v; }
export function setTime(v){ return time = v; }
export function setShX(v){ return shX = v; }
export function setShY(v){ return shY = v; }
export function setShake(v){ return shake = v; }
export const origin = { x:0, y:0 };
