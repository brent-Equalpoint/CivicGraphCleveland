/* The Tree: layout and interactions ported from Brent's VC Fest Tree kit (tree-kit: src/tree.template.html and src/map-shell.js). */
/* The federal government we hold, top down: the top card with its counts, the three branches as columns joined by curved lines, their
   lists as cards, and drawers of names, each with the record's own word (never a strength). A name opens a details card in the map's sheet.
   Built when the Tree opens from the map's and the Index's model (cxUsiPage); a drawer's names only when it first opens. What is open is in
   memory only; each opening is a step in history (trR in CX_UsMap). Changed from the kit on purpose: no strength words, 44 px rows that wrap,
   the map's shapes and colors, the record's order or alphabetical (circuits as 28 U.S.C. 41 lists them), no party, no #id link (the search
   box finds a name instead), and drag, pinch, and Ctrl with the wheel. See docs/plan-us-graph-master.md. The part above React is pure. */

const CX_UST_PAGE = 60;   // a drawer shows this many names, then Show more
// the circuits in the order 28 U.S.C. 41 lists them (the record's own source for them, CX_USM_SOURCES.circuits)
const CX_UST_CIRCUITS = [`District of Columbia`, `First`, `Second`, `Third`, `Fourth`, `Fifth`, `Sixth`, `Seventh`, `Eighth`, `Ninth`, `Tenth`, `Eleventh`, `Federal`];
function cxUstCircuitAt(n) { const m = String(n.name).match(/for the (.+) Circuit$/); const k = m ? CX_UST_CIRCUITS.indexOf(m[1]) : -1; return k < 0 ? CX_UST_CIRCUITS.length : k; }
function cxUstByCircuit(a, b) { return cxUstCircuitAt(a) - cxUstCircuitAt(b) || cxUsiByName(a, b); }
/* a count, as its own piece of text so each one translates; k says what it counts (the checks read it) */
function cxUstCount(k, n, one, many) { return { k, n, t: cxUsmPlural(n, one, many) }; }
/* one name: the Index's row for a node of the map's model, opened as a details card */
function cxUstItem(g, M, i, note) { return { ...cxUsiNode(g, M, i, note), act: `card` }; }
/* what a name opens below itself: a committee's members, an agency's own agencies, a circuit's district courts, or judges */
function cxUstNest(g, n, how) {
  let k = 0;
  g.adj[n.i].forEach((ei) => {
    const e = g.edges[ei], o = g.nodes[e.a === n.i ? e.b : e.a];
    if ((how === `members` && o.kind === `member`) || (how === `parts` && o.kind === `agency` && o.a.parent_id === n.a.id) || (how === `districts` && o.kind === `court` && o.c.circuit === n.c.id) || (how === `judges` && o.kind === `judge`)) k += 1;
  });
  if (!k) return null;
  const w = { members: [`member`, `members`], parts: [`agency`, `agencies`], districts: [`court`, `courts`], judges: [`judge`, `judges`] }[how];
  return { how, n: k, one: w[0], many: w[1] };
}
function cxUstWith(g, M, i, note, how) { const x = cxUstItem(g, M, i, note); if (how) { const s = cxUstNest(g, g.nodes[i], how); if (s) x.nest = s; } return x; }
/* an Index row (it already carries the record's word) as a Tree name; an agency under another can open its own agencies */
function cxUstFrom(g, M, y, how) {
  if (y.i === null || y.i === undefined) return { ...y, act: `muted` };
  const x = { ...y, act: `card` };
  if (how) { const s = cxUstNest(g, g.nodes[y.i], how); if (s) x.nest = s; }
  return x;
}
/* the groups one name opens (built the first time it is opened) */
function cxUstKids(data, g, M, it) {
  const how = it.nest.how, n = g.byId.get(it.key);
  if (how === `districts`) return [{ key: `districts`, label: `District courts in this circuit`, one: `court`, many: `courts`, items: g.nodes.filter((o) => o.kind === `court` && o.c.circuit === n.c.id).sort(cxUsiByName).map((o) => cxUstItem(g, M, o.i, ``)) }];
  const P = cxUsiPage(data, g, M, null, it.key);
  const keys = how === `members` ? [`leaders`, `senate`, `house`] : how === `parts` ? [`parts`] : [`judges`];
  return P ? P.groups.filter((x) => keys.includes(x.key)).map((x) => ({ key: x.key, label: x.label, one: x.one, many: x.many, items: x.items.map((y) => cxUstFrom(g, M, y, how === `parts` ? `parts` : null)) })) : [];
}

