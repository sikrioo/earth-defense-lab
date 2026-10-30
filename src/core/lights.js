/* ---------- screen shake (respects reduced motion) ---------- */
import { addShakeRaw, reduce } from './canvas.js';

let scale = 1;
export const setShakeScale = v => { scale = v; };
export const addShake = v => { if (!reduce && scale > 0) addShakeRaw(v*scale); };
