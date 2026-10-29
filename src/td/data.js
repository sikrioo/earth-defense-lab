/* ---------- fortress mode numbers: rocks, waves, turrets, upgrade cards, fortress ---------- */

// rocks. hp/speed scale up with the wave; dmg is what reaching the shield costs the fortress
export const ROCK = {
  rock:    { ko:'운석',       hp:30,    r:14, speed:56,  dmg:10,  energy:1,   col:[255,150,70],  sides:7 },
  dart:    { ko:'파편 떼',    hp:16,    r:9,  speed:118, dmg:6,   energy:1,   col:[255,220,110], sides:5, weave:46 },
  splitter:{ ko:'분열 운석',  hp:62,    r:18, speed:44,  dmg:15,  energy:2,   col:[120,236,255], sides:8, split:3 },
  shard:   { ko:'파편',       hp:14,    r:8,  speed:78,  dmg:5,   energy:.5,  col:[120,236,255], sides:5 },
  brute:   { ko:'철 운석',    hp:150,   r:25, speed:30,  dmg:30,  energy:4,   col:[200,206,230], sides:9, armor:3 },
  comet:   { ko:'붉은 혜성',  hp:40,    r:10, speed:250, dmg:25,  energy:3,   col:[255,84,60],   sides:6, comet:true },
  elite:   { ko:'수정 운석',  hp:520,   r:30, speed:26,  dmg:60,  energy:12,  col:[220,120,255], sides:6, armor:4, elite:true },
  spore:   { ko:'포자',       hp:22,    r:13, speed:74,  dmg:8,   energy:1,   col:[255,70,95],   organic:true, weave:34 },
  pod:     { ko:'기생 포드',  hp:95,    r:16, speed:40,  dmg:20,  energy:3,   col:[255,60,85],   organic:true, split:3, splitInto:'spore' },
  colossus:{ ko:'거대 운석',  hp:3600,  r:66, speed:12,  dmg:300, energy:60,  col:[255,120,60],  sides:11, boss:true, spawns:'rock', every:3.2 },
  hive:    { ko:'생체 행성',  hp:7000,  r:82, speed:10,  dmg:500, energy:110, col:[255,50,75],   boss:true, organic:true, spawns:'spore', every:1.5 },
  planet:  { ko:'떠돌이 행성', hp:9000, r:86, speed:9,   dmg:600, energy:120, col:[255,70,60],   boss:true, planet:true, spawns:'dart', every:2.4 },
};

// 30 waves. Every wave gets a budget of rocks; types join as the waves go on (organics from wave 8);
// bosses: 10 colossus, 15 living planet, 20 rogue planet, 25 living planet + colossus, 30 rogue + living planet
export const WAVES = {
  last: 30,
  count: w => Math.round(10 + w*2.8),
  window: w => 12 + w*.3,                      // seconds the wave's rocks are spread over
  hp: w => Math.pow(1.12, w - 1),
  speed: w => 1 + Math.min(.5, w*.018),
  mix: w => [
    ['rock', 10],
    ['dart', w >= 2 ? 5 : 0],
    ['comet', w >= 3 ? 1.2 : 0],
    ['splitter', w >= 4 ? 3 : 0],
    ['brute', w >= 6 ? 2.4 : 0],
    ['spore', w >= 8 ? 3 : 0],
    ['pod', w >= 11 ? 1.6 : 0],
  ],
  extra: w => w === 30 ? ['planet', 'hive'] : w === 25 ? ['hive', 'colossus'] : w === 20 ? ['planet'] : w === 15 ? ['hive'] : w === 10 ? ['colossus'] : w % 5 === 0 ? ['elite'] : w > 12 && w % 3 === 0 ? ['elite'] : [],
  breakTime: 2,
};

export const FORT = { hp:1000, mounts:6 };

// energy: every kill fills the bar, a full bar is one pick of three cards; each pick needs a bit more
export const ENERGY = { first:5, step:3, grow:1.04 };

// turrets: base stats, and the cards that upgrade each one (max = times it can be taken)
export const TURRET = {
  gatling: { ko:'개틀링', en:'GATLING', col:[90,230,255], desc:'빠른 연사로 하나씩 정확하게',
    base:{ dmg:7, rate:6, range:620, bullets:1, pierce:0, crit:0 } },
  laser:   { ko:'레이저', en:'LASER', col:[255,90,220], desc:'한 대상에 오래 쏠수록 강해지는 빔',
    base:{ dps:24, range:560, beams:1, ramp:1.6, rampMax:3, melt:0 } },
  missile: { ko:'미사일', en:'MISSILE', col:[255,170,60], desc:'유도 미사일, 맞은 자리 폭발',
    base:{ dmg:26, every:1.8, count:2, blast:46, range:700, cluster:0 } },
  cryo:    { ko:'냉각포', en:'CRYO', col:[130,205,255], desc:'범위 냉각탄, 맞은 운석을 느리게',
    base:{ dmg:10, every:1.4, radius:62, slow:.4, slowT:2.5, freeze:0, shatter:0, range:640 } },
  tesla:   { ko:'테슬라', en:'TESLA', col:[176,156,255], desc:'번개가 운석을 타고 튄다',
    base:{ dmg:20, every:1.1, jumps:3, hop:135, stun:0, conduct:0, range:560 } },
  drone:   { ko:'리볼버 드론', en:'REVOLVER', col:[255,206,110], desc:'운석을 쫓아다니며 범위 사격',
    base:{ dmg:12, every:.6, radius:34, drones:1, speed:300, pull:0 } },
};