/* The whole tree: the top card, the branches, and their lists. A list's groups are a function, run the first time its drawer opens. */
function cxUstModel(data, g, M) {
  const of = (k, f = () => !0) => g.nodes.filter((n) => n.kind === k && f(n));
  const it = (n, note, how) => cxUstWith(g, M, n.i, note, how);
  const grp = (key, label, one, many, items) => ({ key, label, one, many, items });
  const fromPage = (key, keys) => { const P = cxUsiPage(data, g, M, null, key); return P ? P.groups.filter((x) => keys.includes(x.key)).map((x) => grp(x.key, x.label, x.one, x.many, x.items.map((y) => cxUstFrom(g, M, y)))) : []; };
  const C = cxUstCount;
  const L = (id, name, o) => ({ id, name, rec: !!o.rec, i: o.i === undefined ? null : o.i, counts: o.counts, note: o.note || ``, self: o.self || null, groups: o.groups });
  const members = of(`member`), committees = of(`committee`), agencies = of(`agency`), courts = of(`court`), judges = of(`judge`), pres = of(`president`), cab = of(`cabinet`);
  // the legislative branch: each chamber and its members, and the committees of each chamber (a committee opens its members)
  const chamber = (id, name, hub, ch) => {
    const h = g.byId.get(hub), n = members.filter((m) => m.m.chamber === ch).length;
    return L(id, name, { i: h.i, counts: [C(`members`, n, `member`, `members`)], self: cxUstItem(g, M, h.i, `Chamber of Congress`), groups: () => fromPage(hub, [`members`]) });
  };
  const comList = (id, name, ch) => {
    const cs = committees.filter((n) => n.c.chamber === ch).sort(cxUsiByName);
    return L(id, name, { counts: [C(`committees`, cs.length, `committee`, `committees`)], groups: () => [grp(`committees`, `Committees`, `committee`, `committees`, cs.map((n) => it(n, ``, `members`)))] });
  };
  const leg = [chamber(`leg.senate`, `Senate`, `h:senate`, `senate`), chamber(`leg.house`, `House`, `h:house`, `house`), comList(`leg.scom`, `Senate committees`, `senate`), comList(`leg.hcom`, `House committees`, `house`), comList(`leg.jcom`, `Joint committees`, `joint`)];
  // the executive branch: the President and Vice President, the cabinet (in the record's order), the departments and the other top-level
  // agencies (each opens the agencies under it), and the former Presidents who appointed sitting judges (each opens those judges)
  const cur = pres.filter((n) => n.p.current).sort((a, b) => (a.p.role === `Vice President`) - (b.p.role === `Vice President`));
  const tops = agencies.filter((n) => !n.a.parent_id).sort(cxUsiByName), isDept = (n) => /\bDepartment\b/.test(n.name);
  const dept = tops.filter(isDept), other = tops.filter((n) => !isDept(n)), former = pres.filter((n) => !n.p.current);
  const short = (n) => (n.a.short_name && n.a.short_name !== n.name ? n.a.short_name : ``);
  const exe = [
    L(`exe.lead`, `President and Vice President`, { counts: [C(`people`, cur.length, `person`, `people`)], groups: () => [grp(`leaders`, `Leaders`, `person`, `people`, cur.map((n) => it(n, n.p.role === `Vice President` ? `Vice President` : `President`)))] }),
    L(`exe.cab`, `Cabinet`, { counts: [C(`people`, cab.length, `person`, `people`)], note: `Which agency each cabinet title leads is not linked yet. That needs a person's review.`, groups: () => [grp(`cabinet`, `Cabinet`, `person`, `people`, cab.map((n) => ({ ...it(n, n.cab.title), wrec: !0 })))] }),
    L(`exe.dept`, `Departments`, { counts: [C(`departments`, dept.length, `department`, `departments`)], groups: () => [grp(`departments`, `Departments`, `department`, `departments`, dept.map((n) => ({ ...it(n, short(n), `parts`), wrec: !0 })))] }),
    L(`exe.other`, `Other agencies`, { counts: [C(`agencies`, other.length, `agency`, `agencies`)], groups: () => [grp(`agencies`, `Agencies`, `agency`, `agencies`, other.map((n) => ({ ...it(n, short(n), `parts`), wrec: !0 })))] }),
    L(`exe.former`, `Former Presidents`, { counts: [C(`people`, former.length, `person`, `people`)], groups: () => [grp(`former`, `Former Presidents`, `person`, `people`, former.map((n) => it(n, ``, `judges`)))] }),
  ];
  // the judicial branch: the Supreme Court, each court of appeals with its judges, the district courts by circuit, other courts, every judge
  const ty = (t) => courts.filter((n) => n.c.type === t);
  const app = ty(`appeals`).sort(cxUstByCircuit), dis = ty(`district`), loose = dis.filter((n) => !n.c.circuit || !g.byId.has(`k:${n.c.circuit}`)).sort(cxUsiByName);
  const sits = (n) => (cxUstNest(g, n, `judges`) || { n: 0 }).n;
  const jud = [
    ...ty(`supreme`).map((n) => L(`jud.supreme`, `Supreme Court`, { i: n.i, counts: [C(`judges`, sits(n), `judge`, `judges`)], self: it(n, `The highest federal court`), groups: () => fromPage(n.id, [`judges`]) })),
    ...app.map((n) => L(`jud.${n.c.id}`, n.name, { rec: !0, i: n.i, counts: [C(`judges`, sits(n), `judge`, `judges`)], self: it(n, `Court of appeals`), groups: () => fromPage(n.id, [`judges`]) })),
    L(`jud.district`, `District courts`, { counts: [C(`courts`, dis.length, `court`, `courts`)], groups: () => [grp(`circuits`, `By circuit`, `circuit`, `circuits`, app.map((n) => it(n, ``, `districts`)).filter((x) => x.nest)), ...(loose.length ? [grp(`loose`, `Other district courts`, `court`, `courts`, loose.map((n) => it(n, ``)))] : [])] }),
    L(`jud.other`, `Other courts`, { counts: [C(`courts`, ty(`other`).length, `court`, `courts`)], groups: () => [grp(`courts`, `Courts`, `court`, `courts`, ty(`other`).sort(cxUsiByName).map((n) => it(n, ``, `judges`)))] }),
    L(`jud.judges`, `Judges`, { counts: [C(`judges`, judges.length, `judge`, `judges`)], note: `Article III judges who sit now, from the Federal Judicial Center. Senior judges are counted on each court, not listed. Bankruptcy, magistrate, and other courts are not in our record yet.`, groups: () => [grp(`judges`, `Judges`, `judge`, `judges`, judges.slice().sort(cxUsiAbc).map((n) => it(n, cxUsiJudgeWord(n.j))))] }),
  ].filter((l) => l.id !== `jud.other` || ty(`other`).length);
  const people = pres.length + cab.length;
  const B = (key, label, color, lists, counts) => ({ key, id: `b:${key}`, label, color, lists, counts: [C(`lists`, lists.length, `list`, `lists`), ...counts] });
  return {
    title: `The United States federal government`,
    counts: [C(`members`, members.length, `member of Congress`, `members of Congress`), C(`committees`, committees.length, `committee`, `committees`), C(`agencies`, agencies.length, `agency`, `agencies`), C(`courts`, courts.length, `court`, `courts`)],
    branches: [
      B(`leg`, `Legislative branch`, CX_USM_COLORS.senate, leg, [C(`members`, members.length, `member`, `members`), C(`committees`, committees.length, `committee`, `committees`)]),
      B(`exe`, `Executive branch`, CX_USM_COLORS.exec, exe, [C(`people`, people, `person`, `people`), C(`agencies`, agencies.length, `agency`, `agencies`)]),
      B(`jud`, `Judicial branch`, CX_USM_COLORS.courts, jud, [C(`courts`, courts.length, `court`, `courts`), C(`judges`, judges.length, `judge`, `judges`)]),
    ],
  };
}
/* what is on the page for a set of open ids, top to bottom and column by column (the reading order is the picture's order) */
function cxUstVisible(model, open) {
  const out = [{ id: `root`, type: `root`, col: -1 }];
  model.branches.forEach((b, col) => {
    out.push({ id: b.id, type: `branch`, col, b });
    if (!open.has(b.id)) return;
    b.lists.forEach((l) => { out.push({ id: `l:${l.id}`, type: `list`, col, b, l }); if (open.has(`l:${l.id}`)) out.push({ id: `d:${l.id}`, type: `drawer`, col, b, l }); });
  });
  return out;
}
/* everything under an open thing, closed with it: a branch's lists, a list's names that opened, a name's own names */
function cxUstUnder(id, x) {
  if (id.startsWith(`b:`)) { const k = id.slice(2); return x.startsWith(`l:${k}.`) || x.startsWith(`s:${k}.`); }
  if (id.startsWith(`l:`)) return x.startsWith(`s:${id.slice(2)}/`);
  if (id.startsWith(`s:`)) return x.startsWith(`${id}/`);
  return !1;
}
/* Where everything sits (the kit's trLayout). hts: each thing's height as the page measured it. Phones: each branch a column a little
   narrower than the screen, so the next one peeks in from the right, starting at the left. Computers: the whole tree centered. */
