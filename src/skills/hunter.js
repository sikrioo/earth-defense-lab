import { H, TAU, W, ZOOM, ctx, lerp, origin, rand } from '../core/canvas.js';
import { LIGHT, PAL } from '../core/palette.js';
import { emit, sprite, streak } from '../core/particles.js';
import { addShake, flash, light, ring } from '../core/lights.js';
import { DMG } from '../data/damage.js';
import { segDist } from '../core/util.js';
import { enemies } from '../enemies/list.js';
import { alive, ectr } from '../enemies/spawn.js';
import { enemyAt, hurt, hurtArea } from '../enemies/damage.js';
import { sparks } from '../fx/bursts.js';
import { Proj } from '../fx/projectile.js';
import { active } from './index.js';

/* ================= BOUNTY HUNTER (space-western gunslinger kit) ================= */
export let jamT = 0;
export function setJamT(v){ return jamT = v; }
   // "Jam Session" buff timer: cores fire faster while > 0
class Blip {    // tiny timed draw helper (muzzle flashes, laser sights)
  constructor(life, draw, upd){ this.age = 0; this.life = life; this.d = draw; this.u = upd; }
  update(dt){ this.age += dt; this.u && this.u(this, dt); return this.age < this.life; }
  draw(){ this.d(this, this.age/this.life); }
}
function muzzle(x, y, ang, sc = 1){
  flash(x, y, 110*sc, LIGHT.gun, 1, .08);
  active.push(new Blip(.07, (b, t) => {
    const a = 1 - t;
    streak(x + Math.cos(ang)*9*sc, y + Math.sin(ang)*9*sc, ang, 16*sc, 7*sc, PAL.gun[1], a);
    streak(x, y, ang + Math.PI/2, 8*sc, 4*sc, PAL.gun[0], a);
    sprite(x, y, 10*sc, PAL.gun[0], a);
  }));
}
function puff(x, y, n = 4, sc = 1){
  for (let i = 0; i < n; i++) emit({ x:x + rand(-6,6)*sc, y:y + rand(-6,6)*sc, vx:rand(-30,30), vy:rand(-40,0), drag:2, life:rand(.5,.9), s0:rand(5,9)*sc, s1:rand(14,22)*sc, a:.22, pal:[[120,118,124],[70,68,74]] });
}
function bulletHit(x, y, sc = 1){
  sparks(x, y, PAL.gun, 6*sc, 300, 1.8);
  ring(x, y, 2, 18*sc, .18, PAL.gun[0], 2);
}
function tracer(o){ return new Proj(Object.assign({ kind:'tracer', pal:PAL.gun, collide:true, elem:'gun', speed:1700,
  onHit:(x, y) => bulletHit(x, y) }, o)); }
