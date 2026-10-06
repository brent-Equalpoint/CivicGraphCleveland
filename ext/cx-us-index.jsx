/* The Index: layout and interactions ported from Brent's VC Fest Index kit (index-kit: src/index.template.html and src/map-shell.js). */
/* The front page lists six groups (Members of Congress, Committees, Executive branch, Courts and judges, Policy areas, States), each with its
   count. Pick a group, then a name: that name moves to the middle of the page with every group tied to it on the record, and you can keep
   going. Each move is a step in the browser's history (CX_UsMap keeps the steps), so Back, the phone's back gesture, Escape, and Backspace
   step back one name at a time and return to the same group, list page, and scroll. On a computer the name sits on the left as a slowly
   turning globe (decoration only, still when motion is Still or the device asks for less), its groups in a column, and the chosen group's
   names fan out on the right on curved lines, a page at a time. On a phone it is one column: the globe and the name, the groups as buttons,
   then the list, 60 at a time.
   Pages are built when they are opened, from the same model as the map (cxUsGraph, cxUsMapModel, cxUsMapSheet): nothing is baked.
   What changed from the kit, on purpose: a row shows the record's own word (Chair, Member, Appointed by), never a strength; the ring by the
   title is a plain count; groups keep the record's order and names are alphabetical or in the record's order, never by how many ties they
   have; party is not used anywhere here; kinds are told apart by shape and word, in the map's color families; there are no dots beside
   labels. A name with no page of its own (a subcommittee) opens a details card in the map's own sheet. The part above the React line is pure. */

const CX_USI_PHONE = 60;    // a phone list shows this many names, then Show more
const CX_USI_WIDE = 900;    // the kit's breakpoint: narrower than this, the Index is one column
const CX_USI_FONT = `"Schibsted Grotesk", Inter, ui-sans-serif, system-ui, sans-serif`;

/* names in alphabetical order by last name, as the record spells them */
function cxUsiLast(n) {
  if (n.m && n.m.last) return n.m.last;
  if (n.j && n.j.last) return n.j.last;
  const w = String(n.name).replace(/,?\s+(Jr\.|Sr\.|II|III|IV)$/, ``).split(/\s+/);
  return w[w.length - 1] || String(n.name);
}
function cxUsiAbc(a, b) { return cxUsiLast(a).localeCompare(cxUsiLast(b)) || a.name.localeCompare(b.name); }
function cxUsiByName(a, b) { return a.name.localeCompare(b.name); }
/* one row: a node of the map's model (it has a page), a state or a policy area (pages of their own), a subcommittee (a details card), or a
   plain line (nothing to open). shape and color are the map's, so a kind looks the same here as on the map. */
function cxUsiNode(g, M, i, note) {
  const m = M.nodes[i];
  return { key: g.nodes[i].id, i, name: g.nodes[i].name, note: note || ``, shape: m.shape, color: m.kind === `hub` ? CX_USM_COLORS[m.branch] : cxUsmColor(m), act: `drill`, rec: m.kind !== `hub` };
}
function cxUsiStateItem(code, note) { return { key: `st:${code}`, i: null, name: cxStateName(code), note: note || ``, shape: `diamond`, color: null, act: `drill` }; }
function cxUsiAreaItem(area, note) { return { key: `pa:${area}`, i: null, name: area, note: note || ``, shape: `bars`, color: null, act: `drill` }; }
function cxUsiSubItem(parent, s, note) { return { key: null, i: null, sub: s.id, name: s.name, note: note || ``, shape: `hex`, color: CX_USM_FAMILY.committee[parent.c.chamber] || CX_USM_FAMILY.committee.joint, act: `card`, rec: !0 }; }
function cxUsiMuted(name) { return { key: null, i: null, name, note: ``, shape: null, color: null, act: `muted` }; }
/* a member's office, as the map's sheet says it (never party) */
function cxUsiWho(n) {
  const m = n.m, st = cxStateName(m.state);
  if (m.chamber === `senate`) return `Senator, ${st}`;
  if (CX_USM_TERR.has(m.state)) return m.state === `PR` ? `Resident Commissioner, Puerto Rico` : `Delegate, ${st}`;
  return m.district ? `Representative, ${st}, district ${m.district}` : `Representative, ${st}, at large`;
}
/* a member's seat word for their state's page and their own (the record's: Senator, District 11, At large, Delegate) */
function cxUsiSeatOf(m) {
  if (m.chamber === `senate`) return `Senator`;
  if (CX_USM_TERR.has(m.state)) return m.state === `PR` ? `Resident Commissioner` : `Delegate`;
  return m.district ? `District ${m.district}` : `At large`;
}
function cxUsiJudgeWord(j) { return j.title === `Judge` ? (j.chief ? `Chief judge` : `Judge`) : j.title; }
function cxUsiChamberWord(ch) { return ch === `joint` ? `Joint committee` : ch === `senate` ? `Senate committee` : `House committee`; }
function cxUsiCount(gr) { return gr.items.filter((x) => x.act !== `muted`).length; }

/* the front page: every group, each with its count, in the order of the record's own doors (CX_US_DOORS) */
function cxUsiFront(data, g, M, vd) {
  const of = (k) => g.nodes.filter((n) => n.kind === k);
  const it = (n, note) => cxUsiNode(g, M, n.i, note);
  const groups = [];
  const add = (key, label, one, many, items, extra) => groups.push({ key, label, one, many, items, ...(extra || {}) });
  add(`members`, `Members of Congress`, `member`, `members`, of(`member`).sort(cxUsiAbc).map((n) => it(n, cxUsiWho(n))));
  add(`committees`, `Committees`, `committee`, `committees`, of(`committee`).sort(cxUsiByName).map((n) => it(n, cxUsiChamberWord(n.c.chamber))));
  const pres = of(`president`), ag = of(`agency`);
  add(`executive`, `Executive branch`, `leader or agency`, `leaders and agencies`, [
    ...pres.filter((n) => n.p.current).map((n) => it(n, n.p.role === `Vice President` ? `Vice President` : `President`)),
    ...of(`cabinet`).map((n) => it(n, n.cab.title)),
    ...pres.filter((n) => !n.p.current).map((n) => it(n, `Former President`)),
    ...ag.filter((n) => !n.a.parent_id).sort(cxUsiByName).map((n) => it(n, `Federal agency`)),
    ...ag.filter((n) => n.a.parent_id).sort(cxUsiByName).map((n) => it(n, `Part of a larger agency`)),
  ]);
  const co = of(`court`), ty = (t) => co.filter((n) => n.c.type === t).sort(cxUsiByName);
  add(`courts`, `Courts and judges`, `court or judge`, `courts and judges`, [
    ...ty(`supreme`).map((n) => it(n, `The highest federal court`)), ...ty(`appeals`).map((n) => it(n, `Court of appeals`)),
    ...ty(`district`).map((n) => it(n, `District court`)), ...ty(`other`).map((n) => it(n, `Federal court`)),
    ...of(`judge`).sort(cxUsiAbc).map((n) => it(n, cxUsiJudgeWord(n.j))),
  ]);
  if (vd) add(`areas`, `Policy areas`, `policy area`, `policy areas`, cxUsAreaList(vd).map((a) => cxUsiAreaItem(a.area, a.votes === 1 ? `1 deciding vote` : `${a.votes} deciding votes`)));
  else add(`areas`, `Policy areas`, `policy area`, `policy areas`, [cxUsiMuted(`Loading the votes...`)], { wait: !0 });
  const sc = new Map();
  data.members.forEach((m) => { const s = sc.get(m.state) || { senate: 0, house: 0 }; s[m.chamber] += 1; sc.set(m.state, s); });
  add(`states`, `States`, `state`, `states`, [...sc.keys()].sort((a, b) => cxStateName(a).localeCompare(cxStateName(b))).map((c) => cxUsiStateItem(c, `Senators: ${sc.get(c).senate}. Representatives: ${sc.get(c).house}.`)));
  return { key: ``, i: null, title: `United States`, kicker: ``, lead: [`Six ways into the federal government.`], ring: null, groups };
}

