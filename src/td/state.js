/* ---------- fortress mode: one shared run state ---------- */
export const G = {
  phase:'wave',          // 'wave' | 'break' | 'over' | 'win'
  wave:0, breakT:0,
  speed:1, paused:false, picking:false, codexOpen:false,
  hp:0, hpMax:0, regen:0, hitT:0,
  energy:0, need:0, picks:0, energyMul:1, shatter:0, magnet:46,
  cores:[], coreQueue:0, coreOpen:false, evoQueue:[],
  kills:0, time:0, runTime:0,
  queue:[], spawnT:0, waveTotal:0, waveDone:0,
  banner:null, bannerT:0,
};
export const enemies = [];   // live rocks and bosses
export const shots = [];     // projectiles in flight
export const fx = [];        // short-lived visuals: { update(dt) → keep?, draw() }
