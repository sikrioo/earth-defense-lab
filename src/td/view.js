/* ---------- fortress mode: the field of play around Earth, in three views ----------
   line : waves 1-10  — the old front line: a column, Earth's horizon at the bottom, rocks from above (6 pads)
   half : waves 11-20 — pulled back: half of Earth at the bottom, rocks from above and both sides (8 pads)
   full : waves 21-30 — pulled back again: all of Earth in the middle, rocks from every direction (10 pads)
   Everything sits on circles around Earth's centre: the shield, the platform ring and its pads. */
import { H, W, ZOOM, setOffset, setViewport } from '../core/canvas.js';

export const MODES = {
  line: { ko:'전선',   en:'FRONT LINE', scale:1,    pads:6 },
  half: { ko:'반구',   en:'HALF SPHERE', scale:1.45, pads:8 },
  full: { ko:'전방위', en:'FULL ORBIT', scale:1.9,  pads:10 },
};
export const modeFor = w => w <= 10 ? 'line' : w <= 20 ? 'half' : 'full';

export let PW = 540;               // play column width in world units (grows when the view pulls back)
export const V = {
  mode:'line', PH:960, ox:0, spd:1,
  cx:0, cy:0, ER:0, SR:0, PR:0,    // Earth centre and radius, shield radius, platform radius
  earthTop:0,                       // line view only: where the horizon cap starts
  mounts:[],                        // pads in fill order: { x, y, a } with a = outward angle
  spawnR:0,                         // spawn ring radius (half/full)
  cam:1, camT:0,                    // zoom-out transition: draw scale easing back to 1
};

export function fitView(mode = V.mode){
  const M = MODES[mode], prevZoom = ZOOM;
  V.mode = mode; PW = 540*M.scale;
  setViewport(Math.min(innerWidth/PW, innerHeight/(960*M.scale)));
  V.PH = H; V.ox = (W - PW)/2; setOffset(V.ox, 0);
  V.spd = mode === 'line' ? V.PH/960 : 1 + (M.scale - 1)*.5;     // the pulled-back views cover more ground, so rocks move faster in world units
  if (mode === 'line'){
    V.ER = 675; V.earthTop = V.PH - 150; V.cx = PW/2; V.cy = V.earthTop + V.ER;
    V.SR = V.ER + 82; V.PR = V.ER + 36;
    const xs = [.42, .58, .26, .74, .11, .89];
    V.mounts = xs.map(x => { const a = -Math.PI/2 + Math.asin((x - .5)*PW/V.PR); return pad(a); });
  } else if (mode === 'half'){
    // the ring's ends sit just above the bottom HUD panel
    V.ER = 250; V.cx = PW/2; V.cy = V.PH - (hudPx('.bottom', 70) + 24)/ZOOM; V.earthTop = V.cy - V.ER;
    V.SR = V.ER + 120; V.PR = V.ER + 52;
    const n = 8, angs = Array.from({ length:n }, (_, i) => -Math.PI + .32 + i/(n - 1)*(Math.PI - .64));
    V.mounts = centreOut(angs, -Math.PI/2).map(pad);
  } else {
    // centred in the space between the two HUD panels
    const t = hudPx('.top', 50)/ZOOM, bt = V.PH - hudPx('.bottom', 70)/ZOOM;
    V.ER = 175; V.cx = PW/2; V.cy = (t + bt)/2; V.earthTop = V.cy - V.ER;
    V.SR = V.ER + 105; V.PR = V.ER + 45;
    const n = 10, angs = Array.from({ length:n }, (_, i) => -Math.PI/2 + i/n*Math.PI*2);
    V.mounts = centreOut(angs, -Math.PI/2).map(pad);
  }
  V.room = Math.max(1, ...Array.from({ length:64 }, (_, i) => edgeDist(i/64*Math.PI*2) - V.SR));
  V.spawnR = Math.hypot(Math.max(V.cx, PW - V.cx) + V.ox, Math.max(V.cy, V.PH - V.cy)) + 60;
  document.documentElement.style.setProperty('--colw', `${Math.round(PW*ZOOM)}px`);
  return prevZoom/ZOOM;
}
const hudPx = (sel, fb) => { const el = document.querySelector(sel); return (el && el.offsetHeight || fb) + 18; };
const pad = a => ({ a, x:V.cx + Math.cos(a)*V.PR, y:V.cy + Math.sin(a)*V.PR });
// order pads by how close they are to the top, so the first turrets sit facing the first rocks
function centreOut(angs, top){
  const d = a => Math.abs(Math.atan2(Math.sin(a - top), Math.cos(a - top)));
  return [...angs].sort((p, q) => d(p) - d(q) || p - q);
}
// zoom-out transition: start drawn at the old scale and ease out to the new one
export function startCamera(fromScale){ V.cam = V.camFrom = fromScale; V.camT = 0; }
export function tickCamera(dt){
  if (V.cam === 1) return;
  V.camT += dt; const k = Math.min(1, V.camT/1.6), e = k < .5 ? 4*k*k*k : 1 - Math.pow(-2*k + 2, 3)/2;
  V.cam = k >= 1 ? 1 : V.camFrom + (1 - V.camFrom)*e;
}

