/* ---------- fortress mode: rocks — spawning, falling, taking hits, breaking, hitting the shield ---------- */
import { TAU, ctx, rand, setCtx, time } from '../core/canvas.js';
import { addShake } from '../core/lights.js';
import { emit, sprite } from '../core/particles.js';
import { srng } from '../core/util.js';
import { ROCK, WAVES } from './data.js';
import { G, enemies } from './state.js';
import { PW, V, angC, distC, inWorld, shieldAt } from './view.js';
import { bigNumber, burst, explode, mixc, rgb } from './fx.js';
import { hitFortress } from './fortress.js';
import { discover } from './codex.js';
import { dropLoot } from './mining.js';
import { sfx } from './sfx.js';
import { afterHurt, armorOf, drawCustom, drawCustomIcon, filterHurt, onKill, onSpawn, updSpecial } from './bosses.js';

const SPR = 2;                       // sprite pixels per world unit
const sprites = new Map();
export const alive = e => e && !e.dead;
export const isChilled = e => e.slowT > 0 || e.freezeT > 0;
// can a gun pick this as a target? (not while a comet is still a warning, a phase rock is folded away, or dark matter is unseen)
export const targetable = e => alive(e) && !(e.warnT > 0) && !e.ghost && !e.hidden;

export function spawnRock(type, x, y, opts = {}){
  const T = ROCK[type], w = Math.max(1, G.wave);
  const e = { type, T, x, y, r:T.r*(T.boss ? 1 : rand(1.05, 1.3)), variant:(Math.random()*3)|0, seed:rand(0, 100),
    hp:0, max:0, speed:T.speed*WAVES.speed(w)*V.spd, rot:rand(0, TAU), spin:rand(-.6, .6)/(T.boss ? 6 : 1),
    vx:0, vy:0, px:0, py:0, tx:x, ty:y, slowT:0, slowAmt:0, freezeT:0, stunT:0, flash:0, spT:T.every || 0, dead:false, ...opts };
  e.max = e.hp = Math.round(T.hp*WAVES.hp(w)*(opts.hpMul || 1));
  // every rock heads for a point on the shield; it picks the side of Earth it came from
  aimAt(e, opts.aim ?? angC(x, y) + rand(-.25, .25));
  // comets: the trajectory is shown for a moment first, then they come in at full speed
  if (T.comet){ const dx = e.tx - x, dy = e.ty - y, d = Math.hypot(dx, dy); e.vx = dx/d*e.speed; e.vy = dy/d*e.speed; e.rot = Math.atan2(e.vy, e.vx); e.spin = 0; e.warnT = 1.1; sfx.cometWarn(); }
  enemies.push(e); onSpawn(e); discover(type); return e;
}

// all damage goes through here: armour, the cryo "shatter" bonus, numbers for big hits
function aimAt(e, a){
  if (V.mode === 'line'){ a = Math.max(-Math.PI/2 - .36, Math.min(-Math.PI/2 + .36, a)); }
  const p = shieldAt(a); e.tx = p.x; e.ty = p.y; e.aim = a;
}
export function hurt(e, dmg, opts = {}){
  if (!alive(e)) return 0;
  let d = dmg;
  if (isChilled(e)) d *= 1 + G.shatter + (opts.chillBonus || 0);
  if ((e.T.organic || e.T.icy) && opts.organicBonus) d *= 1 + opts.organicBonus;
  const ar = armorOf(e); if (ar && !opts.pierceArmor) d = Math.max(d*.25, d - ar);
  d = filterHurt(e, d); if (d <= 0) return 0;
  e.hp -= d; e.flash = .1; afterHurt(e);
  // a shove away from Earth: small rocks get knocked back, big ones barely, bosses and comets not at all
  if (!e.T.boss && !e.T.comet && !e.T.node && d > 0){
    const dc = Math.hypot(e.x - V.cx, e.y - V.cy) || 1, kb = Math.min(40, d*1.3)*14/Math.max(12, e.r);
    e.px += (e.x - V.cx)/dc*kb; e.py += (e.y - V.cy)/dc*kb;
    const m = Math.hypot(e.px, e.py); if (m > 90){ e.px *= 90/m; e.py *= 90/m; }
  }
  if (d >= 60 || opts.crit) bigNumber(e.x + rand(-6, 6), e.y - e.r - 6, d, opts.crit ? [255,230,120] : e.T.col);
  if (e.hp <= 0) kill(e);
  return d;
}
export function hurtArea(x, y, r, dmg, opts){
  let n = 0;
  for (const e of enemies) if (alive(e) && Math.hypot(e.x - x, e.y - y) < r + e.r*.7){ hurt(e, dmg, opts); n++; }
  return n;
}
export function chill(e, amt, t){
  if (!alive(e)) return;
  if (e.T.boss) amt = Math.min(amt, .3);            // bosses only slow a little
  e.slowAmt = Math.max(e.slowT > 0 ? e.slowAmt : 0, amt); e.slowT = Math.max(e.slowT, t); }

