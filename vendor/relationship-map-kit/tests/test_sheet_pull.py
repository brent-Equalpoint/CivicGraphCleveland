"""Phone details sheet: opens part way, pulls up to a quarter from the top of the screen, follows the finger,
glides with momentum, the map moves with it so the picked star stays in view, and it still swipes away.
usage: python3 test_sheet_pull.py SITE_DIR"""
import asyncio, json, os, subprocess, sys, time
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = sys.argv[1]

async def touch(cdp, typ, pts):
    await cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': [{'x': x, 'y': y} for x, y in pts]})

async def drag(pg, cdp, x, y, dy, steps=12, gap=16, hold_end=0):
    await touch(cdp, 'touchStart', [(x, y)])
    for k in range(1, steps + 1):
        await touch(cdp, 'touchMove', [(x, y + dy * k / steps)]); await pg.wait_for_timeout(gap)
    if hold_end: await pg.wait_for_timeout(hold_end)
    await touch(cdp, 'touchEnd', [])

STATE = """()=>{const sh=document.getElementById('sheet'),r=sh.getBoundingClientRect(),S=window._vc.SKY,n=S.focus;
  const sky=document.getElementById('sky').getBoundingClientRect();let ny=null;if(n){ny=Math.round(S.T.apply([n.x,n.y])[1]+sky.top);}
  return {show:sh.classList.contains('show'),top:Math.round(r.top),h:Math.round(r.height),node_y:ny,sky_top:Math.round(sky.top),
    solo_op:getComputedStyle(document.getElementById('soloBar')).opacity,body_overflow:getComputedStyle(sh.querySelector('.sh-body')).overflowY,
    body_scroll:Math.round(sh.querySelector('.sh-body').scrollTop),focus:n&&n.e.name}}"""

async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8769', '--bind', '127.0.0.1'], cwd=SITE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.0)
    URL = 'http://localhost:8769/'
    out = {}
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            async def block(r):
                if r.request.url.startswith('http://localhost'): await r.continue_()
                else: await r.abort()
            for vp in ({'width': 390, 'height': 844}, {'width': 375, 'height': 667}):
                ctx = await b.new_context(viewport=vp, is_mobile=True, has_touch=True, device_scale_factor=2)
                pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.route('**/*', block); await pg.goto(URL); await pg.wait_for_timeout(2500)
                cdp = await ctx.new_cdp_session(pg)
                r = {}
                # tap a star, then tap it again: the details sheet opens part way
                pos = await pg.evaluate("()=>{const S=window._vc.SKY;const n=S.nodes.filter(n=>n.kind==='startup').sort((a,b)=>b.r-a.r)[3];const [x,y]=S.T.apply([n.x,n.y]);const r=document.getElementById('skyCanvas').getBoundingClientRect();return [x+r.left,y+r.top]}")
                await pg.touchscreen.tap(pos[0], pos[1]); await pg.wait_for_timeout(1300)
                pos = await pg.evaluate("()=>{const S=window._vc.SKY;const n=S.focus;const [x,y]=S.T.apply([n.x,n.y]);const r=document.getElementById('skyCanvas').getBoundingClientRect();return [x+r.left,y+r.top]}")
                await pg.touchscreen.tap(pos[0], pos[1]); await pg.wait_for_timeout(1400)
                r['peek'] = await pg.evaluate(STATE)
                await pg.screenshot(path=os.path.join(HERE, 'shots', f'pull-{vp["height"]}-peek.png'))
                # pull it up slowly from the top, check halfway that the map is moving with it
                x = vp['width'] * 0.3; y0 = r['peek']['top'] + 30
                await touch(cdp, 'touchStart', [(x, y0)])
                for k in range(1, 7):
                    await touch(cdp, 'touchMove', [(x, y0 - 25 * k)]); await pg.wait_for_timeout(20)
                r['mid'] = await pg.evaluate(STATE)
                for k in range(7, 17):
                    await touch(cdp, 'touchMove', [(x, y0 - 25 * k)]); await pg.wait_for_timeout(20)
                await pg.wait_for_timeout(150); await touch(cdp, 'touchEnd', []); await pg.wait_for_timeout(700)
                r['full'] = await pg.evaluate(STATE)
                r['full_top_is_quarter'] = abs(r['full']['top'] - max(vp['height'] * .25, r['full']['sky_top'] + 88)) <= 2
                r['node_visible_at_full'] = r['full']['node_y'] is not None and r['full']['sky_top'] <= r['full']['node_y'] <= r['full']['top']
                r['map_moved_with_sheet'] = r['mid']['node_y'] < r['peek']['node_y'] and r['full']['node_y'] < r['mid']['node_y']
                await pg.screenshot(path=os.path.join(HERE, 'shots', f'pull-{vp["height"]}-full.png'))
                # at the top, swiping up inside the text scrolls the text, not the sheet
                await drag(pg, cdp, x, r['full']['top'] + 300, -180, steps=8)
                await pg.wait_for_timeout(500)
                r['scroll_at_full'] = await pg.evaluate(STATE)
                await pg.wait_for_timeout(900)
                await pg.evaluate("document.querySelector('#sheet .sh-body').scrollTop=0"); await pg.wait_for_timeout(400)
                r['push_target'] = await pg.evaluate(f"(()=>{{const e=document.elementFromPoint({x},{r['full']['top']+30});return e&&(e.closest('.sh-top')?'top':e.closest('.sh-body')?'body':e.className)}})()")
                # a small push down from the top edge settles back to part way
                await drag(pg, cdp, x, r['full']['top'] + 30, 200, steps=10, gap=24, hold_end=150)
                await pg.wait_for_timeout(700)
                r['back_to_peek'] = await pg.evaluate(STATE)
                # a quick flick up glides it to the top with momentum
                await drag(pg, cdp, x, r['back_to_peek']['top'] + 30, -90, steps=4, gap=10)
                await pg.wait_for_timeout(60)
                r['flick_mid'] = await pg.evaluate(STATE)
                await pg.wait_for_timeout(700)
                r['flick_up'] = await pg.evaluate(STATE)
                # tapping the top edge toggles between part way and the top
                await pg.touchscreen.tap(vp['width'] * 0.3, r['flick_up']['top'] + 28); await pg.wait_for_timeout(700)
                r['tap_toggle'] = await pg.evaluate(STATE)
                # a flick down closes it, and the star stays picked
                await drag(pg, cdp, x, r['tap_toggle']['top'] + 30, 220, steps=5, gap=10)
                await pg.wait_for_timeout(600)
                r['flick_down'] = await pg.evaluate(STATE)
                r['chrome_back'] = r['flick_down']['solo_op'] == '1'
                r['errors'] = errs
                out[f'{vp["width"]}x{vp["height"]}'] = r
                await ctx.close()
            # desktop: the right drawer is untouched
            ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
            pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.route('**/*', block); await pg.goto(URL); await pg.wait_for_timeout(2200)
            await pg.evaluate("()=>{const S=window._vc.SKY;window._vc.skyFocus(S.nodes.filter(n=>n.kind==='startup')[5]);}"); await pg.wait_for_timeout(900)
            out['desktop'] = await pg.evaluate("()=>{const sh=document.getElementById('sheet');const r=sh.getBoundingClientRect();return {show:sh.classList.contains('show'),w:Math.round(r.width),h:Math.round(r.height),inline_h:sh.style.height}}")
            out['desktop']['errors'] = errs
            await ctx.close(); await b.close()
    finally:
        srv.terminate()
    print(json.dumps(out, indent=1))

asyncio.run(main())
