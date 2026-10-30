/* ---------- fortress mode numbers: rocks, waves, turrets, upgrade cards, fortress ---------- */

// rocks. hp/speed scale up with the wave; dmg is what reaching the shield costs the fortress
export const ROCK = {
  rock:    { ko:'운석', desc:'가장 흔한 운석. 곧게 떨어진다.',       hp:30,    r:14, speed:56,  dmg:10,  energy:1,   col:[255,150,70],  sides:7 },
  dart:    { ko:'파편 떼', desc:'작고 빠른 파편 무리. 좌우로 흔들리며 내려온다.',    hp:16,    r:9,  speed:118, dmg:6,   energy:1,   col:[255,220,110], sides:5, weave:46 },
  splitter:{ ko:'분열 운석', desc:'부수면 파편 3개로 쪼개진다. 범위 무기로 한꺼번에.',  hp:62,    r:18, speed:44,  dmg:15,  energy:2,   col:[120,236,255], sides:8, split:3 },
  shard:   { ko:'파편', desc:'분열 운석에서 떨어져 나온 조각. 약하지만 빠르다.',       hp:14,    r:8,  speed:78,  dmg:5,   energy:.5,  col:[120,236,255], sides:5 },
  brute:   { ko:'철 운석', desc:'장갑을 두른 철 운석. 한 발에 3씩 피해를 덜 받는다 — 작은 탄이 약하다.',    hp:150,   r:25, speed:30,  dmg:30,  energy:4,   col:[200,206,230], sides:9, armor:3 },
  comet:   { ko:'붉은 혜성', desc:'궤적 경고가 뜬 뒤 엄청난 속도로 돌진하는 혜성. 방어막에 부딪히면 크게 깎인다.',  hp:70,    r:14, speed:300, dmg:55,  energy:3,   col:[255,84,60],   sides:6, comet:true },
  elite:   { ko:'수정 운석', desc:'단단한 수정 운석. 장갑 4, 체력이 높고 처치하면 에너지가 많다.',  hp:520,   r:30, speed:26,  dmg:60,  energy:12,  col:[220,120,255], sides:6, armor:4, elite:true },
  spore:   { ko:'포자', desc:'꿈틀대며 다가오는 생체 포자. 불에 약하다.',       hp:22,    r:13, speed:74,  dmg:8,   energy:1,   col:[255,70,95],   organic:true, weave:34 },
  pod:     { ko:'기생 포드', desc:'기생 포드. 터지면 포자 3개가 쏟아진다. 불에 약하다.',  hp:95,    r:16, speed:40,  dmg:20,  energy:3,   col:[255,60,85],   organic:true, split:3, splitInto:'spore' },
  colossus:{ ko:'거대 운석', desc:'보스. 거대한 운석이 작은 운석을 흩뿌리며 천천히 내려온다.',  hp:3000,  r:66, speed:12,  dmg:300, energy:60,  col:[255,120,60],  sides:11, boss:true, spawns:'rock', every:3.2 },
  hive:    { ko:'생체 행성', desc:'보스. 살아 있는 행성. 촉수를 흔들며 포자를 끊임없이 뿜고, 눈이 요새를 노려본다. 불에 약하다.',  hp:7000,  r:82, speed:10,  dmg:500, energy:110, col:[255,50,75],   boss:true, organic:true, spawns:'spore', every:1.5 },
  icecomet:{ ko:'얼음 혜성', desc:'오르트 구름에서 온 얼음 혜성. 궤적 경고 뒤 돌진하고, 부서지면 얼음 파편 3개로 흩어진다.', hp:110, r:15, speed:270, dmg:45, energy:4, col:[170,225,255], sides:7, comet:true, split:3, splitInto:'iceshard' },
  iceshard:{ ko:'얼음 파편', desc:'얼음 혜성이 부서진 조각. 작고 빠르다.', hp:20, r:8, speed:90, dmg:6, energy:.5, col:[190,235,255], sides:5 },
  glacier: { ko:'빙하 덩어리', desc:'두꺼운 얼음 껍질. 체력이 70% 넘게 남은 동안은 장갑 8, 껍질이 깨지면 장갑이 사라진다. 불에 약하다.', hp:420, r:30, speed:22, dmg:40, energy:6, col:[200,235,255], sides:10, shell:8, icy:true },
  plasma:  { ko:'플라즈마 구', desc:'흔들리며 다가오는 플라즈마. 부서질 때 전자기 펄스가 터져 주변 포탑을 1.5초 멈춘다 — 멀리서 잡을 것.', hp:60, r:13, speed:82, dmg:14, energy:2, col:[230,120,255], plasma:true, weave:40, emp:150, custom:true },
  phase:   { ko:'위상 운석', desc:'공간을 접어 앞으로 순간이동한다. 사라져 있는 동안은 맞지 않는다.', hp:90, r:16, speed:46, dmg:18, energy:3, col:[120,255,230], sides:6, phase:true },
  lens:    { ko:'중력 렌즈', desc:'주변 공간을 휘게 하는 고밀도 천체. 근처를 지나는 탄환과 미사일이 휘어진다.', hp:240, r:20, speed:34, dmg:25, energy:5, col:[255,220,160], lens:150, custom:true },
  dark:    { ko:'암흑 물질', desc:'빛을 내지 않는 덩어리. 방어막 가까이 와야 보이고, 그 전에는 조준할 수 없다 (범위 공격은 맞는다).', hp:180, r:18, speed:46, dmg:30, energy:5, col:[170,130,230], sides:8, dark:true },
  node:    { ko:'불안정 핵', desc:'블랙홀 둘레를 도는 불안정한 핵. 모두 부숴야 블랙홀 본체가 잠깐 드러난다.', hp:900, r:16, speed:0, dmg:0, energy:8, col:[255,170,90], sides:6, node:true },
  saturn:  { ko:'토성의 잔해', desc:'보스. 사라진 토성의 부서진 핵. 고리 조각을 흩뿌리고, 고리가 남아 있는 동안은 피해를 절반만 받는다.', hp:8000, r:74, speed:9, dmg:700, energy:140, col:[255,200,120], boss:true, saturn:true, custom:true, every:2.8 },
  blackhole:{ ko:'블랙홀', desc:'최종 보스. 목성과 토성을 삼킨 것. 멈추지 않고 지구로 다가오며 탄환과 광물을 삼키고, 가까워질수록 요새를 빨아들인다. 방어막에 닿으면 지구가 삼켜진다. 둘레를 도는 불안정 핵을 모두 부숴야 본체가 7초 동안 드러나고 거의 멈춘다.', hp:9000, r:80, speed:5, dmg:5000, energy:300, col:[255,130,60], boss:true, blackhole:true, custom:true, spawns:'dark', every:4.5 },
  planet:  { ko:'떠돌이 행성', desc:'보스. 목성 궤도에서 밀려난 떠돌이 행성. 닿으면 요새가 거의 무너진다.', hp:9000, r:86, speed:9,   dmg:600, energy:120, col:[255,70,60],   boss:true, planet:true, spawns:'dart', every:2.4 },
};

