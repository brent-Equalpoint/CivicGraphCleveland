"""Every sliding screen can be left easily on a phone: Done, tap outside, swipe down, and the phone's back gesture.
Also checks that the switches in the accessibility screen show the chosen option the first time it opens.
usage: python3 test_exits.py SITE_DIR   (an unlocked site folder with index.html)"""
import asyncio, json, os, subprocess, sys, time
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = sys.argv[1]
os.makedirs(os.path.join(HERE, 'shots'), exist_ok=True)

async def touch(cdp, typ, pts):
    await cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': [{'x': x, 'y': y} for x, y in pts]})

async def swipe_down(pg, cdp, x, y, dist=260, steps=8):
    await touch(cdp, 'touchStart', [(x, y)])
    for k in range(1, steps + 1):
        await touch(cdp, 'touchMove', [(x, y + dist * k / steps)]); await pg.wait_for_timeout(16)
    await touch(cdp, 'touchEnd', []); await pg.wait_for_timeout(700)

SEGS = """()=>[...document.querySelectorAll('#accessPane .seg')].map(s=>{const b=s.querySelector('[aria-checked=true]');const t=s.querySelector('.thumb');
  if(!b||!t)return {ok:false,why:'missing'};const r=b.getBoundingClientRect(),q=t.getBoundingClientRect();
  return {label:b.textContent,ok:Math.abs(r.left-q.left)<1.5&&Math.abs(r.top-q.top)<1.5&&Math.abs(r.width-q.width)<1.5&&q.width>0&&getComputedStyle(t).opacity==='1'}})"""

