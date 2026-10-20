"""Cel-shaded (90s anime style) re-bake: asteroids, Earth, background, debris silhouettes.
Usage: python3 render_cel.py rocks|earth|debris|test   -> writes into out_cel/"""
import sys, io, base64, json, math, os
import numpy as np
from PIL import Image, ImageFilter
src = open('render_assets.py').read().split("if __name__")[0]
exec(src)                      # reuse Noise3, normalize, sample, rotx/roty, load_tex
OUT = 'out_cel'; os.makedirs(OUT, exist_ok=True)

PALS = {   # light, mid, dark, ink, rim
  'rose':   [(152,120,118), (98,76,78),  (54,42,46),  (18,14,16), (222,190,176)],
  'green':  [(124,144,120), (76,94,80),  (42,52,46),  (14,18,16), (196,224,196)],
  'basalt': [(130,132,144), (80,82,94),  (42,44,54),  (12,12,16), (204,210,226)],
  'rock':   [(156,136,114), (100,86,72), (54,46,40),  (16,13,12), (230,208,176)],
  'ice':    [(222,238,250), (150,184,214),(80,106,144),(24,34,54), (255,255,255)],
  'lava':   [(92,76,70),    (58,48,46),  (32,26,26),  (10,8,8),   (255,150,80)],
  'debris': [(52,56,70),    (30,32,42),  (16,17,24),  (6,6,9),    (128,140,166)],
}

def cel_asteroid(seed, size, style, lumpy, craters, elong, outline=True):
    N = Noise3(seed); N2 = Noise3(seed + 99); r = np.random.default_rng(seed)
    cr_dirs = normalize(r.normal(size=(craters, 3))); cr_rad = r.uniform(.2, .45, craters); cr_dep = r.uniform(.05, .1, craters)
    ex, ey, ez = elong
    def height(d):
        h = (N.fbm(d[...,0]*1.5 + 3, d[...,1]*1.5, d[...,2]*1.5, 3) - .5)*2*lumpy
        for i in range(craters):
            t = np.arccos(np.clip((d*cr_dirs[i]).sum(-1), -1, 1))/cr_rad[i]
            h += np.where(t < 1, -cr_dep[i]*(1 - t*t), 0) + np.where((t > .8) & (t < 1.35), cr_dep[i]*.45*np.exp(-((t - 1.02)/.15)**2), 0)
        return h
    def F(p):
        q = p/np.array([ex, ey, ez]); rr = np.linalg.norm(q, axis=-1)
        return rr - (.72 + height(q/np.maximum(rr[...,None], 1e-6)))
    S = 2; n = size*S
    ys, xs = np.mgrid[0:n, 0:n]
    px = ((xs + .5)/n*2 - 1)*1.08; py = ((ys + .5)/n*2 - 1)*1.08
    hit = np.zeros((n, n), bool); depth = np.full((n, n), -2.0); zs = np.linspace(1.3, -1.3, 70)
    for z in zs:
        m = ~hit
        if not m.any(): break
        f = F(np.stack([px[m], py[m], np.full(m.sum(), z)], -1))
        idx = np.flatnonzero(m.ravel())[f < 0]; hit.ravel()[idx] = True; depth.ravel()[idx] = z
    m = hit; zhi = depth[m] + (zs[0] - zs[1]); zlo = depth[m]; pxm, pym = px[m], py[m]
    for _ in range(7):
        zm = (zhi + zlo)/2; inside = F(np.stack([pxm, pym, zm], -1)) < 0
        zlo = np.where(inside, zm, zlo); zhi = np.where(inside, zhi, zm)
    P = np.stack([pxm, pym, (zhi + zlo)/2], -1); e = 2.5e-2   # wide sampling = smooth, flat cel planes
    g = np.stack([F(P + np.array([e,0,0])) - F(P - np.array([e,0,0])), F(P + np.array([0,e,0])) - F(P - np.array([0,e,0])), F(P + np.array([0,0,e])) - F(P - np.array([0,0,e]))], -1)
    nrm = normalize(g); L = normalize(np.array([-.6, -.55, .58]))
    lam = (nrm*L).sum(-1); d = normalize(P)
    # painted patches shift a pixel one tone darker, like hand-painted rock
    patch = N2.fbm(d[...,0]*1.7, d[...,1]*1.7, d[...,2]*1.7, 2) > .6
    band = np.where(lam > .46, 0, np.where(lam > .1, 1, np.where(lam > -.08, 2, 3)))
    band = np.minimum(3, band + (patch & (band == 1)).astype(int))
    pal = np.array(PALS[style], float)/255
    col = pal[band]
    rim = ((1 - np.abs(nrm[...,2])) > .7) & (lam > .2)
    col[rim] = pal[4]
    if style == 'ice':
        H = normalize(L + np.array([0,0,1.])); col[(nrm*H).sum(-1) > .965] = 1.0
    if style == 'lava':
        cr = N2.fbm(d[...,0]*4.5 + 9, d[...,1]*4.5, d[...,2]*4.5, 4)
        crack = np.abs(cr - .5) < .022
        col[crack] = np.array([1.0, .55, .18]); col[np.abs(cr - .5) < .008] = np.array([1.0, .92, .6])
    img = np.zeros((n, n, 4)); img[m, :3] = col; img[m, 3] = 1
    im = Image.fromarray((img*255).astype(np.uint8), 'RGBA').resize((size, size), Image.LANCZOS)
    if outline:
        a = im.split()[3].point(lambda v: 255 if v > 40 else 0).filter(ImageFilter.MaxFilter(3))
        ink = Image.new('RGBA', im.size, tuple(int(v*255) for v in pal[3]) + (255,)); ink.putalpha(a)
        im = Image.alpha_composite(ink, im)
    bb = im.getbbox(); return im.crop(bb)

