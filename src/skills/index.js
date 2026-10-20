import { LIGHT, PAL } from '../core/palette.js';
import { DMG } from '../data/damage.js';
import { Blizzard, ChargedBolts, FireWall, Fireball, FrozenOrb, Hydra, LightningNova, Meteor, NovaRing, chainLightning } from './sorceress.js';
import { freezingArrow, guidedArrow, immolationArrow, lightningFury, multiShot, plagueJavelin } from './amazon.js';
import { Aura, BlessedHammer, FistOfHeavens, holyBolt } from './paladin.js';
import { Curse, boneSpear, boneSpirit, corpseExplosion, teeth } from './necromancer.js';
import { BattleOrders, Berserk, LeapAttack, WarCry, Whirlwind, doubleThrow } from './barbarian.js';
import { Harpoon, Jam, LongShot, Mine, Orbital, Strafe, fanFire, missiles, scatter } from './hunter.js';

/* ---------- skill table ---------- */
export const active = [];
const push = o => active.push(o);
export const CLASSES = [
  { id:'sorc', en:'Sorceress', ko:'소서리스', key:'q', skills:[
    { elem:'fire',  ko:'파이어 볼',     en:'Fire Ball',       cd:.22, cast:(o,t) => push(new Fireball(o.x, o.y, t.x, t.y)) },
    { elem:'fire',  ko:'파이어 월',     en:'Fire Wall',       cd:.9,  cast:(o,t) => push(new FireWall(o.x, o.y, t.x, t.y)) },
    { elem:'fire',  ko:'메테오',        en:'Meteor',          cd:.7,  cast:(o,t) => push(new Meteor(o.x, o.y, t.x, t.y)) },
    { elem:'fire',  ko:'히드라',        en:'Hydra',           cd:1,   cast:(o,t) => push(new Hydra(t.x, t.y)) },
    { elem:'ice',   ko:'프로즌 오브',   en:'Frozen Orb',      cd:.5,  cast:(o,t) => push(new FrozenOrb(o.x, o.y, t.x, t.y)) },
    { elem:'ice',   ko:'프로스트 노바', en:'Frost Nova',      cd:.6,  cast:(o,t) => push(new NovaRing(t.x, t.y, PAL.ice, LIGHT.ice, true, DMG.frostnova, 'ice')) },
    { elem:'ice',   ko:'블리자드',      en:'Blizzard',        cd:.8,  cast:(o,t) => push(new Blizzard(o.x, o.y, t.x, t.y)) },
    { elem:'bolt',  ko:'차지드 볼트',   en:'Charged Bolt',    cd:.25, cast:(o,t) => push(new ChargedBolts(o.x, o.y, t.x, t.y)) },
    { elem:'bolt',  ko:'체인 라이트닝', en:'Chain Lightning', cd:.35, cast:(o,t) => push(chainLightning(o.x, o.y, t.x, t.y)) },
    { elem:'bolt',  ko:'노바',          en:'Nova',            cd:.5,  cast:(o,t) => push(new LightningNova(t.x, t.y)) },
  ]},
  { id:'ama', en:'Amazon', ko:'아마존', key:'w', skills:[
    { elem:'bow',    ko:'멀티플 샷',       en:'Multiple Shot',    cd:.3,  cast:(o,t) => multiShot(o.x, o.y, t.x, t.y) },
    { elem:'magic',  ko:'가이디드 애로우', en:'Guided Arrow',     cd:.25, cast:(o,t) => guidedArrow(o.x, o.y, t.x, t.y) },
    { elem:'ice',    ko:'프리징 애로우',   en:'Freezing Arrow',   cd:.4,  cast:(o,t) => freezingArrow(o.x, o.y, t.x, t.y) },
    { elem:'fire',   ko:'이몰레이션 애로우', en:'Immolation Arrow', cd:.5, cast:(o,t) => immolationArrow(o.x, o.y, t.x, t.y) },
    { elem:'bolt',   ko:'라이트닝 퓨리',   en:'Lightning Fury',   cd:.45, cast:(o,t) => lightningFury(o.x, o.y, t.x, t.y) },
    { elem:'poison', ko:'플레이그 재블린', en:'Plague Javelin',   cd:.6,  cast:(o,t) => plagueJavelin(o.x, o.y, t.x, t.y) },
  ]},
  { id:'pal', en:'Paladin', ko:'팔라딘', key:'e', skills:[
    { elem:'magic', ko:'블레스드 해머',   en:'Blessed Hammer',   cd:.16, cast:(o,t) => push(new BlessedHammer(t.x, t.y)) },
    { elem:'holy',  ko:'피스트 오브 헤븐', en:'Fist of Heavens', cd:.55, cast:(o,t) => push(new FistOfHeavens(t.x, t.y)) },
    { elem:'holy',  ko:'홀리 볼트',       en:'Holy Bolt',        cd:.22, cast:(o,t) => holyBolt(o.x, o.y, t.x, t.y) },
    { elem:'fire',  ko:'홀리 파이어',     en:'Holy Fire',        cd:.8,  cast:(o,t) => push(new Aura(t.x, t.y, 'fire')) },
    { elem:'ice',   ko:'홀리 프리즈',     en:'Holy Freeze',      cd:.8,  cast:(o,t) => push(new Aura(t.x, t.y, 'ice')) },
    { elem:'bolt',  ko:'홀리 쇼크',       en:'Holy Shock',       cd:.8,  cast:(o,t) => push(new Aura(t.x, t.y, 'bolt')) },
  ]},
  { id:'nec', en:'Necromancer', ko:'네크로맨서', key:'r', skills:[
    { elem:'bone',   ko:'티스',         en:'Teeth',            cd:.2,  cast:(o,t) => teeth(o.x, o.y, t.x, t.y) },
    { elem:'bone',   ko:'본 스피어',     en:'Bone Spear',       cd:.25, cast:(o,t) => boneSpear(o.x, o.y, t.x, t.y) },
    { elem:'spirit', ko:'본 스피릿',     en:'Bone Spirit',      cd:.35, cast:(o,t) => boneSpirit(o.x, o.y, t.x, t.y) },
    { elem:'poison', ko:'포이즌 노바',   en:'Poison Nova',      cd:.6,  cast:(o,t) => push(new NovaRing(t.x, t.y, PAL.poison, LIGHT.poison, false, DMG.poisonnova, 'poison')) },
    { elem:'blood',  ko:'시체 폭발',     en:'Corpse Explosion', cd:.35, cast:(o,t) => corpseExplosion(t.x, t.y) },
    { elem:'blood',  ko:'앰플리파이 대미지', en:'Amplify Damage', cd:.8, cast:(o,t) => push(new Curse(t.x, t.y)) },
  ]},
  { id:'barb', en:'Barbarian', ko:'바바리안', key:'t', skills:[
    { elem:'steel', ko:'휠윈드',     en:'Whirlwind',     cd:.6,  cast:(o,t) => push(new Whirlwind(o.x, o.y, t.x, t.y)) },
    { elem:'steel', ko:'리프 어택',  en:'Leap Attack',   cd:.7,  cast:(o,t) => push(new LeapAttack(o.x, o.y, t.x, t.y)) },
    { elem:'rage',  ko:'버서크',     en:'Berserk',       cd:.3,  cast:(o,t) => push(new Berserk(t.x, t.y)) },
    { elem:'steel', ko:'더블 스로우', en:'Double Throw',  cd:.3,  cast:(o,t) => doubleThrow(o.x, o.y, t.x, t.y) },
    { elem:'shout', ko:'워 크라이',  en:'War Cry',       cd:.6,  cast:(o,t) => push(new WarCry(t.x, t.y)) },
    { elem:'shout', ko:'배틀 오더',  en:'Battle Orders', cd:.9,  cast:(o,t) => push(new BattleOrders(t.x, t.y)) },
  ]},
  { id:'hunt', en:'Bounty Hunter', ko:'현상금 사냥꾼', key:'y', skills:[
    { elem:'gun', ko:'패닝',        en:'Fan Fire',       cd:.6,  cast:(o,t) => fanFire(o.x, o.y - 8, t.x, t.y) },
    { elem:'gun', ko:'산탄총',      en:'Scattergun',     cd:.5,  cast:(o,t) => scatter(o.x, o.y - 8, t.x, t.y) },
    { elem:'gun', ko:'작살',        en:'Harpoon',        cd:.9,  cast:(o,t) => push(new Harpoon(o.x, o.y - 8, t.x, t.y)) },
    { elem:'gun', ko:'근접 기뢰',   en:'Prox Mine',      cd:.5,  cast:(o,t) => push(new Mine(t.x, t.y)) },
    { elem:'gun', ko:'궤도 포격',   en:'Orbital Strike', cd:1.4, cast:(o,t) => push(new Orbital(t.x, t.y)) },
    { elem:'gun', ko:'저격',        en:'Long Shot',      cd:1.0, cast:(o,t) => push(new LongShot(o.x, o.y - 8, t.x, t.y)) },
    { elem:'gun', ko:'소형 미사일', en:'Micro Missiles', cd:1.0, cast:(o,t) => missiles(o.x, o.y - 8, t.x, t.y) },
    { elem:'gun', ko:'공중 지원',   en:'Air Strafe',     cd:1.8, cast:(o,t) => push(new Strafe(t.x, t.y)) },
    { elem:'gun', ko:'재즈 세션',   en:'Jam Session',    cd:3,   cast:() => push(new Jam()) },
  ]},
];