/* one page, built when it is opened: the groups tied to this one thing on the record, each in the record's order or alphabetical */
function cxUsiPage(data, g, M, vd, key) {
  if (key.startsWith(`st:`)) return cxUsiStatePage(data, g, M, key.slice(3));
  if (key.startsWith(`pa:`)) return cxUsiAreaPage(g, M, vd, key.slice(3));
  const n = g.byId.get(key); if (!n) return null;
  const i = n.i, sh = cxUsMapSheet(g, M, data, i);
  const conn = (f) => g.adj[i].map((ei) => { const e = g.edges[ei], o = e.a === i ? e.b : e.a; return { i: o, n: g.nodes[o], e, l: M.links[ei] }; }).filter((x) => f(x.n, x));
  const abc = (a, b) => cxUsiAbc(a.n, b.n);
  const P = { key, i, title: sh.name, kicker: sh.kicker, cid: null, ring: null, lead: [], groups: [], kind: n.kind };
  const grp = (k, label, one, many, items) => { if (items.length) P.groups.push({ key: k, label, one, many, items }); };
  const node = (x, note) => cxUsiNode(g, M, x.i, note);
  if (n.kind === `member`) {
    const m = n.m, terr = CX_USM_TERR.has(m.state), full = [], subs = [];
    m.committees.forEach((c) => {   // the record's own order, and its own word for each seat
      const exact = g.byId.get(`c:${c.id}`), parent = exact || g.byId.get(`c:${c.id.slice(0, 4)}`);
      if (!parent) return;
      if (exact) full.push(cxUsiNode(g, M, exact.i, cxUsmRole(c.role)));
      else { const s = parent.c.subcommittees.find((x) => x.id === c.id); if (s) subs.push(cxUsiSubItem(parent, s, cxUsmRole(c.role))); }
    });
    grp(`committees`, `Committees`, `committee`, `committees`, full);
    grp(`subcommittees`, `Subcommittees`, `subcommittee`, `subcommittees`, subs);
    grp(`state`, `State`, `state`, `states`, [cxUsiStateItem(m.state, cxUsiSeatOf(m))]);
    const hub = g.byId.get(m.chamber === `senate` ? `h:senate` : `h:house`);
    grp(`chamber`, `Chamber`, `chamber`, `chambers`, [cxUsiNode(g, M, hub.i, terr ? `Delegate` : `Member`)]);
    P.ring = { n: full.length, one: `committee`, many: `committees` };
  } else if (n.kind === `committee`) {
    const c = n.c, mem = conn((o) => o.kind === `member`);
    const rank = (r) => (/^(chair|chairman|chairwoman)$/i.test(r) ? 0 : /^co/i.test(r) ? 1 : /^vice/i.test(r) ? 2 : /^ranking/i.test(r) ? 3 : 4);
    grp(`leaders`, `Chair and leaders`, `person`, `people`, mem.filter((x) => x.l.line === `lead`).sort((a, b) => rank(a.e.rel) - rank(b.e.rel) || abc(a, b)).map((x) => node(x, cxUsmRole(x.e.rel))));
    grp(`senate`, `Senate members`, `member`, `members`, mem.filter((x) => x.n.m.chamber === `senate`).sort(abc).map((x) => node(x, cxUsmRole(x.e.rel))));
    grp(`house`, `House members`, `member`, `members`, mem.filter((x) => x.n.m.chamber === `house`).sort(abc).map((x) => node(x, cxUsmRole(x.e.rel))));
    grp(`subcommittees`, `Subcommittees`, `subcommittee`, `subcommittees`, c.subcommittees.map((s) => cxUsiSubItem(n, s, s.chair ? `Chair: ${s.chair}` : ``)));
    // a joint committee belongs to both chambers (the map pulls it toward both)
    const halls = c.chamber === `joint` ? [g.byId.get(`h:senate`), g.byId.get(`h:house`)] : conn((o) => o.kind === `hub`).map((x) => x.n);
    grp(`chamber`, `Chamber`, `chamber`, `chambers`, halls.map((h) => cxUsiNode(g, M, h.i, cxUsiChamberWord(c.chamber))));
    P.ring = { n: mem.length, one: `member`, many: `members` };
    P.cid = c.id;
  } else if (n.kind === `agency`) {
    const a = n.a, up = a.parent_id ? g.byId.get(`a:${a.parent_id}`) : null;
    const kids = conn((o) => o.kind === `agency` && o.a.parent_id === a.id).sort((x, y) => cxUsiByName(x.n, y.n));
    if (up) grp(`parent`, `Part of`, `larger agency`, `larger agencies`, [cxUsiNode(g, M, up.i, up.a.parent_id ? `Agency` : `Top-level agency`)]);
    else grp(`parent`, `Part of`, `branch`, `branches`, conn((o) => o.kind === `hub`).map((x) => node(x, `Branch`)));
    grp(`parts`, `Agencies under it`, `agency`, `agencies`, kids.map((x) => node(x, x.n.a.short_name && x.n.a.short_name !== x.n.name ? x.n.a.short_name : ``)));
    grp(`led`, `Led by`, `person`, `people`, [cxUsiMuted(`Not in our record yet`)]);
    if (kids.length) P.ring = { n: kids.length, one: `agency under it`, many: `agencies under it` };
  } else if (n.kind === `court`) {
    const c = n.c, up = c.circuit ? g.byId.get(`k:${c.circuit}`) : null;
    const judges = conn((o) => o.kind === `judge`).sort(abc);
    const lower = conn((o) => o.kind === `court` && (o.c.circuit === c.id || (c.type === `supreme` && o.c.type === `appeals`))).sort((x, y) => cxUsiByName(x.n, y.n));
    const higher = up ? [up] : c.type === `appeals` ? conn((o) => o.kind === `court` && o.c.type === `supreme`).map((x) => x.n) : [];
    grp(`judges`, `Judges`, `judge`, `judges`, judges.map((x) => node(x, cxUsiJudgeWord(x.n.j))));
    grp(`up`, `Its appeals go to`, `court`, `courts`, higher.map((h) => cxUsiNode(g, M, h.i, h.c.type === `supreme` ? `Supreme Court` : `Court of appeals`)));
    grp(`lower`, `Hears appeals from`, `court`, `courts`, lower.map((x) => node(x, x.n.c.type === `appeals` ? `Court of appeals` : `District court`)));
    // who appointed its sitting judges, in the order they served (the record's order), never by how many
    const by = new Set(judges.map((x) => x.n.j.appointed_by_id));
    grp(`appointed`, `Appointed by`, `president`, `presidents`, g.nodes.filter((o) => o.kind === `president` && by.has(o.p.id)).map((o) => cxUsiNode(g, M, o.i, o.p.current ? `President` : `Former President`)));
    P.ring = { n: judges.length, one: `judge`, many: `judges` };
  } else if (n.kind === `judge`) {
    const j = n.j, co = g.byId.get(`k:${j.court_id}`), who = conn((o) => o.kind === `president`)[0];
    if (co) grp(`court`, `Court`, `court`, `courts`, [cxUsiNode(g, M, co.i, cxUsiJudgeWord(j))]);
    if (who) grp(`by`, `Appointed by`, `president`, `presidents`, [node(who, who.n.p.current ? `President` : `Former President`)]);
  } else if (n.kind === `president`) {
    const p = n.p;
    grp(`cabinet`, `Cabinet`, `person`, `people`, conn((o) => o.kind === `cabinet`).map((x) => node(x, x.n.cab.title)));
    const judges = conn((o) => o.kind === `judge`).sort(abc);
    grp(`judges`, `Judges appointed`, `judge`, `judges`, judges.map((x) => node(x, x.n.where || `Judge`)));
    grp(`branch`, `Branch`, `branch`, `branches`, conn((o) => o.kind === `hub`).map((x) => node(x, p.current ? `Leader` : `Former leader`)));
    if (judges.length) P.ring = { n: judges.length, one: `judge appointed`, many: `judges appointed` };
  } else if (n.kind === `cabinet`) {
    grp(`pres`, `Serves in the cabinet of`, `president`, `presidents`, conn((o) => o.kind === `president`).map((x) => node(x, `President`)));
    grp(`led`, `Agency it leads`, `agency`, `agencies`, [cxUsiMuted(`Not linked yet`)]);
  } else if (n.id === `h:senate` || n.id === `h:house`) {
    const ch = n.id === `h:senate` ? `senate` : `house`, mem = conn((o) => o.kind === `member`).sort(abc);
    grp(`members`, `Members`, `member`, `members`, mem.map((x) => node(x, ch === `senate` ? cxStateName(x.n.m.state) : x.n.m.district ? `${cxStateName(x.n.m.state)}, district ${x.n.m.district}` : cxStateName(x.n.m.state))));
    grp(`committees`, `Committees`, `committee`, `committees`, conn((o) => o.kind === `committee`).sort((a, b) => cxUsiByName(a.n, b.n)).map((x) => node(x, cxUsiChamberWord(x.n.c.chamber))));
    P.ring = { n: mem.length, one: `member`, many: `members` };
  } else if (n.id === `h:exec`) {
    const lead = conn((o) => o.kind === `president`), cab = g.nodes.filter((o) => o.kind === `cabinet`), tops = conn((o) => o.kind === `agency`).sort((a, b) => cxUsiByName(a.n, b.n));
    grp(`leaders`, `Leaders`, `person`, `people`, lead.map((x) => node(x, x.n.p.role === `Vice President` ? `Vice President` : x.n.p.current ? `President` : `Former President`)));
    grp(`cabinet`, `Cabinet`, `person`, `people`, cab.map((o) => cxUsiNode(g, M, o.i, o.cab.title)));
    grp(`agencies`, `Top-level agencies`, `agency`, `agencies`, tops.map((x) => node(x, `Federal agency`)));
    P.ring = { n: tops.length, one: `top-level agency`, many: `top-level agencies` };
  } else {
    const co = conn((o) => o.kind === `court`), ty = (t) => co.filter((x) => x.n.c.type === t).sort((a, b) => cxUsiByName(a.n, b.n));
    const circ = (x) => { const u0 = x.n.c.circuit ? g.byId.get(`k:${x.n.c.circuit}`) : null; return u0 ? u0.label : `District court`; };
    grp(`supreme`, `Supreme Court`, `court`, `courts`, ty(`supreme`).map((x) => node(x, `The highest federal court`)));
    grp(`appeals`, `Courts of appeals`, `court`, `courts`, ty(`appeals`).map((x) => node(x, `Court of appeals`)));
    grp(`district`, `District courts`, `court`, `courts`, ty(`district`).map((x) => node(x, circ(x))));
    grp(`other`, `Other courts`, `court`, `courts`, ty(`other`).map((x) => node(x, `Federal court`)));
    P.ring = { n: co.length, one: `court`, many: `courts` };
  }
  return P;
}
/* a state or territory: its senators, then its representatives in district order (the record's order) */
function cxUsiStatePage(data, g, M, code) {
  const ms = cxUsStateMembers(data, code).map((m) => g.byId.get(`m:${m.id}`)).filter(Boolean);
  const P = { key: `st:${code}`, i: null, title: cxStateName(code), kicker: code === `DC` ? `Federal district` : CX_USM_TERR.has(code) ? `Territory` : `State`, cid: null, ring: null, lead: [], groups: [], state: code };
  const sen = ms.filter((n) => n.m.chamber === `senate`), rep = ms.filter((n) => n.m.chamber === `house`);
  if (sen.length) P.groups.push({ key: `senators`, label: `Senators`, one: `senator`, many: `senators`, items: sen.map((n) => cxUsiNode(g, M, n.i, `Senator`)) });
  if (rep.length) P.groups.push({ key: `representatives`, label: `Representatives`, one: `representative`, many: `representatives`, items: rep.map((n) => cxUsiNode(g, M, n.i, cxUsiSeatOf(n.m))) });
  P.ring = { n: ms.length, one: `member of Congress`, many: `members of Congress` };
  return P;
}
/* a policy area: the members who cast a recorded vote (yea, nay, or present) that decided a bill or a nominee in it, as the map's Solo shows */
function cxUsiAreaPage(g, M, vd, area) {
  const P = { key: `pa:${area}`, i: null, title: area, kicker: `Policy area`, cid: null, ring: null, lead: [], groups: [], area, wait: !vd };
  if (!vd) { P.groups.push({ key: `wait`, label: `Members`, one: `member`, many: `members`, items: [cxUsiMuted(`Loading the votes...`)] }); return P; }
  const ids = cxUsmAreaMembers(vd, area), votes = (cxUsAreaList(vd).find((a) => a.area === area) || { votes: 0 }).votes;
  const mem = g.nodes.filter((n) => n.kind === `member` && ids.has(n.m.id)).sort(cxUsiAbc);
  const sen = mem.filter((n) => n.m.chamber === `senate`), rep = mem.filter((n) => n.m.chamber === `house`);
  if (sen.length) P.groups.push({ key: `senators`, label: `Senators`, one: `senator`, many: `senators`, items: sen.map((n) => cxUsiNode(g, M, n.i, cxStateName(n.m.state))) });
  if (rep.length) P.groups.push({ key: `representatives`, label: `Representatives`, one: `representative`, many: `representatives`, items: rep.map((n) => cxUsiNode(g, M, n.i, n.m.district ? `${cxStateName(n.m.state)}, district ${n.m.district}` : cxStateName(n.m.state))) });
  P.lead = [`Votes that decided something: ${votes}.`, `Not voting is not a no.`];
  P.ring = { n: mem.length, one: `member cast a deciding vote`, many: `members cast a deciding vote` };
  return P;
}
/* what a step in the Index is called (in the crumbs and the spoken update) */
function cxUsiName(g, key) {
  if (!key) return `United States`;
  if (key.startsWith(`st:`)) return cxStateName(key.slice(3));
  if (key.startsWith(`pa:`)) return key.slice(3);
  const n = g.byId.get(key); return n ? n.name : key;
}