// geometry helpers used everywhere
export const distC = (x, y) => Math.hypot(x - V.cx, y - V.cy);
export const angC = (x, y) => Math.atan2(y - V.cy, x - V.cx);
export const shieldAt = a => ({ x:V.cx + Math.cos(a)*V.SR, y:V.cy + Math.sin(a)*V.SR });
// how close to the shield something is (bigger = more urgent)
export const threat = e => V.SR - distC(e.x, e.y);
// where a new rock appears, and the arc of the shield it heads for
// a direction for a group of rocks: x fraction across the column (line) or an angle (half/full)
export function pickDir(){
  if (V.mode === 'line') return { u:.1 + Math.random()*.8 };
  const pick = () => V.mode === 'half' ? -Math.PI + Math.random()*Math.PI : Math.random()*Math.PI*2;
  let a = pick();
  for (let i = 0; i < 16; i++){ const room = Math.max(0, edgeDist(a) - V.SR)/V.room; if (Math.random() < room*room) break; a = pick(); }
  return { a };
}
export function spawnPoint(T, dir){
  if (V.mode === 'line'){
    if (T.comet){ const x = Math.random() < .5 ? -30 : PW + 30, y = 40 + Math.random()*220; return { x, y, aim:-Math.PI/2 + (Math.random() - .5)*.6 }; }
    const u = dir && dir.u !== undefined ? Math.max(0, Math.min(1, dir.u + (Math.random() - .5)*.3)) : Math.random();
    const x = T.boss ? PW/2 : T.r + u*(PW - T.r*2);
    return { x, y:-T.r - Math.random()*40, aim:angC(x, V.cy - V.SR) + (Math.random() - .5)*.25 };
  }
  // half: anywhere over the top half; full: anywhere around — but weighted toward the directions with
  // more room to cross, so a phone's narrow sides don't throw rocks straight onto the shield
  const pick = () => V.mode === 'half' ? -Math.PI + Math.random()*Math.PI : Math.random()*Math.PI*2;
  let a;
  if (dir && dir.a !== undefined && !T.boss){ a = dir.a + (Math.random() - .5)*.7; if (V.mode === 'half') a = Math.max(-Math.PI + .05, Math.min(-.05, a)); }
  else { a = pick(); for (let i = 0; i < 16; i++){ const room = Math.max(0, edgeDist(a) - V.SR)/V.room; if (Math.random() < room*room) break; a = pick(); } }
  const r = edgeDist(a) + 30 + T.r;
  return { x:V.cx + Math.cos(a)*r, y:V.cy + Math.sin(a)*r, aim:a + (Math.random() - .5)*(T.comet ? 1.2 : .5) };
}
// distance from Earth's centre to the edge of the play column along an angle (rocks appear just outside it)
function edgeDist(a){
  const dx = Math.cos(a), dy = Math.sin(a), x0 = 0, x1 = PW;
  const tx = dx > 0 ? (x1 - V.cx)/dx : dx < 0 ? (x0 - V.cx)/dx : 1e9;
  const ty = dy > 0 ? (V.PH - V.cy)/dy : dy < 0 ? (0 - V.cy)/dy : 1e9;
  return Math.min(tx, ty);
}
export const inWorld = (x, y, m = 40) => x > -V.ox - m && x < PW + V.ox + m && y > -m && y < V.PH + m;