function kill(e){
  e.dead = true; G.kills++; G.waveDone++;
  onKill(e);
  dropLoot(e);
  explode(e.x, e.y, e.r*1.6, e.T.col);
  // chunks of rock fly off; big kills stop the clock for a beat
  const n = e.T.boss ? 36 : Math.round(3 + e.r/3), hot = mixc(e.T.col, [255,255,255], .35);
  for (let i = 0; i < n; i++){ const a = rand(0, TAU), v = rand(60, 220)*(e.T.boss ? 1.8 : 1); emit({ x:e.x, y:e.y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, drag:1.4, life:rand(.45, 1), s0:rand(2, 4.5), s1:.8, pal:[hot, e.T.col, [70,60,60]] }); }
  sfx.boom(e.r/14 + (e.T.elite ? 1 : 0) + (e.T.boss ? 3 : 0));
  if (e.T.elite){ G.hitStop = Math.max(G.hitStop || 0, .06); addShake(4); }
  if (e.T.boss) G.hitStop = Math.max(G.hitStop || 0, .3);
  if (e.T.boss){ addShake(10); for (let i = 0; i < 4; i++) setTimeout(() => explode(e.x + rand(-e.r, e.r), e.y + rand(-e.r, e.r), e.r, e.T.col), i*120); }
  if (e.T.split) for (let i = 0; i < e.T.split; i++){
    // fragments burst sideways (relative to the way the rock was falling) and pick spots nearby on the shield
    const a = angC(e.x, e.y), side = a + Math.PI/2;
    const s = spawnRock(e.T.splitInto || 'shard', e.x + rand(-8, 8), e.y + rand(-8, 8), { hpMul:1, aim:(e.aim ?? a) + (i - 1)*.12 });
    s.px = Math.cos(side)*(i - 1)*150 + Math.cos(a)*40; s.py = Math.sin(side)*(i - 1)*150 + Math.sin(a)*40;
    G.waveTotal++;
  }
}