CL = None
def load_clouds():
    global CL
    CL = np.asarray(Image.open('dl_globe/package/example/clouds/clouds.png').convert('RGBA').split()[3].resize((2048, 1024), Image.LANCZOS)).astype(np.float32)[...,None]/255
def cel_globe_pixels(nx, ny, view_lat, view_lon, light, rot_clouds=0.0):
    nz = np.sqrt(np.clip(1 - nx*nx - ny*ny, 0, 1))
    w = np.stack([nx, -ny, nz], -1) @ (roty(view_lon) @ rotx(-view_lat)).T
    lat = np.arcsin(np.clip(w[...,1], -1, 1)); lon = np.arctan2(w[...,0], w[...,2])
    day = sample(BM, lat, lon); night = sample(NL, lat, lon); cl = sample(CL, lat, lon + rot_clouds)[...,0]
    # flat, saturated paint: push saturation, then posterize to a few tones
    grey = day.mean(-1, keepdims=True); day = np.clip(grey + (day - grey)*1.55, 0, 1)
    ocean = (day[...,2] > day[...,0] + .06) & (day[...,2] > day[...,1] - .02)
    day = np.round(day*5)/5
    day[ocean] = np.where((day[ocean].sum(-1) > 1.0)[...,None], np.array([.18, .48, .86]), np.array([.10, .30, .68]))
    cloud = np.clip((cl - .18)*4.5, 0, 1)[...,None]
    day = day*(1 - cloud) + np.array([.95, .97, 1.0])*cloud
    lam = (np.stack([nx, ny, nz], -1)*light).sum(-1)
    lit = np.where(lam > .16, 1.0, np.where(lam > -.06, .58, .13))[...,None]
    col = day*lit
    term = (lam <= .16) & (lam > -.06)
    col[term] = col[term]*np.array([.7, .78, 1.0])
    nightside = lam <= -.06
    cities = (night.mean(-1) > .35) & nightside
    col[cities] = np.array([1.0, .82, .45])
    # thin cyan-green limb, hard edged
    limb = nz < LIMB
    col[limb] = col[limb]*.4 + np.array([.45, .95, .88])*.6*(lam[limb] > -.2)[...,None] + col[limb]*.0
    return np.clip(col, 0, 1)
LIMB = .14
def cel_globe(size, vlat, vlon, light, rc):
    S = 2; n = size*S; ys, xs = np.mgrid[0:n, 0:n]
    nx = (xs + .5)/n*2 - 1; ny = (ys + .5)/n*2 - 1; m = nx*nx + ny*ny <= 1
    col = np.zeros((n, n, 4)); col[m, :3] = cel_globe_pixels(nx[m], ny[m], vlat, vlon, light, rc); col[m, 3] = 1
    return Image.fromarray((col*255).astype(np.uint8), 'RGBA').resize((size, size), Image.LANCZOS)
