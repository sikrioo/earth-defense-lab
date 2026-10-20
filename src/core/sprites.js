/* ---------- sprites ---------- */
const cache = new Map();
export function glowSprite(c){ if (!c) c = [255,255,255];
  const k = 'g' + c; let s = cache.get(k); if (s) return s;
  s = document.createElement('canvas'); s.width = s.height = 64;
  const g = s.getContext('2d'), gr = g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0, `rgba(${c},1)`); gr.addColorStop(.22, `rgba(${c},.8)`);
  gr.addColorStop(.55, `rgba(${c},.2)`); gr.addColorStop(1, `rgba(${c},0)`);
  g.fillStyle = gr; g.fillRect(0,0,64,64); cache.set(k, s); return s;
}
export function softSprite(c){ if (!c) c = [255,255,255];
  const k = 's' + c; let s = cache.get(k); if (s) return s;
  s = document.createElement('canvas'); s.width = s.height = 128;
  const g = s.getContext('2d'), gr = g.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0, `rgba(${c},1)`); gr.addColorStop(.35, `rgba(${c},.4)`); gr.addColorStop(1, `rgba(${c},0)`);
  g.fillStyle = gr; g.fillRect(0,0,128,128); cache.set(k, s); return s;
}
