/* ---------- fortress mode: the stranger things in the sky ----------
   Late-sector enemies with their own rules (phase rocks, dark matter, plasma EMP, gravity lenses,
   the glacier's shell) and the last two bosses: Saturn's remnant and the black hole with its nodes.
   enemies.js calls in here at spawn, every frame, on hurt and on kill; turrets.js bends shots here. */
import { TAU, ctx, rand, setCtx, time } from '../core/canvas.js';
import { emit, sprite } from '../core/particles.js';
import { addShake } from '../core/lights.js';
import { G, enemies, fx } from './state.js';
import { V, angC, distC } from './view.js';
import { mixc, neonCircle, neonPath, rgb, ringFx, explode } from './fx.js';
import { sfx } from './sfx.js';
import { spawnRock } from './enemies.js';
import { turrets } from './turrets.js';
import { stunDrones } from './mining.js';

const live = e => e && !e.dead;

/* ----- spawn ----- */
export function onSpawn(e){
  const T = e.T;
  if (T.phase) e.phT = rand(1.4, 2.6);
  if (T.saturn){ e.ringMax = e.ringHp = e.max*.35; e.flingT = 2; }
  if (T.blackhole){ e.phase = 1; spawnNodes(e, 3); }
  if (T.dark) e.hidden = true;
}
function spawnNodes(bh, n){
  for (let i = 0; i < n; i++){
    spawnRock('node', bh.x, bh.y, { host:bh, orbA:i/n*TAU, hpMul:.12 + bh.phase*.04 });
    G.waveTotal++;
  }
  ringFx(bh.x, bh.y, bh.r, bh.r*2.4, .6, [255,170,90], 3);
}
const nodesOf = bh => enemies.filter(n => live(n) && n.host === bh);