/* Where everything sits on a computer (the kit's geometry, with 44 px names). The names of the chosen group are laid out a page at a time:
   each takes one line, or more where its name or its word wraps in the room on the right, so no two ever overlap. */
function cxUsiLayout(W, H, nG, depth, items, page, measure, headH) {
  const R = Math.max(46, Math.min(60, H * 0.075)), Sz = Math.round(R * 3);
  const cw = Math.round(Math.min(330, Math.max(296, W * 0.24))), ch = 74, gap = 12;
  const tot = nG * ch + Math.max(0, nG - 1) * gap, topY = Math.round(Math.max(depth ? 76 : 28, (H - tot) / 2));
  // the globe sits level with the middle of the groups (as in the kit), so its lines run sideways and never across the words under it
  const ox = Math.round(Math.max(R * 2.4, W * 0.12)), oy = Math.round(Math.max(R + 70, Math.min(topY + tot / 2 - 30, H - 16 - headH - R - 14)));
  const x0 = Math.round(ox + R + Math.max(96, W * 0.07));
  const apex = Math.round(Math.min(W - 300, x0 + cw + Math.max(150, W * 0.13)));
  const top0 = depth ? 76 : 60, bot = H - 20, span = bot - top0, cyM = (top0 + bot) / 2;
  const aw = Math.max(170, W - apex - 40) - 20;   // the room for a name and its word (the label's padding taken off)
  const slot = (it) => {
    const nw = measure(it.name, 1), ow = it.note ? measure(it.note, 0) : 0;
    let h;
    if (nw + (ow ? ow + 10 : 0) <= aw) h = 20;
    else { const ln = Math.max(1, Math.ceil((nw * 1.12) / aw)); h = ln * 20 + (ow ? 18 : 0); }
    return Math.max(46, h + 16);
  };
  // pages: as many names as fit, the last place kept for "and n more"
  const room = span - 48, pages = [];
  let at = 0;
  while (at < items.length) { let used = 0, k = at; while (k < items.length && (k === at || used + slot(items[k]) <= room)) { used += slot(items[k]); k += 1; } pages.push([at, k]); at = k; }
  if (!pages.length) pages.push([0, 0]);
  const p = ((page % pages.length) + pages.length) % pages.length, [a, b] = pages[p], list = items.slice(a, b), more = pages.length > 1;
  const slots = list.map(slot).concat(more ? [46] : []), total = slots.reduce((t, v) => t + v, 0);
  let y = cyM - total / 2;
  const pts = slots.map((s) => { const c = y + s / 2; y += s; const t = span ? (c - cyM) / (span / 2) : 0; return { x: Math.round(apex - 90 * t * t), y: Math.round(c), h: s }; });
  return { R, Sz, ox, oy, cw, ch, gap, x0, topY, apex, cyM, list, more, pages: pages.length, page: p, pts, aw, rest: items.length - list.length };
}

