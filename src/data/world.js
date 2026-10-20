/* ---------- world numbers: Earth, cities, mana, timed events ---------- */
export const EARTH_MAX = 1000;
export const MANA_MAX = 100, MANA_REGEN = 8;
export const CITY_HP = 3, CITY_MULT = 2;   // city defence pips, Earth damage multiplier when a city is hit
export const SPIN = { line:2, orbit:6 };   // degrees per second

// name, longitude (east +)
export const CITY_DEF = [
  ['서울', 127], ['도쿄', 139.7], ['시드니', 151.2], ['호놀룰루', -157.8], ['로스앤젤레스', -118.2], ['뉴욕', -74],
  ['상파울루', -46.6], ['런던', -.1], ['카이로', 31.2], ['두바이', 55.3], ['뭄바이', 72.9], ['쿠알라룸푸르', 101.7],
];

// meteor showers and the rogue planet; the MAX sim uses the sim* values
export const EVENTS = {
  firstShower:35, showerEvery:[38, 50], showerSize:14,
  firstPlanet:70, planetEvery:[100, 130],
  simFirstShower:8, simShowerEvery:12, simShowerSize:28, simFirstPlanet:4, simPlanetEvery:20,
};
