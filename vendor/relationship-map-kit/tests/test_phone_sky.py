# Phone sky: tap = connections only, hold = details sheet, swipe down or tap the map = sheet slides away, key hidden until asked
import asyncio, json, sys, os
from playwright.async_api import async_playwright
PAGE = sys.argv[1] if len(sys.argv) > 1 else '/mnt/user-data/outputs/flx-vcfest-26.html'
HERE = os.path.dirname(os.path.abspath(__file__))
wrap = os.path.join(HERE, 'shots', 'wrapped-psky.html')
open(wrap, 'w').write('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + open(PAGE).read() + '</body></html>')
D3 = open(os.path.join(HERE, 'd3.min.js')).read()
STATE = "()=>{const S=window._vc.SKY;const sh=document.getElementById('sheet');const r=sh.getBoundingClientRect();return {focus:S.focus&&S.focus.e.name,sheet:sh.classList.contains('show'),sheetTop:Math.round(r.top),vis:getComputedStyle(sh).visibility,legend:getComputedStyle(document.getElementById('skyLegend')).display,ring:getComputedStyle(document.getElementById('skyCanvas')).outlineStyle}}"
async def touch(cdp, typ, pts):
    await cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': [{'x': x, 'y': y} for x, y in pts]})
async def main():
    out = {}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2, color_scheme='dark')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        async def route(r):
            if 'd3.min.js' in r.request.url: await r.fulfill(body=D3, content_type='application/javascript')
            else: await r.continue_()
        await pg.route('**/*', route); await pg.goto('file://' + wrap); await pg.wait_for_timeout(2600)
        cdp = await ctx.new_cdp_session(pg)
        out['start'] = await pg.evaluate(STATE)
        pos = await pg.evaluate("()=>{const S=window._vc.SKY;const n=S.nodes.filter(n=>n.kind==='startup').sort((a,b)=>b.r-a.r)[3];const [x,y]=S.T.apply([n.x,n.y]);const r=document.getElementById('skyCanvas').getBoundingClientRect();return [x+r.left,y+r.top,n.e.name]}")
        await pg.touchscreen.tap(pos[0], pos[1]); await pg.wait_for_timeout(1300)
        out['tap'] = await pg.evaluate(STATE); out['toast'] = await pg.evaluate("()=>document.getElementById('toast').textContent")
        await pg.screenshot(path='shots/psky-1-tap.png')
        # hold the focused star: the details sheet comes up
        pos = await pg.evaluate("()=>{const S=window._vc.SKY;const n=S.focus;const [x,y]=S.T.apply([n.x,n.y]);const r=document.getElementById('skyCanvas').getBoundingClientRect();return [x+r.left,y+r.top]}")
        await touch(cdp, 'touchStart', [pos]); await pg.wait_for_timeout(800); await touch(cdp, 'touchEnd', []); await pg.wait_for_timeout(900)
        out['hold'] = await pg.evaluate(STATE)
        await pg.screenshot(path='shots/psky-2-hold.png')
        # swipe the sheet down from its top edge
        top = out['hold']['sheetTop']
        await touch(cdp, 'touchStart', [(195, top + 30)])
        for k in range(1, 9): await touch(cdp, 'touchMove', [(195, top + 30 + k * 25)]); await pg.wait_for_timeout(16)
        mid = await pg.evaluate("()=>document.getElementById('sheet').style.transform")
        await touch(cdp, 'touchEnd', []); await pg.wait_for_timeout(500)
        out['swipe'] = dict(await pg.evaluate(STATE), mid_drag=mid)
        await pg.screenshot(path='shots/psky-3-swiped.png')
        # a small swipe snaps back
        pos = await pg.evaluate("()=>{const S=window._vc.SKY;const n=S.focus;const [x,y]=S.T.apply([n.x,n.y]);const r=document.getElementById('skyCanvas').getBoundingClientRect();return [x+r.left,y+r.top]}")
        await pg.touchscreen.tap(pos[0], pos[1]); await pg.wait_for_timeout(1400)
        out['tap_again'] = await pg.evaluate(STATE)
        top = out['tap_again']['sheetTop']
        await touch(cdp, 'touchStart', [(195, top + 30)])
        for k in range(1, 4): await touch(cdp, 'touchMove', [(195, top + 30 + k * 12)]); await pg.wait_for_timeout(60)
        await pg.wait_for_timeout(300); await touch(cdp, 'touchEnd', []); await pg.wait_for_timeout(500)
        out['small_swipe'] = await pg.evaluate(STATE)
        # tap the open map: the sheet goes, the connections stay; tap again: everything clears
        await pg.touchscreen.tap(30, 300); await pg.wait_for_timeout(500)
        out['tap_out_1'] = await pg.evaluate(STATE)
        await pg.touchscreen.tap(30, 300); await pg.wait_for_timeout(500)
        out['tap_out_2'] = await pg.evaluate(STATE)
        # the key
        await pg.tap('#zKey'); await pg.wait_for_timeout(200)
        out['key_on'] = await pg.evaluate("()=>[getComputedStyle(document.getElementById('skyLegend')).display,document.getElementById('zKey').getAttribute('aria-pressed')]")
        await pg.screenshot(path='shots/psky-4-key.png')
        out['errors'] = errs
        await b.close()
    print(json.dumps(out, indent=1))
asyncio.run(main())