// 30 waves. Every wave gets a budget of rocks; types join as the waves go on (organics from wave 8);
// bosses: 10 colossus, 15 living planet, 20 rogue planet, 25 Saturn's remnant, 30 the black hole
export const WAVES = {
  last: 30,
  count: w => Math.round(10 + w*2.8),
  window: w => 12 + w*.3,                      // seconds the wave's rocks are spread over
  hp: w => Math.pow(1.1, w - 1),
  speed: w => 1 + Math.min(.5, w*.018),
  mix: w => [
    ['rock', 10],
    ['dart', w >= 2 ? 5 : 0],
    ['comet', w >= 3 ? 1.2 : 0],
    ['splitter', w >= 4 ? 3 : 0],
    ['brute', w >= 6 ? 2.4 : 0],
    ['spore', w >= 8 ? 3 : 0],
    ['pod', w >= 11 ? 1.6 : 0],
    ['icecomet', w >= 16 ? 1 : 0],
    ['glacier', w >= 16 ? 1.6 : 0],
    ['plasma', w >= 21 ? 2.2 : 0],
    ['phase', w >= 21 ? 1.8 : 0],
    ['lens', w >= 26 ? 1.2 : 0],
    ['dark', w >= 26 ? 2.4 : 0],
  ],
  extra: w => w === 30 ? ['blackhole'] : w === 25 ? ['saturn'] : w === 20 ? ['planet'] : w === 15 ? ['hive'] : w === 10 ? ['colossus'] : w % 5 === 0 ? ['elite'] : w > 12 && w % 3 === 0 ? ['elite'] : [],
  breakTime: 2,
};

// six sectors of five waves: each has its own nebula colours and its own newcomers
export const SECTORS = [
  { ko:'소행성대',       en:'ASTEROID BELT', neb:[[120,60,200],[40,140,220],[200,60,140]], sky:['#04050c', '#070a1a', '#0b1630'] },
  { ko:'철 운석 지대',    en:'IRON FIELD',    neb:[[220,110,40],[160,80,40],[255,150,60]],  sky:['#07050a', '#120b10', '#1c1210'] },
  { ko:'생체 성운',       en:'BIO NEBULA',    neb:[[60,200,110],[30,140,90],[200,60,90]],   sky:['#030807', '#071410', '#0c1c14'] },
  { ko:'오르트 얼음 구름', en:'OORT CLOUD',    neb:[[150,210,255],[90,150,230],[220,240,255]], sky:['#04070e', '#0a1424', '#122238'] },
  { ko:'플라즈마 성운',    en:'PLASMA NEBULA', neb:[[200,70,255],[120,60,240],[255,80,200]], sky:['#07040e', '#120824', '#1a0c30'] },
  { ko:'사건의 지평선',    en:'EVENT HORIZON', neb:[[200,50,40],[90,20,70],[255,120,40]],    sky:['#050203', '#0e0406', '#160608'] },
];
export const sectorOf = w => Math.max(0, Math.min(5, Math.floor((w - 1)/5)));

