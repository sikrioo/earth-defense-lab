/* ---------- canvas, view size, clock, screen shake ---------- */
export const cv = document.getElementById('c');
export let ctx = cv.getContext('2d');
// sprite painters draw into offscreen canvases by swapping the active context
export function setCtx(v){ return ctx = v; }
export const bar = document.querySelector('.bar');
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const MOBILE = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;
export let Q = MOBILE ? .35 : 1;            // share of cosmetic particles actually emitted
export let DPR_CAP = MOBILE ? 1 : 1.5;        // 2× on a big retina window is 4× the pixels to fill every frame
export const TAU = Math.PI * 2;
export const rand = (a, b) => a + Math.random() * (b - a);
export const lerp = (a, b, t) => a + (b - a) * t;
export const ELL = .62;                     // ground-plane squash for rings and areas

export let ZOOM = 1, RS = 1;                // world → screen zoom, and the combined render scale (DPR*ZOOM)
export let W = 0, H = 0, DPR = 1, time = 0, shX = 0, shY = 0, shake = 0;
export const origin = { x:0, y:0 };

// size the canvas for the window at a given world zoom
export function setViewport(zoom){
  ZOOM = zoom; DPR = Math.min(DPR_CAP, devicePixelRatio || 1); RS = DPR*ZOOM;
  W = innerWidth/ZOOM; H = innerHeight/ZOOM;
  cv.width = Math.round(innerWidth*DPR); cv.height = Math.round(innerHeight*DPR);
}
export function tickClock(dt){ time += dt; }
export function addShakeRaw(v){ shake = Math.min(14, shake + v); }
export function decayShake(dt){ shake *= Math.exp(-9*dt); if (shake < .05) shake = 0; }
// a fixed draw offset (the portrait column is centred on wide screens) rides along with the shake
export let offX = 0, offY = 0;
export function setOffset(x, y){ offX = x; offY = y; }
export function rollShake(){ shX = offX + (shake ? rand(-1, 1)*shake : 0); shY = offY + (shake ? rand(-1, 1)*shake : 0); }
// adaptive quality: first drop the pixel ratio, then thin out cosmetic particles; true if anything changed
export function lowerQuality(){
  if (DPR_CAP > 1){ DPR_CAP = 1; return 'dpr'; }
  if (Q > .3){ Q = Math.max(.3, Q - .15); return 'particles'; }
  return null;
}
