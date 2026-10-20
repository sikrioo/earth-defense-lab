/* ---------- revolver ring numbers ---------- */
// base values for one ring; each level-up pick multiplies by its step
export const RING = {
  dmg:14, dmgStep:.25,            // FIRE: +25% per pick
  tick:.6, tickStep:.85,          // RATE: fire interval ×0.85 per pick
  radius:30, sizeStep:.2,         // BORE: +20% per pick
  speed:300, moveStep:.25,        // DRIVE: +25% per pick
  rankStep:.1,                    // style rank: +10% damage per rank
};
// style rank: consecutive hits needed for each rank
export const RANKS = [
  { k:'D', w:'DRY',   at:0 },  { k:'C', w:'COOL',  at:3 },  { k:'B', w:'BLUE',  at:6 },
  { k:'A', w:'ACE',   at:10 }, { k:'S', w:'SWING', at:15 }, { k:'SS', w:'BEBOP', at:22 },
];
