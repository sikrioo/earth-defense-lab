"""Offline asset baker: realistic asteroids (ray-marched displaced spheres) + NASA Blue Marble Earth.
Outputs WebP files into out_assets/."""
import numpy as np, os, io, base64, json, math
from PIL import Image

OUT = 'out_assets'; os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

# ---------------- 3D value noise ----------------
class Noise3:
    def __init__(self, seed):
        r = np.random.default_rng(seed)
        self.p = r.permutation(256); self.p = np.concatenate([self.p, self.p])
        self.v = r.random(256)
    def _h(self, x, y, z):
        return self.v[self.p[self.p[self.p[x & 255] + (y & 255)] + (z & 255)]]
    def __call__(self, x, y, z):
        xi, yi, zi = np.floor(x).astype(int), np.floor(y).astype(int), np.floor(z).astype(int)
        xf, yf, zf = x - xi, y - yi, z - zi
        u, v, w = [t*t*(3 - 2*t) for t in (xf, yf, zf)]
        c = lambda a, b, d: self._h(xi + a, yi + b, zi + d)
        x00 = c(0,0,0)*(1-u) + c(1,0,0)*u; x10 = c(0,1,0)*(1-u) + c(1,1,0)*u
        x01 = c(0,0,1)*(1-u) + c(1,0,1)*u; x11 = c(0,1,1)*(1-u) + c(1,1,1)*u
        return (x00*(1-v) + x10*v)*(1-w) + (x01*(1-v) + x11*v)*w
    def fbm(self, x, y, z, oct=5, lac=2.0, gain=.5):
        s, a, f, n = 0, 1, 1, 0
        for _ in range(oct):
            s += a*self(x*f, y*f, z*f); n += a; a *= gain; f *= lac
        return s/n

def normalize(v): return v/np.linalg.norm(v, axis=-1, keepdims=True)

# ---------------- asteroid ----------------
def make_asteroid(seed, size=176, style='rock', lumpy=.22, craters=14, elong=(1.0, .85, .9)):
    N = Noise3(seed); N2 = Noise3(seed + 99)
    r = np.random.default_rng(seed)
    cr_dirs = normalize(r.normal(size=(craters, 3))); cr_rad = r.uniform(.12, .38, craters); cr_dep = r.uniform(.04, .09, craters)
    ex, ey, ez = elong
    def height(d):  # d: unit directions (..., 3)
        h = (N.fbm(d[...,0]*1.6 + 3, d[...,1]*1.6, d[...,2]*1.6, 4) - .5)*2*lumpy
        h += (N2.fbm(d[...,0]*6, d[...,1]*6, d[...,2]*6, 3) - .5)*.05
        for i in range(craters):
            ang = np.arccos(np.clip((d*cr_dirs[i]).sum(-1), -1, 1))
            t = ang/cr_rad[i]
            bowl = np.where(t < 1, -cr_dep[i]*(1 - t*t), 0)
            rim = np.where((t > .8) & (t < 1.35), cr_dep[i]*.45*np.exp(-((t - 1.02)/.15)**2), 0)
            h += bowl + rim
        return h
    def F(p):  # signed-ish distance proxy; scale to ellipsoid
        q = p/np.array([ex, ey, ez])
        rr = np.linalg.norm(q, axis=-1)
        return rr - (.72 + height(q/np.maximum(rr[...,None], 1e-6)))
    S = 2  # supersample
    n = size*S
    ys, xs = np.mgrid[0:n, 0:n]
    px = (xs + .5)/n*2 - 1; py = (ys + .5)/n*2 - 1
    px = px*1.08; py = py*1.08
    hit = np.zeros((n, n), bool); depth = np.full((n, n), -2.0)
    zs = np.linspace(1.3, -1.3, 90)
    prev = None
    for z in zs:
        m = ~hit
        if not m.any(): break
        p = np.stack([px[m], py[m], np.full(m.sum(), z)], -1)
        f = F(p)
        inside = f < 0
        idx = np.flatnonzero(m.ravel())[inside]
        hit.ravel()[idx] = True; depth.ravel()[idx] = z
    # refine depth by bisection
    m = hit
    zhi = depth[m] + (zs[0] - zs[1]); zlo = depth[m]
    pxm, pym = px[m], py[m]
    for _ in range(8):
        zm = (zhi + zlo)/2
        f = F(np.stack([pxm, pym, zm], -1))
        inside = f < 0
        zlo = np.where(inside, zm, zlo); zhi = np.where(inside, zhi, zm)
    P = np.stack([pxm, pym, (zhi + zlo)/2], -1)
    e = 2e-3
    g = np.stack([F(P + np.array([e,0,0])) - F(P - np.array([e,0,0])),
                  F(P + np.array([0,e,0])) - F(P - np.array([0,e,0])),
                  F(P + np.array([0,0,e])) - F(P - np.array([0,0,e]))], -1)
    nrm = normalize(g)
    L = normalize(np.array([-.55, -.62, .56]))
    diff = np.clip((nrm*L).sum(-1), 0, 1)
    d = normalize(P)
    alb = .78 + .45*(N2.fbm(d[...,0]*3, d[...,1]*3, d[...,2]*3, 4) - .5) + .15*(N.fbm(d[...,0]*12, d[...,1]*12, d[...,2]*12, 2) - .5)
    styles = {
        'rock':   (np.array([.56, .50, .44]), .09),
        'dark':   (np.array([.34, .36, .33]), .08),
        'basalt': (np.array([.46, .46, .50]), .08),
        'iron':   (np.array([.62, .40, .28]), .09),
        'ice':    (np.array([.70, .82, .95]), .14),
        'lava':   (np.array([.30, .24, .22]), .07),
        'rose':   (np.array([.62, .44, .46]), .09),
        'green':  (np.array([.40, .52, .42]), .08),
    }
    base, amb = styles[style]
    col = base[None,:]*alb[:,None]*(amb + diff[:,None]*1.05)
    # subtle bounce light from the lower right
    col += base[None,:]*.12*np.clip((nrm*normalize(np.array([.6,.7,.2]))).sum(-1), 0, 1)[:,None]
    if style == 'ice':
        H = normalize(L + np.array([0,0,1.]))
        spec = np.clip((nrm*H).sum(-1), 0, 1)**28
        col += spec[:,None]*.55
    if style in ('lava',):
        cr = N2.fbm(d[...,0]*4.5 + 9, d[...,1]*4.5, d[...,2]*4.5, 4)
        crack = np.clip(1 - np.abs(cr - .5)*36, 0, 1)**1.5
        col += crack[:,None]*np.array([1.0, .45, .12])[None,:]*1.4
        col += crack[:,None]*np.array([1.0, .85, .5])[None,:]*.35*(crack[:,None] > .7)
    if style == 'iron':
        H = normalize(L + np.array([0,0,1.]))
        col += (np.clip((nrm*H).sum(-1), 0, 1)**16)[:,None]*.25
    img = np.zeros((n, n, 4))
    img[m, :3] = np.clip(col, 0, 1)**(1/1.15)
    img[m, 3] = 1
    im = Image.fromarray((img*255).astype(np.uint8), 'RGBA').resize((size, size), Image.LANCZOS)
    bb = im.getbbox(); im = im.crop(bb)
    return im