/* ----- every frame; returns true when the enemy's movement was handled here ----- */
export function updSpecial(e, dt){
  const T = e.T;
  if (T.node){
    const h = e.host;
    if (!live(h)){ e.dead = true; G.waveDone++; return true; }
    e.orbA += dt*(.7 + h.phase*.15);
    const R = h.r + 62 + Math.sin(time*2 + e.orbA*3)*6;
    e.x = h.x + Math.cos(e.orbA)*R; e.y = h.y + Math.sin(e.orbA)*R*.55; e.rot += dt;
    return true;
  }
  if (T.dark){
    const was = e.hidden; e.hidden = distC(e.x, e.y) - V.SR > 260*V.spd;
    if (was && !e.hidden){ sprite(e.x, e.y, e.r*3, [200,170,255], .8); ringFx(e.x, e.y, e.r, e.r*3, .4, T.col, 2); }
  }
  if (T.phase){
    e.phT -= dt;
    if (e.phT <= 0){
      if (!e.ghost){ e.ghost = true; e.phT = .45; sprite(e.x, e.y, e.r*2.5, T.col, .7); }
      else {
        // fold space: jump ahead along the path (never into the shield itself)
        const dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy) || 1, j = Math.min(130*V.spd, Math.max(0, d - e.r - 50));
        const ox = e.x, oy = e.y; e.x += dx/d*j; e.y += dy/d*j;
        e.ghost = false; e.phT = rand(2.2, 3);
        { let l = .3; const x1 = e.x, y1 = e.y; fx.push({ update(d){ l -= d; return l > 0; }, draw(){ neonPath(() => { ctx.moveTo(ox, oy); ctx.lineTo(x1, y1); }, T.col, 1.2, l/.3); } }); }
        ringFx(e.x, e.y, 4, e.r*2.4, .35, T.col, 2); sfx.zap();
      }
    }
  }
  if (T.saturn && e.y > -e.r*.5){
    e.flingT -= dt;
    if (e.flingT <= 0){
      // the ring sheds pieces: a burst of fragments all around it, all heading for the shield
      e.flingT = T.every*(e.ringHp > 0 ? 1 : .7);
      const n = e.ringHp > 0 ? 6 : 8;
      for (let i = 0; i < n; i++){
        const a = i/n*TAU + rand(-.2, .2), x = e.x + Math.cos(a)*e.r*1.9, y = e.y + Math.sin(a)*e.r*.55;
        spawnRock(e.ringHp > 0 ? 'shard' : 'iceshard', x, y, { hpMul:.9, aim:angC(x, y) + rand(-.3, .3) }); G.waveTotal++;
      }
      sfx.flak();
    }
  }
  if (T.blackhole){
    e.phase = e.hp > e.max*.66 ? 1 : e.hp > e.max*.33 ? 2 : 3;
    // it comes straight for Earth and never stops; an exposed core only slows it to a crawl
    const dx = V.cx - e.x, dy = V.cy - e.y, dc = Math.hypot(dx, dy) || 1, ux = dx/dc, uy = dy/dc;
    const v = e.exposed > 0 ? e.speed*.15 : e.speed*[1, 1.25, 1.55][e.phase - 1];     // an exposed core only slows it
    // it falls faster the closer it gets (up to 3×), so the last stretch is a plunge
    const near = Math.max(0, 1 - (dc - V.SR)/(420*V.spd));
    e.x += ux*v*(1 + near*near*2)*dt; e.y += uy*v*(1 + near*near*2)*dt;
    // tidal pull: the closer it gets, the faster it tears at the fortress, and Earth's air streams toward it
    const gap = dc - V.SR - e.r*.3, reach = 420*V.spd;
    if (gap < reach){
      const k = 1 - Math.max(0, gap)/reach;
      if (!G.god) G.hp = Math.max(0, G.hp - k*k*30*dt);
      if (Math.random() < dt*60*k){
        const a = Math.atan2(-uy, -ux) + rand(-.5, .5), sx = V.cx + Math.cos(a)*V.SR, sy = V.cy + Math.sin(a)*V.SR;
        emit({ x:sx, y:sy, vx:(e.x - sx)*rand(.5, .9), vy:(e.y - sy)*rand(.5, .9), drag:.2, life:rand(.8, 1.3), s0:rand(2, 4), s1:.6, pal:[[150,220,255],[90,170,255],[255,150,80]] });
      }
      addShake(.06 + k*.25);
      if (!e.warned){ e.warned = true; G.banner = { title:'TIDAL FORCE', sub:'블랙홀이 지구를 빨아들이기 시작했어요', warn:true }; G.bannerT = 2.2; sfx.alarm(); }
    }
    if (gap <= 0 || e.swallow !== undefined){
      // it reached the shield: it slides over Earth and swells until there is nothing left — always a loss, even invincible
      if (e.swallow === undefined){ e.swallow = 0; e.r0 = e.r; G.banner = { title:'SWALLOWED', sub:'지구가 블랙홀에 삼켜지고 있어요', warn:true }; G.bannerT = 3; sfx.boom(5); }
      e.swallow += dt; const k = Math.min(1, e.swallow/2);
      e.x += (V.cx - e.x)*Math.min(1, dt*2.5); e.y += (V.cy - e.y)*Math.min(1, dt*2.5);
      e.r = e.r0 + (V.SR*1.25 - e.r0)*k*k; e.exposed = 0;
      addShake(1 + k*3); G.hitT = 2;
      if (Math.random() < dt*30) explode(V.cx + rand(-1, 1)*V.SR*.7, V.cy + rand(-1, 1)*V.SR*.7, 50, [255,130,60]);
      if (e.swallow >= 2.2 && G.hp > 0){ G.god = false; G.hp = 0; G.swallowed = true; }
      return true;
    }
    // it sheds dark matter from its disk while it comes
    e.spT -= dt;
    if (e.spT <= 0){ e.spT = T.every/(1 + (e.phase - 1)*.4); for (let j = 0; j < 2; j++){ const b = rand(0, TAU), x = e.x + Math.cos(b)*e.r*2, y = e.y + Math.sin(b)*e.r*.7; spawnRock(T.spawns, x, y, { hpMul:.8, aim:angC(x, y) + rand(-.4, .4) }); G.waveTotal++; } }
    if (e.exposed > 0){
      e.exposed -= dt;
      if (e.exposed <= 0){ spawnNodes(e, 2 + e.phase); G.banner = { title:'NODES REFORMED', sub:'불안정 핵이 다시 생겼어요', warn:true }; G.bannerT = 1.6; }
    }
    // matter spiralling in
    if (Math.random() < dt*40){
      const a = rand(0, TAU), r = e.r*rand(2.4, 3.4);
      emit({ x:e.x + Math.cos(a)*r, y:e.y + Math.sin(a)*r*.45, vx:-Math.sin(a)*90 - Math.cos(a)*60, vy:(Math.cos(a)*90 - Math.sin(a)*60)*.45, drag:.5, life:rand(.8, 1.4), s0:rand(2, 4), s1:.5, pal:[[255,230,180],[255,150,60],[160,60,200]] });
    }
    addShake(.04*e.phase);
    return true;
  }
  return false;
}