def cel_cap(width, Rpx, capH, vlat, vlon, light):
    S = 2; W_, H_ = width*S, capH*S; R = Rpx*S; ys, xs = np.mgrid[0:H_, 0:W_]
    nx = (xs + .5 - W_/2)/R; ny = (ys + .5 - R)/R; m = nx*nx + ny*ny <= 1
    col = np.zeros((H_, W_, 4)); col[m, :3] = cel_globe_pixels(nx[m], ny[m], vlat, vlon, light); col[m, 3] = 1
    return Image.fromarray((col*255).astype(np.uint8), 'RGBA').resize((width, capH), Image.LANCZOS)
def cel_sky(w, h, seed=11):
    r = np.random.default_rng(seed); ys = np.linspace(0, 1, h)[:,None,None]
    img = np.array([.008, .012, .035])*(1 - ys) + np.array([.03, .07, .17])*ys + np.zeros((h, w, 3))
    for _ in range(int(w*h/1500)):
        x, y = r.integers(0, w), r.integers(0, h); b = r.random()**4*.85 + .15
        img[y, x] = np.maximum(img[y, x], b)
        if b > .8 and 1 <= x < w - 1 and 1 <= y < h - 1: img[y-1:y+2, x] = np.maximum(img[y-1:y+2, x], b*.5); img[y, x-1:x+2] = np.maximum(img[y, x-1:x+2], b*.5)
    return Image.fromarray((np.clip(img, 0, 1)*255).astype(np.uint8), 'RGB')

def save(name, im, q=88):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6); d = b.getvalue()
    open(f'{OUT}/{name}.webp', 'wb').write(d); return 'data:image/webp;base64,' + base64.b64encode(d).decode(), len(d)

if __name__ == '__main__':
    job = sys.argv[1]; out = {}
    if job == 'test':
        ims = [cel_asteroid(5, 176, 'rose', .26, 5, (1,.86,.92)), cel_asteroid(9, 200, 'lava', .2, 5, (1,.92,.95)), cel_asteroid(11, 190, 'ice', .24, 5, (1,.9,.9)), cel_asteroid(21, 70, 'debris', .3, 6, (1.1,.8,.9))]
        Wt = sum(i.width for i in ims) + 60; Ht = max(i.height for i in ims)
        s = Image.new('RGB', (Wt*2, Ht*2), (8, 12, 30)); x = 0
        for i in ims: i2 = i.resize((i.width*2, i.height*2)); s.paste(i2, (x, 0), i2); x += i2.width + 40
        s.save('cel_test.png')
    if job == 'rocks':
        spec = {'normal':('rose',176,.22,(1.0,.86,.92)), 'runner':('green',140,.3,(1.15,.7,.8)), 'brute':('basalt',200,.16,(1.0,.95,.95)),
                'meteor':('rock',190,.26,(1.1,.82,.9)), 'elite':('ice',190,.2,(1.0,.9,.9)), 'boss':('lava',260,.18,(1.0,.92,.95))}
        for t, (style, size, lump, el) in spec.items():
            out[t] = []
            for v in range(3):
                uri, nb = save(f'{t}_{v}', cel_asteroid(100 + sum(map(ord, t))*7 + v*17, size, style, lump + .04, 4 + v*2, el)); out[t].append(uri); print(t, v, nb, flush=True)
        json.dump(out, open(f'{OUT}/rocks.json', 'w'))
    if job == 'debris':
        out['debris'] = []
        for v in range(5):
            uri, nb = save(f'debris_{v}', cel_asteroid(300 + v*31, 72, 'debris', .3, 5, (1.15, .78, .9), outline=False)); out['debris'].append(uri)
        uri, nb = save('sky', cel_sky(1280, 800), 80); out['stars'] = uri
        json.dump(out, open(f'{OUT}/debris.json', 'w')); print('debris ok')
    if job == 'earth':
        load_tex(); load_clouds()
        Lg = normalize(np.array([-.85, -.2, .5]))
        sheet = Image.new('RGBA', (128*24, 128))
        for i in range(24): sheet.paste(cel_globe(128, math.radians(18), math.radians(i*15), Lg, math.radians(i*3)), (i*128, 0))
        uri, nb = save('globe_sheet', sheet, 86); out['globe'] = uri
        globals()['LIMB'] = .045
        uri, nb = save('earth_cap', cel_cap(2400, 1500, 420, math.radians(-38), math.radians(70), normalize(np.array([-.3, -.75, .6]))), 86); out['cap'] = uri
        json.dump(out, open(f'{OUT}/earth.json', 'w')); print('earth ok')
