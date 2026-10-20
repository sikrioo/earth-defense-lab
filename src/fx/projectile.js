/* ---------- generic projectile (arrows, javelins, bolts) ---------- */
import { TAU, ctx, rand, time } from '../core/canvas.js';
import { LIGHT, PAL } from '../core/palette.js';
import { emit, sprite, streak } from '../core/particles.js';
import { light } from '../core/lights.js';
import { enemyAt, hurt } from '../enemies/damage.js';
import { alive, ectr } from '../enemies/spawn.js';
import { sparks } from './bursts.js';
import { STEEL_PASS } from '../skills/barbarian.js';

export class Proj {
  constructor(o){
    Object.assign(this, { speed:900, len:18, home:0, pal:PAL.bow, kind:'arrow', trail:null, onHit:null, collide:false, dmg:0, elem:'bow', pierce:false, targetE:null }, o);
    const dx = this.tx - this.x, dy = this.ty - this.y;
    this.max = o.max ?? Math.max(30, Math.hypot(dx, dy));
    this.ang = o.ang ?? Math.atan2(dy, dx);
    this.trav = 0; this.age = 0;
  }
  update(dt){
    this.age += dt;
    if (this.home){
      let diff = Math.atan2(this.ty - this.y, this.tx - this.x) - this.ang;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.ang += Math.max(-this.home*dt, Math.min(this.home*dt, diff));
      this.home += dt*6;
    }
    if (this.targetE){ if (!alive(this.targetE)) this.targetE = null; else { const c = ectr(this.targetE); this.tx = c.x; this.ty = c.y; } }
    const st = this.speed*dt;
    this.x += Math.cos(this.ang)*st; this.y += Math.sin(this.ang)*st; this.trav += st;
    if (this.trail) this.trail(this, dt, st);
    if (this.collide){
      const e = enemyAt(this.x, this.y);
      if (e){
        if (!this.pierce && this.pierceN > 0 && !(this.hitSet && this.hitSet.has(e))){
          if (!this.hitSet) this.hitSet = new Set();
          this.hitSet.add(e); this.pierceN--; hurt(e, this.dmg, this.elem, { x:this.x - Math.cos(this.ang)*20, y:this.y - Math.sin(this.ang)*20 });
          sparks(this.x, this.y, this.pal, 4, 180, 1.6);
        } else if (this.hitSet && this.hitSet.has(e) && !this.pierce){
          // already passed through this one
        } else if (this.pierce){
          if (!this.hitSet) this.hitSet = new Set();
          if (!this.hitSet.has(e)){ this.hitSet.add(e); hurt(e, this.dmg, this.elem, { x:this.x - Math.cos(this.ang)*20, y:this.y - Math.sin(this.ang)*20 }); this.onPierce && this.onPierce(this.x, this.y, e); }
        } else { hurt(e, this.dmg, this.elem, { x:this.x - Math.cos(this.ang)*20, y:this.y - Math.sin(this.ang)*20 }); this.onHit && this.onHit(this.x, this.y, this, e); return false; }
      }
    }
    const done = this.home ? (Math.hypot(this.tx - this.x, this.ty - this.y) < st + 6 || this.age > 3) : this.trav >= this.max;
    if (done){ this.onHit && this.onHit(this.x, this.y, this); return false; }
    return true;
  }
  draw(){
    const a = this.ang, p = this.pal;
    if (this.kind === 'orb'){ const z = this.small ? .55 : 1; sprite(this.x, this.y, 20*z, p[2], .85); sprite(this.x, this.y, 8*z, p[0], 1); return; }
    if (this.kind === 'holy'){
      sprite(this.x, this.y, 22, p[2], .8); sprite(this.x, this.y, 8, p[0], 1);
      const r = time*9; streak(this.x, this.y, r, 13, 4, p[1], .95); streak(this.x, this.y, r + Math.PI/2, 13, 4, p[1], .95);
      return;
    }
    if (this.kind === 'spear'){
      const cs = Math.cos(a), sn = Math.sin(a);
      streak(this.x - cs*60, this.y - sn*60, a, 40, 5, p[3], .3);
      streak(this.x - cs*24, this.y - sn*24, a, 28, 8, p[2], .6);
      streak(this.x - cs*22, this.y - sn*22, a, 24, 3, p[0], 1);
      streak(this.x, this.y, a, 9, 6, p[1], 1);
      sprite(this.x, this.y, 12, p[2], .7);
      return;
    }
    if (this.kind === 'spirit'){
      sprite(this.x, this.y, 26, p[3], .6); sprite(this.x, this.y, 12, p[2], .9); sprite(this.x, this.y, 5, p[0], 1);
      for (let k = 0; k < 3; k++){ const o = time*10 + k*TAU/3; sprite(this.x + Math.cos(o)*9, this.y + Math.sin(o)*9, 5, p[1], .8); }
      return;
    }
    if (this.kind === 'axe'){
      ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.age*26); ctx.lineCap = 'round';
      for (const [lw, c, al] of STEEL_PASS()){
        ctx.globalAlpha = al; ctx.strokeStyle = `rgb(${c})`; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, -8); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -4, 10, -Math.PI*.95, -Math.PI*.35); ctx.lineTo(0, -6); ctx.closePath(); ctx.stroke();
      }
      ctx.restore();
      sprite(this.x, this.y, 18, p[3], .35);
      return;
    }
    if (this.kind === 'tracer'){
      const L = this.small ? 14 : 24, cs = Math.cos(a), sn = Math.sin(a);
      streak(this.x - cs*L*.6, this.y - sn*L*.6, a, L, this.small ? 3 : 4.5, p[2], .55);
      streak(this.x - cs*L*.5, this.y - sn*L*.5, a, L*.8, 1.6, p[0], 1);
      return;
    }
    if (this.kind === 'missile'){
      streak(this.x - Math.cos(a)*4, this.y - Math.sin(a)*4, a, 7, 3.5, [230,226,214], 1);
      sprite(this.x - Math.cos(a)*7, this.y - Math.sin(a)*7, 6, PAL.fire[1], .9);
      return;
    }
    if (this.kind === 'shard'){
      const cs = Math.cos(a), sn = Math.sin(a);
      streak(this.x - cs*10, this.y - sn*10, a, 14, 6, p[3], .5);
      streak(this.x - cs*5, this.y - sn*5, a, 10, 3.2, p[1], .95);
      streak(this.x, this.y, a, 4, 2.2, p[0], 1);
      return;
    }
    if (this.kind === 'tooth'){
      streak(this.x - Math.cos(a)*6, this.y - Math.sin(a)*6, a, 9, 3, p[2], .8);
      sprite(this.x, this.y, 4, p[0], 1);
      return;
    }
    const L = this.kind === 'javelin' ? 30 : this.len;
    const bx = this.x - Math.cos(a)*L, by = this.y - Math.sin(a)*L;
    streak((this.x+bx)/2, (this.y+by)/2, a, L*.75, this.kind === 'javelin' ? 6 : 3.5, p[2], .7);
    streak((this.x+bx)/2, (this.y+by)/2, a, L*.6, 1.8, p[0], 1);
    sprite(this.x, this.y, this.kind === 'javelin' ? 12 : 7, p[1], .9);
    sprite(this.x, this.y, 3, p[0], 1);
  }
}
export function trailOf(pal, rate, size, life = .4, spread = 30){
  const lc = LIGHT[Object.keys(PAL).find(k => PAL[k] === pal)] || LIGHT.bow;
  return (o, dt, st) => {
    const n = Math.ceil(dt*rate);
    for (let i = 0; i < n; i++){
      const k = Math.random();
      emit({ x:o.x - Math.cos(o.ang)*st*k + rand(-3,3), y:o.y - Math.sin(o.ang)*st*k + rand(-3,3),
        vx:-Math.cos(o.ang)*rand(20,80) + rand(-spread,spread), vy:-Math.sin(o.ang)*rand(20,80) + rand(-spread,spread),
        drag:2.5, life:rand(life*.6, life), s0:rand(size*.7, size*1.2), s1:1, pal });
    }
    light(o.x, o.y, 120, lc, .7);
  };
}