/* the globe: dots on a slowly turning sphere, lit in the color of what the page is about (the kit's kmOrb). Decoration only. */
function cxUsiOrb(cv, t, tint, ink, turn, sweep) {
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1), Sz = cv.clientWidth; if (!Sz) return;
  if (cv.width !== Math.round(Sz * dpr)) { cv.width = Math.round(Sz * dpr); cv.height = Math.round(Sz * dpr); }
  const x = cv.getContext(`2d`); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, Sz, Sz);
  const R = Sz / 3, cx = Sz / 2, cy = Sz / 2, hex = /^#[0-9a-f]{6}$/i.test(tint);
  if (hex) { const at = x.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.5); at.addColorStop(0, `${tint}1f`); at.addColorStop(1, `${tint}00`); x.fillStyle = at; x.beginPath(); x.arc(cx, cy, R * 1.5, 0, 7); x.fill(); }
  const spin = turn ? (t / 60000) * Math.PI * 2 : 0, tl = 0.32, sw = ((t / 3200) % 1) * 2.6 - 1.3;
  for (let i = 0; i < 16; i++) {
    const ph = -Math.PI / 2 + ((i + 0.5) / 16) * Math.PI, rr = Math.cos(ph), cnt = Math.max(4, Math.round(40 * rr));
    for (let j = 0; j < cnt; j++) {
      const th = (j / cnt) * Math.PI * 2 + spin, px = rr * Math.sin(th), py = Math.sin(ph), pz = rr * Math.cos(th);
      const y2 = py * Math.cos(tl) - pz * Math.sin(tl), z2 = py * Math.sin(tl) + pz * Math.cos(tl);
      const boost = sweep ? Math.max(0, 1 - Math.abs(y2 - sw) / 0.3) : 0, front = z2 >= 0, lit = front && boost > 0.25 && hex;
      x.globalAlpha = front ? 0.34 + boost * 0.55 : 0.06; x.fillStyle = lit ? tint : ink;
      x.beginPath(); x.arc(cx + px * R, cy + y2 * R, 1.4 + (lit ? 0.5 : 0), 0, 7); x.fill();
    }
  }
  x.globalAlpha = 1; x.fillStyle = hex ? tint : ink; x.beginPath(); x.arc(cx, cy, 4.5, 0, 7); x.fill();
  x.globalAlpha = 0.22; x.beginPath(); x.arc(cx, cy, 10, 0, 7); x.fill(); x.globalAlpha = 1;
}