# ---------------- Earth ----------------
BM = None
def load_tex():
    global BM, NL
    BM = np.asarray(Image.open('dl_globe/package/example/img/earth-blue-marble.jpg').convert('RGB').resize((2048, 1024), Image.LANCZOS)).astype(np.float32)/255
    NL = np.asarray(Image.open('dl_globe/package/example/img/earth-night.jpg').convert('RGB').resize((2048, 1024), Image.LANCZOS)).astype(np.float32)/255
def sample(tex, lat, lon):
    h, w, _ = tex.shape
    u = ((lon/(2*np.pi)) % 1)*(w - 1); v = np.clip((.5 - lat/np.pi), 0, 1)*(h - 1)
    x0 = np.floor(u).astype(int); y0 = np.floor(v).astype(int); x1 = (x0 + 1) % w; y1 = np.minimum(y0 + 1, h - 1)
    fx = (u - x0)[...,None]; fy = (v - y0)[...,None]
    return (tex[y0,x0]*(1-fx) + tex[y0,x1]*fx)*(1-fy) + (tex[y1,x0]*(1-fx) + tex[y1,x1]*fx)*fy
def rotx(a): c, s = math.cos(a), math.sin(a); return np.array([[1,0,0],[0,c,-s],[0,s,c]])
def roty(a): c, s = math.cos(a), math.sin(a); return np.array([[c,0,s],[0,1,0],[-s,0,c]])
def globe_pixels(nx, ny, view_lat, view_lon, light):
    nz = np.sqrt(np.clip(1 - nx*nx - ny*ny, 0, 1))
    v = np.stack([nx, -ny, nz], -1)  # screen y down → up
    M = roty(view_lon) @ rotx(-view_lat)
    w = v @ M.T
    lat = np.arcsin(np.clip(w[...,1], -1, 1)); lon = np.arctan2(w[...,0], w[...,2])
    day = sample(BM, lat, lon); night = sample(NL, lat, lon)
    lam = (np.stack([nx, ny, nz], -1)*light).sum(-1)
    k = np.clip(lam*1.6 + .15, 0, 1)[...,None]
    col = day*(.12 + .95*k) + night*np.array([1, .85, .6])*(1 - k)**2*.9
    # limb darkening + atmospheric scatter toward the edge
    edge = (1 - nz)[...,None]
    col = col*(1 - .35*edge**3) + np.array([.35, .6, 1.0])*(edge**2.2)*.55*np.clip(k + .2, 0, 1)
    return np.clip(col, 0, 1)

