/* ---------- fortress mode: save and continue — a checkpoint at the start of every wave ----------
   Kept in this browser only. Test runs (bots, stage select, boss test, invincible) are never saved. */
const KEY = 'edl.save.v1';
export function hasSave(){ try { return !!localStorage.getItem(KEY); } catch (_){ return false; } }
export function readSave(){ try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s && s.v === 1 ? s : null; } catch (_){ return null; } }
export function clearSave(){ try { localStorage.removeItem(KEY); } catch (_){ /* fine */ } }
export function writeSave(data){ try { localStorage.setItem(KEY, JSON.stringify({ v:1, at:Date.now(), ...data })); return true; } catch (_){ return false; } }
