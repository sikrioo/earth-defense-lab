/* ---------- fortress mode: the wave director — 30 waves, elites, bosses, breaks between ---------- */
import { rand } from '../core/canvas.js';
import { ROCK, WAVES } from './data.js';
import { G, enemies } from './state.js';
import { spawnPoint } from './view.js';
import { alive, spawnRock } from './enemies.js';

function pickWeighted(list){
  const tot = list.reduce((a, [, w]) => a + w, 0); let r = Math.random()*tot;
  for (const [k, w] of list){ if ((r -= w) <= 0) return k; }
  return list[0][0];
}
export function startWave(n){
  G.wave = n; G.phase = 'wave';
  const count = WAVES.count(n), win = WAVES.window(n), mix = WAVES.mix(n).filter(([, w]) => w > 0);
  // rocks spread over the window, a little front-loaded; specials arrive a third of the way in
  G.queue = Array.from({ length:count }, (_, i) => ({ t:win*Math.pow(i/count, 1.15) + rand(0, .4), type:pickWeighted(mix) }));
  WAVES.extra(n).forEach((type, i) => G.queue.push({ t:win*.3 + i*6, type }));
  G.queue.sort((a, b) => a.t - b.t);
  G.spawnT = 0; G.waveTotal = G.queue.length; G.waveDone = 0;
  const boss = WAVES.extra(n).find(t => ROCK[t].boss);
  banner(boss ? 'BOSS WAVE' : `WAVE ${n}`, boss ? `${ROCK[boss].ko} 접근` : `${count}개 접근`, !!boss);
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
  while (G.queue.length && G.queue[0].t <= G.spawnT){
    const { type } = G.queue.shift(), p = spawnPoint(ROCK[type]);
    spawnRock(type, p.x, p.y, { aim:p.aim });
  }
  if (!G.queue.length && !enemies.some(alive)){
    if (G.wave >= WAVES.last){ G.phase = 'win'; return; }
    G.phase = 'break'; G.breakT = WAVES.breakTime;
    banner(`WAVE ${G.wave} CLEAR`, G.wave + 1 === 10 || G.wave + 1 === 20 || G.wave + 1 === 30 ? '다음은 보스 웨이브' : '');
  }
}
export const bossAlive = () => enemies.find(e => alive(e) && e.T.boss);
