import { TAU, ctx } from '../core/canvas.js';
import { mix, srng } from '../core/util.js';

// Flat low-poly chunks: matte single colour, one faint lit facet, one faint shaded facet. No outline, no gradient.
// A real-looking meteorite: smooth lumpy outline, matte shading, craters, speckles.
function paintMeteorite(T, variant, R){
  const rnd = srng(4242 + variant*104729);
  const n = 18, ph = [rnd()*TAU, rnd()*TAU, rnd()*TAU], amp = [.1 + rnd()*.06, .06 + rnd()*.04, .03];
  const pts = [];
  for (let i = 0; i < n; i++){
    const a = i/n*TAU;
    const k = .86 + amp[0]*Math.sin(2*a + ph[0]) + amp[1]*Math.sin(3*a + ph[1]) + amp[2]*Math.sin(5*a + ph[2]);
    pts.push([Math.cos(a)*R*k*1.06, Math.sin(a)*R*k*.94]);
  }
  const path = () => {
    ctx.beginPath();
    const m0 = [(pts[0][0] + pts[n-1][0])/2, (pts[0][1] + pts[n-1][1])/2]; ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++){ const p = pts[i], q = pts[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0])/2, (p[1] + q[1])/2); }
    ctx.closePath();
  };
  const base = T.body, dark = mix(base, [12,8,6], .55), lite = mix(base, [255,244,228], .3);
  path(); ctx.fillStyle = `rgb(${base})`; ctx.fill();
  ctx.save(); path(); ctx.clip();
  // matte form shading: soft dark mass lower-right, soft light upper-left
  ctx.fillStyle = `rgba(${dark},.55)`; ctx.beginPath(); ctx.arc(R*.55, R*.5, R*1.05, 0, TAU); ctx.fill();
  ctx.fillStyle = `rgba(${lite},.22)`; ctx.beginPath(); ctx.arc(-R*.45, -R*.45, R*.7, 0, TAU); ctx.fill();
  // speckled grain
  for (let i = 0; i < 40; i++){
    const a = rnd()*TAU, d = Math.sqrt(rnd())*R;
    ctx.fillStyle = rnd() < .6 ? 'rgba(0,0,0,.18)' : 'rgba(255,240,220,.1)';
    ctx.fillRect(Math.cos(a)*d, Math.sin(a)*d, R*.05 + rnd()*R*.04, R*.05 + rnd()*R*.04);
  }
  // craters: shadowed bowl, lit far rim
  const nc = 4 + ((rnd()*3)|0);
  for (let i = 0; i < nc; i++){
    const a = rnd()*TAU, d = rnd()*R*.62, cr = R*(.09 + rnd()*.17), x = Math.cos(a)*d, y = Math.sin(a)*d;
    const sq = Math.sqrt(Math.max(.3, 1 - (d/R)**2));
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(sq, 1); ctx.rotate(-a);
    ctx.fillStyle = `rgba(${dark},.75)`; ctx.beginPath(); ctx.arc(0, 0, cr, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(${base},.9)`; ctx.beginPath(); ctx.arc(cr*.28, cr*.28, cr*.78, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(${lite},.55)`; ctx.lineWidth = Math.max(.7, cr*.2);
    ctx.beginPath(); ctx.arc(0, 0, cr, .1, Math.PI*.75); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  // faint lit edge on the upper-left limb
  ctx.save(); path(); ctx.clip();
  ctx.strokeStyle = `rgba(${lite},.45)`; ctx.lineWidth = 2.2; ctx.translate(1.2, 1.2); path(); ctx.stroke();
  ctx.restore();
}
export function paintDemon(T, type, variant, R){
  if (type === 'meteor'){ paintMeteorite(T, variant, R); return; }
  const rnd = srng(977 + variant*7919 + type.length*131);
  const n = T.sides || (variant === 1 ? 6 : 5), pts = [];
  for (let i = 0; i < n; i++){
    const a = i/n*TAU + (rnd() - .5)*.5, k = .86 + rnd()*.18;
    pts.push([Math.cos(a)*R*k, Math.sin(a)*R*k]);
  }
  const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); };
  path(); ctx.fillStyle = `rgb(${T.body})`; ctx.fill();
  const cx = (rnd() - .5)*R*.35, cy = (rnd() - .5)*R*.35, i0 = (rnd()*n)|0;
  const tri = (i, col) => { const p = pts[i % n], q = pts[(i + 1) % n]; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill(); };
  tri(i0, 'rgba(255,255,255,.08)');
  tri(i0 + Math.floor(n/2), 'rgba(0,0,0,.10)');
}
/* ---------- new rock types: comets, splitters, meteor showers, the rogue planet ---------- */
// flat three-tone cel painter shared by the code-drawn rocks (light from the upper left, no outline)
function celRock(g, R, seed, base, rough = .22){
  const rnd = srng(seed), n = 13, pts = [];
  for (let i = 0; i < n; i++){ const a = i/n*TAU + rnd()*.25, rr = R*(1 - rough*rnd()); pts.push([Math.cos(a)*rr, Math.sin(a)*rr]); }
  const path = () => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
  path(); g.fillStyle = `rgb(${mix(base, [12,10,18], .55)})`; g.fill();
  g.save(); path(); g.clip();
  g.fillStyle = `rgb(${base})`; g.beginPath(); g.arc(-R*.22, -R*.24, R*.92, 0, TAU); g.fill();
  g.fillStyle = `rgb(${mix(base, [255,250,240], .28)})`; g.beginPath(); g.arc(-R*.42, -R*.46, R*.42, 0, TAU); g.fill();
  for (let i = 0; i < 3; i++){
    const cx = (rnd() - .5)*R*1.1, cy = (rnd() - .5)*R*1.1, cr = R*(.12 + rnd()*.12);
    g.fillStyle = `rgb(${mix(base, [12,10,18], .4)})`; g.beginPath(); g.ellipse(cx, cy, cr, cr*.8, 0, 0, TAU); g.fill();
    g.fillStyle = `rgb(${mix(base, [255,250,240], .18)})`; g.beginPath(); g.ellipse(cx + cr*.25, cy + cr*.25, cr*.55, cr*.4, 0, 0, TAU); g.fill();
  }
  g.restore();
  return path;
}
function glowCracks(g, R, seed, col, w){
  const rnd = srng(seed + 7);
  g.strokeStyle = `rgb(${col})`; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
  for (let k = 0; k < 3; k++){
    let x = (rnd() - .5)*R*.6, y = (rnd() - .5)*R*.6; g.beginPath(); g.moveTo(x, y);
    for (let j = 0; j < 4; j++){ x += (rnd() - .5)*R*.55; y += (rnd() - .5)*R*.55; g.lineTo(x, y); }
    g.stroke();
  }
}
function paintRogue(g, R, seed){
  // a dead world: banded crimson crust, magma seams, a hard cel terminator
  const base = [128,62,54];
  g.fillStyle = `rgb(${mix(base, [10,6,12], .6)})`; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
  g.fillStyle = `rgb(${base})`; g.beginPath(); g.arc(-R*.3, -R*.28, R*.98, 0, TAU); g.fill();
  g.rotate(-.35);
  const rnd = srng(seed);
  for (let i = -4; i <= 4; i++){
    const y = i*R*.22 + (rnd() - .5)*R*.06, h = R*(.05 + rnd()*.07);
    g.fillStyle = i % 2 ? 'rgba(20,8,10,.28)' : 'rgba(255,190,150,.10)'; g.fillRect(-R, y, R*2, h);
  }
  g.rotate(.35);
  g.fillStyle = `rgb(${mix(base, [255,236,210], .3)})`; g.beginPath(); g.arc(-R*.5, -R*.52, R*.32, 0, TAU); g.fill();
  for (let i = 0; i < 6; i++){
    const cx = (rnd() - .5)*R*1.4, cy = (rnd() - .5)*R*1.4, cr = R*(.06 + rnd()*.1);
    g.fillStyle = 'rgba(20,8,12,.45)'; g.beginPath(); g.ellipse(cx, cy, cr, cr*.75, 0, 0, TAU); g.fill();
  }
  glowCracks(g, R*1.6, seed, [255,128,48], Math.max(1.5, R*.035));
  glowCracks(g, R*1.6, seed, [255,226,150], Math.max(.6, R*.012));
  g.restore();
}
export var CUSTOM_PAINT = {
  comet:   (g, R, s) => { celRock(g, R, s, [236,104,74], .14); g.fillStyle = 'rgb(255,226,190)'; g.beginPath(); g.arc(-R*.2, -R*.2, R*.35, 0, TAU); g.fill(); },
  splitter:(g, R, s) => { celRock(g, R, s, [104,92,126], .2); glowCracks(g, R, s, [110,236,255], Math.max(1.2, R*.12)); glowCracks(g, R, s, [235,255,255], Math.max(.5, R*.04)); },
  shard:   (g, R, s) => { celRock(g, R, s, [116,104,140], .35); glowCracks(g, R*.7, s, [110,236,255], 1); },
  pebble:  (g, R, s) => { celRock(g, R, s, [150,128,108], .3); },
  planet:  (g, R, s) => paintRogue(g, R, s),
};
