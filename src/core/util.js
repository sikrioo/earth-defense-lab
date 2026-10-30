/* ---------- small helpers ---------- */
// seeded random: the same seed gives the same sequence (star fields, rock shapes)
export function srng(seed){ let v = seed % 2147483647 || 1; return () => (v = v*16807 % 2147483647)/2147483647; }
