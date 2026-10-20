/* ---------- particles ---------- */
import { MOBILE, Q, RS, ctx, lerp, shX, shY } from './canvas.js';
import { PAL } from './palette.js';
import { glowSprite } from './sprites.js';

export const parts = [];
 export let MAXP;
export function setMAXP(v){ return MAXP = v; }
export function emit(o){
  if (parts.length >= MAXP || (Q < 1 && Math.random() > Q)) return;
  const s0 = o.s0 || 6;
  parts.push({ x:o.x, y:o.y, vx:o.vx||0, vy:o.vy||0, ay:o.ay||0, drag:o.drag||0, life:o.life||.5, age:0,
    s0, s1:o.s1 ?? s0*.2, pal:o.pal||PAL.fire, a:o.a ?? 1, streak:o.streak||0 });
}
export function updParts(dt){
  for (let i = parts.length - 1; i >= 0; i--){
    const p = parts[i]; p.age += dt;
    if (p.age >= p.life){ parts[i] = parts[parts.length-1]; parts.pop(); continue; }
    if (p.drag){ const f = Math.exp(-p.drag*dt); p.vx *= f; p.vy *= f; }
    p.vy += p.ay*dt; p.x += p.vx*dt; p.y += p.vy*dt;
  }
}
export function drawParts(){
  for (const p of parts){
    const t = p.age/p.life, s = lerp(p.s0, p.s1, t); if (s <= .3) continue;
    const fade = t < .08 ? t/.08 : 1 - (t-.08)/.92;
    const c = p.pal[Math.min(p.pal.length-1, (t*p.pal.length)|0)];
    if (p.streak) streak(p.x, p.y, Math.atan2(p.vy, p.vx), s*p.streak, s, c, p.a*fade);
    else { ctx.globalAlpha = p.a*fade; ctx.drawImage(glowSprite(c), p.x-s, p.y-s, s*2, s*2); }
  }
}
export function sprite(x, y, r, c, a){ if (a <= 0) return; ctx.globalAlpha = a; ctx.drawImage(glowSprite(c), x-r, y-r, r*2, r*2); }
export function streak(x, y, ang, len, w, c, a){
  if (a <= 0) return;
  const cs = Math.cos(ang), sn = Math.sin(ang);
  ctx.globalAlpha = a;
  ctx.setTransform(RS*cs, RS*sn, -RS*sn, RS*cs, RS*(x+shX), RS*(y+shY));
  ctx.drawImage(glowSprite(c), -len, -w/2, len*2, w);
  ctx.setTransform(RS, 0, 0, RS, RS*shX, RS*shY);
}

// runs once at boot, from main.js, in the original file order
export function setup(){
  MAXP = MOBILE ? 900 : 5000;
}
