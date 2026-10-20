/* ---------- baked art: cel-shaded rocks, Earth (NASA Blue Marble, public domain), sky, far debris ----------
   Files live in /assets. A list entry holds the three size variants of a rock type (name_0..2). */
import { sprCache } from '../enemies/render.js';
import { invalidateBackdrop } from '../world/earth.js';

const FILES = import.meta.glob('../../assets/*.webp', { eager: true, import: 'default' });
const url = name => FILES[`../../assets/${name}.webp`];
const variants = (name, n) => Array.from({ length:n }, (_, i) => url(`${name}_${i}`));

export let GFX = 'asset';                  // 'asset' = baked art, 'code' = everything drawn by code
export function setGFX(v){ return GFX = v; }
export const ASSET_SRC = {
  normal: variants('normal', 3),
  runner: variants('runner', 3),
  brute:  variants('brute', 3),
  meteor: variants('meteor', 3),
  elite:  variants('elite', 3),
  boss:   variants('boss', 3),
  globe:  url('globe'),                    // 24-frame rotation strip for the orbit map
  cap:    url('cap'),                      // Earth's horizon for the line map
  debris: variants('debris', 5),
  stars:  url('stars'),
};
export const ASSET_IMG = {};

export function setup(){
  for (const k in ASSET_SRC){
    const load = src => { const im = new Image(); im.onload = () => { sprCache.clear(); invalidateBackdrop(); }; im.src = src; return im; };
    ASSET_IMG[k] = Array.isArray(ASSET_SRC[k]) ? ASSET_SRC[k].map(load) : load(ASSET_SRC[k]);
  }
}
