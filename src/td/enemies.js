/* ---------- fortress mode: rocks — spawning, falling, taking hits, breaking, hitting the shield ---------- */
import { TAU, ctx, rand, time } from '../core/canvas.js';
import { addShake } from '../core/lights.js';
import { emit, sprite } from '../core/particles.js';
import { srng } from '../core/util.js';
import { ROCK, WAVES } from './data.js';
import { G, enemies } from './state.js';
import { PW, V, shieldY } from './view.js';
import { bigNumber, burst, explode, mixc, rgb } from './fx.js';
import { hitFortress } from './fortress.js';

const SPR = 2;                       // sprite pixels per world unit
const sprites = new Map();
export const alive = e => e && !e.dead;
export const isChilled = e => e.slowT > 0 || e.freezeT > 0;

export function spawnRock(type, x, y, opts = {}){
  const T = ROCK[type], w = Math.max(1, G.wave);
  const e = { type, T, x, y, r:T.r*(T.boss ? 1 : rand(1.05, 1.3)), variant:(Math.random()*3)|0, seed:rand(0, 100),
    hp:0, max:0, speed:T.speed*WAVES.speed(w)*V.spd, rot:rand(0, TAU), spin:rand(-.6, .6)/(T.boss ? 6 : 1),
    vx:0, vy:0, px:0, py:0, tx:x, slowT:0, slowAmt:0, freezeT:0, stunT:0, flash:0, spT:T.every || 0, dead:false, ...opts };
  e.max = e.hp = Math.round(T.hp*WAVES.hp(w)*(opts.hpMul || 1));
  if (T.comet){
    // comets cut across at a shallow angle, aimed somewhere along the shield
    const aimX = rand(PW*.15, PW*.85), dx = aimX - x, dy = V.defY - y, d = Math.hypot(dx, dy);
    e.vx = dx/d*e.speed; e.vy = dy/d*e.speed; e.rot = Math.atan2(e.vy, e.vx); e.spin = 0;
  } else e.tx = Math.max(e.r, Math.min(PW - e.r, x + rand(-60, 60)));
  enemies.push(e); return e;
}

// all damage goes through here: armour, the cryo "shatter" bonus, numbers for big hits
export function hurt(e, dmg, opts = {}){
  if (!alive(e)) return 0;
  let d = dmg;
  if (isChilled(e)) d *= 1 + G.shatter + (opts.chillBonus || 0);
  if (e.T.armor && !opts.pierceArmor) d = Math.max(d*.25, d - e.T.armor);
  e.hp -= d; e.flash = .1;
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
  G.energy += e.T.energy*G.energyMul;
  explode(e.x, e.y, e.r*1.6, e.T.col);
  if (e.T.boss){ addShake(10); for (let i = 0; i < 4; i++) setTimeout(() => explode(e.x + rand(-e.r, e.r), e.y + rand(-e.r, e.r), e.r, e.T.col), i*120); }
  if (e.T.split) for (let i = 0; i < e.T.split; i++){
    const s = spawnRock('shard', e.x + rand(-8, 8), e.y + rand(-8, 8), { hpMul:1 });
    s.px = Math.cos(-Math.PI/2 + (i - 1)*1.1)*140; s.py = -40; s.tx = Math.max(10, Math.min(PW - 10, e.x + (i - 1)*70));
    G.waveTotal++;
  }
  // a few energy sparks drift to the bar
  for (let i = 0; i < Math.min(4, Math.ceil(e.T.energy)); i++) emit({ x:e.x, y:e.y, vx:(PW/2 - e.x)*rand(.6, 1), vy:(V.PH - 40 - e.y)*rand(.6, 1), drag:.2, life:1, s0:3, s1:1.2, pal:[[220,255,255],[90,230,255]] });
}