export function updRocks(dt){
  for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].dead) enemies.splice(i, 1);
  for (const e of enemies){
    if (e.burnT > 0){ e.burnT -= dt; hurt(e, e.burn*e.burnDps*dt); if (e.dead) continue; if (e.burnT <= 0) e.burn = 0; }
    e.flash = Math.max(0, e.flash - dt); e.slowT = Math.max(0, e.slowT - dt); e.freezeT = Math.max(0, e.freezeT - dt); e.stunT = Math.max(0, e.stunT - dt);
    const k = e.freezeT > 0 || e.stunT > 0 ? 0 : e.slowT > 0 ? 1 - e.slowAmt : 1;
    if (updSpecial(e, dt)) continue;
    if (e.T.comet){
      if (e.warnT > 0){ e.warnT -= dt; if (e.warnT <= 0) sfx.comet(); continue; }
      e.x += e.vx*k*dt; e.y += e.vy*k*dt;
      // embers off the tail, and a low rumble while one is on screen
      if (Math.random() < dt*70) emit({ x:e.x + rand(-4, 4), y:e.y + rand(-4, 4), vx:-e.vx*.18 + rand(-40, 40), vy:-e.vy*.18 + rand(-40, 40), drag:2.2, life:rand(.35, .7), s0:rand(3, 6), s1:1, pal:[[255,240,200],[255,160,70],[220,60,40],[80,30,30]] });
      if (inWorld(e.x, e.y, 0)) addShake(.1);
    }
    else {
      // steer for the chosen point on the shield; weavers sway across the line of travel
      const dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy) || 1, ux = dx/d, uy = dy/d;
      e.vx = ux*e.speed*k; e.vy = uy*e.speed*k;
      if (e.T.weave){ const w = Math.sin(time*3.2 + e.seed)*e.T.weave*k; e.vx += -uy*w; e.vy += ux*w; }
      e.x += (e.vx + e.px)*dt; e.y += (e.vy + e.py)*dt;
      e.rot += e.spin*dt*(k > 0 ? 1 : 0);
    }
    const f = Math.exp(-3*dt); e.px *= f; e.py *= f;
    if (V.mode === 'line' && !e.T.comet) e.x = Math.max(e.r*.6, Math.min(PW - e.r*.6, e.x));
    if (e.T.spawns && k > 0 && inWorld(e.x, e.y, -e.r*.3)){
      e.spT -= dt;
      if (e.spT <= 0){ e.spT = e.T.every; for (let j = 0; j < 2; j++){ const a = rand(0, TAU); spawnRock(e.T.spawns, e.x + Math.cos(a)*e.r, e.y + Math.sin(a)*e.r*.6, { hpMul:.8, aim:(e.aim ?? angC(e.x, e.y)) + rand(-.4, .4) }); G.waveTotal++; } }
    }
    if (distC(e.x, e.y) <= V.SR + e.r*.55){ e.dead = true; G.waveDone++; hitFortress(e); }
    else if (e.T.comet && !inWorld(e.x, e.y, 300)){ e.dead = true; G.waveDone++; }   // a comet that missed everything
  }
}

