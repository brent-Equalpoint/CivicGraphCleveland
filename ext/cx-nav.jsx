/* The desktop strip above the graph (screens wider than 760 px): the rooms and the personal pages.
   The compiled app draws the room tabs (a Radix tablist, ?room=) and the personal page buttons (?panel=); build.py mounts
   CX_DeskStrip inside the strip with the app's own state, so this file keeps them in view and in step. */

/* Bring a tab or button inside its sideways-scrolling row into view, clear of the fade and the "more" button at each end
   (scroll-padding-inline in ext/cx.css, 112 px). Only the row moves sideways: the page never moves up or down. */
function cxNavReveal(el, smooth) {
  const row = el && el.closest(`.atlas-room-tabs, .atlas-sidebar-bottom`);
  if (!row || row.scrollWidth <= row.clientWidth + 1) return;
  const pad = 112, r = el.getBoundingClientRect(), s = row.getBoundingClientRect();
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

/* A row that still has to scroll sideways (a narrow window, Spanish, larger text): it fades only at the side with more, a plain mouse wheel over it
   moves it sideways while it can still move that way (and then hands the wheel back to the page), and a button at each end says how many are hidden
   there, so a mouse alone can reach everything. build.py puts CX_RowMore right after the row inside a .cx-row wrapper. The keyboard needs none of this:
   the arrow keys and Tab bring each tab into view, so the buttons are not Tab stops. */
/* the button reads "Show 9 more rooms" ("Show" and the noun are for a screen reader; the screen shows "9 more"), so the name holds the words on it in English and in Spanish */
const CX_ROW_WORDS = {
  rooms: [`rooms to the left`, `rooms`],
  pages: [`pages to the left`, `pages`],
  places: [`places to the left`, `places`],
};
function cxRowItems(row) {
  return [...row.children].filter((e) => !e.hidden && e.getBoundingClientRect().width > 0);
}
function cxRowState(row) {
  const s = row.getBoundingClientRect(), max = row.scrollWidth - row.clientWidth;
  const start = max > 1 && row.scrollLeft > 1, end = max > 1 && row.scrollLeft < max - 1;
  let a = 0, b = 0;
  for (const e of cxRowItems(row)) { const r = e.getBoundingClientRect(); if (start && r.left < s.left - 1) a++; if (end && r.right > s.right + 1) b++; }
  return { start, end, a, b };
}
function cxRowWheel(row, e) {
  if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;   // a sideways wheel or trackpad already scrolls the row; a pinch zooms the page
  const max = row.scrollWidth - row.clientWidth;
  if (max <= 1 || !matchMedia(`(min-width: 761px)`).matches) return;
  const d = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? row.clientWidth : 1);
  if ((d > 0 && row.scrollLeft >= max - 1) || (d < 0 && row.scrollLeft <= 1)) return;   // at the end of the row the wheel scrolls the page again
  e.preventDefault();
  row.scrollLeft = Math.max(0, Math.min(max, row.scrollLeft + d));
}
function CX_RowMore({ unit }) {
  const ref = u.useRef(null);
  const [st, setSt] = u.useState({ a: 0, b: 0 });
  const rowOf = () => ref.current && ref.current.parentElement && ref.current.parentElement.firstElementChild;
  u.useEffect(() => {
    const row = rowOf();
    if (!row) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const s = cxRowState(row);
      row.toggleAttribute(`data-more-start`, s.start);
      row.toggleAttribute(`data-more-end`, s.end);
      setSt((o) => (o.a === s.a && o.b === s.b ? o : { a: s.a, b: s.b }));
    };
    const later = () => { if (!raf) raf = requestAnimationFrame(measure); };
    const ro = typeof ResizeObserver === `undefined` ? null : new ResizeObserver(later);
    const watch = () => { if (ro) { ro.observe(row); [...row.children].forEach((c) => ro.observe(c)); } };
    watch();
    const mo = new MutationObserver(() => { watch(); later(); });
    mo.observe(row, { childList: !0, subtree: !0, attributes: !0, attributeFilter: [`data-state`, `hidden`, `class`] });
    const wheel = (e) => cxRowWheel(row, e);
    row.addEventListener(`scroll`, later, { passive: !0 });
    row.addEventListener(`wheel`, wheel, { passive: !1 });
    window.addEventListener(`resize`, later);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
    later();
    return () => { cancelAnimationFrame(raf); if (ro) ro.disconnect(); mo.disconnect(); row.removeEventListener(`scroll`, later); row.removeEventListener(`wheel`, wheel); window.removeEventListener(`resize`, later); };
  }, []);
  const go = (dir) => {
    const row = rowOf();
    if (!row) return;
    const calm = CX_NAV_INPUT.kbd || matchMedia(`(prefers-reduced-motion: reduce)`).matches;
    try { row.scrollBy({ left: dir * Math.max(120, row.clientWidth - 140), behavior: calm ? `instant` : `smooth` }); } catch (e) { row.scrollLeft += dir * Math.max(120, row.clientWidth - 140); }
  };
  const words = CX_ROW_WORDS[unit] || CX_ROW_WORDS.rooms;
  return (
    <span ref={ref} className="cx-rowmore-wrap">
      {st.a > 0 && (
        <button type="button" className="cx-rowmore cx-rowmore-start" tabIndex={-1} onClick={() => go(-1)}>
          <CXI.Chevron size={16} aria-hidden="true" className="cx-rowmore-back" /><span className="sr-only">Show </span><b>{st.a}</b> <span>more</span><span className="sr-only">{` ${words[0]}`}</span>
        </button>
      )}
      {st.b > 0 && (
        <button type="button" className="cx-rowmore cx-rowmore-end" tabIndex={-1} onClick={() => go(1)}>
          <span className="sr-only">Show </span><b>{st.b}</b> <span>more</span><span className="sr-only">{` ${words[1]}`}</span><CXI.Chevron size={16} aria-hidden="true" />
        </button>
      )}
    </span>
  );
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
