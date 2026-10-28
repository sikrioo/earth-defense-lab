/* ---------- fortress mode: the portrait column and where things sit in it ---------- */
import { H, W, ZOOM, setOffset, setViewport } from '../core/canvas.js';

export const PW = 540;             // play column width in world units (phones fill their width with it)
export const V = {
  PH:960, ox:0,                   // column height, left edge on wide screens
  spd:1,                          // travel speeds scale with column height so a run plays the same everywhere
  earthTop:0, earthR:0, platY:0, defY:0,
  mounts:[],                      // turret pads on the platform, filled centre-out
};
const ORDER = [2, 3, 1, 4, 0, 5];

export function fitView(){
  // fit a 540×960 column: full width on phones, full height on wide screens
  setViewport(Math.min(innerWidth/PW, innerHeight/960));
  V.PH = H; V.ox = (W - PW)/2; V.spd = V.PH/960;
  setOffset(V.ox, 0);
  V.earthTop = V.PH - 150; V.earthR = PW*1.25;
  V.platY = V.PH - 186; V.defY = V.PH - 236;
  const xs = [.11, .26, .42, .58, .74, .89];
  V.mounts = ORDER.map(i => ({ x:PW*xs[i], y:V.platY + Math.pow((xs[i] - .5)*2, 2)*16 }));
  document.documentElement.style.setProperty('--colw', `${Math.round(PW*ZOOM)}px`);
}
// the shield bulges down slightly at the sides, like the platform
export const shieldY = x => V.defY + Math.pow((x/PW - .5)*2, 2)*26;
