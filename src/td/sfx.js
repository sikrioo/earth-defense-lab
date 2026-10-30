/* ---------- fortress mode: sound — every effect synthesised with Web Audio, no files ----------
   Starts on the first tap/key (browsers require a gesture). Each sound has a minimum gap so a
   gatling at ×2 speed doesn't turn into a buzz, and a cap on how many voices play at once. */
const KEY = 'edl.mute.v1';
let ac = null, out = null, noise = null, voices = 0;
let muted = false;
try { muted = localStorage.getItem(KEY) === '1'; } catch (_){ /* private mode */ }
const last = {};

function init(){
  if (ac) return;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ac = new AC();
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 6; comp.connect(ac.destination);
  out = ac.createGain(); out.gain.value = muted ? 0 : .5; out.connect(comp);
  noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1;
}
const wake = () => { init(); if (ac && ac.state === 'suspended') ac.resume(); };
addEventListener('pointerdown', wake, { passive:true }); addEventListener('keydown', wake);

export const isMuted = () => muted;
export function setMuted(m){
  muted = m; try { localStorage.setItem(KEY, m ? '1' : '0'); } catch (_){ /* fine */ }
  if (out) out.gain.setTargetAtTime(m ? 0 : .5, ac.currentTime, .05);
}

// gate: is this sound allowed right now?
function ok(name, gap){
  if (!ac || muted || ac.state !== 'running' || voices > 22) return false;
  const t = ac.currentTime; if (last[name] && t - last[name] < gap) return false;
  last[name] = t; return true;
}
function env(g, t, a, peak, dur){ g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
function track(node, dur){ voices++; node.onended = () => voices--; return node; }
function burst({ vol = .3, dur = .2, type = 'lowpass', f0 = 2000, f1 = 300, q = 1, a = .003 }){
  const t = ac.currentTime, src = track(ac.createBufferSource(), dur), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = noise; src.playbackRate.value = .8 + Math.random()*.4;
  f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  env(g, t, a, vol, dur); src.connect(f).connect(g).connect(out); src.start(t, Math.random()*.5); src.stop(t + dur + .02);
}
function tone({ vol = .2, dur = .2, wave = 'sine', f0 = 440, f1 = f0, a = .005, at = 0 }){
  const t = ac.currentTime + at, o = track(ac.createOscillator(), dur), g = ac.createGain();
  o.type = wave; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, a, vol, dur); o.connect(g).connect(out); o.start(t); o.stop(t + dur + .02);
}

export const sfx = {
  gun(){ if (ok('gun', .05)) burst({ vol:.07, dur:.05, type:'highpass', f0:2600, f1:1800 }); },
  craft(){ if (ok('craft', .07)) burst({ vol:.04, dur:.04, type:'highpass', f0:3600, f1:2600 }); },
  missile(){ if (ok('missile', .12)) burst({ vol:.12, dur:.35, type:'bandpass', f0:500, f1:1800, q:2 }); },
  rail(){ if (!ok('rail', .1)) return; tone({ vol:.18, dur:.35, wave:'sawtooth', f0:1400, f1:90 }); burst({ vol:.2, dur:.25, f0:4000, f1:400 }); },
  railCharge(){ if (ok('railc', .5)) tone({ vol:.03, dur:.5, wave:'sine', f0:300, f1:900 }); },
  zap(){ if (!ok('zap', .08)) return; tone({ vol:.06, dur:.12, wave:'square', f0:900 + Math.random()*500, f1:200 }); burst({ vol:.08, dur:.1, type:'bandpass', f0:3000, f1:1500, q:3 }); },
  laser(){ if (ok('laser', .35)) tone({ vol:.035, dur:.3, wave:'sawtooth', f0:880, f1:820 }); },
  frost(){ if (ok('frost', .12)) burst({ vol:.08, dur:.3, type:'highpass', f0:5000, f1:2500 }); },
  flame(){ if (ok('flame', .14)) burst({ vol:.06, dur:.2, type:'lowpass', f0:900, f1:500 }); },
  flak(){ if (ok('flak', .08)) { burst({ vol:.16, dur:.12, f0:2400, f1:300 }); tone({ vol:.08, dur:.08, f0:180, f1:70 }); } },
  storm(){ if (!ok('storm', .3)) return; tone({ vol:.08, dur:.6, wave:'sawtooth', f0:60, f1:45 }); burst({ vol:.1, dur:.5, type:'bandpass', f0:2200, f1:900, q:4 }); },
  boom(size = 1){
    if (!ok(size > 2 ? 'bigboom' : 'boom', size > 2 ? .05 : .045)) return;
    const k = Math.min(3, size);
    burst({ vol:.06 + k*.06, dur:.18 + k*.12, f0:1600 + k*400, f1:90 });
    if (k > 1.2) tone({ vol:.06*k, dur:.2 + k*.15, f0:110, f1:40 });
  },
  shield(heavy){ if (!ok('shield', .07)) return; tone({ vol:heavy ? .4 : .22, dur:heavy ? .6 : .3, f0:90, f1:38 }); burst({ vol:.12, dur:.25, type:'bandpass', f0:1400, f1:500, q:2 }); },
  cometWarn(){ if (!ok('cwarn', .25)) return; tone({ vol:.07, dur:1.1, wave:'sawtooth', f0:220, f1:1300, a:.3 }); tone({ vol:.05, dur:1.1, wave:'sine', f0:440, f1:2200, a:.3 }); },
  comet(){ if (!ok('comet', .15)) return; burst({ vol:.22, dur:.7, type:'bandpass', f0:2400, f1:250, q:1.5 }); tone({ vol:.14, dur:.6, wave:'sawtooth', f0:160, f1:50 }); },
  alarm(){ if (!ok('alarm', 1)) return; for (let i = 0; i < 3; i++){ tone({ vol:.09, dur:.18, wave:'sawtooth', f0:640, at:i*.36 }); tone({ vol:.09, dur:.16, wave:'sawtooth', f0:470, at:i*.36 + .18 }); } },
  core(){ if (!ok('core', .3)) return; [523, 659, 784, 1047].forEach((f, i) => tone({ vol:.1, dur:.35, f0:f, at:i*.07 })); },
  ore(){ if (ok('ore', .09)) tone({ vol:.03, dur:.08, f0:1500 + Math.random()*400 }); },
  card(){ if (ok('card', .2)){ tone({ vol:.08, dur:.25, f0:660 }); tone({ vol:.06, dur:.3, f0:990, at:.06 }); } },
  pick(){ if (ok('pick', .1)) tone({ vol:.08, dur:.15, wave:'triangle', f0:520, f1:1040 }); },
  heart(){ if (!ok('heart', .5)) return; tone({ vol:.18, dur:.12, f0:70, f1:50 }); tone({ vol:.12, dur:.12, f0:65, f1:45, at:.18 }); },
  view(){ if (ok('view', 1)) tone({ vol:.12, dur:1.4, wave:'triangle', f0:120, f1:360 }); },
};