/* ----- damage rules ----- */
// returns the damage that actually lands (0 = immune right now)
export function filterHurt(e, d){
  const T = e.T;
  if (e.ghost) return 0;
  if (T.blackhole && !(e.exposed > 0)){ if (Math.random() < .1) sprite(e.x + rand(-e.r, e.r)*.6, e.y + rand(-e.r, e.r)*.6, 8, [255,200,150], .6); return 0; }
  if (T.saturn && e.ringHp > 0){
    e.ringHp -= d; d *= .5;
    if (e.ringHp <= 0){
      G.banner = { title:'RING SHATTERED', sub:'고리가 부서졌어요 · 이제 피해가 그대로 들어가요', warn:false }; G.bannerT = 2;
      for (let i = 0; i < 16; i++){ const a = i/16*TAU; explode(e.x + Math.cos(a)*e.r*1.9, e.y + Math.sin(a)*e.r*.55, 30, [255,210,150]); }
      addShake(10); G.hitStop = Math.max(G.hitStop || 0, .15); sfx.boom(4);
    }
  }
  return d;
}
export const armorOf = e => e.T.shell ? (e.hp > e.max*.7 ? e.T.shell : 0) : (e.T.armor || 0);
export function afterHurt(e){
  if (e.T.shell && !e.shellBroken && e.hp <= e.max*.7){
    e.shellBroken = true; sfx.frost();
    for (let i = 0; i < 16; i++){ const a = rand(0, TAU), v = rand(80, 220); emit({ x:e.x, y:e.y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, drag:1.6, life:rand(.4, .8), s0:rand(2, 4), s1:1, pal:[[240,250,255],[170,225,255],[90,150,230]] }); }
  }
}

/* ----- kills ----- */
export function onKill(e){
  const T = e.T;
  if (T.emp){
    // electromagnetic pulse: turrets close by stop for a moment
    ringFx(e.x, e.y, 10, T.emp, .45, [210,150,255], 3); sprite(e.x, e.y, T.emp*.7, [200,140,255], .35); sfx.storm();
    for (const t of turrets) if (Math.hypot(t.px - e.x, t.py - e.y) < T.emp) t.emp = 1.5;
    stunDrones(e.x, e.y, T.emp, 1.5);
  }
  if (T.node && live(e.host) && !nodesOf(e.host).some(n => n !== e)){
    const h = e.host; h.exposed = 7;
    G.banner = { title:'CORE EXPOSED', sub:'7초 동안 본체가 드러나고 느려져요', warn:true }; G.bannerT = 2;
    ringFx(h.x, h.y, h.r, h.r*3, .7, [255,90,60], 5); addShake(8); G.hitStop = Math.max(G.hitStop || 0, .12); sfx.alarm();
  }
}