function cxUstPlace(vis, hts, sw, phone, leaving) {
  const ph = phone || sw <= 640;
  const CW = ph ? Math.max(220, Math.min(274, sw - 64)) : 280, GAP = ph ? 16 : 30, PAD = ph ? 16 : 28, RW = ph ? CW : 440, GAPV = 26, GAPB = 18;
  const n = vis.filter((x) => x.type === `branch`).length, W = PAD * 2 + n * CW + Math.max(0, n - 1) * GAP;
  const T = new Map(), links = [];
  const rh = hts.get(`root`) || 88, root = { x: ph ? PAD : W / 2 - RW / 2, y: ph ? 20 : 28, w: RW, h: rh, col: -1, type: `root`, idx: -1 };
  T.set(`root`, root);
  const by = root.y + rh + (ph ? 56 : 70), colY = [], prev = [], idx = [], first = [];
  vis.forEach((x) => {
    if (x.type === `root`) return;
    const c = x.col, cx = PAD + c * (CW + GAP), h = hts.get(x.id) || 0;
    if (x.type === `branch`) { T.set(x.id, { x: cx, y: by, w: CW, h, col: c, type: x.type, idx: -1, color: x.b.color }); links.push({ kind: `curve`, a: `root`, b: x.id, col: c, idx: -1, color: x.b.color }); colY[c] = by + h + GAPV; prev[c] = x.id; idx[c] = 0; first[c] = !0; return; }
    if (x.type === `list`) { if (!first[c]) colY[c] += GAPB; first[c] = !1; }
    const y = x.type === `drawer` ? colY[c] + 6 : colY[c], hh = x.type === `drawer` && leaving.has(x.id) ? 0 : h;
    T.set(x.id, { x: cx, y, w: CW, h: hh, col: c, type: x.type, idx: idx[c], color: x.b.color });
    links.push({ kind: `chain`, a: prev[c], b: x.id, col: c, idx: idx[c], color: x.b.color });
    colY[c] = y + hh; prev[c] = x.id; idx[c] += 1;
  });
  const H = Math.max(by + 120, ...colY.filter((v) => v !== undefined)) + 60;
  return { T, links, W, H, CW, RW };
}
/* the line between two things: a curve from the top card to a branch, a straight drop inside a column */
function cxUstPath(l, a, b) {
  if (l.kind === `curve`) { const x1 = a.x + a.w / 2, y1 = a.y + a.h, x2 = b.x + b.w / 2, y2 = b.y, my = (y1 + y2) / 2; return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${x1.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`; }
  const x = b.x + b.w / 2; return `M ${x.toFixed(1)} ${(a.y + a.h).toFixed(1)} V ${b.y.toFixed(1)}`;
}
/* the record's own address for a name, when it has one (a member's, a committee's, an agency's official site) */
function cxUstUrl(n) { const u0 = (n.m && n.m.url) || (n.c && n.c.url) || (n.a && n.a.url) || ``; return /^https?:\/\//.test(u0) ? u0 : ``; }

/* ---------- React ---------- */

/* the round toggle: a plus that turns into a minus */
function CxUstPm() {
  return <span className="ust-pm" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M2.5 6h7" /><path className="ust-v" d="M6 2.5v7" /></svg></span>;
}
/* counts, each its own piece of text: "539 members of Congress · 49 committees" */
function CxUstCounts({ list }) {
  return <small className="ust-cap">{list.map((c, k) => <u.Fragment key={c.k + k}>{k ? <span aria-hidden="true">{` · `}</span> : null}<span data-k={c.k} data-n={c.n}>{c.t}</span></u.Fragment>)}</small>;
}

/* The Tree view. R: CX_UsMap's history steps for the Tree (trR), which this view fills with what it can undo, redo, and find.
   onCard(o, el) opens a name's details card over the view. */
function CX_UstTree({ data, g, M, phone, still, R, onCard }) {
  const model = u.useMemo(() => cxUstModel(data, g, M), [data, g, M]);
  const X = useCxUsx(!1);   // a committee's "what it does" line, at the top of its drawer, once the lines have loaded
  const [lang] = useCxLang();
  const [open, setOpenS] = u.useState(() => new Set(model.branches.map((b) => b.id)));
  const [closing, setClosing] = u.useState(() => new Set());
  const [shown, setShown] = u.useState({});
  const [say, setSay] = u.useState(null);
  const openR = u.useRef(open), stillR = u.useRef(still);
  openR.current = open; stillR.current = still;
  const rootRef = u.useRef(null), scRef = u.useRef(null), sizerRef = u.useRef(null), innerRef = u.useRef(null), svgRef = u.useRef(null);
  const els = u.useRef(new Map());
  const S = u.useRef({ cur: new Map(), raf: 0, scale: 1, W: 0, H: 0, links: [], hot: null, prog: new Map(), fitted: !1, focus: null, ct: 0, sw: 0, run: null, drag: null, pinch: null, sizes: new WeakMap(), dirty: !1 });
  const memo = u.useRef({ m: null, groups: new Map(), kids: new Map() });
  if (memo.current.m !== model) memo.current = { m: model, groups: new Map(), kids: new Map() };
  const groupsOf = (l) => { const c = memo.current.groups; if (!c.has(l.id)) c.set(l.id, l.groups()); return c.get(l.id); };
  const kidsOf = (key, it) => { const c = memo.current.kids; if (!c.has(key)) c.set(key, cxUstKids(data, g, M, it)); return c.get(key); };
  const ref = (id) => (el) => { if (el) els.current.set(id, el); else els.current.delete(id); };

  // ---- opening and closing. Opening is a step in history (R.push); closing takes the closed things out of the steps (R.drop).
  const setOpen = (next, focusTo) => {
    const was = openR.current, gone = [...was].filter((id) => !next.has(id));
    if (!stillR.current && gone.length) {
      setClosing((c) => { const s = new Set(c); gone.forEach((id) => s.add(id)); return s; });
      clearTimeout(S.current.ct); S.current.ct = setTimeout(() => setClosing(new Set()), 520);
    }
    // the focus never stays inside something that is going away: it moves to the toggle that closed it
    const a = globalThis.document.activeElement;
    if (!focusTo && a && rootRef.current && rootRef.current.contains(a)) {
      for (const id of gone) {
        const box = id.startsWith(`l:`) ? els.current.get(`d:${id.slice(2)}`) : id.startsWith(`s:`) ? globalThis.document.getElementById(`ust-${cxUstDom(id)}`) : null;
        if (box && box.contains(a)) { focusTo = id; break; }
      }
    }
    S.current.focus = focusTo || null;
    openR.current = next; setOpenS(next);
  };
  const close = (id) => { const next = new Set(openR.current); const out = [...next].filter((x) => x === id || cxUstUnder(id, x)); out.forEach((x) => next.delete(x)); setOpen(next); R.current.drop(out); };
  const openMore = (ids) => { const next = new Set(openR.current), added = ids.filter((x) => !next.has(x)); added.forEach((x) => next.add(x)); if (!added.length) return; setOpen(next); R.current.push(added); };
  const listCount = (l) => l.counts;
  const tell = (name, rec, counts) => setSay({ name, rec, counts });
  const toggleRoot = () => {
    const all = model.branches.every((b) => openR.current.has(b.id));
    if (all) { const next = new Set(openR.current), out = [...next]; out.forEach((x) => next.delete(x)); setOpen(next); R.current.drop(out); setSay({ line: `Every branch is closed.` }); }
    else { openMore(model.branches.map((b) => b.id)); setSay({ line: `Every branch is open.` }); }
  };
  const toggleBranch = (b) => { if (openR.current.has(b.id)) { close(b.id); setSay({ closed: b.label }); } else { openMore([b.id]); tell(b.label, !1, b.counts); } };
  const toggleList = (l) => { const id = `l:${l.id}`; if (openR.current.has(id)) { close(id); setSay({ closed: l.name, rec: l.rec }); } else { openMore([id]); tell(l.name, l.rec, listCount(l)); } };
  const toggleSub = (skey, it) => { const id = `s:${skey}`; if (openR.current.has(id)) { close(id); setSay({ closed: it.name, rec: !0 }); } else { openMore([id]); tell(it.name, !0, [cxUstCount(it.nest.how, it.nest.n, it.nest.one, it.nest.many)]); } };
  const openAll = () => { const ids = []; model.branches.forEach((b) => { ids.push(b.id); b.lists.forEach((l) => ids.push(`l:${l.id}`)); }); openMore(ids); setSay({ line: `Everything is open.` }); };
  const closeAll = () => { const keep = new Set([...openR.current].filter((x) => x.startsWith(`b:`))); R.current.leave(); setOpen(keep); setShown({}); setSay({ line: `Every list is closed.` }); };

  // ---- what CX_UsMap's history calls: undo a step (Back), redo it (Forward), find a name (the search box)
  u.useEffect(() => {
    const r = R.current;
    r.undo = (ids) => { const next = new Set(openR.current); let any = !1; ids.forEach((id) => { if (next.has(id)) any = !0; [...next].forEach((x) => { if (x === id || cxUstUnder(id, x)) next.delete(x); }); }); if (any) { setOpen(next); setSay({ line: `Closed.` }); } return any; };
    r.redo = (ids) => { const next = new Set(openR.current); ids.forEach((id) => next.add(id)); setOpen(next); };
    r.find = (key) => find(key);
    return () => { r.undo = null; r.redo = null; r.find = null; };
  });
  // the search box: open the tree where that name sits, and point to it (the kit's trFind)
  // The shallowest place it sits: a list's own names first, then one drawer down, and so on (an agency under an agency under a department).
  const find = (key) => {
    const page = (gk, k) => ({ gk, n: Math.ceil((k + 1) / CX_UST_PAGE) * CX_UST_PAGE });
    const go = (z, gr, k) => {
      const ids = [z.b.id, `l:${z.l.id}`, ...z.path.map((x) => `s:${x.ctx}`)], pages = [...z.path.map((x) => x.page), page(`${z.ctx}#${gr.key}`, k)];
      setShown((s0) => { const s1 = { ...s0 }; pages.forEach((q) => { if (q.n > CX_UST_PAGE) s1[q.gk] = Math.max(s1[q.gk] || CX_UST_PAGE, q.n); }); return s1; });
      openMore(ids);
      S.current.point = { key, ctx: z.ctx };
      const it = z.it;
      tell(it ? it.name : z.l.name, it ? !0 : z.l.rec, it ? [cxUstCount(it.nest.how, it.nest.n, it.nest.one, it.nest.many)] : z.l.counts);   // also draws again, so the name is pointed to
      return !0;
    };
    let level = [];
    for (const b of model.branches) for (const l of b.lists) {
      if (l.self && l.self.key === key) { openMore([b.id, `l:${l.id}`]); S.current.point = { key, ctx: `${l.id}^` }; tell(l.name, l.rec, l.counts); return !0; }
      level.push({ b, l, ctx: l.id, path: [], it: null, groups: groupsOf(l) });
    }
    for (let depth = 0; depth < 6 && level.length; depth++) {
      const next = [];
      for (const z of level) for (const gr of z.groups) {
        const k = gr.items.findIndex((x) => x.key === key);
        if (k >= 0) return go(z, gr, k);
        gr.items.forEach((it, j) => { if (!it.nest) return; const ctx = `${z.ctx}/${it.key}`; next.push({ b: z.b, l: z.l, ctx, it, path: [...z.path, { ctx, page: page(`${z.ctx}#${gr.key}`, j) }], groups: kidsOf(ctx, it) }); });
      }
      level = next;
    }
    return !1;
  };

  // ---- what is drawn: everything open, and for a moment what is closing
  const union = new Set([...open, ...closing]);
  const live = new Set(cxUstVisible(model, open).map((x) => x.id));
  const vis = cxUstVisible(model, union).map((x) => ({ ...x, leaving: !live.has(x.id) }));
  const leaving = new Set(vis.filter((x) => x.leaving).map((x) => x.id));
  const visR = u.useRef(vis); visR.current = vis;

  // ---- zoom: the buttons keep the middle in place; a pinch or Ctrl and the wheel keep the point under the fingers or the pointer
  const applyScale = (sNew, ax, ay) => {
    const s = S.current, sc = scRef.current, sz = sizerRef.current, inner = innerRef.current; if (!sc || !sz || !inner) return;
    const old = s.scale, k = Math.max(0.35, Math.min(1.5, sNew));
    const ox = ax === undefined ? sc.clientWidth / 2 : ax, oy = ay === undefined ? sc.clientHeight / 2 : ay;
    const px = (sc.scrollLeft + ox - sz.offsetLeft) / old, py = (sc.scrollTop + oy - sz.offsetTop) / old;
    s.scale = k; inner.style.transform = `scale(${k})`; sz.style.width = `${s.W * k}px`; sz.style.height = `${s.H * k}px`;
    sc.scrollLeft = px * k + sz.offsetLeft - ox; sc.scrollTop = py * k + sz.offsetTop - oy;
    if (rootRef.current) rootRef.current.dataset.scale = k.toFixed(3);
  };
  const fit = () => {
    const s = S.current, sc = scRef.current; if (!sc || !s.W) return;
    const ph = phone || sc.clientWidth <= 640;
    // phones: full size, from the first branch. Computers: the whole width, centered; a small shrink blurs the words, so it scrolls instead
    let k = 1;
    if (!ph) { k = Math.min(1, (sc.clientWidth - 8) / s.W); if (k >= 0.95) k = 1; k = Math.max(0.5, k); }
    applyScale(k, 0, 0);
    sc.scrollTo({ left: ph ? 0 : Math.max(0, (s.W * k - sc.clientWidth) / 2), top: 0, behavior: stillR.current ? `auto` : `smooth` });
  };

  // ---- the picture: measure, place, and move everything from where it is to where it goes (the kit's trRender)
  const draw = (cur, prog) => {
    const s = S.current, svg = svgRef.current; if (!svg) return;
    const h0 = s.hot ? cur.get(s.hot) : null;
    let h = ``;
    s.links.forEach((l) => {
      const a = cur.get(l.a), b = cur.get(l.b); if (!a || !b) return;
      const p = Math.min(prog.has(l.a) ? prog.get(l.a) : 1, prog.has(l.b) ? prog.get(l.b) : 1); if (p <= 0.001) return;
      if (l.kind !== `curve` && b.y <= a.y + a.h + 1) return;
      const on = !!h0 && h0.col === l.col && (l.kind === `curve` || (h0.type !== `branch` && l.idx <= h0.idx));
      const st = [p < 1 ? `stroke-dasharray:1 1;stroke-dashoffset:${(1 - p).toFixed(3)}` : ``, on ? `stroke:${l.color}` : ``].filter(Boolean).join(`;`);
      h += `<path class="ust-link${on ? ` hot` : ``}" d="${cxUstPath(l, a, b)}"${p < 1 ? ` pathLength="1"` : ``}${st ? ` style="${st}"` : ``}/>`;
    });
    svg.innerHTML = h;
  };
  const run = (anim) => {
    const s = S.current, sc = scRef.current, inner = innerRef.current, svg = svgRef.current, sz = sizerRef.current; if (!sc || !inner || !svg || !sz) return;
    const V = visR.current, lv = new Set(V.filter((x) => x.leaving).map((x) => x.id)), sw = sc.clientWidth || 1;
    const ph = phone || sw <= 640, CW = ph ? Math.max(220, Math.min(274, sw - 64)) : 280, RW = ph ? CW : 440;
    // widths first, so each card measures its own words at its own width (two lines or three, never cut)
    V.forEach((x) => { const el = els.current.get(x.id); if (el) el.style.width = `${x.type === `root` ? RW : CW}px`; });
    // the branches share one height, so the columns line up
    const bEls = V.filter((x) => x.type === `branch`).map((x) => els.current.get(x.id)).filter(Boolean);
    bEls.forEach((el) => { el.style.minHeight = ``; });
    const bh = Math.max(72, ...bEls.map((el) => el.offsetHeight));
    bEls.forEach((el) => { el.style.minHeight = `${bh}px`; });
    const hts = new Map();
    // a drawer is as tall as the names in it and its own border, so nothing in it is ever cut off; each size is kept, so the
    // ResizeObserver below places things again only when one really changed
    V.forEach((x) => {
      const el = els.current.get(x.id); if (!el) return;
      const box = x.type === `drawer` ? el.firstChild : el; if (box) s.sizes.set(box, box.offsetHeight);
      hts.set(x.id, x.type === `drawer` ? (el.firstChild ? el.firstChild.offsetHeight + (el.offsetHeight - el.clientHeight) : 0) : x.type === `branch` ? bh : el.offsetHeight);
    });
    const P = cxUstPlace(V, hts, sw, phone, lv);
    s.links = P.links;
    const motion = !!anim && !stillR.current;
    const dur = motion ? 460 : 0;
    // while things fold away, keep the old height, so the picture never jumps under a finger
    const holdH = motion ? Math.max(s.H || 0, P.H) : P.H;
    s.W = P.W; s.H = holdH;
    inner.style.width = `${P.W}px`; inner.style.height = `${holdH}px`;
    svg.setAttribute(`width`, P.W); svg.setAttribute(`height`, holdH); svg.setAttribute(`viewBox`, `0 0 ${P.W} ${holdH}`);
    sz.style.width = `${P.W * s.scale}px`; sz.style.height = `${holdH * s.scale}px`;
    // start every card from exactly where it is on the screen now, so a quick second tap never makes things jump
    const from = new Map(), fresh = new Map();
    let n0 = 0;
    V.forEach((x) => {
      const t = P.T.get(x.id); if (!t) return;
      const c = s.cur.get(x.id);
      if (c) { from.set(x.id, c); return; }
      from.set(x.id, { ...t, h: x.type === `drawer` ? 0 : t.h });
      if (motion) fresh.set(x.id, x.type === `drawer` ? 0 : Math.min(n0++, 14) * 30);
      s.cur.set(x.id, from.get(x.id));
    });
    if (motion) fresh.forEach((d, id) => {
      const el = els.current.get(id); if (!el || id.startsWith(`d:`)) return;
      el.animate([{ opacity: 0, translate: `0 12px` }, { opacity: 1, translate: `0 0` }], { duration: 420, delay: d, easing: `cubic-bezier(.2,.7,.3,1)`, fill: `backwards` });
    });
    let maxD = dur;
    fresh.forEach((d, id) => { if (!id.startsWith(`d:`)) maxD = Math.max(maxD, d + 500); });
    cancelAnimationFrame(s.raf); s.raf = 0;
    const t0 = globalThis.performance.now();
    const frame = (now) => {
      const t = now - t0, q = dur ? 1 - Math.pow(1 - Math.min(1, t / dur), 3) : 1, cur = new Map(), prog = new Map();
      V.forEach((x) => {
        const T0 = P.T.get(x.id), f = from.get(x.id), el = els.current.get(x.id); if (!T0 || !f) return;
        const px = f.x + (T0.x - f.x) * q, py = f.y + (T0.y - f.y) * q, hh = f.h + (T0.h - f.h) * q;
        if (el) {
          el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
          if (x.type === `drawer`) el.style.height = `${Math.max(0, hh).toFixed(1)}px`;
          if (x.leaving) el.style.opacity = x.type === `drawer` ? String(q < 0.8 ? 1 : (1 - q) / 0.2) : String(1 - q);
          else if (el.style.opacity) el.style.opacity = ``;
        }
        cur.set(x.id, { ...T0, x: px, y: py, h: hh });
        if (fresh.has(x.id)) prog.set(x.id, x.type === `drawer` ? Math.min(1, t / 110) : Math.max(0, Math.min(1, (t - fresh.get(x.id) - 140) / 360)));
        if (x.leaving) prog.set(x.id, 1 - q);
      });
      s.cur = cur; s.prog = prog; draw(cur, prog);
      if (t < maxD) { s.raf = requestAnimationFrame(frame); if (rootRef.current) rootRef.current.dataset.moving = `1`; return; }
      s.raf = 0; s.prog = new Map(); draw(cur, s.prog);
      if (rootRef.current) delete rootRef.current.dataset.moving;
      if (s.dirty) { s.dirty = !1; requestAnimationFrame(() => { if (s.run) s.run(!1); }); }   // a size that changed while things moved
      if (holdH !== P.H) { s.H = P.H; inner.style.height = `${P.H}px`; svg.setAttribute(`height`, P.H); svg.setAttribute(`viewBox`, `0 0 ${P.W} ${P.H}`); sz.style.height = `${P.H * s.scale}px`; }
    };
    if (motion && (fresh.size || V.some((x) => { const f = from.get(x.id), T0 = P.T.get(x.id); return x.leaving || !f || !T0 || Math.abs(f.x - T0.x) > 0.5 || Math.abs(f.y - T0.y) > 0.5 || Math.abs(f.h - T0.h) > 0.5; }))) s.raf = requestAnimationFrame(frame);
    else frame(t0 + 1e6);
    if (!s.fitted && s.W) { s.fitted = !0; fit(); }
  };
  S.current.run = run;
  u.useLayoutEffect(() => {
    run(!0);
    const s = S.current;
    // after a step back, the focus goes to the toggle that closed the drawer it was in
    if (s.focus) {
      const f = s.focus; s.focus = null;
      const el = f.startsWith(`l:`) ? els.current.get(f) : globalThis.document.querySelector(`[data-skey="${cxUstDom(f.slice(2))}"]`);
      if (el) el.focus({ preventScroll: !0 });
    }
    // the search box found a name: point to it in the middle of the canvas and give it the focus
    if (s.point) {
      const pt = s.point; s.point = null;
      setTimeout(() => {
        const sc = scRef.current; if (!sc) return;
        const b = [...sc.querySelectorAll(`[data-k]`)].find((x) => x.getAttribute(`data-k`) === pt.key && x.getAttribute(`data-ctx`) === pt.ctx);
        if (!b) return;
        const er = b.getBoundingClientRect(), sr = sc.getBoundingClientRect();
        sc.scrollTo({ left: sc.scrollLeft + er.left - sr.left - sr.width / 2 + er.width / 2, top: sc.scrollTop + er.top - sr.top - sr.height / 2 + er.height / 2, behavior: stillR.current ? `auto` : `smooth` });
        b.focus({ preventScroll: !0 });
      }, stillR.current ? 0 : 480);
    }
  });
  // the words can change size after they are drawn (the fonts arrive, the Spanish is put in): place everything again, without moving it
  u.useEffect(() => {
    const s = S.current, sc = scRef.current; if (!sc || !globalThis.ResizeObserver) return undefined;
    let f = 0;
    // a new element is reported at once with the size the picture was just laid out with: only a real change places things again, and
    // never in the middle of a move (that would cut the move short); it waits for the move to end
    const again = (entries) => {
      if (!entries.some((e) => e.target.isConnected && Math.abs((s.sizes.has(e.target) ? s.sizes.get(e.target) : -1) - e.target.offsetHeight) > 0.5)) return;
      if (s.raf) { s.dirty = !0; return; }
      cancelAnimationFrame(f); f = requestAnimationFrame(() => { if (s.run) s.run(!1); });
    };
    const ro = new globalThis.ResizeObserver(again), seen = new Set();
    const watch = () => {
      const now = new Set(); els.current.forEach((el, id) => now.add(id.startsWith(`d:`) && el.firstChild ? el.firstChild : el));
      seen.forEach((el) => { if (!now.has(el)) { ro.unobserve(el); seen.delete(el); } });
      now.forEach((el) => { if (!seen.has(el)) { ro.observe(el); seen.add(el); } });
    };
    watch(); s.watch = watch;
    // a window that changes width by more than a little fits again (the kit's resize)
    const ro2 = new globalThis.ResizeObserver(() => { const w = sc.clientWidth; if (Math.abs(w - s.sw) > 40) { s.sw = w; if (s.run) s.run(!1); fit(); } });
    s.sw = sc.clientWidth; ro2.observe(sc);
    return () => { cancelAnimationFrame(f); ro.disconnect(); ro2.disconnect(); cancelAnimationFrame(s.raf); clearTimeout(s.ct); };
  }, []);
  u.useEffect(() => { if (S.current.watch) S.current.watch(); });

  // ---- moving the picture: drag with a mouse, pinch with two fingers, Ctrl (or the trackpad's pinch) with the wheel
  u.useEffect(() => {
    const sc = scRef.current, s = S.current; if (!sc) return undefined;
    const wheel = (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); const r = sc.getBoundingClientRect(); applyScale(s.scale * Math.exp(-e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top); };
    const pd = (e) => { if (e.pointerType !== `mouse` || e.button || (e.target.closest && e.target.closest(`button, a, input, select`))) return; s.drag = { x: e.clientX, y: e.clientY, l: sc.scrollLeft, t: sc.scrollTop, id: e.pointerId, moved: !1 }; };
    const pm = (e) => { const d = s.drag; if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (!d.moved && Math.hypot(dx, dy) > 4) { d.moved = !0; sc.classList.add(`ust-drag`); try { sc.setPointerCapture(d.id); } catch (er) { /* not every pointer can be captured */ } } if (d.moved) { sc.scrollLeft = d.l - dx; sc.scrollTop = d.t - dy; } };
    const pu = () => { if (s.drag) { s.drag = null; sc.classList.remove(`ust-drag`); } };
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const ts = (e) => { if (e.touches.length === 2) { const r = sc.getBoundingClientRect(); s.pinch = { d0: dist(e.touches) || 1, k0: s.scale, x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top }; } };
    const tm = (e) => { const p = s.pinch; if (!p || e.touches.length !== 2) return; e.preventDefault(); applyScale(p.k0 * (dist(e.touches) / p.d0), p.x, p.y); };
    const te = (e) => { if (e.touches.length < 2) s.pinch = null; };
    sc.addEventListener(`wheel`, wheel, { passive: !1 });
    sc.addEventListener(`pointerdown`, pd); sc.addEventListener(`pointermove`, pm); sc.addEventListener(`pointerup`, pu); sc.addEventListener(`pointercancel`, pu);
    sc.addEventListener(`touchstart`, ts, { passive: !0 }); sc.addEventListener(`touchmove`, tm, { passive: !1 }); sc.addEventListener(`touchend`, te); sc.addEventListener(`touchcancel`, te);
    return () => {
      sc.removeEventListener(`wheel`, wheel); sc.removeEventListener(`pointerdown`, pd); sc.removeEventListener(`pointermove`, pm); sc.removeEventListener(`pointerup`, pu); sc.removeEventListener(`pointercancel`, pu);
      sc.removeEventListener(`touchstart`, ts); sc.removeEventListener(`touchmove`, tm); sc.removeEventListener(`touchend`, te); sc.removeEventListener(`touchcancel`, te);
    };
  }, []);
  // lines light up in the branch's color while a card is pointed at or has the focus
  const hot = (e) => { const t = e.target.closest && e.target.closest(`[data-tid]`), s = S.current, id = t ? t.getAttribute(`data-tid`) : null; if (id === s.hot) return; s.hot = id; draw(s.cur, s.prog); };
  const cold = () => { const s = S.current; if (s.hot === null) return; s.hot = null; draw(s.cur, s.prog); };

  // ---- the keyboard: Tab goes through everything in the picture's order; up and down move inside a column, left and right to the
  // nearest thing in the next column, Home and End to the top and bottom of a column; Enter or Space opens (they are buttons)
  const onKey = (e) => {
    const K = e.key; if (![`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Home`, `End`].includes(K) || e.altKey || e.ctrlKey || e.metaKey) return;
    const sc = scRef.current, t = e.target.closest && e.target.closest(`[data-col]`); if (!sc || !t || !sc.contains(t)) return;
    const all = [...sc.querySelectorAll(`button[data-col]`)].filter((b) => !b.closest(`[inert], .ust-leaving`) && b.getClientRects().length);
    const col = Number(t.getAttribute(`data-col`)), inCol = (c) => all.filter((b) => Number(b.getAttribute(`data-col`)) === c);
    const ncol = model.branches.length, here = inCol(col), at = here.indexOf(t);
    let to = null;
    if (K === `ArrowDown`) to = col < 0 ? inCol(0)[0] : here[at + 1];
    else if (K === `ArrowUp`) to = col < 0 ? null : at > 0 ? here[at - 1] : all.find((b) => b.getAttribute(`data-col`) === `-1`);
    else if (K === `Home`) to = col < 0 ? t : here[0];
    else if (K === `End`) to = col < 0 ? t : here[here.length - 1];
    else if (col >= 0) {
      const c2 = K === `ArrowRight` ? col + 1 : col - 1;
      if (c2 >= 0 && c2 < ncol) { const y = t.getBoundingClientRect().top, there = inCol(c2); to = there.reduce((best, b) => (!best || Math.abs(b.getBoundingClientRect().top - y) < Math.abs(best.getBoundingClientRect().top - y) ? b : best), null); }
    }
    e.preventDefault();
    if (to && to !== t) to.focus();
  };

  // ---- the parts
  const REC = CX_USI_REC;
  const pathOf = (b, l, parent) => [{ t: b.label }, { t: l.name, rec: l.rec }].concat(parent ? [{ t: parent.name, rec: !0 }] : []);
  const card = (it, e, b, l, parent) => onCard({ i: it.i, word: it.note, from: parent ? parent.name : ``, path: pathOf(b, l, parent) }, e.currentTarget);
  const rows = (items, ctx) => items.map((it) => {
    const key = `${ctx.key}/${it.key}`, sid = `s:${key}`, isOpen = !!it.nest && union.has(sid);
    const body = <><span className="ust-mk"><CxUsiShape shape={it.shape} color={it.color} /></span><span className="ust-rt"><b id={it.nest ? `ust-n-${cxUstDom(key)}` : undefined} {...(it.rec ? REC : {})}>{it.name}</b>{it.note ? <span className="ust-w" {...(it.wrec ? REC : {})}>{it.note}</span> : null}</span></>;
    if (it.act === `muted`) return <li key={`m-${it.name}`} className="ust-row"><p className="ust-nm ust-muted">{body}</p></li>;
    return (
      <li key={key} className="ust-row">
        <button type="button" className="ust-nm" data-col={ctx.col} data-k={it.key} data-ctx={ctx.key} aria-haspopup="dialog" onClick={(e) => card(it, e, ctx.b, ctx.l, ctx.parent)}>{body}</button>
        {it.nest && <button type="button" className="ust-pmb" data-col={ctx.col} data-skey={cxUstDom(key)} aria-expanded={isOpen} aria-controls={isOpen ? `ust-${cxUstDom(sid)}` : undefined} onClick={() => toggleSub(key, it)}><span>{cxUsmPlural(it.nest.n, it.nest.one, it.nest.many)}</span><CxUstPm /></button>}
        {isOpen && <div className="ust-sub" id={`ust-${cxUstDom(sid)}`} role="group" aria-labelledby={`ust-n-${cxUstDom(key)}`}>{body0(kidsOf(key, it), { ...ctx, key, parent: it, cid: g.nodes[it.i].kind === `committee` ? g.nodes[it.i].c.id : null })}</div>}
      </li>
    );
  });
  const more = (gr, gk, n) => {
    const rest = gr.items.length - n; if (rest <= 0) return null;
    return <button type="button" className="ust-more" onClick={(e) => { const k = n; setShown((s0) => ({ ...s0, [gk]: n + CX_UST_PAGE })); if (!e.detail) requestAnimationFrame(() => { const b = rootRef.current && rootRef.current.querySelectorAll(`[data-g="${cxUstDom(gk)}"] .ust-nm`)[k]; if (b) b.focus(); }); }}>{`Show ${Math.min(CX_UST_PAGE, rest)} more of ${gr.items.length.toLocaleString(`en-US`)}`}</button>;
  };
  const body0 = (groups, ctx) => (
    <>
      {ctx.cid && X && X.lines && X.lines[ctx.cid] ? <><p className="ust-what usx-what">{X.lines[ctx.cid][0]}</p><p className="ust-note">{cxUsxShortReview()}</p></> : null}
      {groups.map((gr) => {
        const gk = `${ctx.key}#${gr.key}`, n = shown[gk] || CX_UST_PAGE, items = gr.items;
        return (
          <section key={gr.key} className="ust-grp" data-g={cxUstDom(gk)}>
            <h3 className="ust-head"><span>{gr.label}</span><span aria-hidden="true">{` · `}</span><span data-n={items.length}>{items.length.toLocaleString(`en-US`)}</span></h3>
            <ul className="ust-rows">{rows(items.slice(0, n), ctx)}</ul>
            {more(gr, gk, n)}
          </section>
        );
      })}
    </>
  );
  const drawer = (x) => {
    const l = x.l, ctx = { key: l.id, col: x.col, b: x.b, l, parent: null, cid: null };
    return (
      <div key={x.id} ref={ref(x.id)} id={`ust-${cxUstDom(x.id)}`} data-tid={x.id} className={`ust-drawer ${x.leaving ? `ust-leaving` : ``}`} role="group" aria-labelledby={`ust-t-${cxUstDom(l.id)}`} style={{ '--sc': x.b.color }} inert={x.leaving ? `` : undefined} aria-hidden={x.leaving ? `true` : undefined}>
        <div className="ust-dwin">
          {l.note ? <p className="ust-note">{l.note}</p> : null}
          {l.self ? <ul className="ust-rows ust-self">{rows([l.self], { ...ctx, key: `${l.id}^` })}</ul> : null}
          {body0(groupsOf(l), ctx)}
        </div>
      </div>
    );
  };
  const node = (x) => {
    if (x.type === `drawer`) return drawer(x);
    const common = { key: x.id, ref: ref(x.id), 'data-tid': x.id, 'data-col': x.col, inert: x.leaving ? `` : undefined, 'aria-hidden': x.leaving ? `true` : undefined };
    if (x.type === `root`) {
      const all = model.branches.every((b) => open.has(b.id));
      return <button type="button" {...common} className="ust-card ust-root" aria-expanded={all} onClick={toggleRoot}><b>{model.title}</b><CxUstCounts list={model.counts} /></button>;
    }
    if (x.type === `branch`) {
      const on = open.has(x.id);
      return <button type="button" {...common} className="ust-card ust-branch" style={{ '--sc': x.b.color }} aria-expanded={on} onClick={() => toggleBranch(x.b)}><b>{x.b.label}</b><CxUstCounts list={x.b.counts} /><CxUstPm /></button>;
    }
    const l = x.l, on = open.has(x.id);
    return <button type="button" {...common} id={`ust-${cxUstDom(x.id)}`} className={`ust-card ust-list ${x.leaving ? `ust-leaving` : ``}`} style={{ '--sc': x.b.color }} aria-expanded={on} aria-controls={on ? `ust-${cxUstDom(`d:${l.id}`)}` : undefined} onClick={() => toggleList(l)}><b id={`ust-t-${cxUstDom(l.id)}`} {...(l.rec ? REC : {})}>{l.name}</b><CxUstCounts list={l.counts} /><CxUstPm /></button>;
  };
  // for the browser checks: what is open, the zoom, and the picture's size
  const expose = (el) => { rootRef.current = el; if (el) el.cxTree = { open: [...open], closing: [...closing], scale: S.current.scale, W: S.current.W, H: S.current.H, branches: model.branches.map((b) => ({ id: b.id, label: b.label, lists: b.lists.map((l) => l.id) })) }; };
  const words = say ? (say.line ? <span>{say.line}</span>
    : say.closed ? <><span>Closed</span><span>: </span><span {...(say.rec ? REC : {})}>{say.closed}</span></>
    : <><span>Now showing</span>{` `}<span {...(say.rec ? REC : {})}>{say.name}</span><span>: </span>{say.counts.map((c, k) => <u.Fragment key={k}>{k ? <span>, </span> : null}<span>{c.t}</span></u.Fragment>)}</>) : null;
  return (
    <div className="ust" ref={expose} data-lang={lang}>
      <h2 className="usm-sr">Tree</h2>
      <div className="ust-bar">
        <button type="button" className="usm-btn" onClick={openAll}>Open all</button>
        <button type="button" className="usm-btn" onClick={closeAll}>Close all</button>
        <span className="ust-grow" />
        <p className="ust-hint">Tap a branch or a list to open it. Tap a name for its details.</p>
        <div className="ust-zoom" role="group" aria-label="Zoom">
          <button type="button" className="usm-btn ust-zb" aria-label="Zoom out" onClick={() => applyScale(S.current.scale - 0.15)}><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3.5 8h9" /></svg></button>
          <button type="button" className="usm-btn ust-zb" aria-label="Zoom in" onClick={() => applyScale(S.current.scale + 0.15)}><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3.5 8h9M8 3.5v9" /></svg></button>
          <button type="button" className="usm-btn ust-fit" onClick={fit}><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" /></svg><span className="ust-t">Fit</span></button>
        </div>
      </div>
      <div className="ust-scroll" ref={scRef} role="region" aria-label="The tree" tabIndex={-1} onKeyDown={onKey} onMouseOver={hot} onFocus={hot} onMouseLeave={cold} onBlur={cold}>
        <div className="ust-sizer" ref={sizerRef}>
          <div className="ust-inner" ref={innerRef}>
            <svg className="ust-svg" ref={svgRef} aria-hidden="true" />
            <div className="ust-nodes">{vis.map(node)}</div>
          </div>
        </div>
      </div>
      <p className="usm-sr" aria-live="polite">{words}</p>
    </div>
  );
}
/* an id the page can use (letters, digits, and dashes) */
function cxUstDom(id) { return String(id).replace(/[^A-Za-z0-9_-]+/g, `-`); }