def make_globe(size, view_lat, view_lon, light):
    S = 2; n = size*S
    ys, xs = np.mgrid[0:n, 0:n]
    nx = (xs + .5)/n*2 - 1; ny = (ys + .5)/n*2 - 1
    r2 = nx*nx + ny*ny; m = r2 <= 1
    col = np.zeros((n, n, 4)); col[m, :3] = globe_pixels(nx[m], ny[m], view_lat, view_lon, light); col[m, 3] = 1
    return Image.fromarray((col*255).astype(np.uint8), 'RGBA').resize((size, size), Image.LANCZOS)

def make_cap(width, Rpx, capH, view_lat, view_lon, light):
    """Top slice of a huge globe: width px wide, sphere radius Rpx, visible height capH (+ margin)."""
    S = 2; W_, H_ = width*S, capH*S; R = Rpx*S
    ys, xs = np.mgrid[0:H_, 0:W_]
    nx = (xs + .5 - W_/2)/R; ny = (ys + .5 - R)/R      # sphere centre at (W/2, R) → top edge at y=0
    m = nx*nx + ny*ny <= 1
    col = np.zeros((H_, W_, 4)); col[m, :3] = globe_pixels(nx[m], ny[m], view_lat, view_lon, light); col[m, 3] = 1
    return Image.fromarray((col*255).astype(np.uint8), 'RGBA').resize((width, capH), Image.LANCZOS)

def starfield(w, h, seed=3):
    r = np.random.default_rng(seed); N = Noise3(seed)
    ys, xs = np.mgrid[0:h, 0:w]
    neb = N.fbm(xs/260., ys/260., np.full(xs.shape, .5), 5)
    neb2 = N.fbm(xs/120. + 40, ys/120., np.full(xs.shape, 1.5), 4)
    a = np.clip((neb - .48)*3.2, 0, 1)**1.6
    img = np.zeros((h, w, 3))
    img += a[...,None]*np.array([.20, .10, .34])*.9 + (np.clip((neb2 - .55)*3, 0, 1)**2)[...,None]*np.array([.05, .12, .22])
    img += np.array([.008, .008, .016])
    for _ in range(int(w*h/900)):
        x, y = r.integers(0, w), r.integers(0, h); b = r.random()**3*.9 + .1
        c = np.array([1, 1, 1]) if r.random() < .7 else (np.array([.75, .85, 1]) if r.random() < .5 else np.array([1, .9, .75]))
        img[y, x] += c*b
        if b > .75 and 1 <= x < w - 1 and 1 <= y < h - 1:
            img[y-1:y+2, x] += c*b*.35; img[y, x-1:x+2] += c*b*.35
    return Image.fromarray((np.clip(img, 0, 1)*255).astype(np.uint8), 'RGB')

if __name__ == '__main__':
    load_tex()
    out = {}
    def save(name, im, q=86, lossless=False):
        b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6, lossless=lossless); d = b.getvalue()
        open(f'{OUT}/{name}.webp', 'wb').write(d)
        return 'data:image/webp;base64,' + base64.b64encode(d).decode(), len(d)
    total = 0
    # asteroids per enemy type: style, size scale, lumpiness, elongation
    spec = {
        'normal': ('rose',   176, .22, (1.0, .86, .92)),
        'runner': ('green',  140, .30, (1.15, .7, .8)),
        'brute':  ('basalt', 200, .16, (1.0, .95, .95)),
        'meteor': ('rock',   190, .26, (1.1, .82, .9)),
        'elite':  ('ice',    190, .2,  (1.0, .9, .9)),
        'boss':   ('lava',   260, .18, (1.0, .92, .95)),
    }
    for t, (style, size, lump, el) in spec.items():
        out[t] = []
        for v in range(3):
            im = make_asteroid(100 + sum(map(ord, t))*7 + v*17, size, style, lump, 12 + v*3, el)
            uri, nb = save(f'{t}_{v}', im, 88); out[t].append(uri); total += nb
            print(t, v, im.size, nb)
    # orbit globe: 24 rotation frames, sun from the left
    frames = []
    for i in range(24):
        im = make_globe(128, math.radians(18), math.radians(i*15), np.array(normalize(np.array([-.85, -.2, .5]))))
        frames.append(im)
    sheet = Image.new('RGBA', (128*24, 128))
    for i, f in enumerate(frames): sheet.paste(f, (i*128, 0))
    uri, nb = save('globe_sheet', sheet, 85); out['globe'] = uri; total += nb; print('globe', nb)
    cap = make_cap(2400, 1500, 420, math.radians(-38), math.radians(70), np.array(normalize(np.array([-.3, -.75, .6]))))
    uri, nb = save('earth_cap', cap, 84); out['cap'] = uri; total += nb; print('cap', nb)
    sf = starfield(1280, 800)
    b = io.BytesIO(); sf.save(b, 'WEBP', quality=80, method=6); d = b.getvalue(); open(f'{OUT}/stars.webp', 'wb').write(d)
    out['stars'] = 'data:image/webp;base64,' + base64.b64encode(d).decode(); total += len(d); print('stars', len(d))
    json.dump(out, open(f'{OUT}/assets.json', 'w'))
    print('TOTAL', total)