async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8766', '--bind', '127.0.0.1'], cwd=SITE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.0)
    URL = 'http://localhost:8766/'
    res = {}
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            async def block(r):
                if r.request.url.startswith('http://localhost'): await r.continue_()
                else: await r.abort()
            # ---------- phone ----------
            ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2)
            pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.route('**/*', block)
            await pg.goto(URL); await pg.wait_for_timeout(2500)
            cdp = await ctx.new_cdp_session(pg)
            ph = {}
            is_open = "()=>document.getElementById('skyPanel').classList.contains('open')"
            vis = "()=>{const r=document.getElementById('skyPanel').getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),vis:getComputedStyle(document.getElementById('skyPanel')).visibility}}"
            # Filters on the map: Done
            await pg.tap('#panelOpen'); await pg.wait_for_timeout(600)
            ph['panel_open'] = {'open': await pg.evaluate(is_open), 'box': await pg.evaluate(vis), 'done_visible': await pg.is_visible('#skyPanel [data-panel-close]'),
                'inside_screen': await pg.evaluate("document.getElementById('skyPanel').getBoundingClientRect().bottom<=innerHeight+1"),
                'covers_tabs': await pg.evaluate("(()=>{const t=document.querySelector('.tabbar').getBoundingClientRect();const e=document.elementFromPoint(40,t.top+t.height/2);return !!(e&&e.closest('#skyPanel,#panelScrim'))})()"),
                'covers_header': await pg.evaluate("(()=>{const e=document.elementFromPoint(300,30);return !!(e&&e.closest('#skyPanel,#panelScrim'))})()")}
            await pg.screenshot(path=os.path.join(HERE, 'shots', 'exits-phone-filters.png'))
            await pg.tap('#skyPanel [data-panel-close]'); await pg.wait_for_timeout(600)
            ph['panel_done'] = not await pg.evaluate(is_open)
            ph['panel_hidden_after'] = await pg.evaluate(vis)
            # tap outside
            await pg.tap('#panelOpen'); await pg.wait_for_timeout(600)
            await pg.touchscreen.tap(195, 90); await pg.wait_for_timeout(600)
            ph['panel_tap_outside'] = not await pg.evaluate(is_open)
            # swipe down on its header
            await pg.tap('#panelOpen'); await pg.wait_for_timeout(600)
            hb = await pg.evaluate("()=>{const r=document.querySelector('#skyPanel .pn-top').getBoundingClientRect();return [r.left+80,r.top+20]}")
            await swipe_down(pg, cdp, hb[0], hb[1])
            ph['panel_swipe'] = not await pg.evaluate(is_open)
            # phone back gesture
            await pg.tap('#panelOpen'); await pg.wait_for_timeout(600)
            await pg.go_back(); await pg.wait_for_timeout(700)
            ph['panel_back'] = {'closed': not await pg.evaluate(is_open), 'still_here': await pg.evaluate("location.href"), 'app': await pg.evaluate("!!window._vc")}
            # the sheet now sits over the tabs; if the page switches tab by itself (a link inside a profile), it closes
            await pg.tap('#panelOpen'); await pg.wait_for_timeout(500)
            await pg.evaluate("window._vc.setView('people')"); await pg.wait_for_timeout(700)
            ph['panel_closed_on_tab_switch'] = not await pg.evaluate(is_open)
            # People filters
            for k, view in (('pd', 'people'), ('ag', 'agenda')):
                await pg.tap(f'.tabbar [data-view="{view}"]'); await pg.wait_for_timeout(700)
                ro = f"()=>document.getElementById('{k}Rail').classList.contains('open')"
                r = {}
                await pg.tap(f'#{k}Fbtn'); await pg.wait_for_timeout(600)
                r['open'] = await pg.evaluate(ro); r['done_visible'] = await pg.is_visible(f'#{k}Rail [data-rail-close]')
                await pg.screenshot(path=os.path.join(HERE, 'shots', f'exits-phone-{view}.png'))
                await pg.tap(f'#{k}Rail [data-rail-close]'); await pg.wait_for_timeout(600); r['done'] = not await pg.evaluate(ro)
                await pg.tap(f'#{k}Fbtn'); await pg.wait_for_timeout(600)
                await pg.touchscreen.tap(195, 90); await pg.wait_for_timeout(600); r['tap_outside'] = not await pg.evaluate(ro)
                await pg.tap(f'#{k}Fbtn'); await pg.wait_for_timeout(600)
                hb = await pg.evaluate(f"()=>{{const r=document.querySelector('#{k}Rail .rail-top').getBoundingClientRect();return [r.left+60,r.top+18]}}")
                await swipe_down(pg, cdp, hb[0], hb[1]); r['swipe'] = not await pg.evaluate(ro)
                await pg.tap(f'#{k}Fbtn'); await pg.wait_for_timeout(600)
                await pg.go_back(); await pg.wait_for_timeout(700); r['back'] = not await pg.evaluate(ro)
                r['still_here'] = await pg.evaluate("!!window._vc")
                ph[view] = r
            # accessibility screen: switches right the first time
            await pg.tap('#menuBtn'); await pg.wait_for_timeout(300); await pg.tap('#topMenu [data-open="access"]'); await pg.wait_for_timeout(900)
            ph['access_switches'] = await pg.evaluate(SEGS)
            await pg.screenshot(path=os.path.join(HERE, 'shots', 'exits-phone-access.png'))
            await pg.go_back(); await pg.wait_for_timeout(600)
            ph['access_back'] = not await pg.evaluate("document.getElementById('accessDlg').open")
            # large text, then open again
            await pg.evaluate("localStorage.setItem('x','1')")
            await pg.tap('#menuBtn'); await pg.wait_for_timeout(300); await pg.tap('#topMenu [data-open="access"]'); await pg.wait_for_timeout(700)
            await pg.tap('#accessPane [data-k="text"][data-v="1.3"]'); await pg.wait_for_timeout(500)
            await pg.tap('#accessPane [data-close]'); await pg.wait_for_timeout(500)
            await pg.tap('#menuBtn'); await pg.wait_for_timeout(300); await pg.tap('#topMenu [data-open="access"]'); await pg.wait_for_timeout(900)
            ph['access_switches_large_text'] = await pg.evaluate(SEGS)
            await pg.screenshot(path=os.path.join(HERE, 'shots', 'exits-phone-access-large.png'))
            await pg.tap('#accessPane [data-k="text"][data-v="1"]'); await pg.wait_for_timeout(400)
            await pg.tap('#accessPane [data-close]'); await pg.wait_for_timeout(600)
            ph['access_closed_x'] = not await pg.evaluate("document.getElementById('accessDlg').open")
            for sel, dlg, name in (('#topMenu [data-open="about"]', 'aboutDlg', 'about'), ('#topMenu [data-dict]', 'dictDlg', 'dict')):
                await pg.tap('#menuBtn'); await pg.wait_for_timeout(300); await pg.tap(sel); await pg.wait_for_timeout(800)
                await pg.screenshot(path=os.path.join(HERE, 'shots', f'exits-phone-{name}.png'))
                await pg.tap(f'#{dlg} [data-close]'); await pg.wait_for_timeout(600)
                ph[f'{name}_done'] = not await pg.evaluate(f"document.getElementById('{dlg}').open")
            # a profile: back goes to the last profile, then closes
            await pg.tap('.tabbar [data-view="people"]'); await pg.wait_for_timeout(500)
            ids = await pg.evaluate("[window._vc.D.companies[0].id, window._vc.D.funds[0].id]")
            await pg.evaluate(f"window._vc.openStory('{ids[0]}')"); await pg.wait_for_timeout(700)
            await pg.evaluate(f"window._vc.openStory('{ids[1]}')"); await pg.wait_for_timeout(700)
            t1 = await pg.evaluate("document.getElementById('pfTitle')&&document.getElementById('pfTitle').textContent")
            await pg.go_back(); await pg.wait_for_timeout(900)
            t2 = await pg.evaluate("document.getElementById('story').open&&document.getElementById('pfTitle').textContent")
            await pg.go_back(); await pg.wait_for_timeout(900)
            ph['profile_back'] = {'second': t1, 'after_back': t2, 'closed_after_second_back': not await pg.evaluate("document.getElementById('story').open"), 'still_here': await pg.evaluate("!!window._vc")}
            # solo list on the map: swipe down
            await pg.tap('.tabbar [data-view="network"]'); await pg.wait_for_timeout(700)
            await pg.tap('#soloTrig'); await pg.wait_for_timeout(700)
            so = "()=>!document.getElementById('soloPop').hidden"
            s1 = await pg.evaluate(so)
            hb = await pg.evaluate("()=>{const r=document.getElementById('soloPop').getBoundingClientRect();return [r.left+195,r.top+6]}")
            await swipe_down(pg, cdp, hb[0], hb[1]); await pg.wait_for_timeout(300)
            ph['solo_swipe'] = {'was_open': s1, 'closed': not await pg.evaluate(so)}
            await pg.tap('#soloTrig'); await pg.wait_for_timeout(600)
            await pg.go_back(); await pg.wait_for_timeout(700)
            ph['solo_back'] = not await pg.evaluate(so)
            # nothing left open, and a final back press isn't swallowed: history is clean
            ph['history_len'] = await pg.evaluate("history.length")
            ph['errors'] = errs
            res['phone'] = ph
            await ctx.close()
            # ---------- desktop ----------
            ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
            pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.route('**/*', block)
            await pg.goto(URL); await pg.wait_for_timeout(2200)
            dk = {'panel_visible': await pg.is_visible('#skyPanel'), 'pn_top_hidden': not await pg.is_visible('#skyPanel .pn-top'),
                  'motion_switch': await pg.evaluate("(()=>{const s=document.querySelector('#skyPanel .seg');const b=s.querySelector('[aria-checked=true]');const t=s.querySelector('.thumb');const r=b.getBoundingClientRect(),q=t.getBoundingClientRect();return Math.abs(r.left-q.left)<1.5&&Math.abs(r.width-q.width)<1.5})()")}
            await pg.click('.side [data-open="access"]'); await pg.wait_for_timeout(900)
            dk['access_switches'] = await pg.evaluate(SEGS)
            await pg.go_back(); await pg.wait_for_timeout(500)
            dk['access_back'] = not await pg.evaluate("document.getElementById('accessDlg').open")
            await pg.screenshot(path=os.path.join(HERE, 'shots', 'exits-desk.png'))
            dk['errors'] = errs
            res['desktop'] = dk
            await ctx.close(); await b.close()
    finally:
        srv.terminate()
    print(json.dumps(res, indent=1))

asyncio.run(main())
