import { ELL, TAU, rand } from '../core/canvas.js';
import { LIGHT, PAL } from '../core/palette.js';
import { emit } from '../core/particles.js';
import { light } from '../core/lights.js';
import { DMG } from '../data/damage.js';
import { hurtArea } from '../enemies/damage.js';

/* ---------- lingering areas ---------- */
export class BurningGround {
  constructor(x, y, R, dur, dmg = DMG.meteorBurn){ this.x = x; this.y = y; this.R = R; this.dur = dur; this.age = 0; this.dmg = dmg; this.tk = .2; }
  update(dt){
    this.age += dt; if (this.age > this.dur) return false;
    const k = 1 - this.age/this.dur, n = Math.ceil(dt*170*k);
    for (let i = 0; i < n; i++){
      const a = rand(0, TAU), r = Math.sqrt(Math.random())*this.R;
      emit({ x:this.x + Math.cos(a)*r, y:this.y + Math.sin(a)*r*ELL, vx:rand(-12,12), vy:-rand(40,140), drag:1, life:rand(.3,.7), s0:rand(7,14), s1:1, pal:PAL.fire });
    }
    light(this.x, this.y - 10, this.R*3, LIGHT.fire, .6*k);
    this.tk -= dt; if (this.tk <= 0){ this.tk = .3; hurtArea(this.x, this.y, this.R, this.dmg, 'fire'); }
    return true;
  }
}
export class PoisonCloud {
  constructor(x, y){ this.x = x; this.y = y; this.age = 0; this.dur = 3.6; this.R = 20; }
  update(dt){
    this.age += dt; if (this.age > this.dur) return false;
    this.R = Math.min(140, this.R + dt*260);
    const k = this.age < this.dur - .8 ? 1 : (this.dur - this.age)/.8;
    const n = Math.ceil(dt*60*k);
    for (let i = 0; i < n; i++){
      const a = rand(0, TAU), r = Math.sqrt(Math.random())*this.R;
      emit({ x:this.x + Math.cos(a)*r, y:this.y + Math.sin(a)*r*ELL, vx:-Math.sin(a)*rand(10,40), vy:Math.cos(a)*rand(10,40)*ELL - 8, drag:.6, life:rand(.9,1.6), s0:rand(26,46), s1:rand(14,24), a:.17, pal:PAL.poison });
    }
    if (Math.random() < dt*25*k){ const a = rand(0, TAU), r = Math.sqrt(Math.random())*this.R; emit({ x:this.x + Math.cos(a)*r, y:this.y + Math.sin(a)*r*ELL, vy:-rand(15,40), life:rand(.6,1), s0:2.5, s1:.6, pal:PAL.poison }); }
    light(this.x, this.y, this.R*2.4, LIGHT.poison, .55*k);
    this.tk = (this.tk || 0) - dt; if (this.tk <= 0 && k > .2){ this.tk = .4; hurtArea(this.x, this.y, this.R, DMG.plagueTick, 'poison'); }
    return true;
  }
}
