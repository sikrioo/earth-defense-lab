

// runs once at boot, from main.js, in the original file order
export function setup(){
  try {
    const g = document.createElement('canvas'); g.width = g.height = 180; const gx = g.getContext('2d'), id = gx.createImageData(180, 180);
    for (let i = 0; i < id.data.length; i += 4){ const v = 110 + Math.random()*120; id.data[i] = id.data[i+1] = id.data[i+2] = v; id.data[i+3] = 255; }
    gx.putImageData(id, 0, 0); document.documentElement.style.setProperty('--grain', `url(${g.toDataURL()})`);
    const pd = gx.createImageData(180, 180);
    for (let i = 0; i < pd.data.length; i += 4){ const r = Math.random(); const dark = r < .5; pd.data[i] = pd.data[i+1] = pd.data[i+2] = dark ? 60 : 255; pd.data[i+3] = dark ? Math.random()*22 : Math.random()*16; }
    gx.putImageData(pd, 0, 0); document.documentElement.style.setProperty('--paperg', `url(${g.toDataURL()})`);
  } catch (_){}
}
