import { sprCache } from '../enemies/render.js';

// ---- optional art: ray-marched asteroid renders + Earth from NASA Blue Marble (public domain), embedded as data URIs ----
export let GFX = 'asset';
export function setGFX(v){ return GFX = v; }
import normal0Img from '../../assets/normal_0.webp';
import normal1Img from '../../assets/normal_1.webp';
import normal2Img from '../../assets/normal_2.webp';
import runner0Img from '../../assets/runner_0.webp';
import runner1Img from '../../assets/runner_1.webp';
import runner2Img from '../../assets/runner_2.webp';
import brute0Img from '../../assets/brute_0.webp';
import brute1Img from '../../assets/brute_1.webp';
import brute2Img from '../../assets/brute_2.webp';
import meteor0Img from '../../assets/meteor_0.webp';
import meteor1Img from '../../assets/meteor_1.webp';
import meteor2Img from '../../assets/meteor_2.webp';
import elite0Img from '../../assets/elite_0.webp';
import elite1Img from '../../assets/elite_1.webp';
import elite2Img from '../../assets/elite_2.webp';
import boss0Img from '../../assets/boss_0.webp';
import boss1Img from '../../assets/boss_1.webp';
import boss2Img from '../../assets/boss_2.webp';
import globeImg from '../../assets/globe.webp';
import capImg from '../../assets/cap.webp';
import debris0Img from '../../assets/debris_0.webp';
import debris1Img from '../../assets/debris_1.webp';
import debris2Img from '../../assets/debris_2.webp';
import debris3Img from '../../assets/debris_3.webp';
import debris4Img from '../../assets/debris_4.webp';
import starsImg from '../../assets/stars.webp';
export const ASSET_SRC = {
  normal: [normal0Img, normal1Img, normal2Img],
  runner: [runner0Img, runner1Img, runner2Img],
  brute: [brute0Img, brute1Img, brute2Img],
  meteor: [meteor0Img, meteor1Img, meteor2Img],
  elite: [elite0Img, elite1Img, elite2Img],
  boss: [boss0Img, boss1Img, boss2Img],
  globe: globeImg,
  cap: capImg,
  debris: [debris0Img, debris1Img, debris2Img, debris3Img, debris4Img],
  stars: starsImg,
};
export const ASSET_IMG = {};

// runs once at boot, from main.js, in the original file order
export function setup(){
  for (const k in ASSET_SRC){
    const load = src => { const im = new Image(); im.onload = () => { sprCache.clear(); }; im.src = src; return im; };
    ASSET_IMG[k] = Array.isArray(ASSET_SRC[k]) ? ASSET_SRC[k].map(load) : load(ASSET_SRC[k]);
  }
}
