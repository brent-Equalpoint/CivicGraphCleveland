"""Narrow screens: iPhone Display Zoom and Safari's page zoom make the page act like a 320px or 260px wide screen.
Every view, the menu, the Access screen and a profile must fit with no sideways scrolling, at standard and largest text.
Also checks that the phone's Larger Text and Increase Contrast settings are followed until a choice is made in Access.
usage: python3 test_narrow.py SITE_DIR"""
import asyncio, json, os, subprocess, sys, time
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = sys.argv[1]
OVER = """()=>{const W=innerWidth;const bad=[];document.querySelectorAll('body *').forEach(e=>{if(!e.offsetParent&&getComputedStyle(e).position!=='fixed')return;const cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.display==='none')return;
  if(e.closest('svg,canvas,.sky,.kmap,.tree,[hidden],dialog:not([open]),.sheet:not(.show),.panel:not(.open),.dir-rail:not(.open),.pl-scroll,.pc-row,.ds-row,.kl-cards,.vhead .seg,.mcal,.fz-chips,.solo-pop[hidden]'))return;
  const r=e.getBoundingClientRect();if(r.width&&r.right>W+1&&r.left<W)bad.push((e.id?'#'+e.id:'')+'.'+String(e.className).split(' ')[0]+':'+Math.round(r.right));});
  return {hscroll:document.documentElement.scrollWidth>W+1,overflow:[...new Set(bad)].slice(0,8)}}"""

async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8774', '--bind', '127.0.0.1'], cwd=SITE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.0)
    URL = 'http://localhost:8774/'
    out = {}
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            async def block(r):
                if r.request.url.startswith('http://localhost'): await r.continue_()
                else: await r.abort()
            for w in (320, 260):
                for tag, prefs in (('standard', {}), ('largest', {'text': '1.3', 'targets': 'large', 'chosen': {'text': True}})):
                    ctx = await b.new_context(viewport={'width': w, 'height': 700}, is_mobile=True, has_touch=True, device_scale_factor=2)
                    await ctx.add_init_script(f"try{{localStorage.setItem('flx-vcfest-access',{json.dumps(json.dumps(prefs))})}}catch(e){{}}")
                    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
                    await pg.route('**/*', block); await pg.goto(URL); await pg.wait_for_timeout(2000)
                    r = {}
                    for v in ('network', 'matches', 'people', 'agenda'):
                        await pg.tap(f'.tabbar [data-view="{v}"]'); await pg.wait_for_timeout(900)
                        r[v] = await pg.evaluate(OVER)
                        await pg.screenshot(path=os.path.join(HERE, 'shots', f'narrow-{w}-{tag}-{v}.png'))
                    await pg.tap('#menuBtn'); await pg.wait_for_timeout(400); r['menu'] = await pg.evaluate(OVER)
                    await pg.screenshot(path=os.path.join(HERE, 'shots', f'narrow-{w}-{tag}-menu.png'))
                    await pg.tap('#topMenu [data-open="access"]'); await pg.wait_for_timeout(700); r['access'] = await pg.evaluate(OVER)
                    await pg.screenshot(path=os.path.join(HERE, 'shots', f'narrow-{w}-{tag}-access.png'))
                    await pg.tap('#accessPane [data-close]'); await pg.wait_for_timeout(500)
                    await pg.evaluate("window._vc.openStory(window._vc.D.companies[3].id)"); await pg.wait_for_timeout(900); r['profile'] = await pg.evaluate(OVER)
                    await pg.screenshot(path=os.path.join(HERE, 'shots', f'narrow-{w}-{tag}-profile.png'))
                    r['errors'] = errs
                    out[f'{w}-{tag}'] = r
                    await ctx.close()
            # the phone's own settings: Increase Contrast is followed; a choice made in Access wins
            ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, forced_colors='none')
            pg = await ctx.new_page(); await pg.route('**/*', block)
            await pg.emulate_media(reduced_motion='reduce')
            await pg.goto(URL); await pg.wait_for_timeout(1500)
            out['system_reduced_motion'] = await pg.evaluate("document.documentElement.dataset.motion")
            await pg.evaluate("localStorage.setItem('flx-vcfest-access',JSON.stringify({motion:'live',chosen:{motion:true}}))"); await pg.reload(); await pg.wait_for_timeout(1200)
            out['choice_beats_system'] = await pg.evaluate("document.documentElement.dataset.motion")
            await pg.evaluate("localStorage.setItem('flx-vcfest-access',JSON.stringify({motion:'calm',text:'1',contrast:'standard',targets:'large'}))"); await pg.reload(); await pg.wait_for_timeout(1200)
            out['old_save_follows_system'] = await pg.evaluate("({motion:document.documentElement.dataset.motion,targets:document.documentElement.dataset.targets})")
            await ctx.close(); await b.close()
    finally:
        srv.terminate()
    print(json.dumps(out, indent=1))

asyncio.run(main())