export const FORT = { hp:1000, mounts:6 };

// energy: every kill fills the bar, a full bar is one pick of three cards; each pick needs a bit more
export const ENERGY = { first:5, step:2.2, grow:1.04 };

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
  carrier: { ko:'인터셉터 모함', en:'CARRIER', col:[120,255,230], role:'전역 · 추적', desc:'작은 요격기를 띄워 멀리 있는 적까지 쫓아가 쏜다',
    pros:['사거리 제한 없음: 화면 어디든 날아감 (360° 방어에 강함)', '여러 대가 흩어져 다른 적을 맡음'],
    cons:'탄창을 비우면 모함으로 돌아와 재장전 · 처음 띄우는 데 시간이 걸리고 한 발이 약함',
    base:{ dmg:11, every:.15, ammo:10, craft:2, speed:560, rearm:1.2, hunter:0 } },
  flak:    { ko:'플락포', en:'FLAK', col:[255,226,120], role:'범위 · 산탄', desc:'공중에서 터져 파편을 흩뿌리는 대공포',
    pros:['떼로 오는 작은 적(파편·포자)을 한 방에 정리', '앞질러 쏴서 빠른 적도 터뜨림'],
    cons:'파편 하나하나가 약해 장갑에 거의 막힘 · 멀리 쏠수록 조준이 흔들림',
    base:{ dmg:9, frags:10, every:1.2, range:640, spread:1.1, ap:0, double:0 } },
  storm:   { ko:'스톰 발생기', en:'STORM', col:[160,140,255], role:'장판 · 지속', desc:'적이 몰린 곳에 번개 폭풍을 펼친다',
    pros:['폭풍 안의 모든 적에게 계속 피해', '몰려오는 길목을 막아둠'],
    cons:'재사용 대기 4초 · 펼쳐지기까지 0.6초 · 폭풍이 겹쳐도 피해는 안 겹침 · 빠른 적은 금방 빠져나감',
    base:{ dps:55, radius:105, dur:3.5, every:4, range:640, delay:.6, slow:0, drift:0 } },
  miner:   { ko:'채굴기', en:'MINER', col:[130,240,150], role:'자원 · 채굴', desc:'채굴 드론을 띄워 부서진 운석의 광석을 실어 온다',
    pros:['빠르고 많이 실어 와서 카드를 더 자주 받음', '모든 등급의 광석과 에너지 코어까지 운반 (요새 기본 드론은 규석·빙정만)'],
    cons:'공격을 전혀 안 함: 발판 하나만큼 화력이 줄어듦 · 드론이 운석을 피해 돌아가느라 운석이 많으면 느려짐',
    base:{ drones:2, speed:340, scoop:44, cap:10, yield:.15, beam:0, tier:5, cores:1 } },
};
// ore: what a broken rock leaves behind. Only what the drones (or the shield's magnet) bring home becomes energy.
// Ore comes in five grades: the rarer, the more each piece is worth. What a rock drops depends on the rock and
// the sector (deeper sectors bump pieces up a grade more often). The fortress's own drones only carry grades 1-2;
// miner drones carry everything, cores included. Cores also drift slowly toward Earth so the magnet gets them in the end.
export const ORE = { yieldMul:1.3, life:12, coreLife:45, magnet:46, coreDrift:24,
  tiers:[
    { ko:'규석',   en:'SILICATE',      col:[150,235,215], mul:1,   from:'모든 운석', real:'돌로 된 소행성 대부분을 이루는 규산염 광물(감람석·휘석)' },
    { ko:'빙정',   en:'ICE',           col:[190,225,255], mul:1.6, from:'혜성 · 얼음 혜성 · 빙하', real:'혜성과 소행성의 물얼음. 우주에서는 물·산소·연료가 되는 귀한 자원' },
    { ko:'운철',   en:'METEORIC IRON', col:[255,170,110], mul:2.4, from:'철 운석 · 중력 렌즈', real:'산화되지 않은 철-니켈 합금. 철운석과 금속형 소행성' },
    { ko:'성강석', en:'LONSDALEITE',   col:[200,140,255], mul:3.5, from:'수정 운석(엘리트) · 플라즈마 섹터', real:'운석 충돌 때 생기는 육방정 다이아몬드(론스데일라이트)' },
    { ko:'성핵석', en:'STAR CORE',     col:[255,220,120], mul:5,   from:'보스', real:'가상의 광물: 사라진 목성과 토성의 핵에서 흘러나온 전설의 결정' },
  ],

  core:{ ko:'에너지 코어', col:[255,220,140] },
  base:{ drones:2, speed:230, scoop:24, cap:3, yield:0, beam:0, tier:2, cores:0 } };   // the fortress's own two slow drones