/* ---------- React ---------- */

/* a kind's shape beside its word: the map's own shapes, and two more for the pages that are not on the map (a state, a policy area) */
function CxUsiShape({ shape, color }) {
  if (shape === `diamond`) return <svg className="usm-glyph" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.6L14.4 8L8 14.4L1.6 8Z" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>;
  if (shape === `bars`) return <svg className="usm-glyph" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="9" width="3" height="5" fill="currentColor" /><rect x="6.5" y="6" width="3" height="8" fill="currentColor" /><rect x="11" y="2" width="3" height="12" fill="currentColor" /></svg>;
  if (!shape) return null;
  return <CxUsmShape shape={shape} color={color} />;
}
/* the same shapes, where a line ends beside a name on a computer */
function cxUsiMark(it, x, y, k) {
  const c = it.color || `currentColor`, r = 4.5;
  if (!it.shape) return null;
  if (it.shape === `square`) return <rect key={k} x={x - r} y={y - r} width={2 * r} height={2 * r} fill={c} />;
  if (it.shape === `hex` || it.shape === `hexo`) {
    const pts = [0, 1, 2, 3, 4, 5].map((j) => { const a = -Math.PI / 2 + (j * Math.PI) / 3; return `${(x + r * 1.15 * Math.cos(a)).toFixed(1)},${(y + r * 1.15 * Math.sin(a)).toFixed(1)}`; }).join(` `);
    return it.shape === `hex` ? <polygon key={k} points={pts} fill={c} /> : <polygon key={k} points={pts} fill={c} fillOpacity="0.28" stroke={c} strokeWidth="1.6" />;
  }
  if (it.shape === `ring`) return <circle key={k} cx={x} cy={y} r={r} fill="none" stroke={c} strokeWidth="1.8" />;
  if (it.shape === `diamond`) return <path key={k} d={`M${x} ${y - r - 1}L${x + r + 1} ${y}L${x} ${y + r + 1}L${x - r - 1} ${y}Z`} className="usi-mk-ink" fill="none" strokeWidth="1.6" />;
  if (it.shape === `bars`) return <g key={k} className="usi-mk-fill"><rect x={x - 5} y={y} width="2.6" height="4" /><rect x={x - 1.3} y={y - 2.5} width="2.6" height="6.5" /><rect x={x + 2.4} y={y - 5} width="2.6" height="9" /></g>;
  return <circle key={k} cx={x} cy={y} r={r - 0.5} fill={c} />;
}
/* a count in a plain circle: how many, never how much */
function CxUsiCount({ n, size = 44 }) {
  const c = size / 2, s = n.toLocaleString(`en-US`);
  return (
    <svg className="usi-count" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={c} cy={c} r={c - 3} fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.45" />
      <text x={c} y={c} textAnchor="middle" dominantBaseline="central" fill="currentColor" fontSize={s.length > 4 ? 12 : 13} fontWeight="700">{s}</text>
    </svg>
  );
}
const CX_USI_REC = { 'data-no-translate': ``, lang: `en` };   // a name from the record stays as the record writes it, in both languages

/* The Index view. stack: the keys opened, oldest first ([] is the front page); CX_UsMap owns it and the history steps. onGo(key) opens one more,
   onUp() steps back one, onTo(depth) goes back to an earlier step. onCard(item, page, from) opens a details card; onProfile(i), onMap(page),
   onTopics(area) leave for the profile, the map, or Votes by topic. */
