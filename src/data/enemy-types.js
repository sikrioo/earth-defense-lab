/* ---------- rock types: hit points, size, colours, speed, xp, Earth damage ---------- */
// Hunched demons ("fallen"-like). s = drawing scale; r/h = hitbox in px.
// Orb dummies. r = radius in px (height = 2r); VSIZE gives each one of three sizes.
export const VSIZE = [.85, 1, 1.15];
export const ETYPE = {
  normal:{ hp:120,  r:12,   body:[160,84,94],  bar:[210,44,44],  sides:0, speed:1, fall:24, xp:5, hit:20 },
  runner:{ hp:60,   r:9,    body:[86,150,116], bar:[90,210,140], sides:3, speed:4, fall:52, xp:4, hit:10 },   // small, quick triangles
  brute: { hp:300,  r:17,   body:[92,88,102],  bar:[170,170,190], sides:4, speed:.5, fall:13, xp:12, hit:45 }, // heavy grey blocks
  meteor:{ hp:220,  r:17,   body:[122,106,92], bar:[220,180,140], sides:0, speed:.8, fall:18, xp:10, hit:40 }, // real-looking meteorites
  elite: { hp:420,  r:15.5, body:[46,74,150],  bar:[90,150,255],  sides:0, speed:1, fall:20, xp:30, hit:60 },
  boss:  { hp:1600, r:27,   body:[186,112,26], bar:[255,190,60],  sides:0, speed:1, fall:10, xp:150, hit:250 },
  comet: { hp:70,   r:7,    body:[236,104,74],  bar:[255,96,64],   sides:0, speed:1, fall:200, xp:14, hit:35, free:true, ballistic:true },   // fast; half are fly-bys
  splitter:{ hp:200, r:14,  body:[104,92,126], bar:[110,236,255], sides:0, speed:1, fall:20, xp:10, hit:30, split:true },  // breaks into 3 shards
  shard: { hp:45,   r:6,    body:[116,104,140], bar:[110,236,255], sides:0, speed:1, fall:55, xp:2, hit:8 },
  pebble:{ hp:28,   r:4.5,  body:[150,128,108], bar:[255,190,120], sides:0, speed:1, fall:150, xp:2, hit:6, free:true },  // meteor shower
  planet:{ hp:6000, r:64,   body:[128,62,54],  bar:[216,57,43],   sides:0, speed:1, fall:9, xp:500, hit:250, free:true },   // rogue planet event
};
export const ECOL = { gun:[244,196,96], fire:[255,130,50], ice:[120,195,255], bolt:[175,175,255], poison:[120,235,80], holy:[255,222,120], magic:[140,192,255],
  bone:[238,232,216], spirit:[130,232,222], blood:[236,60,56], steel:[230,236,246], rage:[255,86,96], shout:[255,192,96], bow:[234,218,182] };
