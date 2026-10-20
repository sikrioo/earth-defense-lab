import { ELL, TAU, ctx, lerp, rand, time } from '../core/canvas.js';
import { LIGHT, PAL } from '../core/palette.js';
import { emit, sprite, streak } from '../core/particles.js';
import { addShake, flash, light, ring } from '../core/lights.js';
import { drawBolt, jag } from '../core/lightning.js';
import { DMG } from '../data/damage.js';
import { enemies } from '../enemies/list.js';
import { alive, ectr } from '../enemies/spawn.js';
import { hurt, hurtArea } from '../enemies/damage.js';
import { sparks } from '../fx/bursts.js';
import { Proj } from '../fx/projectile.js';
import { active } from './index.js';

/* ================= BARBARIAN ================= */
function line(x1, y1, x2, y2, passes, a){
  ctx.lineCap = 'round';
  for (const [lw, c, al] of passes){ ctx.globalAlpha = a*al; ctx.strokeStyle = `rgb(${c})`; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
}
export const STEEL_PASS = () => [[7, PAL.steel[3], .25], [3, PAL.steel[1], .7], [1.2, PAL.steel[0], 1]];
export class Whirlwind {
  constructor(ox, oy, tx, ty){
    this.sx = ox; this.sy = oy - 10; this.tx = tx; this.ty = ty;
    this.move = Math.max(.7, Math.hypot(tx - this.sx, ty - this.sy)/340);
    this.life = this.move + .35; this.age = 0; this.spin = rand(0, TAU); this.x = this.sx; this.y = this.sy;
  }
  k(){ return Math.max(0, Math.min(1, this.age/.12, (this.life - this.age)/.3)); }
  pt(a, r){ return { x:this.x + Math.cos(a)*r, y:this.y - 22 + Math.sin(a)*r*ELL }; }
  sword(a, k){
    // blade lies radially in the spin plane: grip, crossguard, tapered blade with a bright fuller
    let tx = -Math.sin(a), ty = Math.cos(a)*ELL; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const P = (r, w) => { const c = this.pt(a, r); return [c.x + tx*w, c.y + ty*w]; };
    const blade = [P(17, -3.6), P(52, -2.6), P(62, 0), P(52, 2.6), P(17, 3.6)];
    const guard = [P(14, -9), P(17, -9), P(17, 9), P(14, 9)];
    const grip = [P(4, -1.8), P(14, -1.8), P(14, 1.8), P(4, 1.8)];
    const poly = pts => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); };
    ctx.lineJoin = 'round';
    ctx.globalAlpha = .3*k; ctx.strokeStyle = `rgb(${PAL.steel[3]})`; ctx.lineWidth = 7;
    poly(blade); ctx.stroke(); poly(guard); ctx.stroke();
    ctx.globalAlpha = .9*k; ctx.fillStyle = `rgb(${PAL.steel[2]})`; poly(blade); ctx.fill();
    ctx.fillStyle = `rgb(${PAL.steel[3]})`; poly(grip); ctx.fill();
    ctx.fillStyle = `rgb(${PAL.steel[1]})`; poly(guard); ctx.fill();
    const f0 = P(18, 0), f1 = P(55, 0);
    ctx.globalAlpha = k; ctx.strokeStyle = `rgb(${PAL.steel[0]})`; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(f0[0], f0[1]); ctx.lineTo(f1[0], f1[1]); ctx.stroke();
    const tip = P(60, 0); sprite(tip[0], tip[1], 5, PAL.steel[0], .8*k);
  }
  update(dt){
    this.age += dt; const p = Math.min(1, this.age/this.move), k = this.k();
    this.x = lerp(this.sx, this.tx, p); this.y = lerp(this.sy, this.ty, p);
    this.spin += dt*24*(.4 + .6*k);
    const n = Math.ceil(dt*55*k);
    for (let i = 0; i < n; i++){
      const a = rand(0, TAU), r = rand(20, 58), s = rand(60, 150);
      emit({ x:this.x + Math.cos(a)*r, y:this.y + Math.sin(a)*r*ELL, vx:-Math.sin(a)*s, vy:Math.cos(a)*s*ELL - rand(10,30), drag:2, life:rand(.5,.9), s0:rand(10,18), s1:26, a:.09, pal:PAL.earth });
    }
    if (Math.random() < dt*16*k){
      const a = this.spin + (Math.random() < .5 ? 0 : Math.PI), tip = this.pt(a, 54), s = rand(200, 380);
      emit({ x:tip.x, y:tip.y, vx:-Math.sin(a)*s, vy:Math.cos(a)*s*ELL - rand(40,120), ay:700, drag:1, life:rand(.25,.45), s0:2, s1:.6, streak:3, pal:PAL.steel });
    }
    if (!this.cd) this.cd = new Map();
    for (const e of enemies){
      if (!alive(e) || Math.hypot(e.x - this.x, (e.y - this.y)/ELL) > 62 + e.r) continue;
      const c = this.cd.get(e) || 0;
      if (time >= c){ this.cd.set(e, time + .18); hurt(e, DMG.whirlwind, 'steel'); const q = ectr(e); sparks(q.x, q.y, PAL.steel, 5, 260, 2); }
    }
    light(this.x, this.y - 20, 170, LIGHT.steel, .5*k);
    return this.age < this.life;
  }
  draw(){
    const k = this.k(); if (!k) return;
    sprite(this.x, this.y - 18, 64, PAL.steel[3], .12*k);
    for (const b of [0, Math.PI]){
      const a0 = this.spin + b;
      for (let j = 1; j <= 16; j++){
        const a = a0 - j*.1, i0 = this.pt(a, 14), i1 = this.pt(a, 54);
        ctx.globalAlpha = .3*k*(1 - j/16)**2; ctx.strokeStyle = `rgb(${PAL.steel[2]})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(i0.x, i0.y); ctx.lineTo(i1.x, i1.y); ctx.stroke();
      }
      for (let j = 0; j < 12; j++){
        const a = a0 - j*.12, q = this.pt(a, 55);
        streak(q.x, q.y, Math.atan2(Math.cos(a)*ELL, -Math.sin(a)), 8, 3.5, PAL.steel[1], .55*k*(1 - j/12));
      }
      this.sword(a0, k);
    }
  }
}
export class LeapAttack {
  constructor(ox, oy, tx, ty){
    this.sx = ox; this.sy = oy; this.tx = tx; this.ty = ty; this.age = 0; this.air = .6;
    this.peak = 170 + Math.hypot(tx-ox, ty-oy)*.2; this.x = ox; this.y = oy; this.done = false; this.cracks = [];
  }
  update(dt){
    this.age += dt; const p = Math.min(1, this.age/this.air);
    if (!this.done){
      const px = this.x, py = this.y;
      this.x = lerp(this.sx, this.tx, p); this.y = lerp(this.sy, this.ty, p) - Math.sin(Math.PI*p)*this.peak;
      this.ang = Math.atan2(this.y - py, this.x - px);
      for (let i = 0; i < 3; i++) emit({ x:lerp(px, this.x, Math.random()), y:lerp(py, this.y, Math.random()), vx:rand(-10,10), vy:rand(-10,10), life:rand(.2,.4), s0:rand(4,7), s1:1, a:.5, pal:PAL.steel });
      light(this.tx, this.ty, 60 + 100*p, LIGHT.steel, .2 + .5*p);
      if (p >= 1){
        this.done = true; const x = this.tx, y = this.ty;
        flash(x, y, 260, LIGHT.steel, 1.4, .3); addShake(8); hurtArea(x, y, 90, DMG.leap, 'steel');
        ring(x, y, 6, 150, .45, PAL.earth[1], 5); ring(x, y, 4, 80, .3, PAL.steel[0], 2);
        for (let i = 0; i < 36; i++){ const a = rand(0, TAU), s = rand(80, 300); emit({ x:x + rand(-10,10), y, vx:Math.cos(a)*s, vy:-rand(150,380), ay:1100, drag:.5, life:rand(.6,1.1), s0:rand(2.5,4.5), s1:1.5, streak:1.6, pal:PAL.earth }); }
        for (let i = 0; i < 24; i++){ const a = rand(0, TAU), s = rand(80, 220); emit({ x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s*ELL - 15, drag:2.2, life:rand(.9,1.5), s0:rand(14,22), s1:40, a:.1, pal:PAL.earth }); }
        sparks(x, y - 6, PAL.steel, 18, 420);
        for (let i = 0; i < 7; i++){ const a = i/7*TAU + rand(-.3,.3), L = rand(50, 115); this.cracks.push(jag(x, y, x + Math.cos(a)*L, y + Math.sin(a)*L*ELL, .25)); }
      }
      return true;
    }
    return this.age < this.air + 1.2;
  }
  draw(){
    if (!this.done){
      const p = Math.min(1, this.age/this.air);
      ctx.globalAlpha = .25 + .3*p; ctx.strokeStyle = `rgb(${PAL.steel[2]})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(this.tx, this.ty, 34*(1.4 - p*.4), 34*(1.4 - p*.4)*ELL, 0, 0, TAU); ctx.stroke();
      streak(this.x - Math.cos(this.ang)*14, this.y - Math.sin(this.ang)*14, this.ang, 22, 6, PAL.steel[2], .6);
      sprite(this.x, this.y, 14, PAL.steel[1], .8); sprite(this.x, this.y, 5, PAL.steel[0], 1);
      return;
    }
    const a = Math.max(0, 1 - (this.age - this.air)/1.2);
    for (const c of this.cracks) drawBolt(c, a*.55, .7, PAL.earth);
  }
}
export class Berserk {
  constructor(x, y){ this.x = x; this.y = y; this.age = 0; this.life = .75; this.burst = false; }
  crescent(cx, cy, r, a0, a1, p, alpha){
    const head = lerp(a0, a1, p), tail = lerp(a0, a1, Math.max(0, p - .75)), N = 18, pts = [];
    for (let i = 0; i <= N; i++){ const a = lerp(tail, head, i/N); pts.push([cx + Math.cos(a)*r, cy + Math.sin(a)*r]); }
    ctx.lineCap = 'round';
    for (const [m, c, al] of [[3.2, PAL.rage[3], .25], [1.6, PAL.rage[2], .65], [.55, PAL.rage[0], 1]]){
      ctx.strokeStyle = `rgb(${c})`;
      for (let i = 0; i < N; i++){
        const t = i/N; ctx.globalAlpha = alpha*al*(.3 + .7*t);
        ctx.lineWidth = (Math.sin(Math.PI*t)*6 + .6)*m;
        ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i+1][0], pts[i+1][1]); ctx.stroke();
      }
    }
  }
  update(dt){
    this.age += dt;
    if (this.age > .17 && !this.burst){
      this.burst = true; const x = this.x, y = this.y;
      for (let i = 0; i < 40; i++){ const a = rand(0, TAU), s = rand(80, 340); emit({ x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, drag:3, life:rand(.3,.6), s0:rand(5,10), s1:1, pal:PAL.rage }); }
      sparks(x, y, PAL.rage, 16, 460);
      ring(x, y, 4, 90, .4, PAL.rage[1], 4); flash(x, y, 240, LIGHT.rage, 1.4, .35); addShake(4); hurtArea(x, y, 50, DMG.berserk, 'rage');
    }
    light(this.x, this.y, 160, LIGHT.rage, .6*(1 - this.age/this.life));
    return this.age < this.life;
  }
  draw(){
    const fade = a => a < .3 ? 1 : Math.max(0, 1 - (a - .3)/.4);
    const q = Math.PI*3/4, x = this.x, y = this.y;
    this.crescent(x + 38, y - 38, 54, q - .95, q + .95, Math.min(1, this.age/.1), fade(this.age));
    const t2 = this.age - .08;
    if (t2 > 0) this.crescent(x - 38, y - 38, 54, Math.PI/4 + .95, Math.PI/4 - .95, Math.min(1, t2/.1), fade(t2));
  }
}
export class WarCry {
  constructor(x, y){
    this.x = x; this.y = y; this.age = 0; this.life = 1;
    flash(x, y, 260, LIGHT.shout, 1.2, .35); addShake(4);
    for (const e of enemies) if (alive(e) && Math.hypot(e.x - x, (e.y - y)/ELL) < 230){ hurt(e, DMG.warcry, 'shout'); e.stun = 1.8; }
    for (let i = 0; i < 40; i++){ const a = rand(0, TAU), s = rand(160, 360); emit({ x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s*ELL, drag:2.4, life:rand(.6,1), s0:rand(12,20), s1:30, a:.1, pal:PAL.earth }); }
    for (let i = 0; i < 20; i++){ const a = rand(0, TAU), s = rand(200, 400); emit({ x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s*ELL, drag:3, life:rand(.3,.5), s0:3, s1:1, streak:3, pal:PAL.shout }); }
  }
  update(dt){ this.age += dt; light(this.x, this.y, 260, LIGHT.shout, .6*(1 - this.age/this.life)); return this.age < this.life; }
  draw(){
    for (let i = 0; i < 3; i++){
      const lt = this.age - i*.1; if (lt <= 0 || lt >= .65) continue;
      const t = lt/.65, r = lerp(20, 290 - i*40, 1 - (1-t)**2);
      for (const [lw, c, al] of [[10, PAL.shout[3], .15], [3.5, PAL.shout[2], .45], [1.2, PAL.shout[0], .85]]){
        ctx.globalAlpha = (1-t)*al; ctx.strokeStyle = `rgb(${c})`; ctx.lineWidth = lw;
        ctx.beginPath();
        for (let s = 0; s <= 64; s++){
          const a = s/64*TAU, rr = r*(1 + .045*Math.sin(a*7 + time*30 + i*2));
          const px = this.x + Math.cos(a)*rr, py = this.y + Math.sin(a)*rr*ELL;
          s ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke();
      }
    }
    sprite(this.x, this.y, 40, PAL.shout[2], .5*Math.max(0, 1 - this.age/.4));
  }
}
export class BattleOrders {
  constructor(x, y){ this.x = x; this.y = y; this.age = 0; this.life = 1.8; this.ch = []; this.ct = 0; ring(x, y, 10, 110, .6, PAL.shout[1], 4); flash(x, y, 220, LIGHT.shout, 1.1, .4); }
  k(){ return Math.max(0, Math.min(1, this.age/.2, (this.life - this.age)/.5)); }
  update(dt){
    this.age += dt; const k = this.k();
    this.ct -= dt;
    if (this.ct <= 0 && this.age < this.life - .5){ this.ct = .2; this.ch.push({ age:0 }); }
    for (const c of this.ch) c.age += dt;
    this.ch = this.ch.filter(c => c.age < 1);
    if (Math.random() < dt*50*k){ const a = rand(0, TAU), r = rand(10, 46); emit({ x:this.x + Math.cos(a)*r, y:this.y + Math.sin(a)*r*ELL, vx:rand(-6,6), vy:-rand(80,170), drag:.6, life:rand(.6,1), s0:rand(2,3.5), s1:.6, pal:PAL.shout }); }
    light(this.x, this.y - 60, 220, LIGHT.shout, .7*k);
    return this.age < this.life;
  }
  draw(){
    const k = this.k(); if (!k) return;
    streak(this.x, this.y - 80, -Math.PI/2, 95, 30, PAL.shout[3], .3*k);
    streak(this.x, this.y - 70, -Math.PI/2, 80, 7, PAL.shout[1], .4*k);
    ctx.globalAlpha = .35*k; ctx.strokeStyle = `rgb(${PAL.shout[2]})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(this.x, this.y, 50, 50*ELL, 0, 0, TAU); ctx.stroke();
    ctx.lineJoin = 'round';
    for (const c of this.ch){
      const cy = this.y - c.age*150, a = k*Math.min(1, c.age/.12)*(1 - c.age), rr = 46 - c.age*22;
      for (const [lw, col, al] of [[7, PAL.shout[3], .2], [2.5, PAL.shout[2], .5], [1, PAL.shout[0], .8]]){
        ctx.globalAlpha = a*al; ctx.strokeStyle = `rgb(${col})`; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.ellipse(this.x, cy, rr, rr*ELL*.6, 0, 0, TAU); ctx.stroke();
      }
    }
  }
}
export function doubleThrow(ox, oy, tx, ty){
  const base = Math.atan2(ty-oy, tx-ox), d = Math.hypot(tx-ox, ty-oy);
  for (const off of [-.07, .07]){
    active.push(new Proj({ x:ox, y:oy, tx, ty, ang:base + off, max:d, speed:780, kind:'axe', pal:PAL.steel, collide:true, dmg:DMG.doublethrow, elem:'steel',
      trail:(o, dt) => { if (Math.random() < dt*30) emit({ x:o.x, y:o.y, vx:rand(-20,20), vy:rand(-20,20), drag:3, life:.25, s0:3, s1:.6, a:.6, pal:PAL.steel }); light(o.x, o.y, 90, LIGHT.steel, .4); },
      onHit:(x, y) => { sparks(x, y, PAL.steel, 14, 380); ring(x, y, 3, 40, .25, PAL.steel[1], 2); flash(x, y, 120, LIGHT.steel, .9, .2); } }));
  }
}