// Energy cores work like jewels: each has a grade, an element and random affixes rolled inside fixed ranges.
// Grades (최하급 → 최상급): how many affixes and which part of the range they roll in. Named cores come from bosses: fixed affixes + one random.
export const GRADES = {
  lowest:  { ko:'최하급', en:'CRUDE',    n:1, lo:0,   hi:.5, col:[150,160,175], w:28 },
  low:     { ko:'하급',   en:'COMMON',   n:1, lo:0,   hi:1,  col:[205,215,230], w:30 },
  normal:  { ko:'일반',   en:'STANDARD', n:2, lo:0,   hi:1,  col:[110,220,255], w:26 },
  high:    { ko:'상급',   en:'SUPERIOR', n:3, lo:0,   hi:1,  col:[200,140,255], w:13 },
  highest: { ko:'최상급', en:'PRISTINE', n:3, lo:.5,  hi:1,  col:[255,205,90],  w:3 },
  named:   { ko:'네임드', en:'NAMED',    n:1, lo:.3,  hi:1,  col:[255,130,80],  w:0 },
};
// elements: the colour of a core, and what links it can form
export const ELEMENTS = {
  heat:    { ko:'열',   en:'THERMAL', col:[255,110,70] },
  cold:    { ko:'냉기', en:'CRYO',    col:[120,200,255] },
  arc:     { ko:'전격', en:'ARC',     col:[190,150,255] },
  kinetic: { ko:'운동', en:'KINETIC', col:[255,210,100] },
  gravity: { ko:'중력', en:'GRAVITY', col:[110,240,190] },
};
// affixes and their fixed ranges (whole numbers). dmg/speed/reach scale stats; the rest work on each hit.
export const AFFIX = {
  dmg:     { ko:'피해',               lo:8,  hi:16, pct:true },
  speed:   { ko:'발사·충전 속도',      lo:6,  hi:12, pct:true },
  reach:   { ko:'사거리·범위',         lo:6,  hi:12, pct:true },
  crit:    { ko:'치명 확률 (피해 2.5배)', lo:4,  hi:8,  pct:true },
  pierce:  { ko:'장갑 관통',          lo:2,  hi:4 },
  chilled: { ko:'냉각된 적에게 피해',   lo:10, hi:20, pct:true },
  big:     { ko:'엘리트·보스에게 피해', lo:10, hi:20, pct:true },
  ore:     { ko:'처치한 적의 광석',     lo:10, hi:25, pct:true },
  organic: { ko:'생체형에게 피해',      lo:20, hi:40, pct:true, rare:true },
};
export const CORE_KEYS = {
  dmg:  { up:['dmg', 'dps', 'burn'], down:[] },
  speed:{ up:['rate', 'speed'], down:['every', 'charge', 'recharge', 'cool', 'rearm'] },
  reach:{ up:['range', 'radius', 'blast', 'hop', 'scoop'], down:[] },
};
// links: all of a turret's slots are linked (2 at MK II, 3 at MK III). Element combinations switch these on.
export const LINKS = [
  { id:'thermo',    ko:'열충격',       els:['heat', 'cold'],            d:'냉각된 적에게 주는 피해 +35%' },
  { id:'incend',    ko:'소이탄',       els:['heat', 'kinetic'],         d:'맞힌 적에게 화상 (초당 6, 3초)' },
  { id:'ap',        ko:'철갑탄',       els:['kinetic', 'kinetic'],      d:'장갑을 완전히 무시' },
  { id:'overcur',   ko:'과전류',       els:['arc', 'arc'],              d:'맞힐 때 가끔 번개가 근처 적 2명에게 튐 (피해 50%)' },
  { id:'permafrost',ko:'영구 동토',    els:['cold', 'gravity'],         d:'맞힌 적 25% 감속 (1초)' },
  { id:'collapse',  ko:'붕괴',         els:['gravity', 'kinetic'],      d:'처치한 자리가 꺼지며 주변 적을 끌어당기고 피해 (처치한 적 체력의 30%)' },
  { id:'plasmaarc', ko:'플라즈마 아크', els:['heat', 'arc', 'kinetic'],  d:'맞힌 자리에서 작은 폭발 (피해 35%, 반경 45)' },
  { id:'stasis',    ko:'정지장',       els:['cold', 'arc', 'gravity'],  d:'맞힐 때 가끔 1초 정지 (보스 0.3초)' },
];
// named cores: one per boss (and a rare one from elites); plain names, fixed affixes
export const NAMED = {
  colossus:{ ko:'거대 운석 핵',     el:'kinetic', fixed:[['dmg', 25], ['pierce', 6]] },
  hive:    { ko:'생체 행성 심장',   el:'heat',    fixed:[['organic', 60], ['dmg', 15]] },
  planet:  { ko:'떠돌이 행성 파편', el:'gravity', fixed:[['reach', 25], ['big', 25]] },
  saturn:  { ko:'토성 고리 조각',   el:'cold',    fixed:[['speed', 20], ['chilled', 30]] },
  elite:   { ko:'수정 운석 결정',   el:'arc',     fixed:[['crit', 12], ['dmg', 15]] },
};
export const slotsFor = lv => tierFor(lv);