/* ----- gravity on shots and ore: lenses bend, the black hole bends harder and swallows ----- */
let wells = [];
export function collectWells(){ wells = enemies.filter(e => live(e) && (e.T.lens || e.T.blackhole)); return wells.length; }
// returns false when the shot was swallowed
export function bendShot(p, dt){
  for (const w of wells){
    const dx = w.x - p.x, dy = w.y - p.y, d = Math.hypot(dx, dy), R = w.T.lens ? w.T.lens : w.r*5;
    if (d > R) continue;
    if (w.T.blackhole && d < w.r*.85 && !(w.exposed > 0)){ sprite(p.x, p.y, 6, [255,200,150], .6); return false; }
    const want = Math.atan2(dy, dx), cur = Math.atan2(p.vy, p.vx); let da = want - cur; da = Math.atan2(Math.sin(da), Math.cos(da));
    const turn = (w.T.lens ? 3.2 : 4.5)*(1 - d/R)*dt, na = cur + Math.sign(da)*Math.min(Math.abs(da), turn), sp = Math.hypot(p.vx, p.vy);
    p.vx = Math.cos(na)*sp; p.vy = Math.sin(na)*sp;
  }
  return true;
}
export function pullOre(o, dt){
  for (const w of wells){
    if (!w.T.blackhole) continue;
    const dx = w.x - o.x, dy = w.y - o.y, d = Math.hypot(dx, dy);
    if (d < w.r*4){ o.vx += dx/d*220*dt; o.vy += dy/d*220*dt; if (d < w.r*.7) return false; }
  }
  return true;
}

