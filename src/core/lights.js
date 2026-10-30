/* ---------- screen shake (respects reduced motion) ---------- */
import { addShakeRaw, reduce } from './canvas.js';

export const addShake = v => { if (!reduce) addShakeRaw(v); };