function CX_UsIndex({ data, g, M, phone, motion, still, stack, onGo, onUp, onTo, onCard, onProfile, onMap, onTopics }) {
  const [vd, setVd] = u.useState(CX_USV.v);
  u.useEffect(() => { let live = !0; if (!CX_USV.v) cxUsVotesLoad().then((d) => { if (live && d) setVd(d); }); return () => { live = !1; }; }, []);
  const X = useCxUsx(!0);   // what each committee does, for a committee's page
  const [lang] = useCxLang();   // the words are measured in the reader's language, so a longer Spanish word still has its room
  const rootRef = u.useRef(null), orbRef = u.useRef(null), stageRef = u.useRef(null), titleRef = u.useRef(null);
  const [box, setBox] = u.useState({ W: 0, H: 0 });
  u.useLayoutEffect(() => {
    const el = rootRef.current; if (!el) return undefined;
    const f = () => setBox((b) => (b.W === el.clientWidth && b.H === el.clientHeight ? b : { W: el.clientWidth, H: el.clientHeight }));
    f();
    const ro = globalThis.ResizeObserver ? new globalThis.ResizeObserver(f) : null;
    if (ro) ro.observe(el); else globalThis.addEventListener(`resize`, f);
    return () => { if (ro) ro.disconnect(); else globalThis.removeEventListener(`resize`, f); };
  }, []);
  const top = stack.length ? stack[stack.length - 1] : ``;
  const P = u.useMemo(() => (top ? cxUsiPage(data, g, M, vd, top) : cxUsiFront(data, g, M, vd)), [top, vd, data, g, M]);
  const path = stack.join(`>`);
  // each page keeps its own chosen group, list page, and phone length, so stepping back returns to the same list
  const [uiAll, setUiAll] = u.useState({});
  const ui = uiAll[path] || { active: 0, page: 0, shown: CX_USI_PHONE };
  const setUi = (o) => setUiAll((a) => ({ ...a, [path]: { ...(a[path] || { active: 0, page: 0, shown: CX_USI_PHONE }), ...o } }));
  const G = P ? P.groups : [];
  const active = Math.max(0, Math.min(ui.active, G.length - 1));
  const gr = G[active] || null;
  const ready = box.W > 0;
  const wide = ready && !phone && box.W >= CX_USI_WIDE;
  const depth = stack.length;
  // text widths for the layout, measured once each
  const mR = u.useRef({ cx: null, w: new Map() });
  const measure = (s, bold) => {
    const m = mR.current, t = bold ? String(s) : cxUsmTr(String(s)), k = `${bold ? 1 : 0}|${lang}|${t}`;
    let w = m.w.get(k);
    if (w == null) { if (!m.cx) m.cx = globalThis.document.createElement(`canvas`).getContext(`2d`); m.cx.font = bold ? `700 15px ${CX_USI_FONT}` : `600 14px ${CX_USI_FONT}`; w = m.cx.measureText(t).width; m.w.set(k, w); }
    return w;
  };
  // how tall the words under the globe will be, so the globe can sit high enough for them to fit
  const headW = Math.min(300, 2 * (Math.round(Math.max(Math.max(46, Math.min(60, box.H * 0.075)) * 2.4, box.W * 0.12)) - 12));
  // (a first guess from the words, then the height it really drew at, so the block always ends inside the page)
  const [headM, setHeadM] = u.useState({});
  const headKey = `${path}|${box.W}|${box.H}|${lang}|${X ? 1 : 0}`;
  const headH = !P ? 0 : headM[headKey] || 30 + Math.ceil((measure(P.title, 1) * 1.5) / Math.max(120, headW)) * 28 + (P.cid ? 170 : 0) + (P.lead && P.lead.length ? 24 * P.lead.length : 0) + (P.ring ? 56 : 0) + (P.key ? 112 : 0);
  const L = wide && gr ? cxUsiLayout(box.W, box.H, G.length, depth, gr.items, ui.page, measure, headH) : null;
  u.useLayoutEffect(() => {
    if (!wide || !rootRef.current) return;
    const el = rootRef.current.querySelector(`.usi-head`), h = el ? Math.ceil(el.getBoundingClientRect().height) : 0;
    if (h && Math.abs(h - headH) > 4) setHeadM((m) => ({ ...m, [headKey]: h }));
  });
  const [hot, setHot] = u.useState(-1);
  const tintOf = () => {
    if (P && P.i !== null && P.i !== undefined) { const m = M.nodes[P.i]; return m.kind === `hub` ? CX_USM_COLORS[m.branch] : cxUsmColor(m); }
    return ``;
  };
  // the globe turns while motion is Calm or Live and the device asks for no less; it is drawn once and stays still otherwise
  u.useEffect(() => {
    const cv = orbRef.current; if (!cv) return undefined;
    const cs = globalThis.getComputedStyle(rootRef.current), ink = cs.color, tint = tintOf() || cs.getPropertyValue(`--u-soft`).trim();
    const turn = !still, sweep = !still && motion === `live`;
    let raf = 0;
    const loop = (t) => { raf = 0; if (globalThis.document.hidden) return; cxUsiOrb(cv, t, tint, ink, turn, sweep); raf = requestAnimationFrame(loop); };
    cxUsiOrb(cv, globalThis.performance.now(), tint, ink, turn, sweep);
    cv.dataset.turning = turn ? `1` : `0`;
    if (turn) raf = requestAnimationFrame(loop);
    const vis = () => { if (!globalThis.document.hidden && turn && !raf) raf = requestAnimationFrame(loop); };
    globalThis.document.addEventListener(`visibilitychange`, vis);
    return () => { if (raf) cancelAnimationFrame(raf); globalThis.document.removeEventListener(`visibilitychange`, vis); };
  }, [path, still, motion, wide, ready, !!P]);

  // moving: the chosen name glides toward the globe and the page fades (pointer only; a key press moves at once, and nothing moves under Still)
  const enterR = u.useRef(!1), fadeR = u.useRef(null), scrollR = u.useRef({}), prevR = u.useRef(null), sayR = u.useRef(null);
  const [say, setSay] = u.useState(null);
  const keepPlace = () => { const el = rootRef.current; if (el && !wide) scrollR.current[path] = el.scrollTop; };
  const go = (it, el, ptr) => {
    keepPlace();
    const anim = !!ptr && !still;
    enterR.current = anim;
    const root = rootRef.current, stage = stageRef.current;
    if (anim && wide && root && stage && el && L) {
      const r = el.getBoundingClientRect(), br = root.getBoundingClientRect(), gh = globalThis.document.createElement(`div`);
      gh.className = `usi-ghost`; gh.setAttribute(`aria-hidden`, `true`); gh.textContent = it.name;
      gh.style.left = `${r.left - br.left + 10}px`; gh.style.top = `${r.top - br.top + r.height / 2 - 10}px`;
      root.appendChild(gh);
      const dx = L.ox - (r.left - br.left + 10) - 40, dy = L.oy + L.R + 30 - (r.top - br.top + r.height / 2);
      gh.animate([{ transform: `translate(0, 0)`, opacity: 1 }, { transform: `translate(${dx}px, ${dy}px)`, opacity: 0 }], { duration: 320, easing: `cubic-bezier(.2,.8,.2,1)`, fill: `forwards` });
      setTimeout(() => gh.remove(), 340);
      fadeR.current = stage.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: `ease-out`, fill: `forwards` });
      setTimeout(() => onGo(it.key), 160);
    } else onGo(it.key);
  };
  const pick = (it, e) => {
    if (it.act === `drill`) go(it, e && e.currentTarget, !!(e && e.detail));
    else if (it.act === `card`) onCard(it, P, e && e.currentTarget);
  };
  const setGroup = (k, ptr) => { if (k === active) return; enterR.current = !!ptr && !still; setUi({ active: k, page: 0, shown: CX_USI_PHONE }); };
  const focusTitle = () => { const h = titleRef.current; if (h) h.focus({ preventScroll: !0 }); };

  // after each move: the new name takes the focus (or, stepping back, the name you came from), the column keeps its scroll, and it is said
  u.useLayoutEffect(() => {
    if (!ready || !P) return;
    const prev = prevR.current; prevR.current = stack.slice();
    if (fadeR.current) { fadeR.current.cancel(); fadeR.current = null; }
    const root = rootRef.current;
    if (root && !wide) root.scrollTop = scrollR.current[path] || 0;
    if (prev !== null || depth) {
      const back = prev && prev.length > depth, left = back ? prev[prev.length - 1] : null;
      const at = left && root ? [...root.querySelectorAll(`[data-k]`)].find((b) => b.getAttribute(`data-k`) === left) : null;
      if (at) at.focus({ preventScroll: wide }); else focusTitle();
    }
    if (prev !== null || depth) setSay([P.title, P.ring ? cxUsmPlural(P.ring.n, P.ring.one, P.ring.many) : ``]);
  }, [path, ready, wide]);
  // the names come in from the left and their lines draw out, once, when a pointer chose them (never under Still)
  const listKey = `${path}|${active}|${L ? L.page : ui.shown}`;
  u.useLayoutEffect(() => {
    if (!enterR.current || still) return;
    enterR.current = !1;
    const root = rootRef.current; if (!root) return;
    const ease = `cubic-bezier(.2,.8,.2,1)`;
    if (wide) {
      root.querySelectorAll(`.usi-lab`).forEach((el, q) => el.animate([{ opacity: 0, transform: `translate(-8px, -50%)` }, { opacity: 1, transform: `translate(0, -50%)` }], { duration: 240, delay: 40 + Math.min(q, 12) * 22, easing: ease, fill: `backwards` }));
      root.querySelectorAll(`.usi-ray`).forEach((el, q) => { const len = el.getTotalLength(); el.style.strokeDasharray = `${len}`; el.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 340, delay: Math.min(q, 12) * 22, easing: ease, fill: `backwards` }); });
    } else root.querySelectorAll(`.usi-row`).forEach((el, q) => { if (q < 14) el.animate([{ opacity: 0, transform: `translateX(-6px)` }, { opacity: 1, transform: `none` }], { duration: 220, delay: q * 22, easing: ease, fill: `backwards` }); });
  }, [listKey, wide]);

  // keys: Escape or Backspace steps back; in the groups the arrows, Home, and End choose (stopping at the ends); in the names they move
  const onKey = (e) => {
    const t = e.target; if (e.defaultPrevented || (t.closest && t.closest(`input, select, textarea`))) return;
    if ((e.key === `Escape` || e.key === `Backspace`) && depth) { e.preventDefault(); e.stopPropagation(); onUp(); return; }
    const root = rootRef.current; if (!root) return;
    if (t.closest && t.closest(`[role="radiogroup"]`)) {
      const n = G.length, K = e.key; let k = null;
      if (K === `ArrowDown` || K === `ArrowRight`) k = Math.min(n - 1, active + 1); else if (K === `ArrowUp` || K === `ArrowLeft`) k = Math.max(0, active - 1); else if (K === `Home`) k = 0; else if (K === `End`) k = n - 1;
      if (k === null) return;
      e.preventDefault(); setGroup(k, !1);
      requestAnimationFrame(() => { const b = root.querySelector(`[data-g="${k}"]`); if (b) b.focus({ preventScroll: wide }); });
      return;
    }
    if (t.closest && t.closest(`.usi-names, .usi-list, .usi-more`)) {
      const all = [...root.querySelectorAll(`.usi-names button, .usi-list button, button.usi-more`)], i = all.indexOf(globalThis.document.activeElement), K = e.key;
      if (i < 0) return;
      const k = K === `ArrowDown` ? Math.min(all.length - 1, i + 1) : K === `ArrowUp` ? Math.max(0, i - 1) : K === `Home` ? 0 : K === `End` ? all.length - 1 : null;
      if (k === null) return;
      e.preventDefault(); all[k].focus();
    }
  };

  if (!ready || !P) return <div className={`usi ${phone ? `usi-col` : ``}`} ref={rootRef}>{ready && !P ? <p className="usi-none" role="status">That is not in the record. <button type="button" className="usm-btn" onClick={() => onTo(0)}>Back to the start</button></p> : null}</div>;

  const plural = (n, one, many) => cxUsmPlural(n, one, many);
  const countText = (x) => (x.wait ? `Loading the votes...` : !cxUsiCount(x) ? x.items[0].name : plural(cxUsiCount(x), x.one, x.many));
  const kicker = P.kicker ? <p className="usi-kicker">{P.kicker}</p> : null;
  const what = P.cid && X && X.lines && X.lines[P.cid] ? <><p className="usi-what usx-what">{X.lines[P.cid][0]}</p><p className="usi-rev">{cxUsxShortReview()}</p></> : null;
  const lead = P.lead && P.lead.length ? <p className="usi-lead">{P.lead.map((s, k) => <u.Fragment key={k}>{k ? ` ` : null}<span>{s}</span></u.Fragment>)}</p> : null;
  const ring = P.ring ? (wide
    ? <p className="usi-ring"><CxUsiCount n={P.ring.n} /><b><span className="usm-sr">{`${P.ring.n} `}</span><span>{P.ring.n === 1 ? P.ring.one : P.ring.many}</span></b></p>
    : <p className="usi-ring"><b>{plural(P.ring.n, P.ring.one, P.ring.many)}</b></p>) : null;
  const acts = P.key ? (
    <div className="usi-acts">
      {P.i !== null && P.i !== undefined && <button type="button" className="usm-btn usm-pri" onClick={() => onProfile(P.i)}>Open profile</button>}
      {P.area && <button type="button" className="usm-btn usm-pri" onClick={() => onTopics(P.area)}>See the votes</button>}
      <button type="button" className="usm-btn" onClick={() => onMap(P)}>Show on the map</button>
    </div>
  ) : null;
  const head = (
    <>
      {kicker}
      <h2 className="usi-title" id="usi-h" tabIndex={-1} ref={titleRef}><span {...(P.i !== null && P.i !== undefined && M.nodes[P.i].kind !== `hub` ? CX_USI_REC : {})}>{P.title}</span></h2>
      {what}{lead}{ring}{acts}
    </>
  );
  const crumbs = depth ? (
    <nav className="usi-crumbs" aria-label="Where you are">
      <ol>
        {[``, ...stack].map((k, d) => (d < depth
          ? <li key={d}><button type="button" onClick={() => onTo(d)}><span {...(d && !k.startsWith(`st:`) && !k.startsWith(`pa:`) ? CX_USI_REC : {})}>{cxUsiName(g, k)}</span></button><span className="usi-sep" aria-hidden="true">›</span></li>
          : <li key={d}><b aria-current="page"><span {...(!k.startsWith(`st:`) && !k.startsWith(`pa:`) ? CX_USI_REC : {})}>{cxUsiName(g, k)}</span></b></li>))}
      </ol>
      {depth > 1 && <button type="button" className="usi-start" onClick={() => onTo(0)}>Back to the start</button>}
    </nav>
  ) : null;
  const nameOf = (it) => <b className="usi-nm" {...(it.rec ? CX_USI_REC : {})}>{it.name}</b>;
  const live = say ? <p className="usm-sr" aria-live="polite" ref={sayR}><span>Now showing</span>{` `}<span {...(P.i !== null && P.i !== undefined ? CX_USI_REC : {})}>{say[0]}</span>{say[1] ? <><span>: </span><span>{say[1]}</span></> : null}</p> : <p className="usm-sr" aria-live="polite" />;
  // for the browser checks: what this page is, its groups in order, and every row's word
  const expose = (el) => { if (el) el.cxIndex = { stack: stack.slice(), title: P.title, active, page: L ? L.page : 0, pages: L ? L.pages : 1, groups: G.map((x) => ({ key: x.key, label: x.label, count: cxUsiCount(x), items: x.items.map((it) => ({ key: it.key, sub: it.sub || null, name: it.name, note: it.note, act: it.act })) })) }; };

  if (wide) {
    const { R, Sz, ox, oy, cw, ch, gap, x0, topY, pts, list, more } = L;
    const cy = (k) => topY + k * (ch + gap) + ch / 2;
    const wire = (k) => { const ax = ox + R + 6, ay = oy + (k - (G.length - 1) / 2) * 6, bx = x0, by = cy(k); return `M ${ax} ${ay} C ${ax + 60} ${ay} ${bx - 30} ${by} ${bx} ${by}`; };
    const ray = (q) => { const ax = x0 + cw, ay = cy(active), b = pts[q], d = b.y - ay; return `M ${ax} ${ay} C ${ax + 78} ${ay + 0.16 * d} ${b.x - 150} ${b.y - 0.1 * d} ${b.x} ${b.y}`; };
    const hint = P.key ? `Choose a name to go further.` : `Pick a group, then a name.`;
    return (
      <div className="usi usi-wide" ref={(el) => { rootRef.current = el; expose(el); }} onKeyDown={onKey} data-depth={depth}>
        <div className="usi-stage" ref={stageRef}>
          <svg className="usi-svg" width={box.W} height={box.H} viewBox={`0 0 ${box.W} ${box.H}`} aria-hidden="true">
            {G.map((x, k) => <path key={`w${k}`} className={`usi-wire ${k === active ? `on` : ``}`} d={wire(k)} />)}
            {!still && motion === `live` && G.length > 0 && <path className="usi-comet" d={wire(active)} />}
            {list.map((it, q) => <path key={`r${q}`} className={`usi-ray ${hot === q ? `hot` : ``} ${it.act === `muted` ? `muted` : ``}`} data-ray={q} d={ray(q)} />)}
            {list.map((it, q) => cxUsiMark(it, pts[q].x, pts[q].y, `m${q}`))}
          </svg>
          {crumbs}
          <p className="usi-hint">{hint}</p>
          <canvas className="usi-orb" ref={orbRef} style={{ left: ox - Sz / 2, top: oy - Sz / 2, width: Sz, height: Sz }} aria-hidden="true" />
          <div className="usi-head" style={{ left: ox - Math.min(150, ox - 12), top: oy + R + 14, width: 2 * Math.min(150, ox - 12) }}>{head}</div>
          <div className="usi-groups" role="radiogroup" aria-label="Groups">
            {G.map((x, k) => (
              <button key={x.key} type="button" role="radio" aria-checked={k === active} tabIndex={k === active ? 0 : -1} data-g={k} className={`usi-card ${k === active ? `on` : ``}`}
                style={{ left: x0, top: topY + k * (ch + gap), width: cw, height: ch }} onClick={(e) => setGroup(k, !!e.detail)}>
                <span className="usi-ti" aria-hidden="true"><CxUsiShape shape={x.items[0] && x.items[0].shape} color={x.items[0] && x.items[0].color} /></span>
                <span className="usi-cl"><span className="usi-lb">{x.label}</span><span className="usi-ct">{countText(x)}</span></span>
                {cxUsiCount(x) > 0 ? <CxUsiCount n={cxUsiCount(x)} /> : <span />}
              </button>
            ))}
          </div>
          <ul className="usi-names" aria-label={gr ? gr.label : ``}>
            {list.map((it, q) => {
              const st = { left: pts[q].x + 12, top: pts[q].y, maxWidth: L.aw + 20 };
              if (it.act === `muted`) return <li key={`${q}-${it.name}`}><p className="usi-lab muted" style={st}>{nameOf(it)}{it.note && <span className="usi-note">{it.note}</span>}</p></li>;
              return (
                <li key={`${it.key || it.sub}-${q}`}>
                  <button type="button" className="usi-lab" data-k={it.key || it.sub} style={st} onClick={(e) => pick(it, e)}
                    onMouseEnter={() => setHot(q)} onMouseLeave={() => setHot(-1)} onFocus={() => setHot(q)} onBlur={() => setHot(-1)}
                    aria-haspopup={it.act === `card` ? `dialog` : undefined}>
                    {nameOf(it)}{it.note && <span className="usi-note">{it.note}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {more && <button type="button" className="usi-lab usi-more" style={{ left: pts[pts.length - 1].x + 12, top: pts[pts.length - 1].y }} onClick={(e) => { enterR.current = !!e.detail && !still; setUi({ page: L.page + 1 }); requestAnimationFrame(() => { const f = rootRef.current && rootRef.current.querySelector(`.usi-names button`); if (f && !e.detail) f.focus(); }); }}>
            <b>{`and ${L.rest} more · page ${L.page + 1} of ${L.pages}`}</b>
          </button>}
        </div>
        {live}
      </div>
    );
  }

  // a phone, or a narrow window: one column
  const items = gr ? gr.items : [], shown = items.slice(0, ui.shown);
  return (
    <div className="usi usi-col" ref={(el) => { rootRef.current = el; expose(el); }} onKeyDown={onKey} data-depth={depth}>
      <div className="usi-stage" ref={stageRef}>
        {crumbs}
        <div className="usi-top">
          <canvas className="usi-orb" ref={orbRef} aria-hidden="true" />
          <div className="usi-head">{head}</div>
        </div>
        <div className="usi-chips" role="radiogroup" aria-label="Groups">
          {G.map((x, k) => (
            <button key={x.key} type="button" role="radio" aria-checked={k === active} tabIndex={k === active ? 0 : -1} data-g={k} className={`usi-chip ${k === active ? `on` : ``}`} onClick={(e) => setGroup(k, !!e.detail)}>
              <span>{x.label}</span>{cxUsiCount(x) > 0 && <span className="usi-n">{cxUsiCount(x).toLocaleString(`en-US`)}</span>}
            </button>
          ))}
        </div>
        <ul className="usi-list" aria-label={gr ? gr.label : ``}>
          {shown.map((it, q) => {
            const body = <><span className="usi-mk"><CxUsiShape shape={it.shape} color={it.color} /></span><span className="usi-rt">{nameOf(it)}{it.note && <span className="usi-note">{it.note}</span>}</span></>;
            if (it.act === `muted`) return <li key={`${q}-${it.name}`}><p className="usi-row muted">{body}</p></li>;
            return (
              <li key={`${it.key || it.sub}-${q}`}>
                <button type="button" className="usi-row" data-k={it.key || it.sub} onClick={(e) => pick(it, e)} aria-haspopup={it.act === `card` ? `dialog` : undefined}>
                  {body}
                  {it.act === `drill` && <svg className="usi-go" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5" /></svg>}
                </button>
              </li>
            );
          })}
        </ul>
        {items.length > shown.length && <button type="button" className="usm-btn usi-more" onClick={(e) => { const k = shown.length; setUi({ shown: ui.shown + CX_USI_PHONE }); requestAnimationFrame(() => { const f = rootRef.current && rootRef.current.querySelectorAll(`.usi-list button`)[k]; if (f && !e.detail) f.focus(); }); }}>{`Show ${Math.min(CX_USI_PHONE, items.length - shown.length)} more of ${items.length.toLocaleString(`en-US`)}`}</button>}
      </div>
      {live}
    </div>
  );
}
