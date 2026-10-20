import { ELL, TAU, lerp, rand, time } from '../core/canvas.js';
import { LIGHT, PAL } from '../core/palette.js';
import { emit, sprite } from '../core/particles.js';
import { addShake, flash, light, ring } from '../core/lights.js';
import { DMG } from '../data/damage.js';
import { enemies } from '../enemies/list.js';
import { alive } from '../enemies/spawn.js';
import { hurtArea, nearestEnemy } from '../enemies/damage.js';
import { sparks } from '../fx/bursts.js';
import { Proj } from '../fx/projectile.js';
import { active } from './index.js';

/* ================= NECROMANCER ================= */
export function boneSpear(ox, oy, tx, ty){
  active.push(new Proj({ x:ox, y:oy, tx, ty, max:Math.hypot(tx-ox, ty-oy) + 260, speed:1150, kind:'spear', pal:PAL.bone, collide:true, pierce:true, dmg:DMG.bonespear, elem:'bone', onPierce:(x, y) => sparks(x, y, PAL.bone, 8, 240, 2),
    trail:(o, dt, st) => {
      const n = Math.ceil(dt*170), cs = Math.cos(o.ang), sn = Math.sin(o.ang);
      for (let i = 0; i < n; i++){ const k = Math.random(); emit({ x:o.x - cs*(st*k + 30) + rand(-3,3), y:o.y - sn*(st*k + 30) + rand(-3,3), vx:rand(-14,14), vy:rand(-14,14), drag:2, life:rand(.25,.5), s0:rand(3,6), s1:1, a:.6, pal:PAL.bone }); }
      light(o.x, o.y, 130, LIGHT.bone, .55);
    },
    onHit:(x, y) => sparks(x, y, PAL.bone, 10, 260, 2) }));
}
export function boneSpirit(ox, oy, tx, ty){
  const a = Math.atan2(ty-oy, tx-ox) + rand(-.5, .5);
  active.push(new Proj({ x:ox, y:oy, tx, ty, ang:a, home:1.6, speed:440, kind:'spirit', pal:PAL.spirit, collide:true, dmg:DMG.bonespirit, elem:'spirit', targetE:nearestEnemy(tx, ty, 250),
    trail:(o, dt) => {
      o.ang += Math.sin(o.age*9)*dt*2.4;
      const n = Math.ceil(dt*90);
      for (let i = 0; i < n; i++) emit({ x:o.x + rand(-5,5), y:o.y + rand(-5,5), vx:-Math.cos(o.ang)*rand(20,60) + rand(-15,15), vy:-Math.sin(o.ang)*rand(20,60) + rand(-15,15), drag:1.5, life:rand(.5,.9), s0:rand(6,11), s1:1, a:.55, pal:PAL.spirit });
      light(o.x, o.y, 150, LIGHT.spirit, .8);
    },
    onHit:(x, y) => {
      sparks(x, y, PAL.spirit, 26, 420, 2.6); ring(x, y, 4, 90, .45, PAL.spirit[1], 3); flash(x, y, 220, LIGHT.spirit, 1.2, .3); addShake(2);
      for (let i = 0; i < 18; i++){ const a = rand(0, TAU), s = rand(40, 160); emit({ x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s - 40, drag:2, life:rand(.5,.9), s0:rand(8,14), s1:2, a:.6, pal:PAL.spirit }); }
    } }));
}
export function teeth(ox, oy, tx, ty){
  const base = Math.atan2(ty-oy, tx-ox);
  for (let i = 0; i < 13; i++){
    active.push(new Proj({ x:ox, y:oy, tx, ty, ang:base + rand(-.55, .55), max:rand(360, 480), speed:rand(820, 1020), kind:'tooth', pal:PAL.bone, collide:true, dmg:DMG.teeth, elem:'bone',
      onHit:(x, y) => sparks(x, y, PAL.bone, 3, 160, 1.6) }));
  }
}
export function corpseExplosion(x, y){
  for (let i = 0; i < 60; i++){ const a = rand(0, TAU), sp = rand(100, 420); emit({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp*.6 - rand(100,260), ay:950, drag:.8, life:rand(.5,1), s0:rand(4,8), s1:1.5, pal:PAL.blood }); }
  for (let i = 0; i < 14; i++){ const a = rand(Math.PI, TAU), sp = rand(250, 520); emit({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, ay:900, drag:.6, life:rand(.5,.9), s0:3, s1:1.5, streak:3, pal:PAL.bone }); }
  for (let i = 0; i < 30; i++){ const a = rand(0, TAU), sp = rand(60, 260); emit({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp*.7, drag:3.4, life:rand(.25,.55), s0:rand(10,18), s1:2, pal:PAL.fire }); }
  for (let i = 0; i < 10; i++){ const a = rand(0, TAU), sp = rand(20, 80); emit({ x, y:y - 10, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp*.6 - 20, drag:1.2, life:rand(.8,1.3), s0:rand(20,32), s1:10, a:.22, pal:PAL.blood }); }
  ring(x, y, 6, 140, .45, PAL.blood[1], 5); hurtArea(x, y, 120, DMG.corpse, 'blood'); flash(x, y, 300, LIGHT.blood, 1.4, .4); flash(x, y, 160, LIGHT.fire, 1, .2); addShake(6);
}
export class Curse {
  // a wide, smeared red flame hovering in place, like the curse mark over a monster's head
  constructor(x, y){ this.x = x; this.y = y; this.age = 0; this.life = 6; this.seed = rand(0, 100); }
  k(){ return Math.max(0, Math.min(1, this.age/.5, (this.life - this.age)/1)); }
  base(){ return { x:this.x + Math.sin(time*1.3 + this.seed)*4, y:this.y - 70 + Math.sin(time*1.9 + this.seed)*3 }; }
  update(dt){
    this.age += dt; const k = this.k(), b = this.base();
    const n = Math.ceil(dt*30*k);
    for (let i = 0; i < n; i++){
      emit({ x:b.x + rand(-26,26), y:b.y + rand(-4,16), vx:rand(-12,12), vy:-rand(10,30), drag:.6,
        life:rand(.9,1.5), s0:rand(16,24), s1:rand(32,46), a:.09, pal:PAL.blood });
    }
    for (const e of enemies) if (alive(e) && Math.hypot(e.x - this.x, (e.y - this.y)/ELL) < 120) e.amp = Math.max(e.amp, .25);
    light(b.x, b.y, 240, LIGHT.blood, .3*k);
    return this.age < this.life;
  }
  draw(){
    const k = this.k(); if (!k) return;
    const b = this.base(), p = PAL.blood, t = time*5 + this.seed;
    const flick = .88 + .12*Math.sin(t*1.7) + .06*Math.sin(t*4.1);
    sprite(b.x, b.y - 12, 78*flick, p[3], .2*k);
    sprite(b.x, b.y - 14, 46*flick, p[2], .12*k);
    for (const [off, hgt, ph] of [[-18, 30, 0], [0, 42, 1.7], [18, 30, 3.1]]){
      for (let i = 0; i < 6; i++){
        const u = i/5, sway = Math.sin(t + ph + u*2.2)*(3 + u*7);
        const r = lerp(24, 9, u)*flick, y = b.y - u*hgt*flick;
        sprite(b.x + off*(1 - u*.3) + sway, y, r*1.8, p[2], .13*k*(1 - u*.5));
        sprite(b.x + off*(1 - u*.3) + sway*.6, y + 3, r*.9, p[1], .14*k*(1 - u*.6));
      }
    }
  }
}
