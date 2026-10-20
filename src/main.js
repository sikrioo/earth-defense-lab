/* ---------- boot: modules set themselves up in order, buttons get wired, the loop starts ---------- */
import './style.css';
import { setup as setupPaper } from './ui/paper.js';
import { setup as setupParticles } from './core/particles.js';
import { setup as setupAssets, GFX, setGFX } from './assets/index.js';
import { setup as setupSorceress } from './skills/sorceress.js';
import { setup as setupRings } from './weapons/rings.js';
import { setup as setupLevelup } from './weapons/levelup.js';
import { setup as setupSkillbar } from './ui/skillbar.js';
import { setup as setupDeck } from './ui/deck.js';
import { setup as setupHud } from './ui/hud.js';
import { setup as setupInput } from './game/input.js';
import { bar } from './core/canvas.js';
import { mapMode, setMapMode } from './world/earth.js';
import { restart } from './game/progress.js';
import { sprCache } from './enemies/render.js';
import { setSim, simMax } from './game/sim.js';
import { layout, resize } from './game/view.js';
import { startLoop } from './game/loop.js';

setupPaper();
setupParticles();
setupAssets();
setupSorceress();
setupRings();
setupLevelup();
setupSkillbar();
setupDeck();
setupHud();
setupInput();

const gfxBtn = document.getElementById('gfxbtn'), creditEl = document.getElementById('credit'), mapBtn = document.getElementById('mapbtn');
addEventListener('resize', resize);
document.getElementById('respawn').addEventListener('click', restart);
document.getElementById('again').addEventListener('click', restart);
gfxBtn.addEventListener('click', () => {
  setGFX(GFX === 'asset' ? 'code' : 'asset'); sprCache.clear();
  gfxBtn.textContent = GFX === 'asset' ? '그래픽: 에셋' : '그래픽: 코드'; creditEl.hidden = GFX !== 'asset';
});
document.getElementById('simbtn').addEventListener('click', () => setSim(!simMax));
mapBtn.addEventListener('click', () => {
  setMapMode(mapMode === 'line' ? 'orbit' : 'line');
  mapBtn.textContent = mapMode === 'line' ? '맵: 지구 방어선' : '맵: 궤도 방어';
  resize(); restart();
});
if (window.ResizeObserver) new ResizeObserver(layout).observe(bar);
resize();
startLoop();
