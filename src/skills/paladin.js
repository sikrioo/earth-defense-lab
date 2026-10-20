import { ELL, TAU, ctx, lerp, rand, time } from '../core/canvas.js';
import { LIGHT, PAL } from '../core/palette.js';
import { emit, sprite, streak } from '../core/particles.js';
import { addShake, flash, light, ring } from '../core/lights.js';
import { DMG } from '../data/damage.js';
import { enemies } from '../enemies/list.js';
import { alive, ectr } from '../enemies/spawn.js';
import { hurt, hurtArea } from '../enemies/damage.js';
import { holyBurst, sparks } from '../fx/bursts.js';
import { Proj, trailOf } from '../fx/projectile.js';
import { BoltChain } from './sorceress.js';
import { active } from './index.js';

/* ================= PALADIN ================= */
export class BlessedHammer {
  constructor(x, y){ this.cx = x; this.cy = y; this.age = 0; this.life = 2.2; this.a0 = rand(0, TAU); }
  pos(t){ const r = 12 + t*112, a = this.a0 + t*7.4; return { x:this.cx + Math.cos(a)*r, y:this.cy + Math.sin(a)*r*ELL }; }
  update(dt){
    this.age += dt; const p = this.pos(this.age);
    const n = Math.ceil(dt*70);
    for (let i = 0; i < n; i++) emit({ x:p.x + rand(-5,5), y:p.y + rand(-5,5), vx:rand(-15,15), vy:rand(-15,15), drag:2, life:rand(.3,.55), s0:rand(5,8), s1:1, a:.75, pal:PAL.magic });
    if (!this.hs) this.hs = new Set();
    for (const e of enemies){ if (!alive(e) || this.hs.has(e)) continue; const c = ectr(e); if (Math.hypot(c.x - p.x, c.y - p.y) < e.r + 14){ this.hs.add(e); hurt(e, DMG.hammer, 'magic'); sparks(p.x, p.y, PAL.magic, 6, 220); } }
    light(p.x, p.y, 120, LIGHT.magic, .8);
    if (this.age >= this.life){ sparks(p.x, p.y, PAL.magic, 12, 280); flash(p.x, p.y, 120, LIGHT.magic, .8, .2); return false; }
    return true;
  }
  shape(){ ctx.beginPath(); ctx.rect(-1.7, -3, 3.4, 16); ctx.rect(-9, -11, 18, 8); }
  hammer(x, y, rot, a){
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.lineJoin = 'round';
    ctx.globalAlpha = .3*a; ctx.strokeStyle = `rgb(${PAL.magic[3]})`; ctx.lineWidth = 9; this.shape(); ctx.stroke();
    ctx.globalAlpha = .6*a; ctx.strokeStyle = `rgb(${PAL.magic[2]})`; ctx.lineWidth = 3.5; this.shape(); ctx.stroke();
    ctx.globalAlpha = .95*a; ctx.fillStyle = `rgb(${PAL.magic[1]})`; this.shape(); ctx.fill();
    ctx.globalAlpha = a; ctx.fillStyle = `rgb(${PAL.magic[0]})`; ctx.fillRect(-8, -10, 16, 2.2); ctx.fillRect(-.7, -2, 1.4, 13);
    ctx.restore();
  }
  draw(){
    const fade = Math.min(1, (this.life - this.age)/.2, this.age/.08);
    for (let k = 4; k >= 1; k--){
      const t = Math.max(0, this.age - k*.028), q = this.pos(t);
      this.hammer(q.x, q.y, t*28 + this.a0, fade*.16*(1 - k/5));
    }
    const p = this.pos(this.age);
    sprite(p.x, p.y, 26, PAL.magic[3], .55*fade);
    this.hammer(p.x, p.y, this.age*28 + this.a0, fade);
  }
}
export class FistOfHeavens {
  constructor(x, y){
    this.tx = x; this.ty = y; this.ax = x; this.ay = Math.max(30, y - 250);
    this.age = 0; this.gather = .42; this.drop = .1; this.hy = this.ay; this.done = false;
  }
  update(dt){
    this.age += dt; const t = this.age;
    if (t < this.gather){
      const k = t/this.gather, n = Math.ceil(dt*150);
      for (let i = 0; i < n; i++){
        const a = rand(0, TAU), d = rand(50, 110)*(1 - k*.45), life = rand(.16,.28);
        emit({ x:this.ax + Math.cos(a)*d, y:this.ay + Math.sin(a)*d, vx:-Math.cos(a)*d/life, vy:-Math.sin(a)*d/life, life, s0:rand(2,3.4), s1:.8, streak:2.6, pal:PAL.holy });
      }
      light(this.ax, this.ay, 90 + 110*k, LIGHT.holy, .4 + .8*k);
      light(this.tx, this.ty, 60, LIGHT.holy, .3*k);
      return true;
    }
    if (t < this.gather + this.drop){
      const p = (t - this.gather)/this.drop, py = this.hy;
      this.hy = lerp(this.ay, this.ty, p*p);
      for (let i = 0; i < 6; i++) emit({ x:this.tx + rand(-2,2), y:lerp(py, this.hy, Math.random()), vx:rand(-12,12), vy:rand(-20,0), drag:3, life:rand(.15,.3), s0:rand(3,5), s1:.6, pal:PAL.holy });
      light(this.tx, this.hy, 170, LIGHT.holy, 1.1);
      return true;
    }
    if (!this.done){
      this.done = true; const x = this.tx, y = this.ty;
      flash(x, y, 280, LIGHT.holy, 1.6, .35); addShake(4); hurtArea(x, y, 55, DMG.foh, 'holy');
      ring(x, y, 2, 70, .28, PAL.holy[0], 3); ring(x, y, 6, 170, .55, PAL.holy[2], 4);
      for (let i = 0; i < 46; i++){ const a = rand(0, TAU), sp = rand(100, 420); emit({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp*ELL, drag:3.2, life:rand(.3,.6), s0:rand(3,5), s1:.8, streak:2.8, pal:PAL.holy }); }
      for (let i = 0; i < 16; i++){ const a = rand(0, TAU), sp = rand(30, 120); emit({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp*ELL, drag:2, life:rand(.4,.7), s0:rand(10,16), s1:2, pal:PAL.holy }); }
      for (let i = 0; i < 8; i++){
        active.push(new Proj({ x, y, tx:x, ty:y, ang:i/8*TAU + .2, max:270, speed:440, kind:'holy', pal:PAL.holy, collide:true, dmg:DMG.fohBolt, elem:'holy',
          trail:trailOf(PAL.holy, 90, 5, .35, 10), onHit:(hx, hy) => holyBurst(hx, hy, .55) }));
      }
    }
    return false;
  }
  draw(){
    const t = this.age;
    if (t < this.gather){
      const k = t/this.gather, pulse = .85 + .15*Math.sin(time*40);
      sprite(this.ax, this.ay, (12 + 30*k)*pulse, PAL.holy[3], .35 + .45*k);
      sprite(this.ax, this.ay, 4 + 8*k, PAL.holy[1], 1);
      sprite(this.ax, this.ay, 2 + 3*k, PAL.holy[0], 1);
      sprite(this.tx, this.ty, 30, PAL.holy[3], .18*k);
    } else if (!this.done){
      const y = this.hy;
      streak(this.tx, (this.ay + y)/2, Math.PI/2, Math.max(4, (y - this.ay)/2), 2, PAL.holy[2], .3);
      streak(this.tx, y - 26, Math.PI/2, 30, 6, PAL.holy[1], .9);
      streak(this.tx, y - 20, Math.PI/2, 24, 2, PAL.holy[0], 1);
      sprite(this.tx, y, 18, PAL.holy[2], .9); sprite(this.tx, y, 6, PAL.holy[0], 1);
    }
  }
}
export function holyBolt(ox, oy, tx, ty){
  active.push(new Proj({ x:ox, y:oy, tx, ty, speed:620, kind:'holy', pal:PAL.holy, collide:true, dmg:DMG.holybolt, elem:'holy', trail:trailOf(PAL.holy, 160, 6, .4, 14), onHit:(x, y) => holyBurst(x, y) }));
}
export class Aura {
  constructor(x, y, type){
    this.x = x; this.y = y; this.type = type; this.age = 0; this.life = 5.5; this.R = 120; this.pulse = .6;
    this.pal = type === 'fire' ? PAL.fire : type === 'ice' ? PAL.ice : PAL.bolt;
    this.lc = LIGHT[type]; this.rot = rand(0, TAU);
  }
  k(){ return Math.max(0, Math.min(1, this.age/.8, (this.life - this.age)/1)); }
  update(dt){
    this.age += dt; this.rot += dt*.35; const k = this.k();
    this.pulse -= dt;
    if (this.pulse <= 0 && this.age < this.life - 1){
      this.pulse = this.type === 'bolt' ? .9 : 1.3;
      if (this.type === 'fire'){
        ring(this.x, this.y, this.R*.5, this.R*1.6, 1.1, PAL.fire[2], 2, .35*k); hurtArea(this.x, this.y, this.R*1.3, DMG.holyfire, 'fire');
        for (let i = 0; i < 12; i++){ const a = i/12*TAU + this.rot; emit({ x:this.x + Math.cos(a)*this.R, y:this.y + Math.sin(a)*this.R*ELL, vy:-rand(40,80), drag:1.5, life:rand(.4,.7), s0:rand(5,8), s1:1, a:.55, pal:PAL.fire }); }
      } else if (this.type === 'ice'){
        ring(this.x, this.y, this.R*.5, this.R*1.6, 1.3, PAL.ice[1], 2, .3*k); hurtArea(this.x, this.y, this.R*1.3, DMG.holyfreeze, 'ice');
        for (let i = 0; i < 6; i++){ const a = rand(0, TAU), s = rand(60, 120); emit({ x:this.x, y:this.y, vx:Math.cos(a)*s, vy:Math.sin(a)*s*ELL, drag:1.4, life:rand(.8,1.2), s0:3, s1:1, streak:2, a:.5, pal:PAL.ice }); }
      } else {
        const segs = [];
        const inR = enemies.filter(e => alive(e) && Math.hypot(e.x - this.x, (e.y - this.y)/ELL) < this.R*1.4).sort(() => Math.random() - .5).slice(0, 3);
        inR.forEach((e, i) => segs.push({ a:{ x:this.x, y:this.y }, b:ectr(e), e, dmg:DMG.holyshock, delay:i*.05, w:.8 }));
        if (!inR.length) for (let i = 0; i < 2; i++){ const a = rand(0, TAU), r = rand(this.R*.4, this.R*.95); segs.push({ a:{ x:this.x + Math.cos(a + 2)*r*.3, y:this.y + Math.sin(a + 2)*r*.3*ELL }, b:{ x:this.x + Math.cos(a)*r, y:this.y + Math.sin(a)*r*ELL }, delay:i*.06, w:.8 }); }
        const bc = new BoltChain(segs); bc.quiet = true; bc.alpha = .45; active.push(bc);
      }
    }
    if (this.type === 'fire' && Math.random() < dt*16*k){ const a = rand(0, TAU); emit({ x:this.x + Math.cos(a)*this.R, y:this.y + Math.sin(a)*this.R*ELL, vy:-rand(30,60), drag:1, life:rand(.4,.7), s0:rand(3,5), s1:.8, a:.5, pal:PAL.fire }); }
    if (this.type === 'ice' && Math.random() < dt*14*k){ const a = rand(0, TAU), r = Math.sqrt(Math.random())*this.R; emit({ x:this.x + Math.cos(a)*r, y:this.y + Math.sin(a)*r*ELL - rand(20,60), vy:rand(12,30), life:rand(1,1.6), s0:1.8, s1:.5, a:.7, pal:PAL.ice }); }
    if (this.type === 'bolt' && Math.random() < dt*10*k){ const a = rand(0, TAU); emit({ x:this.x + Math.cos(a)*this.R, y:this.y + Math.sin(a)*this.R*ELL, vx:rand(-50,50), vy:rand(-50,50), drag:5, life:.2, s0:1.6, s1:.4, streak:2, a:.6, pal:PAL.bolt }); }
    light(this.x, this.y, this.R*2.2, this.lc, .35*k);
    return this.age < this.life;
  }
  draw(){
    const k = this.k(); if (!k) return;
    const R = this.R, p = this.pal, breathe = .82 + .18*Math.sin(time*2.2);
    ctx.save(); ctx.translate(this.x, this.y); ctx.scale(1, ELL);
    const passes = [[8, p[3], .06], [3, p[2], .16], [1, p[0], .34]];
    for (const [lw, c, al] of passes){
      ctx.globalAlpha = al*k*breathe; ctx.strokeStyle = `rgb(${c})`; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, R*.8, 0, TAU); ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 24; i++){ const a = this.rot + i/24*TAU, l = i % 3 ? .9 : .84; ctx.moveTo(Math.cos(a)*R*l, Math.sin(a)*R*l); ctx.lineTo(Math.cos(a)*R*.97, Math.sin(a)*R*.97); }
      ctx.stroke();
      ctx.beginPath();
      for (let t = 0; t < 2; t++) for (let i = 0; i <= 3; i++){ const a = -this.rot*1.3 + t*Math.PI/3 + i/3*TAU, x = Math.cos(a)*R*.76, y = Math.sin(a)*R*.76; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }
    ctx.restore();
    sprite(this.x, this.y, R*.9, p[3], .14*k*breathe);
  }
}