/* ----- drawing ----- */
export function drawCustom(e){
  const T = e.T;
  if (T.plasma){
    ctx.globalCompositeOperation = 'lighter';
    sprite(e.x, e.y, e.r*2.6, T.col, .45); sprite(e.x, e.y, e.r*1.1, [255,230,255], .9);
    neonPath(() => { for (let i = 0; i < 3; i++){ const a = time*7 + i*2.1 + e.seed, r1 = e.r*.5, r2 = e.r*(1.1 + Math.sin(time*13 + i)*.3);
      ctx.moveTo(e.x + Math.cos(a)*r1, e.y + Math.sin(a)*r1); ctx.lineTo(e.x + Math.cos(a + .4)*r2, e.y + Math.sin(a + .4)*r2); } }, [230,160,255], 1, .9);
    neonCircle(e.x, e.y, e.r, T.col, 1.2, .8);
  } else if (T.lens){
    ctx.globalCompositeOperation = 'lighter';
    ctx.save(); ctx.setLineDash([4, 10]); ctx.lineDashOffset = time*20; neonCircle(e.x, e.y, T.lens, T.col, .8, .18); ctx.restore();
    sprite(e.x, e.y, e.r*3, T.col, .25);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#05040a'; ctx.beginPath(); ctx.arc(e.x, e.y, e.r*.8, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    neonCircle(e.x, e.y, e.r*1.05, [255,240,210], 1.6, .95);
    neonPath(() => { for (let i = 0; i < 4; i++){ const a = time*1.5 + i*TAU/4; ctx.moveTo(e.x + Math.cos(a)*e.r*1.4, e.y + Math.sin(a)*e.r*1.4); ctx.arc(e.x, e.y, e.r*1.4, a, a + .7); } }, T.col, 1, .6);
  } else if (T.saturn) drawSaturn(e);
  else if (T.blackhole) drawBlackHole(e);
}
function drawSaturn(e){
  const R = e.r, ring = e.ringHp > 0, ra = ring ? .5 + .5*(e.ringHp/e.ringMax) : .15, tilt = -.28;
  const ringPath = (a0, a1, k) => { ctx.beginPath(); ctx.ellipse(e.x, e.y, R*1.9*k, R*.55*k, tilt, a0, a1); };
  ctx.globalCompositeOperation = 'lighter'; sprite(e.x, e.y, R*2.2, e.T.col, .2);
  // back half of the ring
  for (const k of [1, .86, 1.12]){ ringPath(Math.PI, TAU, k); ctx.strokeStyle = rgb([255,210,150], .3*ra); ctx.lineWidth = R*.1; ctx.stroke(); }
  // body: a banded, cracked husk
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(e.x - R*.35, e.y - R*.35, R*.1, e.x, e.y, R);
  g.addColorStop(0, '#6a5a44'); g.addColorStop(1, '#1a140f'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, R, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(e.x, e.y, R, 0, TAU); ctx.clip();
  for (let i = -4; i <= 4; i++){ ctx.fillStyle = i % 2 ? 'rgba(0,0,0,.28)' : 'rgba(255,200,140,.08)'; ctx.fillRect(e.x - R, e.y + i*R*.22 - R*.06, R*2, R*.12); }
  ctx.restore();
  ctx.globalCompositeOperation = 'lighter';
  neonCircle(e.x, e.y, R, e.T.col, 1.6, .7);
  neonPath(() => { let x = e.x - R*.3, y = e.y - R*.2; ctx.moveTo(x, y); for (let j = 0; j < 4; j++){ x += Math.sin(j*2.3 + 1)*R*.25; y += Math.cos(j*1.7)*R*.2; ctx.lineTo(x, y); } }, [255,140,80], 1.2, .7);
  // front half
  for (const k of [1, .86, 1.12]){ ringPath(0, Math.PI, k); ctx.strokeStyle = rgb([255,220,170], .55*ra); ctx.lineWidth = R*.1; ctx.stroke(); }
  if (ring) neonPath(() => ringPath(0, Math.PI, 1.2), [255,230,190], 1, .5*ra);
}
function drawBlackHole(e){
  const R = e.r, spin = time*.6, ex = e.exposed > 0, ph = e.phase || 1;
  ctx.globalCompositeOperation = 'lighter';
  sprite(e.x, e.y, R*5, [255,110,40], .18 + ph*.04); sprite(e.x, e.y, R*3, [160,60,200], .2);
  // accretion disk: rotating bands, hot inside, violet outside (back half first)
  const band = (a0, a1, alpha) => {
    for (let i = 0; i < 6; i++){
      const k = 1.35 + i*.3, c = mixc([255,220,160], [160,70,220], i/5);
      ctx.beginPath(); ctx.ellipse(e.x, e.y, R*k, R*k*.32, -.12, a0 + spin*(1 - i*.1), a1 + spin*(1 - i*.1));
      ctx.strokeStyle = rgb(c, alpha*(1 - i*.12)); ctx.lineWidth = R*.16; ctx.stroke();
    }
  };
  band(Math.PI, TAU, .35);
  // the horizon itself, ringed with bent light
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(e.x, e.y, R, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  neonCircle(e.x, e.y, R*1.04, [255,210,160], 2.2, .95);
  neonCircle(e.x, e.y, R*1.25, [255,150,90], 1, .35);
  if (ex){ const k = .5 + .5*Math.sin(time*14); sprite(e.x, e.y, R*1.1, [255,60,40], .5 + .3*k); neonCircle(e.x, e.y, R*.7, [255,90,60], 2, .6 + .4*k); }
  band(0, Math.PI, .55);
  // tethers to the nodes
  for (const n of nodesOf(e)) neonPath(() => { ctx.moveTo(e.x, e.y); ctx.lineTo(n.x, n.y); }, [255,170,90], .8, .25);
}
// codex icon for the custom-drawn ones
export function drawCustomIcon(canvas, type, T, hidden){
  const g = canvas.getContext('2d'), keep = ctx, span = T.blackhole ? T.r*4.2 : T.saturn ? T.r*4 : T.lens ? T.r*4 : T.r*3.2, sc = canvas.width/span;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
  g.setTransform(sc, 0, 0, sc, canvas.width/2, canvas.height/2);
  setCtx(g);
  const e = { type, T, x:0, y:0, r:T.r, seed:2, ringHp:1, ringMax:1, exposed:0, phase:1, rot:0 };
  if (T.lens) e.T = { ...T, lens:T.r*1.8 };
  drawCustom(e);
  if (hidden){ g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#0d1220'; g.fillRect(-span, -span, span*2, span*2); }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  setCtx(keep);
}
