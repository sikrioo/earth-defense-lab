/* ---------- fortress mode numbers: rocks, waves, turrets, upgrade cards, fortress ---------- */

// rocks. hp/speed scale up with the wave; dmg is what reaching the shield costs the fortress
export const ROCK = {
  rock:    { ko:'운석', desc:'가장 흔한 운석. 곧게 떨어진다.',       hp:30,    r:14, speed:56,  dmg:10,  energy:1,   col:[255,150,70],  sides:7 },
  dart:    { ko:'파편 떼', desc:'작고 빠른 파편 무리. 좌우로 흔들리며 내려온다.',    hp:16,    r:9,  speed:118, dmg:6,   energy:1,   col:[255,220,110], sides:5, weave:46 },
  splitter:{ ko:'분열 운석', desc:'부수면 파편 3개로 쪼개진다. 범위 무기로 한꺼번에.',  hp:62,    r:18, speed:44,  dmg:15,  energy:2,   col:[120,236,255], sides:8, split:3 },
  shard:   { ko:'파편', desc:'분열 운석에서 떨어져 나온 조각. 약하지만 빠르다.',       hp:14,    r:8,  speed:78,  dmg:5,   energy:.5,  col:[120,236,255], sides:5 },
  brute:   { ko:'철 운석', desc:'장갑을 두른 철 운석. 한 발에 3씩 피해를 덜 받는다 — 작은 탄이 약하다.',    hp:150,   r:25, speed:30,  dmg:30,  energy:4,   col:[200,206,230], sides:9, armor:3 },
  comet:   { ko:'붉은 혜성', desc:'옆에서 비스듬히 날아드는 빠른 혜성. 직선으로만 움직인다.',  hp:40,    r:10, speed:250, dmg:25,  energy:3,   col:[255,84,60],   sides:6, comet:true },
  elite:   { ko:'수정 운석', desc:'단단한 수정 운석. 장갑 4, 체력이 높고 처치하면 에너지가 많다.',  hp:520,   r:30, speed:26,  dmg:60,  energy:12,  col:[220,120,255], sides:6, armor:4, elite:true },
  spore:   { ko:'포자', desc:'꿈틀대며 다가오는 생체 포자. 불에 약하다.',       hp:22,    r:13, speed:74,  dmg:8,   energy:1,   col:[255,70,95],   organic:true, weave:34 },
  pod:     { ko:'기생 포드', desc:'기생 포드. 터지면 포자 3개가 쏟아진다. 불에 약하다.',  hp:95,    r:16, speed:40,  dmg:20,  energy:3,   col:[255,60,85],   organic:true, split:3, splitInto:'spore' },
  colossus:{ ko:'거대 운석', desc:'보스. 거대한 운석이 작은 운석을 흩뿌리며 천천히 내려온다.',  hp:3000,  r:66, speed:12,  dmg:300, energy:60,  col:[255,120,60],  sides:11, boss:true, spawns:'rock', every:3.2 },
  hive:    { ko:'생체 행성', desc:'보스. 살아 있는 행성. 촉수를 흔들며 포자를 끊임없이 뿜고, 눈이 요새를 노려본다. 불에 약하다.',  hp:7000,  r:82, speed:10,  dmg:500, energy:110, col:[255,50,75],   boss:true, organic:true, spawns:'spore', every:1.5 },
  planet:  { ko:'떠돌이 행성', desc:'보스. 목성 궤도에서 밀려난 떠돌이 행성. 닿으면 요새가 거의 무너진다.', hp:9000, r:86, speed:9,   dmg:600, energy:120, col:[255,70,60],   boss:true, planet:true, spawns:'dart', every:2.4 },
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
export const ENERGY = { first:5, step:2.8, grow:1.04 };

// turrets: base stats, and the cards that upgrade each one (max = times it can be taken).
// every gun has a trade-off (cons) that shows on its card and in the codex
export const TURRET = {
  gatling: { ko:'개틀링', en:'GATLING', col:[90,230,255], role:'단일 · 연사', desc:'빠른 연사로 하나씩 정확하게',
    pros:['연사가 빨라 작은 적을 빨리 정리', '조준을 앞질러 쏴서 빠른 적도 맞춤'],
    cons:'3초쯤 쏘면 과열돼 1.4초 쉼 · 한 발이 약해 장갑 적에게 약함',
    base:{ dmg:8, rate:6, range:620, bullets:1, pierce:0, crit:0, heatPer:5, cool:1.4 } },
  laser:   { ko:'레이저', en:'LASER', col:[255,90,220], role:'단일 · 지속', desc:'한 대상에 오래 쏠수록 강해지는 빔',
    pros:['한 대상에 붙으면 최대 2.5배까지 강해짐', '빗나가지 않음'],
    cons:'전지 2.4초 분량을 다 쓰면 2.2초 충전 · 대상을 바꾸면 출력이 처음부터',
    base:{ dps:26, range:560, beams:1, ramp:1.6, rampMax:2.5, melt:0, cap:2.4, recharge:2.2 } },
  missile: { ko:'미사일', en:'MISSILE', col:[255,170,60], role:'범위 · 유도', desc:'유도 미사일, 맞은 자리 폭발',
    pros:['폭발로 뭉친 적을 한꺼번에', '멀리서도 따라가서 맞춤'],
    cons:'요새 가까이(사각지대) 온 적은 못 쏨 · 장전이 느림',
    base:{ dmg:30, every:1.8, count:2, blast:46, range:700, cluster:0, minRange:230 } },
  cryo:    { ko:'냉각포', en:'CRYO', col:[130,205,255], role:'제어 · 범위', desc:'범위 냉각탄, 맞은 운석을 느리게',
    pros:['넓게 느리게 해서 다른 포탑이 맞출 시간을 벌어줌', '파쇄·융해·도체 시너지의 핵심'],
    cons:'피해가 아주 약함 · 보스는 최대 30%까지만 느려짐',
    base:{ dmg:10, every:1.4, radius:62, slow:.4, slowT:2.5, freeze:0, shatter:0, range:640 } },
  tesla:   { ko:'테슬라', en:'TESLA', col:[176,156,255], role:'연쇄 · 범위', desc:'번개가 운석을 타고 튄다',
    pros:['뭉친 적 여럿을 한 번에', '과부하로 잠깐 멈춤'],
    cons:'사거리가 짧음 · 한 번 튈 때마다 피해 -25%',
    base:{ dmg:26, every:1.1, jumps:3, hop:135, stun:0, conduct:0, range:440, falloff:.75 } },
  drone:   { ko:'리볼버 드론', en:'REVOLVER', col:[255,206,110], role:'범위 · 추적', desc:'운석을 쫓아다니며 범위 사격',
    pros:['위험한 적부터 직접 쫓아감', '견인으로 적을 모아줌'],
    cons:'멈춰서야 쏠 수 있어 빠른 적(혜성·파편 떼)을 자주 놓침',
    base:{ dmg:14, every:.6, radius:34, drones:1, speed:300, pull:0, hoverSpeed:150 } },
  rail:    { ko:'레일건', en:'RAILGUN', col:[150,255,190], role:'관통 · 한 방', desc:'오래 모아 한 줄을 통째로 꿰뚫는다',
    pros:['일직선의 모든 적을 관통', '장갑을 무시하는 큰 한 방'],
    cons:'충전 3.2초 · 발사 직전 조준이 고정돼 빠른 적은 빗나감',
    base:{ dmg:260, charge:3.2, width:9, lockAt:.82, range:2000 } },
  flame:   { ko:'화염방사기', en:'FLAMER', col:[255,110,50], role:'근접 · 지속', desc:'요새 코앞에서 불길로 태운다',
    pros:['부채꼴로 여럿을 동시에, 화상 피해가 쌓임', '생체형(포자·포드·생체 행성)에 피해 +60%'],
    cons:'사거리가 아주 짧음(요새 코앞) · 작은 피해를 자주 줘서 장갑에 거의 안 먹힘',
    base:{ dps:50, range:270, cone:.55, burn:6, stacks:4, organic:.6 } },
};

// upgrade cards. apply(s) changes that turret's stats; key cards (max 1) are marked core
export const UPG = {
  gatling: [
    { id:'g_dmg',   ko:'고폭탄',     d:'피해 +30%',                     max:5, apply:s => { s.dmg *= 1.3; } },
    { id:'g_rate',  ko:'회전 가속',   d:'연사 속도 +25% (과열도 빨라짐)',   max:4, apply:s => { s.rate *= 1.25; } },
    { id:'g_cool',  ko:'냉각 재킷',   d:'과열이 30% 늦게 오고 식는 시간 -25%', max:2, apply:s => { s.heatPer *= .7; s.cool *= .75; } },
    { id:'g_twin',  ko:'쌍열 포신',   d:'한 번에 쏘는 탄 +1',             max:2, apply:s => { s.bullets += 1; } },
    { id:'g_pierce',ko:'관통탄',     d:'탄이 운석 1개를 더 뚫고 지나감',  max:2, apply:s => { s.pierce += 1; } },
    { id:'g_crit',  ko:'치명 사격',   d:'15% 확률로 피해 3배',            max:1, apply:s => { s.crit = .15; } },
  ],
  laser: [
    { id:'l_dps',   ko:'출력 증폭',   d:'빔 피해 +30%',                   max:5, apply:s => { s.dps *= 1.3; } },
    { id:'l_cell',  ko:'대용량 전지', d:'한 번에 쏘는 시간 +40%',           max:3, apply:s => { s.cap *= 1.4; } },
    { id:'l_charge',ko:'급속 충전',   d:'충전 시간 -25%',                  max:3, apply:s => { s.recharge *= .75; } },
    { id:'l_split', ko:'프리즘',     d:'빔이 하나 더 갈라짐 (전지 소모도 +50%)', max:2, apply:s => { s.beams += 1; } },
    { id:'l_melt',  ko:'융해',       d:'냉각된 운석에 빔 피해 +60%',        max:1, apply:s => { s.melt = .6; } },
  ],
  missile: [
    { id:'m_count', ko:'다연장',     d:'한 번에 미사일 +2',              max:3, apply:s => { s.count += 2; } },
    { id:'m_dmg',   ko:'고성능 탄두', d:'피해 +35%',                     max:5, apply:s => { s.dmg *= 1.35; } },
    { id:'m_blast', ko:'폭발 반경',   d:'폭발 범위 +30%',                 max:3, apply:s => { s.blast *= 1.3; } },
    { id:'m_rate',  ko:'자동 장전',   d:'발사 간격 -20%',                 max:3, apply:s => { s.every *= .8; } },
    { id:'m_close', ko:'근접 신관',   d:'사각지대 절반으로 줄어듦',          max:1, apply:s => { s.minRange *= .5; } },
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
    { id:'t_reach', ko:'안테나 연장', d:'사거리 +30%',                    max:2, apply:s => { s.range *= 1.3; } },
    { id:'t_stun',  ko:'과부하',     d:'맞은 운석 0.4초 정지',            max:1, apply:s => { s.stun = .4; } },
    { id:'t_conduct',ko:'도체',      d:'냉각된 운석에 피해 +50%, 튈 때 감소 없음', max:1, apply:s => { s.conduct = .5; } },
  ],
  drone: [
    { id:'r_drone', ko:'드론 추가',   d:'리볼버 드론 +1',                 max:3, apply:s => { s.drones += 1; } },
    { id:'r_dmg',   ko:'화력',       d:'피해 +30%',                     max:5, apply:s => { s.dmg *= 1.3; } },
    { id:'r_rate',  ko:'연사',       d:'발사 간격 ×0.85',                max:4, apply:s => { s.every *= .85; } },
    { id:'r_bore',  ko:'구경',       d:'사격 범위 +20%',                 max:3, apply:s => { s.radius *= 1.2; } },
    { id:'r_gyro',  ko:'자이로 안정', d:'움직이면서도 쏠 수 있음',          max:1, apply:s => { s.hoverSpeed = 1e9; } },
    { id:'r_pull',  ko:'견인',       d:'범위 안 운석을 중심으로 끌어당김',  max:2, apply:s => { s.pull += 1; } },
  ],
  rail: [
    { id:'rg_dmg',  ko:'고출력 코일', d:'피해 +35%',                     max:5, apply:s => { s.dmg *= 1.35; } },
    { id:'rg_charge',ko:'급속 충전', d:'충전 시간 -15%',                 max:4, apply:s => { s.charge *= .85; } },
    { id:'rg_width',ko:'광폭 탄',    d:'탄 폭 +60%, 덜 빗나감',          max:2, apply:s => { s.width *= 1.6; } },
    { id:'rg_track',ko:'추적 조준',   d:'발사 직전까지 조준을 따라감 (빗나감 거의 없음)', max:1, apply:s => { s.lockAt = .97; } },
    { id:'rg_shock',ko:'충격파',     d:'꿰뚫은 자리마다 작은 폭발 (피해 25%)', max:1, apply:s => { s.shock = .25; } },
  ],
  flame: [
    { id:'f_fuel',  ko:'연료 첨가',   d:'불길 피해 +30%',                 max:5, apply:s => { s.dps *= 1.3; } },
    { id:'f_reach', ko:'고압 노즐',   d:'사거리 +25%',                    max:3, apply:s => { s.range *= 1.25; } },
    { id:'f_wide',  ko:'광각 노즐',   d:'부채꼴 폭 +40%',                 max:2, apply:s => { s.cone *= 1.4; } },
    { id:'f_sticky',ko:'점착 연료',   d:'화상 중첩 +3',                   max:2, apply:s => { s.stacks += 3; } },
    { id:'f_purge', ko:'소각',       d:'생체형에 피해 +60% 더',            max:1, apply:s => { s.organic += .6; } },
  ],
};

// fortress cards
export const FORT_UPG = [
  { id:'f_hp',     ko:'장갑 보강',   d:'요새 최대 체력 +20%, 체력 30% 회복', max:5 },
  { id:'f_regen',  ko:'자가 수리',   d:'초당 체력 +3 회복',               max:3 },
  { id:'f_energy', ko:'에너지 효율', d:'에너지 획득 +20%',                max:3 },
];
