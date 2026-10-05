# Momentum: a flick keeps the map gliding and slowing; a drag that stops before lifting doesn't glide; a flick on the sheet glides it away
import asyncio, json, sys, os
from playwright.async_api import async_playwright
PAGE = sys.argv[1] if len(sys.argv) > 1 else '/mnt/user-data/outputs/flx-vcfest-26.html'
HERE = os.path.dirname(os.path.abspath(__file__))
wrap = os.path.join(HERE, 'shots', 'wrapped-mom.html')
open(wrap, 'w').write('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + open(PAGE).read() + '</body></html>')
D3 = open(os.path.join(HERE, 'd3.min.js')).read()
T = "()=>{const t=window._vc.SKY.T;return [Math.round(t.x),Math.round(t.y),+t.k.toFixed(3)]}"
async def touch(cdp, typ, pts):
    await cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': [{'x': x, 'y': y} for x, y in pts]})
async def empty_spot(pg):
    return await pg.evaluate("""()=>{const r=document.getElementById('skyCanvas').getBoundingClientRect();for(let y=r.top+140;y<r.bottom-120;y+=17)for(let x=r.left+40;x<r.right-80;x+=17){const S=window._vc.SKY;const [wx,wy]=S.T.invert([x-r.left,y-r.top]);if(S.nodes.every(n=>Math.hypot(n.x-wx,n.y-wy)*S.T.k>28))return [x,y];}return null}""")
async def main():
    out = {}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        async def route(r):
            if 'd3.min.js' in r.request.url: await r.fulfill(body=D3, content_type='application/javascript')
            else: await r.continue_()
        await pg.route('**/*', route); await pg.goto('file://' + wrap); await pg.wait_for_timeout(2600)
        cdp = await ctx.new_cdp_session(pg)
        x, y = await empty_spot(pg)
        # a quick flick left: 120px in about 80ms, lift while moving
        t0 = await pg.evaluate(T)
        await touch(cdp, 'touchStart', [(x, y)])
        for i in range(1, 7): await touch(cdp, 'touchMove', [(x - i * 30, y)]); await pg.wait_for_timeout(8)
        at_lift = await pg.evaluate(T)
        await touch(cdp, 'touchEnd', []); await pg.wait_for_timeout(120)
        mid = await pg.evaluate(T); await pg.wait_for_timeout(900)
        end = await pg.evaluate(T); await pg.wait_for_timeout(300)
        end2 = await pg.evaluate(T)
        why = await pg.evaluate("()=>window._vc.MOM.why")
        out['flick'] = {'why': why, 'finger_moved': at_lift[0] - t0[0], 'glide_after_lift': end[0] - at_lift[0], 'still_gliding_at_120ms': mid[0] != end[0], 'stopped': end == end2}
        # a drag that rests before lifting: no glide
        x, y = await empty_spot(pg)
        await touch(cdp, 'touchStart', [(x, y)])
        for i in range(1, 7): await touch(cdp, 'touchMove', [(x + i * 15, y)]); await pg.wait_for_timeout(12)
        await pg.wait_for_timeout(200); a = await pg.evaluate(T); await touch(cdp, 'touchEnd', []); await pg.wait_for_timeout(700); b2 = await pg.evaluate(T)
        out['rest_then_lift_glide'] = b2[0] - a[0]
        # the sheet: flick it down fast and it glides away
        await pg.tap('#zFit'); await pg.wait_for_timeout(1000)
        pos = await pg.evaluate("()=>{const S=window._vc.SKY;const n=S.nodes.filter(n=>n.kind==='startup').sort((a,b)=>b.r-a.r)[2];const [x,y]=S.T.apply([n.x,n.y]);const r=document.getElementById('skyCanvas').getBoundingClientRect();return [x+r.left,y+r.top]}")
        await touch(cdp, 'touchStart', [pos]); await pg.wait_for_timeout(800); await touch(cdp, 'touchEnd', []); await pg.wait_for_timeout(900)
        top = await pg.evaluate("()=>Math.round(document.getElementById('sheet').getBoundingClientRect().top)")
        out['sheet_top_before']=top; out['sheet_open_before']=await pg.evaluate("()=>document.getElementById('sheet').classList.contains('show')")
        await touch(cdp, 'touchStart', [(195, top + 30)])
        for k in range(1, 5): await touch(cdp, 'touchMove', [(195, top + 30 + k * 22)]); await pg.wait_for_timeout(10)
        await touch(cdp, 'touchEnd', [])
        tr = await pg.evaluate("t=>[document.getElementById('sheet').style.transition,(document.elementFromPoint(195,t)||{}).className,Math.round(document.getElementById('sheet').getBoundingClientRect().top)]", top + 30)
        await pg.wait_for_timeout(500)
        out['sheet_flick'] = {'transition': tr, 'closed': await pg.evaluate("()=>!document.getElementById('sheet').classList.contains('show')"), 'focus_kept': await pg.evaluate("()=>!!window._vc.SKY.focus")}
        out['errors'] = errs
        await b.close()
    print(json.dumps(out))
asyncio.run(main())
