"""Smoke test: open a built game in headless Chromium, play it for a bit, fail on any script error.

Usage:
  npm run build && python3 tools/smoke.py               # tests dist/ over a local server
  npm run build:single && python3 tools/smoke.py single # tests dist-single/index.html from disk
  python3 tools/smoke.py legacy                         # tests tools/legacy-single-file.html (reference)
Screenshots land in tools/shots/ (git-ignored).
"""
import asyncio, functools, http.server, pathlib, sys, threading
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = ROOT / 'tools' / 'shots'
mode = sys.argv[1] if len(sys.argv) > 1 else 'dist'
IGNORE = ('Failed to load resource', 'fonts.g')   # offline font fetches are expected here


def serve(folder):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    h = functools.partial(Quiet, directory=str(folder))
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return f'http://127.0.0.1:{srv.server_address[1]}/index.html'


async def main():
    if mode == 'single': url = (ROOT / 'dist-single' / 'index.html').as_uri()
    elif mode == 'legacy': url = (ROOT / 'tools' / 'legacy-single-file.html').as_uri()
    else: url = serve(ROOT / 'dist')
    SHOTS.mkdir(exist_ok=True)
    errors = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1100, 'height': 720})
        pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        pg.on('console', lambda m: m.type == 'error' and not any(s in m.text for s in IGNORE) and errors.append(f'console: {m.text}'))
        await pg.goto(url)
        if mode == 'legacy':   # the old file relied on its host page for this
            await pg.add_style_tag(content='[hidden]{display:none!important}body{margin:0}')
        stats = []
        for i in range(16):                          # ~8 s of play, answering level-up cards
            await pg.wait_for_timeout(500)
            if await pg.is_visible('#pick'): await pg.keyboard.press(str(1 + i % 3))
            if i == 4: await pg.mouse.click(550, 250)      # cast the selected skill once
        stats.append(await pg.inner_text('#stats'))
        await pg.screenshot(path=str(SHOTS / f'{mode}-line.png'))
        await pg.click('#mapbtn'); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=str(SHOTS / f'{mode}-orbit.png'))
        await pg.click('#mapbtn'); await pg.click('#simbtn'); await pg.wait_for_timeout(3000)
        stats.append(await pg.inner_text('#stats'))
        await pg.screenshot(path=str(SHOTS / f'{mode}-sim.png'))
        for k in 'qwerty':                           # every class, every skill
            await pg.keyboard.press(k)
            for n in range(1, 10):
                await pg.keyboard.press(str(n)); await pg.mouse.click(300 + n*50, 220)
                await pg.wait_for_timeout(60)
        await pg.wait_for_timeout(800)
        await pg.click('#simbtn'); await pg.click('#bagbtn'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(SHOTS / f'{mode}-bag.png'))
        await b.close()
    print(mode, '|', ' || '.join(stats))
    if errors:
        print('\n'.join(errors[:10])); sys.exit(1)
    print('ok, no script errors')

asyncio.run(main())