// upgrade cards. apply(s) changes that turret's stats; key cards (max 1) are marked core
export const UPG = {
  gatling: [
    { id:'g_dmg',   ko:'고폭탄',     d:'피해 +30%',                     max:5, apply:s => { s.dmg *= 1.3; } },
    { id:'g_rate',  ko:'회전 가속',   d:'연사 속도 +25%',                max:5, apply:s => { s.rate *= 1.25; } },
    { id:'g_twin',  ko:'쌍열 포신',   d:'한 번에 쏘는 탄 +1',             max:2, apply:s => { s.bullets += 1; } },
    { id:'g_pierce',ko:'관통탄',     d:'탄이 운석 1개를 더 뚫고 지나감',  max:2, apply:s => { s.pierce += 1; } },
    { id:'g_crit',  ko:'치명 사격',   d:'15% 확률로 피해 3배',            max:1, apply:s => { s.crit = .15; } },
  ],
  laser: [
    { id:'l_dps',   ko:'출력 증폭',   d:'빔 피해 +35%',                   max:5, apply:s => { s.dps *= 1.35; } },
    { id:'l_split', ko:'프리즘',     d:'빔이 하나 더 갈라져 다른 운석도 조준', max:2, apply:s => { s.beams += 1; } },
    { id:'l_ramp',  ko:'과열 가속',   d:'최대 출력까지 빨라지고 최대치 +1배',  max:2, apply:s => { s.ramp *= .65; s.rampMax += 1; } },
    { id:'l_melt',  ko:'융해',       d:'냉각된 운석에 빔 피해 +60%',        max:1, apply:s => { s.melt = .6; } },
  ],
  missile: [
    { id:'m_count', ko:'다연장',     d:'한 번에 미사일 +2',              max:3, apply:s => { s.count += 2; } },
    { id:'m_dmg',   ko:'고성능 탄두', d:'피해 +35%',                     max:5, apply:s => { s.dmg *= 1.35; } },
    { id:'m_blast', ko:'폭발 반경',   d:'폭발 범위 +30%',                 max:3, apply:s => { s.blast *= 1.3; } },
    { id:'m_rate',  ko:'자동 장전',   d:'발사 간격 -20%',                 max:3, apply:s => { s.every *= .8; } },
    { id:'m_cluster',ko:'집속탄',    d:'폭발할 때 작은 폭탄 3개가 흩어짐',  max:1, apply:s => { s.cluster = 3; } },
  ],
  cryo: [
    { id:'c_slow',  ko:'극저온',     d:'감속 +12%p',                     max:3, apply:s => { s.slow += .12; } },
    { id:'c_area',  ko:'확산 냉각',   d:'냉각 범위 +30%',                 max:3, apply:s => { s.radius *= 1.3; } },
    { id:'c_rate',  ko:'연속 냉각',   d:'발사 간격 -20%',                 max:3, apply:s => { s.every *= .8; } },
    { id:'c_freeze',ko:'순간 동결',   d:'20% 확률로 1.2초 얼림 (2단계 35%)', max:2, apply:s => { s.freeze = s.freeze ? .35 : .2; } },
    { id:'c_shatter',ko:'파쇄',      d:'냉각된 운석이 모든 피해를 +25% 더 받음 (2단계 +50%)', max:2, apply:s => { s.shatter += .25; } },
  ],
  tesla: [
    { id:'t_chain', ko:'확장 코일',   d:'번개가 튀는 횟수 +2',             max:3, apply:s => { s.jumps += 2; } },
    { id:'t_dmg',   ko:'고전압',     d:'피해 +35%',                     max:5, apply:s => { s.dmg *= 1.35; } },
    { id:'t_rate',  ko:'축전 가속',   d:'발사 간격 -20%',                 max:3, apply:s => { s.every *= .8; } },
    { id:'t_stun',  ko:'과부하',     d:'맞은 운석 0.4초 정지',            max:1, apply:s => { s.stun = .4; } },
    { id:'t_conduct',ko:'도체',      d:'냉각된 운석에 피해 +50%',          max:1, apply:s => { s.conduct = .5; } },
  ],
  drone: [
    { id:'r_drone', ko:'드론 추가',   d:'리볼버 드론 +1',                 max:3, apply:s => { s.drones += 1; } },
    { id:'r_dmg',   ko:'화력',       d:'피해 +30%',                     max:5, apply:s => { s.dmg *= 1.3; } },
    { id:'r_rate',  ko:'연사',       d:'발사 간격 ×0.85',                max:4, apply:s => { s.every *= .85; } },
    { id:'r_bore',  ko:'구경',       d:'사격 범위 +20%',                 max:3, apply:s => { s.radius *= 1.2; } },
    { id:'r_pull',  ko:'견인',       d:'범위 안 운석을 중심으로 끌어당김',  max:2, apply:s => { s.pull += 1; } },
  ],
};

// fortress cards
export const FORT_UPG = [
  { id:'f_hp',     ko:'장갑 보강',   d:'요새 최대 체력 +20%, 체력 30% 회복', max:5 },
  { id:'f_regen',  ko:'자가 수리',   d:'초당 체력 +3 회복',               max:3 },
  { id:'f_energy', ko:'에너지 효율', d:'에너지 획득 +20%',                max:3 },
];