/* The details card for one name in the Tree, in the map's own sheet: what it is, where it sits in the Tree, why it is listed there with the
   record's own word, a committee's two plain lines with their review notice, and Open profile, Show on the map, Explore in Index, and the
   record's own website. It closes with Done, a tap outside, Escape, a swipe down, and the back gesture (CX_UsMap's openX and closeX). */
function CX_UstCard({ g, M, data, o, phone, still, sheetRef, onClose, onProfile, onMap, onIndex }) {
  const n = g.nodes[o.i], sh = cxUsMapSheet(g, M, data, o.i), url = cxUstUrl(n);
  return (
    <CX_UsMapSheet cls="usx-note ust-info" hid="usx-note-h" noActs tall rec={M.nodes[o.i].kind !== `hub`} phone={phone} still={still} sheetRef={sheetRef} fresh onPeek={() => {}} onMove={() => {}} onClose={onClose}
      info={{ kicker: sh.kicker, name: sh.name, sentence: sh.sentence, fact: sh.fact, lists: [], src: sh.src }}
      lead={<>
        {o.path && o.path.length ? <p className="ust-path"><span>In </span>{o.path.map((p, k) => <u.Fragment key={k}>{k ? <span aria-hidden="true">{` › `}</span> : null}<span {...(p.rec ? CX_USI_REC : {})}>{p.t}</span></u.Fragment>)}</p> : null}
        {o.from && o.word ? <div className="usi-why"><h3>Why it is linked</h3><p><span {...CX_USI_REC}>{o.from}</span><span>: </span><b>{o.word}</b></p></div> : null}
        {n.kind === `committee` ? <CX_UsxLines id={n.c.id} /> : null}
      </>}
      tail={<div className="usi-card-acts">
        <button type="button" className="usm-btn usm-pri" onClick={onProfile}>Open profile</button>
        <button type="button" className="usm-btn" onClick={onMap}>Show on the map</button>
        <button type="button" className="usm-btn" onClick={onIndex}>Explore in Index</button>
        {url ? <a className="usm-btn" href={url} target="_blank" rel="noreferrer">Official website<span className="sp-ext"> (opens in a new tab)</span></a> : null}
      </div>} />
  );
}
