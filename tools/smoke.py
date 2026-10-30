"""Smoke test: open a built game in headless Chromium, play it for a bit, fail on any script error.

Usage:
  npm run build && python3 tools/smoke.py               # fortress mode (index.html) from dist/
  npm run build:single && python3 tools/smoke.py single # fortress mode from dist-single/index.html, opened from disk
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
    return f'http://127.0.0.1:{srv.server_address[1]}/'


def watch(pg, errors):
    pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    pg.on('console', lambda m: m.type == 'error' and not any(s in m.text for s in IGNORE) and errors.append(f'console: {m.text}'))


async def fortress(b, url, tag, errors):
    """Phone-sized run: first card by hand, then auto-picked cards at 4x until wave 6, pause sheet, a boss wave."""
    ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg = await ctx.new_page(); watch(pg, errors)
    await pg.goto(url)
    for _ in range(60):
        await pg.wait_for_timeout(250)
        if await pg.is_visible('#pick'):
            await pg.screenshot(path=str(SHOTS / f'{tag}-pick.png')); await pg.locator('.card').first.tap(); break
    await pg.goto(url + ('&' if '?' in url else '?') + 'auto=1&speed=4')
    for _ in range(80):
        await pg.wait_for_timeout(250)
        if await pg.evaluate('__td.G.wave') >= 6: break
    await pg.screenshot(path=str(SHOTS / f'{tag}-play.png'))
    await pg.locator('#pausebtn').tap(); await pg.wait_for_timeout(200)
    await pg.screenshot(path=str(SHOTS / f'{tag}-pause.png'))
    state = await pg.evaluate('({ wave:__td.G.wave, kills:__td.G.kills, turrets:__td.turrets.map(t => t.type).join(",") })')
    await pg.goto(url + ('&' if '?' in url else '?') + 'auto=1&speed=4&wave=10')
    await pg.wait_for_timeout(6000)
    await pg.screenshot(path=str(SHOTS / f'{tag}-boss.png'))
    await ctx.close()
    return f'fortress {state}'


async def main():
    SHOTS.mkdir(exist_ok=True)
    errors, out = [], []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        if mode == 'single': out.append(await fortress(b, (ROOT / 'dist-single' / 'index.html').as_uri(), 'single', errors))
        else:
            base = serve(ROOT / 'dist')
            out.append(await fortress(b, base + 'index.html', 'dist', errors))
        await b.close()
    print('\n'.join(out))
    if errors:
        print('\n'.join(errors[:10])); sys.exit(1)
    print('ok, no script errors')

asyncio.run(main())
