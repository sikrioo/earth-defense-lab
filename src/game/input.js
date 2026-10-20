import { ZOOM, cv, origin } from '../core/canvas.js';
import { floats } from '../enemies/list.js';
import { gameOver } from '../world/earth.js';
import { S } from '../loot/items.js';
import { CLASSES } from '../skills/index.js';
import { cls, sel, select, setClass } from '../ui/skillbar.js';
import { paused } from '../ui/deck.js';
import { mana, manaCost, noManaT, orbState, setMana, setNoManaT } from '../ui/hud.js';

/* ---------- input ---------- */
export let holding = false, demo = false, autoT = .5;
export function setHolding(v){ return holding = v; }
export const tgt = { x:0, y:0 };
export function cast(c, k, x, y, free = false){
  const s = CLASSES[c].skills[k]; if (s.cdLeft > 0) return;
  if (!free){
    const m = manaCost(s);
    if (mana < m){ if (noManaT <= 0){ setNoManaT(.8); orbState.mp.hit = 1; floats.push({ x:origin.x, y:origin.y - 40, v:'마나 부족', c:[120,170,255], age:0, big:true }); } return; }
    setMana(mana - (m));
  }
  s.cdLeft = s.cd*(1 - (S.cdr || 0)/100); s.cast({ x:origin.x, y:origin.y }, { x, y });
}
const stop = () => { holding = false; };

// runs once at boot, from main.js, in the original file order
export function setup(){
  cv.addEventListener('pointerdown', e => { if (gameOver || paused) return; demo = false; try { cv.setPointerCapture(e.pointerId); } catch(_){} holding = true; tgt.x = e.clientX/ZOOM; tgt.y = e.clientY/ZOOM; cast(cls, sel, tgt.x, tgt.y); });
  cv.addEventListener('pointermove', e => { tgt.x = e.clientX/ZOOM; tgt.y = e.clientY/ZOOM; });
  cv.addEventListener('pointerup', stop);
   cv.addEventListener('pointercancel', stop);
   cv.addEventListener('lostpointercapture', stop);
  cv.addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('keydown', e => {
    const n = e.key === '0' ? 10 : parseInt(e.key, 10);
    if (n >= 1 && n <= CLASSES[cls].skills.length){ select(n-1); demo = false; return; }
    const ci = CLASSES.findIndex(c => c.key === e.key.toLowerCase()); if (ci >= 0){ setClass(ci); demo = false; }
  });
}
