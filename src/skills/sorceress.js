import { ELL, H, MOBILE, TAU, W, ctx, lerp, origin, rand, time } from '../core/canvas.js';
import { LIGHT, PAL } from '../core/palette.js';
import { emit, sprite, streak } from '../core/particles.js';
import { addShake, flash, light, ring } from '../core/lights.js';
import { boltTick, boltWithForks, drawBolt, drawBolts, jag, prand, pseed } from '../core/lightning.js';
import { DMG } from '../data/damage.js';
import { segDist } from '../core/util.js';
import { enemies } from '../enemies/list.js';
import { alive, ectr } from '../enemies/spawn.js';
import { enemyAt, hurt, hurtArea, nearestEnemy, ringHit } from '../enemies/damage.js';
import { fireBurst, iceBurst, sparks } from '../fx/bursts.js';
import { Proj, trailOf } from '../fx/projectile.js';
import { BurningGround } from './areas.js';
import { active } from './index.js';
import { tgt } from '../game/input.js';

/* ================= SORCERESS ================= */
export let Fireball;
export class FireWall {
  constructor(ox, oy, tx, ty){
    const a = Math.atan2(ty-oy, tx-ox);
    this.cx = tx; this.cy = ty; this.px = -Math.sin(a); this.py = Math.cos(a)*ELL; this.len = 290; this.age = 0; this.life = 4;
  }
  k(){ const t = this.age; return t < .35 ? t/.35 : t > this.life - .6 ? Math.max(0, (this.life-t)/.6) : 1; }
  update(dt){
    this.age += dt; const k = this.k(), reveal = Math.min(1, this.age/.35), n = Math.ceil(dt*380*k);
    for (let i = 0; i < n; i++){
      const u = rand(-.5, .5)*reveal, edge = 1 - Math.abs(u)*1.2;
      emit({ x:this.cx + this.px*u*this.len + rand(-5,5), y:this.cy + this.py*u*this.len + rand(-3,3), vx:rand(-18,18), vy:-rand(70,190)*edge, drag:1.2, life:rand(.35,.85)*edge + .1, s0:rand(9,18)*(.6 + .4*edge), s1:2, pal:PAL.fire });
    }
    for (let j = 0; j < 4; j++){ const u = (j/3 - .5)*reveal; light(this.cx + this.px*u*this.len, this.cy + this.py*u*this.len - 20, 140, LIGHT.fire, .45*k); }
    this.tk = (this.tk || 0) - dt;
    if (this.tk <= 0 && k > .3){
      this.tk = .25; const hl = this.len*reveal/2;
      const ax = this.cx - this.px*hl, ay = this.cy - this.py*hl, bx = this.cx + this.px*hl, by = this.cy + this.py*hl;
      for (const e of enemies) if (alive(e) && segDist(e.x, e.y, ax, ay, bx, by) < e.r + 16) hurt(e, DMG.firewall, 'fire');
    }
    return this.age < this.life;
  }
  draw(){ const k = this.k(), reveal = Math.min(1, this.age/.35); for (let j = 0; j <= 10; j++){ const u = (j/10 - .5)*reveal; sprite(this.cx + this.px*u*this.len, this.cy + this.py*u*this.len, 22, PAL.fire[3], .4*k); } }
}
export class Meteor {
  constructor(ox, oy, tx, ty){
    this.tx = tx; this.ty = ty; this.age = 0; this.fall = .95; this.hit = false;
    this.sx = tx + Math.min(W*.3, 320); this.sy = ty - Math.max(H, 700); this.hx = this.sx; this.hy = this.sy;
  }
  update(dt){
    this.age += dt;
    const t = Math.min(1, this.age/this.fall), e = t*t, px = this.hx, py = this.hy;
    this.hx = lerp(this.sx, this.tx, e); this.hy = lerp(this.sy, this.ty, e);
    const n = Math.ceil(dt*700);
    for (let i = 0; i < n; i++){ const k = Math.random(); emit({ x:lerp(px, this.hx, k) + rand(-8,8), y:lerp(py, this.hy, k) + rand(-8,8), vx:rand(-40,40), vy:rand(-40,10), drag:2, life:rand(.3,.7), s0:rand(14,26), s1:2, pal:PAL.fire }); }
    light(this.hx, this.hy, 240, LIGHT.fire, .6 + t);
    if (t >= 1){ fireBurst(this.tx, this.ty, 1.9); addShake(8); ring(this.tx, this.ty, 20, 260, .7, PAL.fire[2], 4); hurtArea(this.tx, this.ty, 110, DMG.meteor, 'fire'); active.push(new BurningGround(this.tx, this.ty, 72, 3.2)); return false; }
    return true;
  }
  draw(){
    const t = Math.min(1, this.age/this.fall), r = 52*(1 - t*.35);
    ctx.globalAlpha = .55 + .35*Math.sin(time*18); ctx.strokeStyle = `rgb(${PAL.fire[2]})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(this.tx, this.ty, r, r*ELL, 0, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(this.tx, this.ty, r*.55, r*.55*ELL, 0, 0, TAU); ctx.stroke();
    sprite(this.hx, this.hy, 46, PAL.fire[2], .9); sprite(this.hx, this.hy, 20, PAL.fire[0], 1);
  }
}
export class FrozenOrb {
  constructor(ox, oy, tx, ty){
    this.x = ox; this.y = oy; const a = Math.atan2(ty-oy, tx-ox);
    this.vx = Math.cos(a)*260; this.vy = Math.sin(a)*260; this.age = 0;
    this.life = Math.min(2, Math.max(.8, Math.hypot(tx-ox, ty-oy)/260)); this.spin = rand(0, TAU); this.et = 0;
  }
  update(dt){
    this.age += dt; this.x += this.vx*dt; this.y += this.vy*dt; this.spin += dt*11; this.et -= dt;
    while (this.et <= 0){
      this.et += .018;
      for (const off of [0, Math.PI]){
        const a = this.spin + off, sp = rand(420, 560), life = rand(.6, .85);
        const vx = Math.cos(a)*sp, vy = Math.sin(a)*sp*.75;
        emit({ x:this.x, y:this.y, vx, vy, drag:.5, life, s0:15, s1:7, streak:2.6, a:.35, pal:[PAL.ice[2], PAL.ice[3], PAL.ice[4]] });
        emit({ x:this.x, y:this.y, vx, vy, drag:.5, life, s0:8.5, s1:4, streak:3.8, pal:PAL.ice });
      }
    }
    emit({ x:this.x, y:this.y, vx:rand(-30,30), vy:rand(-30,30), drag:2, life:rand(.4,.8), s0:rand(10,18), s1:4, a:.45, pal:PAL.ice });
    light(this.x, this.y, 200, LIGHT.ice, 1);
    this.tk = (this.tk || 0) - dt; if (this.tk <= 0){ this.tk = .1; hurtArea(this.x, this.y, 200, DMG.frozenorb, 'ice'); }
    if (this.age >= this.life){
      for (let i = 0; i < 40; i++){
        const a = i/40*TAU, sp = rand(460, 600), life = rand(.5,.75), vx = Math.cos(a)*sp, vy = Math.sin(a)*sp*ELL;
        emit({ x:this.x, y:this.y, vx, vy, drag:1.2, life, s0:15, s1:6, streak:2.6, a:.35, pal:[PAL.ice[2], PAL.ice[3], PAL.ice[4]] });
        emit({ x:this.x, y:this.y, vx, vy, drag:1.2, life, s0:9, s1:3, streak:3.8, pal:PAL.ice });
      }
      iceBurst(this.x, this.y, 1.2); hurtArea(this.x, this.y, 150, DMG.frozenorbBurst, 'ice'); return false;
    }
    return true;
  }
  draw(){ sprite(this.x, this.y, 32, PAL.ice[2], .8); sprite(this.x, this.y, 15, PAL.ice[0], 1); for (let k = 0; k < 4; k++) streak(this.x, this.y, this.spin*.5 + k*TAU/4, 18, 5, PAL.ice[1], .9); }
}
export class NovaRing {
  constructor(x, y, pal, lc, crackle = false, dmg = 0, elem = 'ice'){ this.crackle = crackle; this.dmg = dmg; this.elem = elem; this.hs = new Set(); this.x = x; this.y = y; this.pal = pal; this.lc = lc; this.age = 0; this.life = .6; this.R = 340; flash(x, y, 260, lc, 1.2, .35); addShake(2.5); }
  r(){ const t = Math.min(1, this.age/this.life); return this.R*(1 - (1-t)**2.2); }
  update(dt){
    this.age += dt; const t = Math.min(1, this.age/this.life), r = this.r(), n = Math.ceil(dt*(this.crackle ? 260 : 1000)*(1-t));
    if (this.crackle) for (let i = 0; i < n; i++){ const a = rand(0, TAU); emit({ x:this.x + Math.cos(a)*r, y:this.y + Math.sin(a)*r*ELL, vx:rand(-40,40), vy:rand(-40,40), drag:5, life:rand(.12,.3), s0:2.2, s1:.5, streak:2.4, pal:this.pal }); }
    else for (let i = 0; i < n; i++){ const a = rand(0, TAU), s = rand(80, 200); emit({ x:this.x + Math.cos(a)*r, y:this.y + Math.sin(a)*r*ELL, vx:Math.cos(a)*s, vy:Math.sin(a)*s*ELL, drag:2.5, life:rand(.35,.7), s0:rand(4,7), s1:1, streak:2.5, pal:this.pal }); }
    light(this.x, this.y, r + 80, this.lc, .7*(1-t));
    if (this.dmg) ringHit(this.hs, this.x, this.y, r, this.dmg, this.elem);
    return this.age < this.life;
  }
  draw(){
    const t = Math.min(1, this.age/this.life), r = this.r();
    if (this.crackle){
      const a = 1 - t*t, N = MOBILE ? Math.max(24, Math.min(50, Math.floor(r*.2))) : Math.max(40, Math.min(110, Math.floor(r*.4))), pts = [];
      pseed(boltTick*131 + (this.x|0));
      for (let i = 0; i <= N; i++){
        const an = i/N*TAU, rr = i === N ? null : r*(1 + prand(-.045, .045));
        if (rr === null){ pts.push(pts[0], pts[1]); break; }
        pts.push(this.x + Math.cos(an)*rr, this.y + Math.sin(an)*rr*ELL);
      }
      drawBolt(pts, a*.95, 1.2, this.pal);
      const br = [];
      for (let k = 0; k < (MOBILE ? 4 : 10); k++){
        const an = prand(0, TAU), out = prand(0, 1) < .6 ? 1 : -1, L = prand(12, 34)*(1 - t*.5), tw = prand(-.6, .6);
        const x1 = this.x + Math.cos(an)*r, y1 = this.y + Math.sin(an)*r*ELL;
        br.push(jag(x1, y1, x1 + Math.cos(an + tw)*L*out, y1 + Math.sin(an + tw)*L*out*ELL, .3));
      }
      drawBolts(br, a*.75, .6, this.pal);
      ctx.strokeStyle = `rgb(${this.pal[3]})`; ctx.globalAlpha = a*.12; ctx.lineWidth = 18; ctx.beginPath(); ctx.ellipse(this.x, this.y, r, r*ELL, 0, 0, TAU); ctx.stroke();
      return;
    }
    ctx.strokeStyle = `rgb(${this.pal[2]})`; ctx.globalAlpha = (1-t)*.25; ctx.lineWidth = 14; ctx.beginPath(); ctx.ellipse(this.x, this.y, r, r*ELL, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgb(${this.pal[0]})`; ctx.globalAlpha = (1-t)*.8; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(this.x, this.y, r, r*ELL, 0, 0, TAU); ctx.stroke();
  }
}
export class Blizzard {
  constructor(ox, oy, tx, ty){ this.x = tx; this.y = ty; this.R = 140; this.age = 0; this.life = 3.4; this.sh = []; this.st = 0; this.fdx = 170; this.fdy = 420; this.fang = Math.atan2(420, 170); ring(tx, ty, this.R*.6, this.R, .5, PAL.ice[2], 3); }
  update(dt){
    this.age += dt; const on = this.age < this.life - .4; this.st -= dt;
    while (on && this.st <= 0){ this.st += 1/55; const a = rand(0, TAU), r = Math.sqrt(Math.random())*this.R; this.sh.push({ lx:this.x + Math.cos(a)*r, ly:this.y + Math.sin(a)*r*ELL, t:0, d:rand(.3,.45) }); }
    for (let i = this.sh.length - 1; i >= 0; i--){
      const s = this.sh[i]; s.t += dt;
      if (s.t >= s.d){
        for (let k = 0; k < 7; k++){ const a = rand(Math.PI, TAU), sp = rand(60, 160); emit({ x:s.lx, y:s.ly, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp*.6, ay:200, drag:2, life:rand(.25,.45), s0:3, s1:1, streak:2, pal:PAL.ice }); }
        ring(s.lx, s.ly, 3, 20, .3, PAL.ice[1], 2); hurtArea(s.lx, s.ly, 28, DMG.blizzard, 'ice');
        this.sh[i] = this.sh[this.sh.length-1]; this.sh.pop();
      }
    }
    const k = on ? Math.min(1, this.age/.3) : Math.max(0, (this.life - this.age)/.4);
    if (Math.random() < dt*30*k){ const a = rand(0, TAU), r = Math.sqrt(Math.random())*this.R; emit({ x:this.x + Math.cos(a)*r, y:this.y + Math.sin(a)*r*ELL, vx:rand(-20,20), vy:rand(-10,0), life:rand(.8,1.4), s0:rand(16,26), s1:8, a:.22, pal:PAL.ice }); }
    light(this.x, this.y, this.R + 100, LIGHT.ice, .6*k);
    return this.age < this.life || this.sh.length > 0;
  }
  draw(){
    for (const s of this.sh){
      const p = s.t/s.d, x = s.lx - this.fdx*(1-p), y = s.ly - this.fdy*(1-p);
      streak(x - Math.cos(this.fang)*14, y - Math.sin(this.fang)*14, this.fang, 26, 4, PAL.ice[3], .5);
      streak(x, y, this.fang, 13, 4, PAL.ice[1], .95); sprite(x, y, 5, PAL.ice[0], 1);
    }
  }
}
export class ChargedBolts {
  constructor(ox, oy, tx, ty){ const base = Math.atan2(ty-oy, tx-ox); this.b = []; for (let i = 0; i < 7; i++) this.b.push({ x:ox, y:oy, a:base + rand(-.6,.6), sp:rand(230,330), life:rand(1.1,1.7), age:0, jt:0, dead:false }); }
  update(dt){
    let alive = false;
    for (const b of this.b){
      if (b.dead) continue;
      b.age += dt; if (b.age >= b.life){ b.dead = true; sparks(b.x, b.y, PAL.bolt, 10); flash(b.x, b.y, 110, LIGHT.bolt, .8, .18); continue; }
      b.jt -= dt; if (b.jt <= 0){ b.jt = rand(.04, .09); b.a += rand(-.9, .9); }
      b.x += Math.cos(b.a)*b.sp*dt; b.y += Math.sin(b.a)*b.sp*dt*.8;
      if (Math.random() < dt*30) emit({ x:b.x, y:b.y, vx:rand(-40,40), vy:rand(-40,40), drag:4, life:rand(.1,.25), s0:2, s1:.5, pal:PAL.bolt });
      const he = enemyAt(b.x, b.y, 4); if (he){ hurt(he, DMG.charged, 'bolt'); b.dead = true; sparks(b.x, b.y, PAL.bolt, 10); flash(b.x, b.y, 110, LIGHT.bolt, .8, .18); continue; }
      light(b.x, b.y, 90, LIGHT.bolt, .55); alive = true;
    }
    return alive;
  }
  draw(){
    for (const b of this.b){
      if (b.dead) continue;
      sprite(b.x, b.y, 15, PAL.bolt[3], .7); sprite(b.x, b.y, 5, PAL.bolt[0], 1);
      pseed(boltTick*53 + b.sp|0); const cl = []; for (let k = 0; k < 3; k++){ const a = prand(0, TAU), r = prand(7, 13); cl.push(jag(b.x, b.y, b.x + Math.cos(a)*r, b.y + Math.sin(a)*r, .35)); } drawBolts(cl, .9, .55);
    }
  }
}
export class BoltChain {
  // a sequence of lightning segments that appear one after another
  constructor(segs, pal = PAL.bolt, lc = LIGHT.bolt, w = 1.9){ this.segs = segs; this.pal = pal; this.lc = lc; this.w = w; this.age = 0; this.end = Math.max(...segs.map(s => s.delay)) + .4; }
  update(dt){
    this.age += dt;
    for (const s of this.segs){
      if (this.age < s.delay) continue;
      if (!s.done){ s.done = true; if (s.e) hurt(s.e, s.dmg, s.elem || 'bolt'); if (!this.quiet){ sparks(s.b.x, s.b.y, this.pal, 14, 420); flash(s.b.x, s.b.y, 200, this.lc, 1.1, .25); addShake(1.2); } else sparks(s.b.x, s.b.y, this.pal, 4, 200, 1.6); }
      const lt = this.age - s.delay;
      if (lt < .35) light((s.a.x+s.b.x)/2, (s.a.y+s.b.y)/2, Math.hypot(s.b.x-s.a.x, s.b.y-s.a.y)*.6 + 80, this.lc, .9*(this.alpha ?? 1)*(1 - lt/.35));
    }
    return this.age < this.end;
  }
  draw(){
    for (const s of this.segs){
      const lt = this.age - s.delay; if (lt < 0 || lt > .35) continue;
      const a = (lt < .05 ? 1 : 1 - (lt - .05)/.3)*(this.alpha ?? 1);
      boltWithForks(s.a.x, s.a.y, s.b.x, s.b.y, a, s.w || this.w, this.pal);
      drawBolt(jag(s.a.x, s.a.y, s.b.x, s.b.y), a*.45, (s.w || this.w)*.5, this.pal);
      sprite(s.b.x, s.b.y, 26, this.pal[2], a*.8);
    }
  }
}
export function chainLightning(ox, oy, tx, ty){
  const first = nearestEnemy(tx, ty, 130);
  if (first){
    const seen = new Set([first]), segs = [{ a:{x:ox, y:oy}, b:ectr(first), e:first, dmg:DMG.chain, delay:0 }];
    let cur = first;
    for (let j = 1; j <= 5; j++){
      const c = ectr(cur), nx = nearestEnemy(c.x, c.y, 280, seen); if (!nx) break;
      segs.push({ a:c, b:ectr(nx), e:nx, dmg:DMG.chain, delay:j*.09 }); seen.add(nx); cur = nx;
    }
    return new BoltChain(segs);
  }
  const segs = [{ a:{x:ox, y:oy}, b:{x:tx, y:ty}, delay:0 }];
  let cur = { x:tx, y:ty }, dir = rand(0, TAU);
  for (let j = 1; j <= 5; j++){
    dir += rand(-1.6, 1.6); const d = rand(140, 240);
    const nx = { x:Math.max(30, Math.min(W-30, cur.x + Math.cos(dir)*d)), y:Math.max(60, Math.min(origin.y - 40, cur.y + Math.sin(dir)*d*.75)) };
    segs.push({ a:cur, b:nx, delay:j*.09 }); cur = nx;
  }
  return new BoltChain(segs);
}
export class LightningNova {
  constructor(x, y){ this.x = x; this.y = y; this.age = 0; this.life = .55; this.grow = .32; this.R = 330; const NR = MOBILE ? 16 : 30; this.angles = Array.from({length:NR}, (_, i) => i/NR*TAU + rand(-.06,.06)); flash(x, y, 280, LIGHT.bolt, 1.5, .3); addShake(3); }
  r(){ const t = Math.min(1, this.age/this.grow); return this.R*(1 - (1-t)**2); }
  update(dt){
    this.age += dt; const r = this.r();
    if (this.age < this.grow) for (let k = 0; k < 6; k++){ const a = this.angles[(Math.random()*this.angles.length)|0]; emit({ x:this.x + Math.cos(a)*r, y:this.y + Math.sin(a)*r*ELL, vx:Math.cos(a)*rand(60,200), vy:Math.sin(a)*rand(60,200)*ELL, drag:4, life:rand(.12,.3), s0:2.5, s1:.6, streak:3, pal:PAL.bolt }); }
    if (!this.hs) this.hs = new Set(); ringHit(this.hs, this.x, this.y, r, DMG.nova, 'bolt');
    light(this.x, this.y, r + 60, LIGHT.bolt, 1.1*(1 - this.age/this.life));
    return this.age < this.life;
  }
  draw(){ const r = this.r(), a = this.age < this.grow ? 1 : 1 - (this.age - this.grow)/(this.life - this.grow); drawBolts(this.angles.map(an => jag(this.x, this.y, this.x + Math.cos(an)*r, this.y + Math.sin(an)*r*ELL, .16)), a*.85, 1.05); sprite(this.x, this.y, 40, PAL.bolt[2], .6*a); }
}
/* ================= SORCERESS: HYDRA ================= */
let hydras = [];
export class Hydra {
  constructor(x, y){
    this.x = x; this.y = y; this.age = 0; this.life = 8; this.seedF = rand(0, 10);
    this.heads = [0, 1, 2].map(i => ({ off:(i - 1)*12, h:i === 1 ? rand(34,38) : rand(25,30), ph:rand(0, TAU), cd:.5 + i*.22, recoil:0 }));
    flash(x, y, 150, LIGHT.fire, 1, .35); ring(x, y, 4, 46, .45, PAL.fire[2], 2);
    for (let i = 0; i < 18; i++){ const a = rand(0, TAU), s = rand(40, 130); emit({ x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s*ELL - 30, drag:3, life:rand(.3,.5), s0:rand(5,9), s1:1, pal:PAL.fire }); }
    hydras = hydras.filter(h => h.age < h.life);
    if (hydras.length >= 3) hydras[0].life = Math.min(hydras[0].life, hydras[0].age + .5);
    hydras.push(this);
  }
  k(){ return Math.max(0, Math.min(1, this.age/.5, (this.life - this.age)/.5)); }
  aimFrom(hp){ const e = nearestEnemy(hp.x, hp.y, 480); if (e){ const c = ectr(e); return Math.atan2(c.y - hp.y, c.x - hp.x); } const dx = tgt.x - hp.x, dy = tgt.y - hp.y; return Math.hypot(dx, dy) < 90 ? null : Math.atan2(dy, dx); }
  headPos(h){
    const k = this.k(), sway = Math.sin(time*2.4 + h.ph);
    const a = h.aim ?? null;
    const lean = a === null ? 0 : Math.cos(a)*3;
    return { x:this.x + h.off*1.15 + sway*3 + lean - h.recoil*2.5*(a === null ? 0 : Math.cos(a)), y:this.y - h.h*k + Math.cos(time*3 + h.ph)*2 + h.recoil*2 };
  }
  neck(h, s){
    const hp = this.headPos(h), bx = this.x + h.off*.3, by = this.y;
    const cx = bx + h.off*.95 + Math.sin(time*2.4 + h.ph + 1.2)*6, cy = by - h.h*.5*this.k();
    const u = 1 - s;
    return { x:u*u*bx + 2*u*s*cx + s*s*hp.x, y:u*u*by + 2*u*s*cy + s*s*hp.y };
  }
  update(dt){
    this.age += dt; const k = this.k();
    for (let n = Math.ceil(dt*45*k); n > 0; n--) emit({ x:this.x + rand(-14,14), y:this.y + rand(-3,3), vx:rand(-6,6), vy:-rand(15,40), drag:1, life:rand(.2,.4), s0:rand(3,5), s1:.8, pal:PAL.fire });
    for (const h of this.heads){
      h.aim = this.aimFrom({ x:this.x + h.off, y:this.y - h.h });
      for (let n = Math.ceil(dt*55*k); n > 0; n--){ const p = this.neck(h, Math.random()); emit({ x:p.x + rand(-2,2), y:p.y + rand(-1.5,1.5), vx:rand(-8,8), vy:-rand(25,55), drag:1.2, life:rand(.2,.4), s0:rand(2.5,4.5), s1:.6, pal:PAL.fire }); }
      if (Math.random() < dt*40*k){ const hp = this.headPos(h); emit({ x:hp.x + rand(-2,2), y:hp.y - 2, vx:rand(-8,8), vy:-rand(30,60), drag:1.2, life:rand(.2,.35), s0:rand(3,4.5), s1:.6, pal:PAL.fire }); }
      h.recoil *= Math.exp(-9*dt);
      h.cd -= dt;
      if (h.cd <= 0 && this.age > .5 && this.age < this.life - .4){
        h.cd = rand(.6, .85);
        const hp = this.headPos(h), aim = h.aim;
        const a = aim === null ? -Math.PI/2 + rand(-1.3, 1.3) : aim + rand(-.1, .1);
        active.push(new Proj({ x:hp.x, y:hp.y, tx:hp.x, ty:hp.y, ang:a, max:rand(380,540), speed:640, kind:'orb', pal:PAL.fire, small:true, collide:true, dmg:DMG.hydra, elem:'fire',
          trail:trailOf(PAL.fire, 200, 5, .3, 16), onHit:(x, y) => fireBurst(x, y, .45) }));
        flash(hp.x, hp.y, 90, LIGHT.fire, .8, .18); sparks(hp.x, hp.y, PAL.fire, 5, 160, 2); h.recoil = 1;
      }
    }
    light(this.x, this.y - 16, 120, LIGHT.fire, (.7 + .12*Math.sin(time*15 + this.seedF))*k);
    return this.age < this.life;
  }
  draw(){
    const k = this.k(); if (!k) return;
    const ink = 'rgb(58,12,4)', hide = 'rgb(196,62,14)', scale = 'rgb(236,118,34)', hot = 'rgb(255,214,130)';
    sprite(this.x, this.y - 3, 24*(.92 + .16*Math.sin(time*13 + this.seedF)), PAL.fire[3], .35*k);
    // solid body: drawn opaque so it reads as a creature, not a cloud
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = k;
    ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(this.x, this.y, 15, 4.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = hide; ctx.beginPath(); ctx.ellipse(this.x, this.y - 1, 12, 3.4, 0, 0, TAU); ctx.fill();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const h of this.heads){
      const NS = 10, pts = []; for (let i = 0; i <= NS; i++) pts.push(this.neck(h, i/NS));
      const path = () => { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i <= NS; i++) ctx.lineTo(pts[i].x, pts[i].y); };
      path(); ctx.strokeStyle = ink; ctx.lineWidth = 6.4; ctx.stroke();
      ctx.strokeStyle = hide; ctx.lineWidth = 4.2; ctx.stroke();
      ctx.strokeStyle = scale; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(pts[1].x - 1, pts[1].y); for (let i = 2; i < NS; i++) ctx.lineTo(pts[i].x - 1, pts[i].y - .5); ctx.stroke();
      const hp = this.headPos(h), aim = h.aim ?? -Math.PI/2, gap = .28 + h.recoil*.4;
      ctx.save(); ctx.translate(hp.x, hp.y); ctx.rotate(aim);
      // jaws
      ctx.fillStyle = scale; ctx.strokeStyle = ink; ctx.lineWidth = 1.1;
      for (const sgn of [-1, 1]){
        ctx.beginPath(); ctx.moveTo(1, sgn*1.2); ctx.lineTo(8.5*Math.cos(gap), sgn*8.5*Math.sin(gap) + sgn*.8); ctx.lineTo(1.5, sgn*3.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // skull
      ctx.fillStyle = hide; ctx.beginPath(); ctx.ellipse(0, 0, 4.8, 3.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = scale; ctx.beginPath(); ctx.ellipse(-1, -1.2, 2.4, 1.2, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // heat on top: small hot cores, glowing eyes and mouths
    ctx.globalCompositeOperation = 'lighter';
    for (const h of this.heads){
      const mid = this.neck(h, .5), hp = this.headPos(h), aim = h.aim ?? -Math.PI/2;
      sprite(mid.x, mid.y, 6*(.85 + .3*Math.sin(time*20 + h.ph)), PAL.fire[2], .35*k);
      sprite(hp.x + Math.cos(aim)*6, hp.y + Math.sin(aim)*6, 4 + h.recoil*6, PAL.fire[1], .7*k);
      sprite(hp.x - Math.sin(aim)*1.6 + Math.cos(aim)*1.2, hp.y + Math.cos(aim)*1.6 + Math.sin(aim)*1.2 - 1, 1.6, [255,250,220], k);
    }
  }
}

// runs once at boot, from main.js, in the original file order
export function setup(){
  Fireball = class Fireball extends Proj {
    constructor(x, y, tx, ty){ super({ x, y, tx, ty, speed:760, kind:'orb', pal:PAL.fire, collide:true, onHit:(hx, hy) => { fireBurst(hx, hy); hurtArea(hx, hy, 60, DMG.fireball, 'fire'); } }); }
    update(dt){
      const n = Math.ceil(dt*420), st = this.speed*dt;
      for (let i = 0; i < n; i++){
        const k = Math.random(), dx = Math.cos(this.ang), dy = Math.sin(this.ang);
        emit({ x:this.x - dx*st*k + rand(-4,4), y:this.y - dy*st*k + rand(-4,4), vx:-dx*rand(30,120) + rand(-40,40), vy:-dy*rand(30,120) + rand(-40,40) - 20, drag:2, life:rand(.25,.55), s0:rand(9,15), s1:1, pal:PAL.fire });
      }
      light(this.x, this.y, 180, LIGHT.fire, 1);
      return super.update(dt);
    }
    draw(){ sprite(this.x, this.y, 24, PAL.fire[2], .9); sprite(this.x, this.y, 11, PAL.fire[0], 1); }
  };
}