export function updRocks(dt){
  for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].dead) enemies.splice(i, 1);
  for (const e of enemies){
    e.flash = Math.max(0, e.flash - dt); e.slowT = Math.max(0, e.slowT - dt); e.freezeT = Math.max(0, e.freezeT - dt); e.stunT = Math.max(0, e.stunT - dt);
    const k = e.freezeT > 0 || e.stunT > 0 ? 0 : e.slowT > 0 ? 1 - e.slowAmt : 1;
    if (e.T.comet){ e.x += e.vx*k*dt; e.y += e.vy*k*dt; }
    else {
      e.vy = e.speed*k; e.vx = (e.tx - e.x)*.35*k;
      if (e.T.weave) e.vx += Math.sin(time*3.2 + e.seed)*e.T.weave*k;
      e.x += (e.vx + e.px)*dt; e.y += (e.vy + e.py)*dt;
      e.rot += e.spin*dt*(k > 0 ? 1 : 0);
    }
    const f = Math.exp(-3*dt); e.px *= f; e.py *= f;
    if (!e.T.comet) e.x = Math.max(e.r*.6, Math.min(PW - e.r*.6, e.x));
    if (e.T.spawns && k > 0 && e.y > -e.r*.3){
      e.spT -= dt;
      if (e.spT <= 0){ e.spT = e.T.every; for (let j = 0; j < 2; j++){ const a = rand(0, TAU); spawnRock(e.T.spawns, e.x + Math.cos(a)*e.r, e.y + Math.sin(a)*e.r*.6, { hpMul:.8 }); G.waveTotal++; } }
    }
    if (e.y + e.r*.55 >= shieldY(e.x)){ e.dead = true; G.waveDone++; hitFortress(e); }
  }
}

/* ----- drawing: dark faceted rock, neon rim, the hot core showing through cracks ----- */
function rockSprite(e){
  const key = e.type + e.variant + (e.T.boss ? '' : Math.round(e.r)); let s = sprites.get(key); if (s) return s;
  const R = e.r, pad = 10, size = Math.ceil((R*2 + pad*2)*SPR), c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); g.scale(SPR, SPR); g.translate(R + pad, R + pad);
  const col = e.T.col, rnd = srng(e.type.length*97 + e.variant*31 + 7);
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
export function drawRocks(){
  // glow and tails first (additive), then bodies
  for (const e of enemies){
    if (e.T.comet){
      const sp = Math.hypot(e.vx, e.vy) || 1, dx = -e.vx/sp, dy = -e.vy/sp;
      for (let i = 1; i <= 10; i++){ const t = i/10; sprite(e.x + dx*e.r*14*t, e.y + dy*e.r*14*t, e.r*(2.2 - t*1.5), [255,70,50], .4*(1 - t)); }
      sprite(e.x, e.y, e.r*3.2, [255,110,70], .6);
    } else sprite(e.x, e.y, e.r*(e.T.boss ? 1.9 : 1.6), e.T.col, e.T.boss ? .22 : .14);
    if (isChilled(e)) sprite(e.x, e.y, e.r*1.5, [130,205,255], e.freezeT > 0 ? .5 : .28);
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const e of enemies){
    const s = rockSprite(e);
    ctx.globalAlpha = 1; ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot);
    ctx.drawImage(s.c, -s.o, -s.o, s.size, s.size); ctx.restore();
    if (e.flash > 0){ ctx.globalCompositeOperation = 'lighter'; sprite(e.x, e.y, e.r*1.3, [255,255,255], e.flash*5); ctx.globalCompositeOperation = 'source-over'; }
    if (e.freezeT > 0){ ctx.strokeStyle = 'rgba(200,240,255,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 3, 0, TAU); ctx.stroke(); }
    if (!e.T.boss && e.hp < e.max){
      const w = Math.max(18, e.r*1.6), x = e.x - w/2, y = e.y - e.r - 8;
      ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(x - 1, y - 1, w + 2, 4);
      ctx.fillStyle = rgb(e.T.col); ctx.fillRect(x, y, w*Math.max(0, e.hp/e.max), 2);
    }
  }
  ctx.globalCompositeOperation = 'lighter';
}
export function hitSpark(x, y, c){ burst(x, y, c, 4, 160, 1.8); }