export function fanFire(ox, oy, tx, ty){
  const base = Math.atan2(ty - oy, tx - ox), d = Math.hypot(tx - ox, ty - oy) + 260;
  let k = 0;
  active.push(new Blip(.42, () => {}, (b) => {
    while (k < 6 && b.age >= k*.065){
      const a = base + rand(-.05, .05) + (k - 2.5)*.018;
      active.push(tracer({ x:ox, y:oy, tx, ty, ang:a, max:d, dmg:DMG.fan }));
      muzzle(ox + Math.cos(a)*10, oy + Math.sin(a)*10, a, .9); addShake(.8); k++;
    }
  }));
}
export function scatter(ox, oy, tx, ty){
  const base = Math.atan2(ty - oy, tx - ox);
  for (let i = 0; i < 12; i++){
    const a = base + rand(-.3, .3);
    active.push(tracer({ x:ox, y:oy, tx, ty, ang:a, max:rand(360, 460), speed:rand(950, 1300), dmg:DMG.pellet, small:true,
      onHit:(x, y) => sparks(x, y, PAL.gun, 3, 200, 1.5) }));
  }
  muzzle(ox + Math.cos(base)*12, oy + Math.sin(base)*12, base, 1.8); puff(ox + Math.cos(base)*20, oy + Math.sin(base)*20, 6, 1.2); addShake(3);
}
export class Harpoon {
  constructor(ox, oy, tx, ty){
    this.ox = ox; this.oy = oy; this.ang = Math.atan2(ty - oy, tx - ox); this.x = ox; this.y = oy;
    this.max = Math.hypot(tx - ox, ty - oy) + 220; this.trav = 0; this.state = 'fly'; this.t = 0; this.hit = [];
    muzzle(ox, oy, this.ang, 1.2); addShake(1.5);
  }
  update(dt){
    this.t += dt;
    if (this.state === 'fly'){
      const st = 1150*dt; this.x += Math.cos(this.ang)*st; this.y += Math.sin(this.ang)*st; this.trav += st;
      const e = enemyAt(this.x, this.y, 4);
      if (e && !this.hit.includes(e)){ this.hit.push(e); e.stun = Math.max(e.stun, 2.2); hurt(e, DMG.harpoon, 'gun', { x:this.ox, y:this.oy }); bulletHit(this.x, this.y, 1.4); }
      if (this.trav >= this.max){ this.state = 'hold'; this.t = 0; }
      return true;
    }
    if (this.state === 'hold' && this.t > .45){
      this.state = 'reel'; this.t = 0;
      for (const e of this.hit) if (alive(e)){ hurt(e, DMG.harpoonReel, 'gun', { x:this.x, y:this.y }); const c = ectr(e); sparks(c.x, c.y, PAL.gun, 12, 360, 2); ring(c.x, c.y, 4, 34, .25, PAL.gun[1], 2); }
      addShake(3);
    }
    return this.state !== 'reel' || this.t < .18;
  }
  draw(){
    const k = this.state === 'reel' ? 1 - this.t/.18 : 1;
    ctx.globalAlpha = .85*k; ctx.strokeStyle = 'rgb(40,36,34)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(this.ox, this.oy); ctx.lineTo(this.x, this.y); ctx.stroke();
    ctx.strokeStyle = `rgb(${PAL.gun[1]})`; ctx.lineWidth = 1; ctx.globalAlpha = .7*k;
    ctx.beginPath(); ctx.moveTo(this.ox, this.oy); ctx.lineTo(this.x, this.y); ctx.stroke();
    const a = this.ang;
    streak(this.x - Math.cos(a)*8, this.y - Math.sin(a)*8, a, 12, 4, PAL.gun[0], k);
    ctx.globalAlpha = k; ctx.fillStyle = `rgb(${PAL.gun[0]})`; ctx.beginPath();
    ctx.moveTo(this.x + Math.cos(a)*9, this.y + Math.sin(a)*9);
    ctx.lineTo(this.x + Math.cos(a + 2.5)*7, this.y + Math.sin(a + 2.5)*7); ctx.lineTo(this.x + Math.cos(a - 2.5)*7, this.y + Math.sin(a - 2.5)*7); ctx.fill();
  }
}
export class Mine {
  constructor(x, y){ this.x = x; this.y = y; this.age = 0; this.life = 7; this.boom = false; ring(x, y, 2, 26, .25, PAL.gun[1], 2); }
  update(dt){
    this.age += dt;
    if (!this.boom){
      const near = this.age > .4 && enemies.some(e => alive(e) && Math.hypot(e.x - this.x, e.y - e.r - this.y) < 60 + e.r);
      if (near || this.age >= this.life){
        this.boom = true; this.age = 0; const x = this.x, y = this.y;
        hurtArea(x, y, 115, DMG.mine, 'gun');
        ring(x, y, 6, 130, .45, PAL.gun[0], 6); ring(x, y, 6, 80, .3, [255,255,255], 3);
        for (let i = 0; i < 22; i++){ const a = rand(0, TAU), sp = rand(260, 560); emit({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, drag:2.2, life:rand(.25,.5), s0:3, s1:1, streak:3.5, pal:PAL.gun }); }
        for (let i = 0; i < 26; i++){ const a = rand(0, TAU), sp = rand(40, 200); emit({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, drag:3, life:rand(.3,.6), s0:rand(10,18), s1:2, pal:PAL.fire }); }
        puff(x, y, 8, 1.8); flash(x, y, 320, LIGHT.gun, 1.6, .35); addShake(6);
      }
      light(this.x, this.y, 50, LIGHT.blood, (Math.sin(this.age*14) > 0 ? .6 : .1));
      return true;
    }
    return this.age < .05;
  }
  draw(){
    if (this.boom) return;
    const x = this.x, y = this.y, blink = Math.sin(this.age*14) > 0;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgb(28,26,30)'; ctx.strokeStyle = `rgb(${PAL.gun[2]})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); for (let i = 0; i < 8; i++){ const a = i/8*TAU + this.age, r = i % 2 ? 7 : 11; ctx.lineTo(x + Math.cos(a)*r, y + Math.sin(a)*r); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = blink ? 'rgb(255,60,40)' : 'rgb(90,20,16)'; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    if (blink) sprite(x, y, 12, PAL.blood[1], .8);
  }
}
export class Orbital {
  constructor(x, y){ this.x = x; this.y = y; this.age = 0; this.lock = 1; this.beam = .6; this.done = new Set(); this.tk = 0; }
  update(dt){
    this.age += dt;
    if (this.age > this.lock){
      const bt = this.age - this.lock, w = 30*(1 - bt/this.beam);
      if (bt < .02) { flash(this.x, this.y, 380, LIGHT.gun, 2, .5); addShake(9); ring(this.x, this.y, 6, 150, .5, PAL.gun[0], 6); }
      this.tk -= dt;
      for (const e of enemies){
        if (!alive(e) || Math.abs(e.x - this.x) > w + e.r || e.y - e.r > this.y + 30) continue;
        if (!this.done.has(e)){ this.done.add(e); hurt(e, DMG.orbital, 'gun', { x:this.x, y:e.y - e.r - 40 }); }
        else if (this.tk <= 0) hurt(e, DMG.orbitalTick, 'gun');
      }
      if (this.tk <= 0) this.tk = .15;
      for (let i = 0; i < 4; i++) emit({ x:this.x + rand(-w, w)*.6, y:this.y + rand(-6, 6), vx:rand(-160,160), vy:rand(-160,-20), drag:2, life:rand(.2,.45), s0:3, s1:1, streak:2.5, pal:PAL.gun });
      light(this.x, this.y - 60, 220, LIGHT.gun, 1.2*(1 - bt/this.beam));
    }
    return this.age < this.lock + this.beam;
  }
  draw(){
    const x = this.x, y = this.y;
    if (this.age < this.lock){
      const t = this.age/this.lock, r = lerp(70, 22, t*t), rot = this.age*3;
      ctx.strokeStyle = 'rgb(255,70,50)'; ctx.lineWidth = 2; ctx.globalAlpha = .55 + .45*(Math.sin(this.age*30) > 0);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 4; i++){ const a = rot + i*Math.PI/2; ctx.moveTo(x + Math.cos(a)*(r - 8), y + Math.sin(a)*(r - 8)); ctx.lineTo(x + Math.cos(a)*(r + 10), y + Math.sin(a)*(r + 10)); }
      ctx.stroke();
      ctx.globalAlpha = .25*t; ctx.fillStyle = 'rgb(255,70,50)'; ctx.fillRect(x - 1, -10, 2, y + 10);
      return;
    }
    const bt = (this.age - this.lock)/this.beam, w = 30*(1 - bt);
    ctx.globalAlpha = .35*(1 - bt); ctx.fillStyle = `rgb(${PAL.gun[2]})`; ctx.fillRect(x - w*1.8, -20, w*3.6, y + 40);
    ctx.globalAlpha = .9*(1 - bt); ctx.fillStyle = `rgb(${PAL.gun[0]})`; ctx.fillRect(x - w*.55, -20, w*1.1, y + 40);
    sprite(x, y, 60*(1 - bt) + 20, PAL.gun[1], 1 - bt);
  }
}
export class LongShot {
  constructor(ox, oy, tx, ty){
    this.ox = ox; this.oy = oy; this.ang = Math.atan2(ty - oy, tx - ox); this.age = 0; this.charge = .45; this.fired = false;
    const L = Math.hypot(W, H)*1.2; this.ex = ox + Math.cos(this.ang)*L; this.ey = oy + Math.sin(this.ang)*L;
  }
  update(dt){
    this.age += dt;
    if (!this.fired && this.age >= this.charge){
      this.fired = true;
      for (const e of enemies){ if (!alive(e)) continue; const c = ectr(e); if (segDist(c.x, c.y, this.ox, this.oy, this.ex, this.ey) < e.r + 8){ hurt(e, DMG.snipe, 'gun', { x:this.ox, y:this.oy }); sparks(c.x, c.y, PAL.gun, 14, 420, 2); } }
      muzzle(this.ox, this.oy, this.ang, 2); puff(this.ox, this.oy, 5, 1.3); addShake(5);
    }
    return this.age < this.charge + .3;
  }
  draw(){
    if (!this.fired){
      const t = this.age/this.charge;
      ctx.strokeStyle = 'rgb(255,60,40)'; ctx.globalAlpha = .25 + .5*t; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(this.ox, this.oy); ctx.lineTo(this.ex, this.ey); ctx.stroke();
      sprite(this.ox, this.oy, 6 + 10*t, PAL.blood[1], .6*t);
      return;
    }
    const k = 1 - (this.age - this.charge)/.3;
    ctx.lineCap = 'butt';
    ctx.globalAlpha = .35*k; ctx.strokeStyle = `rgb(${PAL.gun[2]})`; ctx.lineWidth = 10*k; ctx.beginPath(); ctx.moveTo(this.ox, this.oy); ctx.lineTo(this.ex, this.ey); ctx.stroke();
    ctx.globalAlpha = k; ctx.strokeStyle = `rgb(${PAL.gun[0]})`; ctx.lineWidth = 2.5*k + .5; ctx.beginPath(); ctx.moveTo(this.ox, this.oy); ctx.lineTo(this.ex, this.ey); ctx.stroke();
  }
}
export function missiles(ox, oy, tx, ty){
  const pool = enemies.filter(alive).sort((p, q) => Math.hypot(p.x - tx, p.y - ty) - Math.hypot(q.x - tx, q.y - ty)).slice(0, 8);
  for (let i = 0; i < 8; i++){
    const tgtE = pool.length ? pool[i % pool.length] : null, a = -Math.PI/2 + (i - 3.5)*.28;
    active.push(new Proj({ x:ox + (i - 3.5)*3, y:oy, tx, ty, ang:a, home:3, speed:rand(480, 560), kind:'missile', pal:PAL.gun, collide:true, dmg:DMG.missile, elem:'gun', targetE:tgtE,
      trail:(p, dt2) => {
        if (Math.random() < dt2*40) emit({ x:p.x - Math.cos(p.ang)*6, y:p.y - Math.sin(p.ang)*6, vx:rand(-8,8), vy:rand(-8,8), drag:1.5, life:rand(.5,.8), s0:3, s1:9, a:.25, pal:[[150,146,150],[90,88,94]] });
        if (Math.random() < dt2*60) emit({ x:p.x - Math.cos(p.ang)*5, y:p.y - Math.sin(p.ang)*5, vx:-Math.cos(p.ang)*60, vy:-Math.sin(p.ang)*60, drag:4, life:.12, s0:3.5, s1:.5, pal:PAL.fire });
      },
      onHit:(x, y) => { hurtArea(x, y, 40, Math.round(DMG.missile*.5), 'gun'); ring(x, y, 3, 40, .3, PAL.gun[1], 3); for (let k = 0; k < 10; k++){ const aa = rand(0, TAU), sp = rand(60, 200); emit({ x, y, vx:Math.cos(aa)*sp, vy:Math.sin(aa)*sp, drag:3, life:rand(.2,.4), s0:rand(6,10), s1:1, pal:PAL.fire }); } puff(x, y, 3); } }));
  }
}
export class Strafe {
  constructor(tx, ty){
    this.dir = tx < W/2 ? 1 : -1; this.y = Math.max(70, ty - 70); this.x = this.dir > 0 ? -60 : W + 60;
    this.speed = (W + 120)/1.15; this.age = 0; this.ft = 0;
  }
  update(dt){
    this.age += dt; this.x += this.dir*this.speed*dt; this.ft -= dt;
    if (this.ft <= 0 && this.x > 20 && this.x < W - 20){
      this.ft = .045; const a = Math.PI/2 - this.dir*.35 + rand(-.05, .05);
      active.push(tracer({ x:this.x, y:this.y + 6, tx:this.x, ty:this.y + 400, ang:a, max:520, speed:1500, dmg:DMG.strafe, small:true }));
      muzzle(this.x + Math.cos(a)*8, this.y + 6 + Math.sin(a)*8, a, .7);
    }
    emit({ x:this.x - this.dir*20, y:this.y, vx:-this.dir*rand(60,120), vy:rand(-10,10), drag:2, life:.2, s0:5, s1:1, pal:PAL.fire });
    light(this.x, this.y, 90, LIGHT.gun, .5);
    return this.dir > 0 ? this.x < W + 80 : this.x > -80;
  }
  draw(){
    // an original flat delta-wing gunship silhouette
    const x = this.x, y = this.y, d = this.dir;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(d, 1);
    ctx.fillStyle = 'rgb(20,18,22)'; ctx.beginPath(); ctx.moveTo(28, 2); ctx.lineTo(-18, -12); ctx.lineTo(-12, 2); ctx.lineTo(-20, 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgb(232,226,212)'; ctx.beginPath(); ctx.moveTo(25, 2); ctx.lineTo(-15, -9); ctx.lineTo(-10, 2); ctx.lineTo(-17, 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgb(216,57,43)'; ctx.fillRect(-14, -1.5, 22, 3);
    ctx.fillStyle = 'rgb(20,18,22)'; ctx.fillRect(4, -5, 9, 3);
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    sprite(x - d*18, y + 1, 9, PAL.fire[1], .9);
  }
}
export class Jam {
  constructor(){ this.age = 0; this.life = 6; jamT = 6; this.nt = 0; ring(origin.x, origin.y - 8, 6, 90, .5, PAL.gun[1], 4); flash(origin.x, origin.y, 200, LIGHT.gun, 1.2, .4); }
  update(dt){
    this.age += dt; this.nt -= dt;
    if (this.nt <= 0){ this.nt = .35; this.notes = this.notes || []; this.notes.push({ x:origin.x + rand(-40, 40), y:origin.y - 10, vx:rand(-20, 20), age:0, g:Math.random() < .5 ? '♪' : '♫' }); }
    if (this.notes) for (const n of this.notes){ n.age += dt; n.y -= 46*dt; n.x += n.vx*dt; }
    if (this.notes) this.notes = this.notes.filter(n => n.age < 1.6);
    light(origin.x, origin.y - 10, 120, LIGHT.gun, .4);
    return this.age < this.life;
  }
  draw(){
    const k = Math.min(1, (this.life - this.age)/.5);
    ctx.strokeStyle = `rgb(${PAL.gun[1]})`; ctx.lineWidth = 1.5;
    for (let i = 0; i < 2; i++){ const r = 26 + ((this.age*40 + i*20) % 40); ctx.globalAlpha = .4*k*(1 - (r - 26)/40); ctx.beginPath(); ctx.ellipse(origin.x, origin.y - 4, r, r*.45, 0, 0, TAU); ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = `${Math.round(18/Math.sqrt(ZOOM))}px serif`; ctx.textAlign = 'center';
    for (const n of (this.notes || [])){ ctx.globalAlpha = k*(1 - n.age/1.6); ctx.fillStyle = `rgb(${PAL.gun[1]})`; ctx.fillText(n.g, n.x, n.y); }
    ctx.globalCompositeOperation = 'lighter';
  }
}
