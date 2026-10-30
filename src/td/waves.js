/* ---------- fortress mode: the wave director — 30 waves, elites, bosses, breaks between ---------- */
import { rand } from '../core/canvas.js';
import { ROCK, SECTORS, WAVES, sectorOf } from './data.js';
import { G, enemies } from './state.js';
import { pickDir, spawnPoint } from './view.js';
import { sfx } from './sfx.js';
import { tip } from './tips.js';
import { alive, spawnRock } from './enemies.js';

function pickWeighted(list){
  const tot = list.reduce((a, [, w]) => a + w, 0); let r = Math.random()*tot;
  for (const [k, w] of list){ if ((r -= w) <= 0) return k; }
  return list[0][0];
}
export function startWave(n){
  G.wave = n; G.phase = 'wave';
  const count = WAVES.count(n), win = WAVES.window(n), mix = WAVES.mix(n).filter(([, w]) => w > 0);
  // rocks come in volleys of a few from one direction, with breathing room between volleys;
  // from wave 3 a quarter of the wave is held back for one big surge (with a warning) past the middle
  const surgeN = n >= 3 ? Math.round(count*.25) : 0, mainN = count - surgeN, volleys = [];
  for (let i = 0; i < mainN;){ const k = Math.min(mainN - i, 2 + ((Math.random()*(2 + n/8))|0)); volleys.push(k); i += k; }
  G.queue = [];
  volleys.forEach((k, v) => {
    const t0 = win*.85*Math.pow(v/volleys.length, 1.1) + rand(0, .5), dir = pickDir();
    for (let j = 0; j < k; j++) G.queue.push({ t:t0 + j*rand(.12, .3), type:pickWeighted(mix), dir });
  });
  G.surgeAt = surgeN ? win*.62 : 0; G.surgeWarned = false;
  if (surgeN){ const dirs = [pickDir(), pickDir()]; for (let j = 0; j < surgeN; j++) G.queue.push({ t:G.surgeAt + rand(0, 2.4), type:pickWeighted(mix), dir:dirs[j % 2] }); }
  WAVES.extra(n).forEach((type, i) => G.queue.push({ t:win*.3 + i*6, type }));
  G.spawnT = 0; G.waveTotal = G.queue.length; G.waveDone = 0;
  const boss = WAVES.extra(n).find(t => ROCK[t].boss);
  const sec = sectorOf(n), newSector = n > 1 && sec !== sectorOf(n - 1);
  if (newSector) banner(`SECTOR ${sec + 1} · ${SECTORS[sec].en}`, `${SECTORS[sec].ko} 진입 · 웨이브 ${n}`);
  else banner(boss ? 'BOSS WAVE' : `WAVE ${n}`, boss ? `${ROCK[boss].ko} 접근` : `${count}개 접근`, !!boss);
  // boss test: the boss shows up right away
  if (G.bossTest) for (const q of G.queue) if (ROCK[q.type].boss) q.t = 1.2;
  G.queue.sort((a, b) => a.t - b.t);
  if (boss) sfx.alarm();
}
export function banner(title, sub, warn = false){ G.banner = { title, sub, warn }; G.bannerT = 2.2; }

export function updWaves(dt){
  G.bannerT = Math.max(0, G.bannerT - dt);
  if (G.phase === 'break'){
    G.breakT -= dt;
    if (G.breakT <= 0) startWave(G.wave + 1);
    return;
  }
  if (G.phase !== 'wave') return;
  G.spawnT += dt;
  if (G.surgeAt && !G.surgeWarned && G.spawnT >= G.surgeAt - 1.6){ G.surgeWarned = true; banner('METEOR SURGE', '운석 떼가 몰려와요', true); sfx.alarm(); tip('surge'); }
  while (G.queue.length && G.queue[0].t <= G.spawnT){
    const { type, dir } = G.queue.shift(), p = spawnPoint(ROCK[type], dir);
    spawnRock(type, p.x, p.y, { aim:p.aim });
  }
  if (!G.queue.length && !enemies.some(alive)){
    if (G.wave >= WAVES.last){ G.phase = 'win'; return; }
    G.phase = 'break'; G.breakT = WAVES.breakTime;
    banner(`WAVE ${G.wave} CLEAR`, G.wave + 1 === 10 || G.wave + 1 === 20 || G.wave + 1 === 30 ? '다음은 보스 웨이브' : '');
  }
}
export const bossAlive = () => enemies.find(e => alive(e) && e.T.boss);
