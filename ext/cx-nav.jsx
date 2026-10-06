/* The desktop strip above the graph (screens wider than 760 px): the rooms and the personal pages.
   The compiled app draws the room tabs (a Radix tablist, ?room=) and the personal page buttons (?panel=); build.py mounts
   CX_DeskStrip inside the strip with the app's own state, so this file keeps them in view and in step. */

/* Bring a tab or button inside its sideways-scrolling row into view, with room for the fade and the "more" button
   (scroll-padding-inline in ext/cx.css, 44 px). Only the row moves sideways: the page never moves up or down. */
function cxNavReveal(el, smooth) {
  const row = el && el.closest(`.atlas-room-tabs, .atlas-sidebar-bottom`);
  if (!row || row.scrollWidth <= row.clientWidth + 1) return;
  const pad = 44, r = el.getBoundingClientRect(), s = row.getBoundingClientRect();
  let d = 0;
  if (r.left < s.left + pad) d = r.left - s.left - pad;
  else if (r.right > s.right - pad) d = Math.min(r.right - s.right + pad, r.left - s.left - pad);
  if (Math.abs(d) < 1) return;
  const left = Math.max(0, Math.min(row.scrollWidth - row.clientWidth, row.scrollLeft + d));
  try { row.scrollTo({ left, behavior: smooth ? `smooth` : `instant` }); } catch (e) { row.scrollLeft = left; }
}

/* How the last action was made: a key or a pointer. A page opened from the keyboard appears at once (no rise), and the
   strip scrolls instantly for keys and smoothly for a pointer. Read once, when a page opens (CX_DeskStrip): a page's entrance is never
   switched on or off afterwards, because a CSS animation that is switched back on plays again and moves the page under the pointer. */
const CX_NAV_INPUT = { kbd: !1 };
function cxNavInputWatch() {
  if (cxNavInputWatch.on || typeof window === `undefined`) return;
  cxNavInputWatch.on = !0;
  window.addEventListener(`keydown`, (e) => { if (!e.metaKey && !e.ctrlKey && !e.altKey) CX_NAV_INPUT.kbd = !0; }, !0);
  window.addEventListener(`pointerdown`, () => { CX_NAV_INPUT.kbd = !1; }, !0);
}

/* Mounted by build.py at the top of the strip with the app's state: the room, the open page (panel), and My priorities. */
function CX_DeskStrip({ room, panel, prio }) {
  const ref = u.useRef(null);
  u.useEffect(() => { cxNavInputWatch(); }, []);
  // a page opened from the keyboard is simply there: its entrance is turned off before the first paint (only on the page that just opened)
  u.useLayoutEffect(() => {
    if (!CX_NAV_INPUT.kbd || !(panel || prio)) return;
    document.querySelectorAll(`.auxiliary-page > section, .auxiliary-page > .civic-page, .cx-enter`).forEach((el) => { el.style.animation = `none`; });
  }, [panel, prio]);
  // the chosen room, and the open page, are always in view: on load, on a ?room= link, on every change, after the fonts arrive, and when the strip is resized
  u.useEffect(() => {
    const strip = ref.current && ref.current.parentElement;
    if (!strip) return;
    const show = () => {
      if (!matchMedia(`(min-width: 761px)`).matches) return;
      cxNavReveal(strip.querySelector(`.atlas-room-tab[data-state="active"]`) || strip.querySelector(`.atlas-room-tab[tabindex="0"]`));
      cxNavReveal(strip.querySelector(`.atlas-sidebar-bottom [aria-current="page"]`));
    };
    const raf = requestAnimationFrame(show);
    let gone = !1;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!gone) show(); });
    return () => { gone = !0; cancelAnimationFrame(raf); };
  }, [room, panel, prio]);
  u.useEffect(() => {
    const strip = ref.current && ref.current.parentElement;
    if (!strip || typeof ResizeObserver === `undefined`) return;
    let raf = 0, w = 0;
    const ro = new ResizeObserver(() => {
      if (strip.clientWidth === w) return;
      w = strip.clientWidth;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => cxNavReveal(strip.querySelector(`.atlas-room-tab[data-state="active"]`)));
    });
    ro.observe(strip);
    // a tab or page button that is cut off at the edge comes fully into view when it is clicked
    const onClick = (e) => {
      const b = e.target.closest && e.target.closest(`.atlas-room-tab, .atlas-sidebar-bottom button`);
      if (b) requestAnimationFrame(() => cxNavReveal(b, !CX_NAV_INPUT.kbd));
    };
    strip.addEventListener(`click`, onClick);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); strip.removeEventListener(`click`, onClick); };
  }, []);
  return <span ref={ref} hidden />;
}