/* ----- drawing: dark faceted rock, neon rim, the hot core showing through cracks ----- */
function rockSprite(e){
  const key = e.type + e.variant + (e.T.boss ? '' : Math.round(e.r)); let s = sprites.get(key); if (s) return s;
  const R = e.r, pad = 10, size = Math.ceil((R*2 + pad*2)*SPR), c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); g.scale(SPR, SPR); g.translate(R + pad, R + pad);
  const col = e.T.col, rnd = srng(e.type.length*97 + e.variant*31 + 7);
  if (e.T.organic){ paintOrganic(g, e.type, R, col, rnd); s = { c, size:size/SPR, o:R + pad }; sprites.set(key, s); return s; }
  if (e.T.planet){
    const gr = g.createRadialGradient(-R*.35, -R*.35, R*.1, 0, 0, R);
    gr.addColorStop(0, '#3a1c22'); gr.addColorStop(1, '#0d0709'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
    g.save(); g.clip(); g.rotate(-.35);
    for (let i = -5; i <= 5; i++){ g.fillStyle = i % 2 ? 'rgba(0,0,0,.35)' : 'rgba(255,120,90,.07)'; g.fillRect(-R, i*R*.19, R*2, R*.09); }
    g.restore();
    g.strokeStyle = rgb(col, .9); g.lineWidth = 1.6;
    for (let k = 0; k < 6; k++){ let x = (rnd() - .5)*R*1.2, y = (rnd() - .5)*R*1.2; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 4; j++){ x += (rnd() - .5)*R*.5; y += (rnd() - .5)*R*.5; g.lineTo(x, y); } g.stroke(); }
    g.strokeStyle = rgb(col, .25); g.lineWidth = 8; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
    g.strokeStyle = rgb(mixc(col, [255,255,255], .3), .95); g.lineWidth = 2; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
  } else {
    const n = e.T.sides || 7, pts = [];
    for (let i = 0; i < n; i++){ const a = i/n*TAU + rnd()*.4, rr = R*(e.T.elite ? (i % 2 ? .62 : 1) : .78 + rnd()*.22); pts.push([Math.cos(a)*rr, Math.sin(a)*rr]); }
    const path = () => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
    const gr = g.createLinearGradient(-R, -R, R, R);
    gr.addColorStop(0, '#2a2e3d'); gr.addColorStop(.55, '#151824'); gr.addColorStop(1, '#090a10');
    path(); g.fillStyle = gr; g.fill();
    // facets
    const cx = (rnd() - .5)*R*.4, cy = (rnd() - .5)*R*.4;
    g.strokeStyle = rgb(col, .22); g.lineWidth = 1;
    for (let i = 0; i < n; i += 2){ g.beginPath(); g.moveTo(cx, cy); g.lineTo(pts[i][0], pts[i][1]); g.stroke(); }
    if (e.T.split || e.T.elite){ g.strokeStyle = rgb(col, .8); g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx, cy); g.lineTo(pts[1][0]*.7, pts[1][1]*.7); g.moveTo(cx, cy); g.lineTo(pts[n - 2][0]*.6, pts[n - 2][1]*.6); g.stroke(); }
    // rim: halo + bright edge, brighter on the lit (upper-left) side
    path(); g.strokeStyle = rgb(col, .25); g.lineWidth = 5; g.stroke();
    path(); g.strokeStyle = rgb(col, .85); g.lineWidth = 1.6; g.stroke();
    g.save(); path(); g.clip(); g.strokeStyle = rgb(mixc(col, [255,255,255], .6), .7); g.lineWidth = 2;
    g.beginPath(); g.arc(R*.25, R*.25, R*1.05, Math.PI*.95, Math.PI*1.55); g.stroke(); g.restore();
    if (e.T.armor){ g.strokeStyle = rgb(col, .5); g.lineWidth = 1; path(); g.save(); g.scale(.72, .72); path(); g.stroke(); g.restore(); }
  }
  s = { c, size:size/SPR, o:R + pad }; sprites.set(key, s); return s;
}
/* ----- organics: membrane, veins and glowing sacs; the living planet also gets a live eye and tendrils ----- */
function blobPath(g, R, rnd, n = 12, wob = .12){
  const pts = []; for (let i = 0; i < n; i++){ const a = i/n*TAU, r = R*(1 - wob + rnd()*wob*2); pts.push([Math.cos(a)*r, Math.sin(a)*r]); }
  g.beginPath();
  for (let i = 0; i < n; i++){ const p = pts[i], q = pts[(i + 1) % n]; const mx = (p[0] + q[0])/2, my = (p[1] + q[1])/2; i ? g.quadraticCurveTo(p[0], p[1], mx, my) : g.moveTo(mx, my); }
  const p = pts[0], q = pts[1]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0])/2, (p[1] + q[1])/2); g.closePath();
}
function sac(g, x, y, r, col){
  const gr = g.createRadialGradient(x - r*.3, y - r*.3, r*.1, x, y, r);
  gr.addColorStop(0, 'rgba(255,190,170,.95)'); gr.addColorStop(.35, rgb(col, .9)); gr.addColorStop(1, 'rgba(90,0,20,.9)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(x - r*.35, y - r*.4, r*.25, r*.14, -.6, 0, TAU); g.fill();
}
function paintOrganic(g, type, R, col, rnd){
  if (type === 'spore'){
    // a bristling spore: dark fuzz, a hot core showing through
    g.strokeStyle = 'rgba(40,10,18,.95)'; g.lineWidth = 1.4;
    for (let i = 0; i < 22; i++){ const a = i/22*TAU + rnd()*.2, l = R*(1.05 + rnd()*.35); g.beginPath(); g.moveTo(Math.cos(a)*R*.6, Math.sin(a)*R*.6); g.lineTo(Math.cos(a)*l, Math.sin(a)*l); g.stroke(); }
    const gr = g.createRadialGradient(0, 0, R*.1, 0, 0, R*.85); gr.addColorStop(0, '#3b0a16'); gr.addColorStop(1, '#12040a');
    g.fillStyle = gr; blobPath(g, R*.85, rnd, 9, .1); g.fill();
    sac(g, 0, R*.05, R*.36, col);
    g.strokeStyle = rgb(col, .6); g.lineWidth = 1; blobPath(g, R*.85, rnd, 9, .1); g.stroke();
    return;
  }
  if (type === 'pod'){
    // a capsule with a glowing seam and cilia along its sides
    g.strokeStyle = 'rgba(60,14,26,.9)'; g.lineWidth = 1.2;
    for (let i = 0; i < 14; i++){ const y = -R*.9 + i/13*R*1.8, sd = i % 2 ? 1 : -1, w = R*.55*Math.sqrt(1 - (y/R)**2); g.beginPath(); g.moveTo(sd*w, y); g.lineTo(sd*(w + R*.32), y + R*.08); g.stroke(); }
    const gr = g.createLinearGradient(-R*.6, 0, R*.6, 0); gr.addColorStop(0, '#2a0812'); gr.addColorStop(.5, '#4a1222'); gr.addColorStop(1, '#14050b');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, R*.58, R, 0, 0, TAU); g.fill();
    g.strokeStyle = rgb(col, .95); g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, -R*.75);
    for (let k = 1; k <= 6; k++) g.lineTo((k % 2 ? 1 : -1)*R*.1, -R*.75 + k*R*.25); g.stroke();
    g.strokeStyle = rgb(col, .25); g.lineWidth = 7; g.stroke();
    sac(g, 0, -R*.55, R*.16, col); sac(g, 0, R*.55, R*.13, col);
    return;
  }
  // hive: the living planet's body (eye and tendrils are drawn live)
  const gr = g.createRadialGradient(-R*.3, -R*.35, R*.1, 0, 0, R);
  gr.addColorStop(0, '#4a1020'); gr.addColorStop(.6, '#22060f'); gr.addColorStop(1, '#0c0207');
  g.fillStyle = gr; blobPath(g, R, rnd, 14, .08); g.fill();
  g.save(); blobPath(g, R, rnd, 14, .08); g.clip();
  // veins
  g.strokeStyle = 'rgba(150,20,45,.55)'; g.lineWidth = 2;
  for (let k = 0; k < 9; k++){ let a = rnd()*TAU, r = R*.32; g.beginPath(); g.moveTo(Math.cos(a)*r, Math.sin(a)*r); for (let j = 0; j < 5; j++){ a += (rnd() - .5)*.7; r += R*.14; g.lineTo(Math.cos(a)*r, Math.sin(a)*r); } g.stroke(); }
  g.lineWidth = 1; g.strokeStyle = 'rgba(255,80,100,.25)';
  for (let k = 0; k < 14; k++){ let x = (rnd() - .5)*R*1.6, y = (rnd() - .5)*R*1.6; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 3; j++){ x += (rnd() - .5)*R*.3; y += (rnd() - .5)*R*.3; g.lineTo(x, y); } g.stroke(); }
  // sacs around the rim, a ring of tissue around the eye socket
  for (let k = 0; k < 9; k++){ const a = k/9*TAU + rnd()*.4, d = R*(.62 + rnd()*.22); sac(g, Math.cos(a)*d, Math.sin(a)*d, R*(.07 + rnd()*.07), col); }
  g.fillStyle = '#0a0205'; g.beginPath(); g.ellipse(0, 0, R*.36, R*.3, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(120,10,35,.9)'; g.lineWidth = 5; g.stroke();
  g.restore();
  g.strokeStyle = rgb(col, .22); g.lineWidth = 8; blobPath(g, R, rnd, 14, .08); g.stroke();
  g.strokeStyle = rgb(col, .7); g.lineWidth = 1.6; blobPath(g, R, rnd, 14, .08); g.stroke();
}
// tendrils behind the body, swaying
function hiveTendrils(e){
  const R = e.r;
  ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'round';
  for (let k = 0; k < 8; k++){
    const a0 = k/8*TAU + .3 + e.seed, base = [e.x + Math.cos(a0)*R*.85, e.y + Math.sin(a0)*R*.85];
    ctx.beginPath(); ctx.moveTo(base[0], base[1]);
    let x = base[0], y = base[1];
    for (let j = 1; j <= 6; j++){ const a = a0 + Math.sin(time*1.8 + k*1.3 + j*.7)*.35; x += Math.cos(a)*R*.09; y += Math.sin(a)*R*.09; ctx.lineTo(x, y); }
    ctx.strokeStyle = '#1c050c'; ctx.lineWidth = R*.07; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,60,90,.35)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; sprite(x, y, R*.07, e.T.col, .8); ctx.globalCompositeOperation = 'source-over';
  }
}
// the eye: an amber iris with a slit, looking toward the fortress, blinking now and then
function hiveEye(e){
  const R = e.r, blink = Math.max(0, Math.sin(time*.9 + e.seed*3)) > .985 ? .1 : 1;
  const la = Math.atan2(V.cy - e.y, V.cx - e.x), ex = Math.cos(la)*R*.07 + Math.sin(time*.7)*R*.02, ey = Math.sin(la)*R*.07;   // looks at Earth
  ctx.save(); ctx.translate(e.x, e.y);
  ctx.beginPath(); ctx.ellipse(0, 0, R*.33, R*.27*blink, 0, 0, TAU); ctx.clip();
  const gr = ctx.createRadialGradient(ex, ey, 0, ex, ey, R*.3);
  gr.addColorStop(0, '#ffe08a'); gr.addColorStop(.45, '#ff7a2a'); gr.addColorStop(1, '#5a0a12');
  ctx.fillStyle = gr; ctx.fillRect(-R*.4, -R*.4, R*.8, R*.8);
  ctx.fillStyle = '#080103'; ctx.beginPath(); ctx.ellipse(ex, ey, R*.05, R*.22, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.globalCompositeOperation = 'lighter'; sprite(e.x + ex, e.y + ey, R*.5, [255,120,60], .35*blink); ctx.globalCompositeOperation = 'source-over';
}
// codex art: the rock (and the living planet's eye) fitted into a canvas; unknown ones as a dark silhouette
export function drawRockIcon(canvas, type, hidden){
  if (ROCK[type].custom) return drawCustomIcon(canvas, type, ROCK[type], hidden);
  const T = ROCK[type], e = { type, T, r:T.r, variant:0, seed:3, x:0, y:0, rot:-.4 };
  const s = rockSprite(e), g = canvas.getContext('2d'), sc = canvas.width/(s.size*1.05);
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
  g.setTransform(sc, 0, 0, sc, canvas.width/2, canvas.height/2);
  const keep = ctx; setCtx(g);
  if (!hidden){ g.globalCompositeOperation = 'lighter'; sprite(0, 0, T.r*1.5, T.col, .25); }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.save(); g.rotate(T.organic ? 0 : e.rot); g.drawImage(s.c, -s.o, -s.o, s.size, s.size); g.restore();
  if (type === 'hive' && !hidden) hiveEye(e);
  if (hidden){ g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#0d1220'; g.fillRect(-s.size, -s.size, s.size*2, s.size*2); }
  setCtx(keep);
}
export function drawRocks(){
  // glow and tails first (additive), then bodies
  for (const e of enemies){
    if (e.T.comet && e.warnT > 0){
      // the warning: a dashed red line along the path and a target ring where it will hit
      const k = .45 + .45*Math.sin(time*22);
      ctx.save(); ctx.lineCap = 'round'; ctx.globalAlpha = 1;
      ctx.strokeStyle = rgb([255,60,40], .12 + .12*k); ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.tx, e.ty); ctx.stroke();
      ctx.setLineDash([14, 10]); ctx.lineDashOffset = -time*160; ctx.strokeStyle = rgb([255,120,90], .55 + .4*k); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.tx, e.ty); ctx.stroke(); ctx.restore();
      // a warning triangle where the path enters the screen
      { const L = Math.hypot(e.tx - e.x, e.ty - e.y), ux = (e.tx - e.x)/L, uy = (e.ty - e.y)/L; let d = 0;
        while (d < L && !inWorld(e.x + ux*d, e.y + uy*d, -26)) d += 12;
        const wx = e.x + ux*d, wy = e.y + uy*d;
        ctx.globalAlpha = 1; ctx.strokeStyle = rgb([255,90,60], .6 + .4*k); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(wx, wy - 14); ctx.lineTo(wx + 13, wy + 9); ctx.lineTo(wx - 13, wy + 9); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = rgb([255,200,180], .7 + .3*k); ctx.fillRect(wx - 1.3, wy - 6, 2.6, 8); ctx.fillRect(wx - 1.3, wy + 4, 2.6, 2.6);
        sprite(wx, wy, 34, [255,60,40], .35*k); }
      const rr = 14 + (1.1 - e.warnT)*10; ctx.globalAlpha = 1; ctx.strokeStyle = rgb([255,90,60], .5 + .4*k); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.tx, e.ty, rr, 0, TAU); ctx.stroke();
      sprite(e.tx, e.ty, 30, [255,60,40], .3*k);
      continue;
    }
    if (e.T.comet){
      const sp = Math.hypot(e.vx, e.vy) || 1, dx = -e.vx/sp, dy = -e.vy/sp;
      for (let i = 1; i <= 14; i++){ const t = i/14; sprite(e.x + dx*e.r*20*t, e.y + dy*e.r*20*t, e.r*(2.6 - t*1.8), [255,70,40], .45*(1 - t)); }
      for (let i = 1; i <= 6; i++){ const t = i/6; sprite(e.x + dx*e.r*7*t, e.y + dy*e.r*7*t, e.r*(1.2 - t*.8), [255,220,170], .5*(1 - t)); }
      sprite(e.x, e.y, e.r*4, [255,110,70], .6); sprite(e.x, e.y, e.r*1.2, [255,255,230], .9);
    } else if (!e.T.custom && !e.hidden) sprite(e.x, e.y, e.r*(e.T.boss ? 1.9 : 1.6), e.T.col, e.ghost ? .05 : e.T.boss ? .22 : .14);
    if (isChilled(e)) sprite(e.x, e.y, e.r*1.5, [130,205,255], e.freezeT > 0 ? .5 : .28);
    if (e.burnT > 0) sprite(e.x + rand(-e.r, e.r)*.3, e.y - e.r*.3, e.r*(1.1 + Math.random()*.5), [255,120,40], .25 + e.burn*.06);
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const e of enemies){
    if (e.warnT > 0) continue;
    if (e.T.custom){ drawCustom(e); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; if (!e.T.boss && e.hp < e.max) hpBar(e); continue; }
    const s = rockSprite(e);
    if (e.type === 'hive') hiveTendrils(e);
    // organics breathe instead of tumbling
    const pulse = e.T.organic ? 1 + Math.sin(time*(e.T.boss ? 2 : 5) + e.seed)*(e.T.boss ? .025 : .06) : 1;
    // dark matter is barely there until it comes close; a folded phase rock is a ghost
    ctx.globalAlpha = e.hidden ? .1 + .05*Math.sin(time*3 + e.seed) : e.ghost ? .25 : 1; ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.T.organic ? (e.T.boss ? 0 : Math.sin(time*2 + e.seed)*.25) : e.rot); ctx.scale(pulse, 2 - pulse);
    ctx.drawImage(s.c, -s.o, -s.o, s.size, s.size); ctx.restore();
    if (e.type === 'hive') hiveEye(e);
    if (e.flash > 0){ ctx.globalCompositeOperation = 'lighter'; sprite(e.x, e.y, e.r*1.3, [255,255,255], e.flash*5); ctx.globalCompositeOperation = 'source-over'; }
    if (e.freezeT > 0){ ctx.strokeStyle = 'rgba(200,240,255,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 3, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (e.T.shell && !e.shellBroken){ ctx.strokeStyle = 'rgba(220,240,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, e.r*1.05, 0, TAU); ctx.stroke(); }
    if (e.ghost){ ctx.globalCompositeOperation = 'lighter'; neonCircleLite(e); ctx.globalCompositeOperation = 'source-over'; }
    if (!e.T.boss && !e.hidden && e.hp < e.max) hpBar(e);
  }
  ctx.globalCompositeOperation = 'lighter';
}
export function hitSpark(x, y, c){ burst(x, y, c, 4, 160, 1.8); }

function hpBar(e){
  const w = Math.max(18, e.r*1.6), x = e.x - w/2, y = e.y - e.r - 8;
  ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(x - 1, y - 1, w + 2, 4);
  ctx.fillStyle = rgb(e.T.col); ctx.fillRect(x, y, w*Math.max(0, e.hp/e.max), 2);
}
function neonCircleLite(e){ ctx.strokeStyle = rgb(e.T.col, .5); ctx.lineWidth = 1.2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(e.x, e.y, e.r*1.2, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