// upgrade cards. apply(s) changes that turret's stats; key cards (max 1) are marked core
// Upgrade cards. Each step adds a slice of the BASE value (so stacking grows steadily instead of exploding):
// apply(s, b) — s: the turret's stats being built, b: its base stats. Stats are rebuilt from scratch whenever
// something changes (upgrades, then evolution, then cores), see recompute() in turrets.js.
// max = how many times a card can be taken; max 1 = a key upgrade.
const pct = (k, f) => (s, b) => { s[k] += b[k]*f; };          // +f of base
const cut = (k, f) => (s, b) => { s[k] -= b[k]*f; };          // −f of base (intervals, heat, spread)
export const UPG = {
  gatling: [
    { id:'g_dmg',   ko:'고폭탄',     d:'피해 +25%',                       max:10, apply:pct('dmg', .25) },
    { id:'g_rate',  ko:'회전 가속',   d:'연사 +20% (과열도 그만큼 빨라짐)',   max:8,  apply:pct('rate', .2) },
    { id:'g_cool',  ko:'냉각 재킷',   d:'과열 -12%, 식는 시간 -10%',         max:5,  apply:(s, b) => { s.heatPer -= b.heatPer*.12; s.cool -= b.cool*.1; } },
    { id:'g_range', ko:'강선 포신',   d:'사거리 +8%',                      max:4,  apply:pct('range', .08) },
    { id:'g_twin',  ko:'쌍열 포신',   d:'한 번에 쏘는 탄 +1',               max:2,  apply:s => { s.bullets += 1; } },
    { id:'g_pierce',ko:'관통탄',     d:'탄이 운석 1개를 더 뚫음',           max:3,  apply:s => { s.pierce += 1; } },
    { id:'g_crit',  ko:'치명 사격',   d:'15% 확률로 피해 3배',              max:1,  apply:s => { s.crit = .15; } },
  ],
  laser: [
    { id:'l_dps',   ko:'출력 증폭',   d:'빔 피해 +25%',                    max:10, apply:pct('dps', .25) },
    { id:'l_cell',  ko:'대용량 전지', d:'한 번에 쏘는 시간 +20%',           max:6,  apply:pct('cap', .2) },
    { id:'l_charge',ko:'급속 충전',   d:'충전 시간 -10%',                   max:5,  apply:cut('recharge', .1) },
    { id:'l_ramp',  ko:'집속 렌즈',   d:'붙어 있을 때 최대 출력 배율 +0.25',   max:4,  apply:s => { s.rampMax += .25; } },
    { id:'l_range', ko:'장초점 렌즈', d:'사거리 +8%',                      max:3,  apply:pct('range', .08) },
    { id:'l_split', ko:'프리즘',     d:'빔이 하나 더 갈라짐 (전지 소모 +50%)', max:2,  apply:s => { s.beams += 1; } },
    { id:'l_melt',  ko:'융해',       d:'냉각된 운석에 빔 피해 +60%',         max:1,  apply:s => { s.melt = .6; } },
  ],
  missile: [
    { id:'m_dmg',   ko:'고성능 탄두', d:'피해 +25%',                       max:10, apply:pct('dmg', .25) },
    { id:'m_count', ko:'다연장',     d:'한 번에 미사일 +1',                max:4,  apply:s => { s.count += 1; } },
    { id:'m_rate',  ko:'자동 장전',   d:'발사 간격 -10%',                  max:6,  apply:cut('every', .1) },
    { id:'m_blast', ko:'폭발 반경',   d:'폭발 범위 +10%',                  max:5,  apply:pct('blast', .1) },
    { id:'m_close', ko:'근접 신관',   d:'사각지대 -25%',                   max:2,  apply:cut('minRange', .25) },
    { id:'m_cluster',ko:'집속탄',    d:'폭발할 때 작은 폭탄 3개가 흩어짐',   max:1,  apply:s => { s.cluster = 3; } },
  ],
  cryo: [
    { id:'c_dmg',   ko:'냉각 탄두',   d:'피해 +25%',                       max:5,  apply:pct('dmg', .25) },
    { id:'c_slow',  ko:'극저온',     d:'감속 +5%p',                       max:5,  apply:s => { s.slow += .05; } },
    { id:'c_area',  ko:'확산 냉각',   d:'냉각 범위 +10%',                  max:6,  apply:pct('radius', .1) },
    { id:'c_rate',  ko:'연속 냉각',   d:'발사 간격 -10%',                  max:6,  apply:cut('every', .1) },
    { id:'c_dur',   ko:'잔류 냉기',   d:'감속 시간 +0.4초',                 max:4,  apply:s => { s.slowT += .4; } },
    { id:'c_freeze',ko:'순간 동결',   d:'20% 확률로 1.2초 얼림 (2단계 35%)', max:2,  apply:s => { s.freeze = s.freeze ? .35 : .2; } },
    { id:'c_shatter',ko:'파쇄',      d:'냉각된 운석이 모든 피해를 +25% 더 받음 (2단계 +50%)', max:2, apply:s => { s.shatter += .25; } },
  ],
  tesla: [
    { id:'t_dmg',   ko:'고전압',     d:'피해 +25%',                       max:10, apply:pct('dmg', .25) },
    { id:'t_chain', ko:'확장 코일',   d:'번개가 튀는 횟수 +1',              max:6,  apply:s => { s.jumps += 1; } },
    { id:'t_rate',  ko:'축전 가속',   d:'발사 간격 -10%',                  max:6,  apply:cut('every', .1) },
    { id:'t_reach', ko:'안테나 연장', d:'사거리 +10%',                     max:4,  apply:pct('range', .1) },
    { id:'t_stun',  ko:'과부하',     d:'맞은 운석 0.4초 정지',              max:1,  apply:s => { s.stun = .4; } },
    { id:'t_conduct',ko:'도체',      d:'냉각된 운석에 피해 +50%, 튈 때 감소 없음', max:1, apply:s => { s.conduct = .5; } },
  ],
  drone: [
    { id:'r_dmg',   ko:'화력',       d:'피해 +25%',                       max:10, apply:pct('dmg', .25) },
    { id:'r_rate',  ko:'연사',       d:'발사 간격 -8%',                   max:6,  apply:cut('every', .08) },
    { id:'r_drone', ko:'드론 추가',   d:'리볼버 드론 +1',                  max:3,  apply:s => { s.drones += 1; } },
    { id:'r_bore',  ko:'구경',       d:'사격 범위 +8%',                   max:5,  apply:pct('radius', .08) },
    { id:'r_speed', ko:'추진기',     d:'드론 속도 +12%',                  max:4,  apply:pct('speed', .12) },
    { id:'r_pull',  ko:'견인',       d:'범위 안 운석을 중심으로 끌어당김',    max:2,  apply:s => { s.pull += 1; } },
    { id:'r_gyro',  ko:'자이로 안정', d:'움직이면서도 쏠 수 있음',           max:1,  apply:s => { s.hoverSpeed = 1e9; } },
  ],
  rail: [
    { id:'rg_dmg',  ko:'고출력 코일', d:'피해 +25%',                       max:10, apply:pct('dmg', .25) },
    { id:'rg_charge',ko:'급속 충전', d:'충전 시간 -9%',                    max:6,  apply:cut('charge', .09) },
    { id:'rg_width',ko:'광폭 탄',    d:'탄 폭 +25%, 덜 빗나감',             max:4,  apply:pct('width', .25) },
    { id:'rg_lock', ko:'조준 보정',   d:'조준이 고정되는 시점 +4%p (덜 빗나감)', max:3,  apply:s => { s.lockAt = Math.min(.97, s.lockAt + .04); } },
    { id:'rg_shock',ko:'충격파',     d:'꿰뚫은 자리마다 작은 폭발 (피해 25%)', max:1, apply:s => { s.shock = .25; } },
  ],
  flame: [
    { id:'f_fuel',  ko:'연료 첨가',   d:'불길 피해 +25%',                   max:10, apply:pct('dps', .25) },
    { id:'f_reach', ko:'고압 노즐',   d:'사거리 +8%',                      max:5,  apply:pct('range', .08) },
    { id:'f_wide',  ko:'광각 노즐',   d:'부채꼴 폭 +12%',                  max:4,  apply:pct('cone', .12) },
    { id:'f_burn',  ko:'인화성 연료', d:'화상 피해 +25%',                   max:5,  apply:pct('burn', .2) },
    { id:'f_sticky',ko:'점착 연료',   d:'화상 중첩 +1',                    max:4,  apply:s => { s.stacks += 1; } },
    { id:'f_purge', ko:'소각',       d:'생체형에 피해 +60% 더',             max:1,  apply:s => { s.organic += .6; } },
  ],
  carrier: [
    { id:'ic_dmg',  ko:'기관포 강화', d:'피해 +25%',                       max:10, apply:pct('dmg', .25) },
    { id:'ic_craft',ko:'편대 증강',   d:'인터셉터 +1',                     max:3,  apply:s => { s.craft += 1; } },
    { id:'ic_ammo', ko:'확장 탄창',   d:'탄창 +2발',                       max:5,  apply:s => { s.ammo += 2; } },
    { id:'ic_rearm',ko:'정비 자동화', d:'재장전 시간 -10%',                 max:5,  apply:cut('rearm', .1) },
    { id:'ic_speed',ko:'애프터버너',  d:'비행 속도 +10%',                   max:4,  apply:pct('speed', .1) },
    { id:'ic_hunter',ko:'사냥꾼 편대', d:'엘리트·보스를 먼저 쫓고 그들에게 피해 +60%', max:1, apply:s => { s.hunter = .6; } },
  ],
  flak: [
    { id:'fk_dmg',  ko:'고폭 작약',   d:'파편 피해 +25%',                   max:10, apply:pct('dmg', .25) },
    { id:'fk_frags',ko:'파편 증량',   d:'파편 +2',                         max:6,  apply:s => { s.frags += 2; } },
    { id:'fk_rate', ko:'자동 장전',   d:'발사 간격 -10%',                  max:6,  apply:cut('every', .1) },
    { id:'fk_choke',ko:'조임 신관',   d:'파편이 8% 덜 퍼짐',                max:4,  apply:cut('spread', .08) },
    { id:'fk_ap',   ko:'철갑 파편',   d:'파편이 장갑을 무시',               max:1,  apply:s => { s.ap = 1; } },
    { id:'fk_double',ko:'이중 신관', d:'터진 자리에서 한 번 더 터짐 (파편 절반)', max:1, apply:s => { s.double = 1; } },
  ],
  storm: [
    { id:'st_dps',  ko:'과충전',     d:'폭풍 피해 +25%',                   max:10, apply:pct('dps', .25) },
    { id:'st_radius',ko:'광역 폭풍', d:'폭풍 반경 +8%',                    max:5,  apply:pct('radius', .08) },
    { id:'st_dur',  ko:'지속 장치',   d:'폭풍 지속 +0.4초',                 max:5,  apply:s => { s.dur += .4; } },
    { id:'st_rate', ko:'신속 재전개', d:'재사용 대기 -8%',                  max:6,  apply:cut('every', .08) },
    { id:'st_static',ko:'정전기',    d:'폭풍 안의 적 35% 감속',             max:1,  apply:s => { s.slow = .35; } },
    { id:'st_drift',ko:'유도 폭풍',   d:'폭풍이 적이 몰린 쪽으로 천천히 따라감', max:1, apply:s => { s.drift = 1; } },
  ],
  miner: [
    { id:'mn_drone',ko:'드론 증설',   d:'채굴 드론 +1',                    max:4,  apply:s => { s.drones += 1; } },
    { id:'mn_speed',ko:'추진기',     d:'드론 속도 +10%',                   max:5,  apply:pct('speed', .1) },
    { id:'mn_cap',  ko:'적재함 확장', d:'한 번에 싣는 양 +20%',             max:5,  apply:pct('cap', .2) },
    { id:'mn_scoop',ko:'광역 집게',   d:'한 번에 쓸어 담는 반경 +12%',        max:4,  apply:pct('scoop', .12) },
    { id:'mn_yield',ko:'정제기',     d:'이 채굴기가 실어 온 광석 가치 +6%p', max:5,  apply:s => { s.yield += .06; } },
    { id:'mn_tractor',ko:'견인 빔',  d:'멀리 있는 광석을 빔으로 끌어와 담음 (집게 반경 +80%)', max:1, apply:(s, b) => { s.scoop += b.scoop*.8; } },
  ],
};

