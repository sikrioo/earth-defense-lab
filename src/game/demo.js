import { H, W, origin, time } from '../core/canvas.js';
import { CLASSES } from '../skills/index.js';
import { cast, demo } from './input.js';

/* ---------- opening demo ---------- */
const DEMO = [[0,3,.3,.5,.46],[1,4,1.4,.3,.36],[2,1,2.6,.72,.4],[3,2,3.6,.28,.4],[0,8,4.6,.6,.3],[3,4,5.8,.75,.45],[2,0,6.8,.32,.46],[3,1,8,.6,.3],[0,4,9,.5,.32]];
let demoIdx = 0;
export function runDemo(){
  if (!demo || demoIdx >= DEMO.length) return;
  const [c, k, at, fx, fy] = DEMO[demoIdx]; if (time < at) return; demoIdx++;
  CLASSES[c].skills[k].cdLeft = 0; cast(c, k, W*fx, Math.min(origin.y - 80, H*fy), true);
}