// Tiers: Mk I → Mk II after 6 upgrades → Mk III after 14. Each tier opens a core slot;
// reaching Mk III also offers a one-time evolution: one of two paths that changes how the gun plays.
export const TIERS = [0, 6, 14];
export const tierFor = lv => lv >= TIERS[2] ? 3 : lv >= TIERS[1] ? 2 : 1;
export const EVO = {
  gatling: [
    { id:'vulcan',  ko:'벌컨',       en:'VULCAN',    d:'연사 2배, 과열 절반 · 한 발 피해 -20%', apply:s => { s.rate *= 2; s.heatPer *= .5; s.dmg *= .8; } },
    { id:'flechette',ko:'플레셰트',  en:'FLECHETTE', d:'탄 +2, 관통 +2 · 연사 -20%',          apply:s => { s.bullets += 2; s.pierce += 2; s.rate *= .8; } },
  ],
  laser: [
    { id:'prism',   ko:'프리즘 캐논', en:'PRISM',     d:'빔 +2, 갈라진 빔이 전지를 거의 안 씀',    apply:s => { s.beams += 2; s.prism = 1; } },
    { id:'cutter',  ko:'절단 빔',     en:'CUTTER',    d:'최대 출력 배율 2배, 출력이 2배 빨리 오름', apply:s => { s.rampMax *= 2; s.ramp *= .5; s.dps *= 1.1; } },
  ],
  missile: [
    { id:'swarm',   ko:'스웜 포드',   en:'SWARM',     d:'미사일 +4, 장전 -20% · 한 발 피해 -30%', apply:s => { s.count += 4; s.every *= .8; s.dmg *= .7; } },
    { id:'torpedo', ko:'중어뢰',      en:'TORPEDO',   d:'피해 ×2.5, 폭발 ×1.8, 집속탄 5개 · 장전 +30%', apply:s => { s.dmg *= 2.5; s.blast *= 1.8; s.cluster = 5; s.every *= 1.3; } },
  ],
  cryo: [
    { id:'zero',    ko:'절대영도',    en:'ABSOLUTE',  d:'얼림 확률 50%, 감속 +15%p',            apply:s => { s.freeze = .5; s.slow += .15; } },
    { id:'blizzard',ko:'블리자드',    en:'BLIZZARD',  d:'냉각 범위 ×1.8, 발사 간격 -30%',        apply:s => { s.radius *= 1.8; s.every *= .7; } },
  ],
  tesla: [
    { id:'stormcoil',ko:'폭풍 코일',  en:'STORMCOIL', d:'튀는 횟수 +4, 튀는 거리 ×1.4, 감소 없음', apply:s => { s.jumps += 4; s.hop *= 1.4; s.conduct = Math.max(s.conduct, .01); } },
    { id:'arc',     ko:'과부하 아크', en:'OVERARC',   d:'피해 ×2, 0.8초 정지 · 간격 +20%',       apply:s => { s.dmg *= 2; s.stun = .8; s.every *= 1.2; } },
  ],
  drone: [
    { id:'squadron',ko:'편대 드론',   en:'SQUADRON',  d:'드론 +2, 움직이며 사격',                apply:s => { s.drones += 2; s.hoverSpeed = 1e9; } },
    { id:'heavy',   ko:'중포 드론',   en:'HEAVY',     d:'피해 ×2, 범위 ×1.5 · 간격 +30%',        apply:s => { s.dmg *= 2; s.radius *= 1.5; s.every *= 1.3; } },
  ],
  rail: [
    { id:'gauss',   ko:'가우스 캐논', en:'GAUSS',     d:'충전 절반, 조준 거의 안 놓침 · 피해 -40%', apply:s => { s.charge *= .5; s.lockAt = .97; s.dmg *= .6; } },
    { id:'breaker', ko:'행성 파쇄포', en:'BREAKER',   d:'피해 ×2.2, 탄 폭 ×2, 충격파 50% · 충전 +30%', apply:s => { s.dmg *= 2.2; s.width *= 2; s.shock = .5; s.charge *= 1.3; } },
  ],
  flame: [
    { id:'torch',   ko:'플라즈마 토치', en:'TORCH',   d:'사거리 ×1.6, 피해 ×1.4 · 부채꼴 좁아짐',  apply:s => { s.range *= 1.6; s.dps *= 1.4; s.cone *= .6; } },
    { id:'inferno', ko:'인페르노',    en:'INFERNO',   d:'부채꼴 ×2, 화상 ×1.5, 중첩 +4',          apply:s => { s.cone *= 2; s.burn *= 1.5; s.stacks += 4; } },
  ],
  carrier: [
    { id:'wing',    ko:'요격 편대',   en:'WING',      d:'인터셉터 +3, 탄창 +6',                  apply:s => { s.craft += 3; s.ammo += 6; } },
    { id:'bomber',  ko:'폭격기',      en:'BOMBER',    d:'한 발 피해 ×3, 엘리트·보스 사냥 · 연사 절반', apply:s => { s.dmg *= 3; s.every *= 2; s.hunter = Math.max(s.hunter, .8); } },
  ],
  flak: [
    { id:'barrage', ko:'탄막포',      en:'BARRAGE',   d:'파편 +10, 발사 간격 -25%',              apply:s => { s.frags += 10; s.every *= .75; } },
    { id:'piercer', ko:'철갑 파쇄포', en:'PIERCER',   d:'장갑 무시, 파편 피해 ×1.6, 덜 퍼짐',      apply:s => { s.ap = 1; s.dmg *= 1.6; s.spread *= .6; } },
  ],
  storm: [
    { id:'tempest', ko:'대폭풍',      en:'TEMPEST',   d:'반경 ×1.6, 지속 +2초',                  apply:s => { s.radius *= 1.6; s.dur += 2; } },
    { id:'strike',  ko:'연속 낙뢰',   en:'STRIKE',    d:'재사용 절반, 피해 ×1.3 · 지속 -40%',      apply:s => { s.every *= .5; s.dps *= 1.3; s.dur *= .6; } },
  ],
  miner: [
    { id:'hauler',  ko:'수송 함대',   en:'HAULER',    d:'드론이 크고 느려짐 · 적재량 ×2.5, 드론 +1 · 속도 -25%',          apply:s => { s.cap *= 2.5; s.drones += 1; s.speed *= .75; } },
    { id:'runner',  ko:'쾌속 함대',   en:'RUNNER',    d:'드론이 작고 빨라짐 · 속도 ×1.8, 드론 +2 · 적재량 절반',          apply:s => { s.speed *= 1.8; s.drones += 2; s.cap *= .5; } },
    { id:'tractor', ko:'견인 함대',   en:'TRACTOR',   d:'광석까지 가지 않고 멀리서 빔으로 끌어옴 (빔 거리 170) · 드론 +1', apply:s => { s.beam = 170; s.drones += 1; } },
  ],

};

// fortress cards
export const FORT_UPG = [
  { id:'f_hp',     ko:'장갑 보강',   d:'요새 최대 체력 +15%, 체력 30% 회복', max:8 },
  { id:'f_regen',  ko:'자가 수리',   d:'초당 체력 +2 회복',               max:5 },
  { id:'f_energy', ko:'에너지 효율', d:'광석 가치 +12%',                  max:5 },
  { id:'f_magnet', ko:'중력 자석',   d:'방어막 근처 광석을 끌어오는 범위 +60%', max:2 },
];
