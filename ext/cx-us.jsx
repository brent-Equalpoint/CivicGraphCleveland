/* v5.16 United States graph (plan-us-graph.md, phases U2 and U3): who is in Congress, its committees, and the federal agencies.
   Four ways into one record, so nobody has to use the picture: Sky (a canvas of every node), Index (a searchable list),
   Linked (everything connected to the chosen node, in sentences), and Tree (the structure, as nested lists).
   Rules kept: receipts, not scores. No ranking, no ideology label, no match percentage. Party is shown as a sourced, dated
   field on the member's current term and never used to color or group. A connection is a recorded relationship, not control.
   The layout is fixed and computed here from the data (no physics), so it never depends on timing or on a person's device.
   Data: site/us/landscape-2026.json (scripts/fetch_us.py), fetched on the hosted site only. It is a PREVIEW: the terms of
   the sources have not yet been read by a person, and the page says so. */

const CX_US = { p: null, v: null, graph: null };
function cxUsLoad() {
  if (!CX_US.p) {
    const web = typeof fetch === `function` && /^https?:$/.test(String(globalThis.location?.protocol || ``));
    CX_US.p = (web ? fetch(`/us/landscape-2026.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null)).then((d) => { CX_US.v = d; if (d) CX_US.graph = cxUsGraph(d); return d; });
  }
  return CX_US.p;
}
const CX_USV = { p: null, v: null };
function cxUsVotesLoad() {
  if (!CX_USV.p) {
    const web = typeof fetch === `function` && /^https?:$/.test(String(globalThis.location?.protocol || ``));
    CX_USV.p = (web ? fetch(`/us/votes-2026.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null)).then((d) => { CX_USV.v = d; return d; });
  }
  return CX_USV.p;
}
const CX_CAST = { Y: `Yea`, N: `Nay`, P: `Present`, X: `Not voting`, O: `Voted for a named person` };
const CX_NO_AREA = `No policy area listed`;
/* One member's recorded votes, newest first. A vote is kept only when the member was in that chamber's roll. Each row carries its category. */
function cxMemberVotes(vd, m) {
  const i = vd.members.indexOf(m.id);
  if (i < 0) return [];
  const out = [];
  vd.votes.forEach((v) => {
    if (v.chamber !== m.chamber) return;
    const c = v.codes[i];
    if (!c || c === `-`) return;
    const b = v.bill ? vd.bills[v.bill] : null;
    out.push({ v, c, b, area: b && b.policy_area ? b.policy_area : v.kind === `nomination` ? `Nominations` : CX_NO_AREA });
  });
  return out;
}
/* Plain counts of what the record says, never a share or a score. */
function cxCastCounts(rows) { const t = { Y: 0, N: 0, P: 0, X: 0, O: 0 }; rows.forEach((r) => { t[r.c] += 1; }); return t; }
function cxCountLine(t) { return [`Yea ${t.Y}`, `Nay ${t.N}`, `Present ${t.P}`, `Not voting ${t.X}`].concat(t.O ? [`Named a person ${t.O}`] : []).join(`, `); }
function cxVoteDate(iso) { const d = new Date(`${iso}T12:00:00`); return isNaN(d) ? iso : d.toLocaleDateString(`en-US`, { month: `short`, day: `numeric`, year: `numeric` }); }
function cxVoteWhat(r) { return r.b ? `${r.b.label}${r.b.title ? `, ${r.b.title}` : ``}` : r.v.desc || r.v.legis || r.v.question; }
function cxOrd(n) { const s = [`th`, `st`, `nd`, `rd`], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
const CX_US_STATES = { AL: `Alabama`, AK: `Alaska`, AZ: `Arizona`, AR: `Arkansas`, CA: `California`, CO: `Colorado`, CT: `Connecticut`, DE: `Delaware`, FL: `Florida`, GA: `Georgia`, HI: `Hawaii`, ID: `Idaho`, IL: `Illinois`, IN: `Indiana`, IA: `Iowa`, KS: `Kansas`, KY: `Kentucky`, LA: `Louisiana`, ME: `Maine`, MD: `Maryland`, MA: `Massachusetts`, MI: `Michigan`, MN: `Minnesota`, MS: `Mississippi`, MO: `Missouri`, MT: `Montana`, NE: `Nebraska`, NV: `Nevada`, NH: `New Hampshire`, NJ: `New Jersey`, NM: `New Mexico`, NY: `New York`, NC: `North Carolina`, ND: `North Dakota`, OH: `Ohio`, OK: `Oklahoma`, OR: `Oregon`, PA: `Pennsylvania`, RI: `Rhode Island`, SC: `South Carolina`, SD: `South Dakota`, TN: `Tennessee`, TX: `Texas`, UT: `Utah`, VT: `Vermont`, VA: `Virginia`, WA: `Washington`, WV: `West Virginia`, WI: `Wisconsin`, WY: `Wyoming`, DC: `District of Columbia`, PR: `Puerto Rico`, GU: `Guam`, VI: `U.S. Virgin Islands`, AS: `American Samoa`, MP: `Northern Mariana Islands` };
const cxStateName = (c) => CX_US_STATES[c] || c;

/* Build nodes, edges, and a fixed layout. Pure: the same data always gives the same picture. */
function cxUsGraph(d) {
  const nodes = [], byId = new Map(), edges = [];
  const add = (n) => { n.i = nodes.length; nodes.push(n); byId.set(n.id, n); return n; };
  const seen = new Set();
  const edge = (a, b, rel) => { const k = `${byId.get(a).i}|${byId.get(b).i}`; if (seen.has(k)) return; seen.add(k); edges.push({ a: byId.get(a).i, b: byId.get(b).i, rel }); };
  const hubs = { senate: [-560, 0], house: [190, -30], exec: [1010, 60] };
  add({ id: `h:senate`, kind: `hub`, label: `Senate`, name: `United States Senate`, x: hubs.senate[0], y: hubs.senate[1], r: 16, shape: `circle`, group: `senate` });
  add({ id: `h:house`, kind: `hub`, label: `House`, name: `United States House of Representatives`, x: hubs.house[0], y: hubs.house[1], r: 16, shape: `circle`, group: `house` });
  add({ id: `h:exec`, kind: `hub`, label: `Executive agencies`, name: `Federal executive agencies`, x: hubs.exec[0], y: hubs.exec[1], r: 16, shape: `circle`, group: `exec` });
  const GOLD = 2.399963;  // golden angle: a sunflower spiral, so members of a state sit together along an arm
  const spiral = (list, hub, c, mk) => list.forEach((m, k) => { const r = c * Math.sqrt(k + 2), a = k * GOLD; add(mk(m, hub[0] + r * Math.cos(a), hub[1] + r * Math.sin(a))); });
  const senators = d.members.filter((m) => m.chamber === `senate`), reps = d.members.filter((m) => m.chamber === `house`);
  const mk = (ch) => (m, x, y) => ({ id: `m:${m.id}`, kind: `member`, label: m.name, name: m.name, x, y, r: 3.6, shape: `circle`, group: ch, m });
  spiral(senators, hubs.senate, 13, mk(`senate`));
  spiral(reps, hubs.house, 12, mk(`house`));
  senators.forEach((m) => edge(`m:${m.id}`, `h:senate`, `member of`));
  reps.forEach((m) => edge(`m:${m.id}`, `h:house`, `member of`));
  // committees sit on a ring outside their chamber's cluster; joint committees sit between the three clusters
  const ring = (list, hub, rad, a0, span) => list.forEach((c, k) => { const a = a0 + (list.length > 1 ? (k / (list.length - 1)) * span : span / 2); add({ id: `c:${c.id}`, kind: `committee`, label: c.name.replace(/^(House|Senate|Joint) (Select |Permanent Select |Special )?Committee on (the )?/, ``), name: c.name, x: hub[0] + rad * Math.cos(a), y: hub[1] + rad * Math.sin(a), r: 7 + Math.min(5, c.members / 12), shape: `diamond`, group: c.chamber, c }); });
  const cs = (t) => d.committees.filter((c) => c.chamber === t);
  ring(cs(`senate`), hubs.senate, 190, Math.PI * 0.55, Math.PI * 0.9);
  ring(cs(`house`), hubs.house, 340, Math.PI * 0.12, Math.PI * 0.76);
  const joint = cs(`joint`); joint.forEach((c, k) => add({ id: `c:${c.id}`, kind: `committee`, label: c.name.replace(/^Joint (Select |Economic )?Committee (on )?(the )?/, ``), name: c.name, x: -200 + k * 120, y: 160 + (k % 2) * 40, r: 8, shape: `diamond`, group: `joint`, c }));
  d.committees.forEach((c) => edge(`c:${c.id}`, c.chamber === `joint` ? `h:senate` : `h:${c.chamber}`, `committee of`));
  d.members.forEach((m) => m.committees.forEach((cm) => { const cid = cm.id.length > 4 && !byId.has(`c:${cm.id}`) ? cm.id.slice(0, 4) : cm.id; if (byId.has(`c:${cid}`)) edge(`m:${m.id}`, `c:${cid}`, cm.role === `Member` ? `member` : cm.role.toLowerCase()); }));
  // agencies: the top level in a ring, each one's sub-agencies spiraling near it
  const tops = d.agencies.filter((a) => !a.parent_id), kids = (id) => d.agencies.filter((a) => a.parent_id === id);
  tops.forEach((a, k) => { const ang = (k / tops.length) * Math.PI * 2, rad = 120 + (k % 3) * 26; add({ id: `a:${a.id}`, kind: `agency`, label: a.short_name || a.name, name: a.name, x: hubs.exec[0] + rad * Math.cos(ang), y: hubs.exec[1] + rad * Math.sin(ang), r: 5.5, shape: `square`, group: `exec`, a }); edge(`a:${a.id}`, `h:exec`, `agency of`); });
  tops.forEach((p) => { const pn = byId.get(`a:${p.id}`), ks = kids(p.id); ks.forEach((a, k) => { const ang = Math.atan2(pn.y - hubs.exec[1], pn.x - hubs.exec[0]) + (k - ks.length / 2) * 0.16, rad = 175 + (k % 2) * 22; add({ id: `a:${a.id}`, kind: `agency`, label: a.short_name || a.name, name: a.name, x: hubs.exec[0] + rad * Math.cos(ang), y: hubs.exec[1] + rad * Math.sin(ang), r: 3.4, shape: `square`, group: `exec`, a }); edge(`a:${a.id}`, `a:${p.id}`, `part of`); }); });
  // an agency under a sub-agency (any depth) sits just beyond its parent, so none is left out of the picture
  for (let again = 0; again < 4; again++) d.agencies.filter((a) => !byId.has(`a:${a.id}`) && byId.has(`a:${a.parent_id}`)).forEach((a, k) => { const pn = byId.get(`a:${a.parent_id}`), ang = Math.atan2(pn.y - hubs.exec[1], pn.x - hubs.exec[0]) + (k % 5 - 2) * 0.12; add({ id: `a:${a.id}`, kind: `agency`, label: a.short_name || a.name, name: a.name, x: pn.x + 26 * Math.cos(ang), y: pn.y + 26 * Math.sin(ang), r: 3.2, shape: `square`, group: `exec`, a }); edge(`a:${a.id}`, `a:${a.parent_id}`, `part of`); });
  const adj = nodes.map(() => []);
  edges.forEach((e, k) => { adj[e.a].push(k); adj[e.b].push(k); });
  return cxUsPlace({ nodes, byId, edges, adj });
}

/* what a node says about itself, and its connections, as plain sentences with names */
function cxUsFacts(g, n) {
  const f = [], nm = (i) => g.nodes[i].name;
  if (n.kind === `member`) {
    const m = n.m, chamber = m.chamber === `senate` ? `senator` : (m.district === 0 || m.district === null ? `delegate` : `representative`);
    f.push(m.chamber === `senate` ? `${m.name} is a United States senator for ${cxStateName(m.state)}.` : (m.district ? `${m.name} represents ${cxStateName(m.state)}'s ${cxOrd(m.district)} district in the United States House.` : `${m.name} is the delegate to the United States House from ${cxStateName(m.state)}.`));
    f.push(`Current term: ${m.term_start} to ${m.term_end}. Party on this term: ${m.party}, as of ${m.party_as_of} (a sourced field, not a judgment).`);
    m.committees.forEach((c) => {
      const parent = g.byId.get(`c:${c.id}`) || g.byId.get(`c:${c.id.slice(0, 4)}`);
      if (!parent) return;
      const sub = c.id.length > 4 ? parent.c.subcommittees.find((s) => s.id === c.id) : null;
      const where = sub ? `the ${sub.name} subcommittee of the ${parent.name}` : `the ${parent.name}`;
      f.push(c.role === `Member` ? `${m.name} serves on ${where}.` : `${m.name} is ${/^(Chair|Vice|Ranking|Co)/i.test(c.role) ? `the ${c.role.toLowerCase()} of` : `${c.role} on`} ${where}.`);
    });
    if (!m.committees.length) f.push(`No committee seat is listed for ${m.name} in the committee membership record.`);
  } else if (n.kind === `committee`) {
    const c = n.c;
    f.push(`${c.name} is a ${c.chamber} committee with ${c.members} listed members.`);
    f.push(c.chair ? `${c.chair} is listed as its chair.` : `No chair is listed in the committee membership record.`);
    if (c.subcommittees.length) f.push(`Its subcommittees: ${c.subcommittees.map((s) => s.name).join(`, `)}.`);
  } else if (n.kind === `agency`) {
    const a = n.a, parent = a.parent_id ? g.nodes.find((x) => x.a && x.a.id === a.parent_id) : null;
    f.push(parent ? `${a.name} is part of ${parent.name}.` : `${a.name} is a top-level federal agency in the Federal Register's list.`);
    if (a.blurb) f.push(a.blurb);
    const subs = g.nodes.filter((x) => x.a && x.a.parent_id === a.id);
    if (subs.length) f.push(`Sub-agencies listed: ${subs.slice(0, 12).map((s) => s.name).join(`, `)}${subs.length > 12 ? `, and ${subs.length - 12} more` : ``}.`);
  } else {
    f.push(n.id === `h:exec` ? `These are federal agencies that have published in the Federal Register in the last two years. Some well-known bodies are listed under a parent.` : `${n.name}.`);
  }
  return f;
}
function cxUsLink(n) {
  if (n.kind === `member`) return n.m.url ? [`${n.m.name}'s official website`, n.m.url] : null;
  if (n.kind === `committee`) return n.c.url ? [`${n.name}'s official website`, n.c.url] : null;
  if (n.kind === `agency`) return n.a.url ? [`${n.name}`, n.a.url] : null;
  return null;
}
const CX_US_COLORS = { senate: `#7aa2ff`, house: `#5fd6c4`, joint: `#d6a3ff`, exec: `#ffc66b` };


/* ---------- Your members (D5): a state and a district, kept in memory only, never in a link ---------- */
const CX_US_PLACE = { state: ``, district: `` };
const CX_HOUSE_FIND = `https://www.house.gov/representatives/find-your-representative`;
function cxDistrictWord(d) { return d === 0 || d === null || d === undefined ? `at-large` : cxOrd(d); }
function cxUsMine(data, state, district) {
  const ms = data.members.filter((m) => m.state === state);
  const senators = ms.filter((m) => m.chamber === `senate`);
  const dists = [...new Set(ms.filter((m) => m.chamber === `house`).map((m) => m.district ?? 0))].sort((a, b) => a - b);
  const rep = district === `` ? null : ms.find((m) => m.chamber === `house` && String(m.district ?? 0) === String(district)) || null;
  return { senators, dists, rep };
}
function cxCommitteeLine(g, m) {
  const parts = [];
  m.committees.forEach((c) => {
    const parent = g.byId.get(`c:${c.id}`) || g.byId.get(`c:${c.id.slice(0, 4)}`);
    if (!parent || c.id.length > 4) return;  // seats on full committees only here; subcommittees are in the Linked view
    parts.push(c.role === `Member` ? parent.label : `${parent.label} (${c.role.toLowerCase()})`);
  });
  return parts;
}
/* A short story about the three people, in the same shape the story engine uses, for Easy mode. */
function cxUsStory(data, g, state, district, vd) {
  const { senators, rep } = cxUsMine(data, state, district);
  const sn = cxStateName(state);
  const frames = [];
  if (senators.length) frames.push({ k: `Your senators`, big: senators.length === 2 ? `${senators[0].name} and ${senators[1].name}.` : `${senators[0].name}.`, small: `Every state has two United States senators, and each one represents the whole state of ${sn}. ${senators.map((s) => `${s.name}'s current term runs to ${s.term_end}.`).join(` `)}` });
  else frames.push({ k: `Your senators`, big: `${sn} has no senators.`, small: `${sn} is represented in Congress by a delegate in the House, who does not vote on final passage of most bills.` });
  if (rep) frames.push({ k: `Your representative`, big: `${rep.name}.`, small: `${rep.name} represents ${district === `` || rep.district === 0 || rep.district === null ? `all of ${sn}` : `${sn}'s ${cxOrd(rep.district)} district`} in the United States House. The current term runs to ${rep.term_end}.` });
  const lines = [...senators, ...(rep ? [rep] : [])].map((m) => { const c = cxCommitteeLine(g, m); return c.length ? `${m.name}: ${c.slice(0, 4).join(`, `)}${c.length > 4 ? `, and ${c.length - 4} more` : ``}.` : `${m.name}: no committee seat is listed.`; });
  frames.push({ k: `What they work on`, big: `Committees do much of the work in Congress.`, small: lines.join(` `) });
  const recent = vd ? [...senators, ...(rep ? [rep] : [])].map((m) => { const r = cxMemberVotes(vd, m).filter((x) => x.v.final).slice(0, 2); return r.length ? `${m.name}: ${r.map((x) => `${CX_CAST[x.c]} on ${cxVoteWhat(x)} (${cxVoteDate(x.v.date)}, ${x.v.result ? x.v.result.toLowerCase() : `result not recorded`})`).join(`; `)}.` : `${m.name}: no recent vote that decided a bill or a nominee is on record here.`; }) : null;
  if (recent) frames.push({ k: `How they voted lately`, big: `Their latest votes that decided something.`, small: `${recent.join(` `)} Not voting is not a no. Each vote is on one question, and the official record is linked in the full map.` });
  else frames.push({ k: `What isn't public here yet`, big: `How they voted isn't shown here.`, small: `Roll call votes are public records, but this page could not load them. A missing record here is not a no.` });
  return { id: `us`, label: `Washington`, ini: `US`, name: `Who represents me in Washington?`, when: `${sn}${rep && rep.district ? `, district ${rep.district}` : ``}`, frames,
           source: { label: `the congress-legislators record of current members (public domain)`, url: `https://github.com/unitedstates/congress-legislators` } };
}
function CX_UsVotes({ vd, people }) {
  const [who, setWho] = u.useState(people[0]?.id);
  const [area, setArea] = u.useState(`All`);
  const [fin, setFin] = u.useState(!0);
  const [more, setMore] = u.useState(25);
  const m = people.find((p) => p.id === who) || people[0];
  if (!m) return null;
  const all = cxMemberVotes(vd, m);
  const base = fin ? all.filter((r) => r.v.final) : all;
  const areas = [...base.reduce((a, r) => a.set(r.area, (a.get(r.area) || 0) + 1), new Map())].sort((a, b) => (a[0] === CX_NO_AREA) - (b[0] === CX_NO_AREA) || b[1] - a[1] || a[0].localeCompare(b[0]));
  const pick = area === `All` || !areas.some((a) => a[0] === area) ? `All` : area;
  const rows = pick === `All` ? base : base.filter((r) => r.area === pick);
  const shown = rows.slice(0, more);
  return (
    <section className="us-votes" aria-labelledby="us-votes-h">
      <h2 id="us-votes-h">How they voted</h2>
      <p>These are the official recorded votes of the {vd.congress}th Congress, last updated {cxVoteDate((vd.retrieved_at || ``).slice(0, 10))}. A vote is on one question. A yea on a rule, a motion, or a nomination is not a yea on a bill, so each row says what was asked. Not voting is not a no, and a missing record is not a vote.</p>
      <div className="us-tools">
        <label>Member <select value={m.id} onChange={(e) => { setWho(e.target.value); setArea(`All`); setMore(25); }}>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Topic <select value={pick} onChange={(e) => { setArea(e.target.value); setMore(25); }}><option value="All">All topics ({base.length})</option>{areas.map(([a, n]) => <option key={a} value={a}>{a} ({n})</option>)}</select></label>
        <label className="us-check"><input type="checkbox" checked={fin} onChange={(e) => { setFin(e.target.checked); setMore(25); }} /> Only votes that decided a bill or a nominee</label>
      </div>
      <p className="us-count" role="status">{rows.length === 0 ? `No recorded votes match.` : `${m.name}, ${pick === `All` ? `all topics` : pick}: ${rows.length} recorded vote${rows.length === 1 ? `` : `s`}. ${cxCountLine(cxCastCounts(rows))}.`}</p>
      <ul className="us-vote-list">
        {shown.map((r) => (
          <li key={r.v.id} className="us-vote">
            <p className="us-vote-what"><span className={`us-cast us-cast-${r.c}`}><span className="us-dot" aria-hidden="true" />{CX_CAST[r.c]}</span> <strong>{cxVoteWhat(r)}</strong></p>
            <p className="us-vote-meta">{cxVoteDate(r.v.date)}. The question: {r.v.question || `not recorded`}. Result: {r.v.result || `not recorded`}{r.v.yea || r.v.nay ? ` (${r.v.yea} to ${r.v.nay})` : ``}. {pick === `All` ? `Topic: ${r.area}. ` : ``}<a href={r.v.url} target="_blank" rel="noreferrer">The official record<span className="sp-ext"> (opens in a new tab)</span></a>{r.b && r.b.url ? <>{` `}<a href={r.b.url} target="_blank" rel="noreferrer">The bill on Congress.gov<span className="sp-ext"> (opens in a new tab)</span></a></> : null}</p>
          </li>
        ))}
      </ul>
      {rows.length > shown.length && <p><button type="button" className="cx-link-button" onClick={() => setMore(more + 25)}>Show 25 more of {rows.length - shown.length}</button></p>}
      <p className="us-hint">Topics are the Congressional Research Service's policy areas, as Congress.gov labels each bill. Votes on a nomination or a matter that is not a bill have no policy area. {vd.counts.house} House and {vd.counts.senate} Senate recorded votes are held{vd.senate_waiting ? `; ${vd.senate_waiting} older Senate votes are still being added` : ``}. A member is only listed for votes held while they were in that chamber. These sources have not been read by a person for terms of use.</p>
    </section>
  );
}
/* Topics: pick a policy area, see the bills and recorded votes in it, newest first. If a place is chosen in Your members, each vote also shows how that place's members voted. */
function cxTopicItems(vd, area, finalOnly) {
  const items = new Map();
  vd.votes.forEach((v) => {
    if (finalOnly && !v.final) return;
    const b = v.bill ? vd.bills[v.bill] : null;
    const a = b && b.policy_area ? b.policy_area : v.kind === `nomination` ? `Nominations` : CX_NO_AREA;
    if (a !== area) return;
    const key = v.bill || v.id;
    if (!items.has(key)) items.set(key, { key, label: b ? b.label : v.desc || v.legis || v.question, title: b ? b.title : null, url: b ? b.url : null, votes: [] });
    items.get(key).votes.push(v);
  });
  return [...items.values()].sort((x, y) => (y.votes[0].date > x.votes[0].date ? 1 : -1));
}
function CX_UsTopics({ data }) {
  const [vd, setVd] = u.useState(CX_USV.v);
  const [load, setLoad] = u.useState(CX_USV.p ? `ready` : `loading`);
  u.useEffect(() => { let live = !0; cxUsVotesLoad().then((d) => { if (live) { setVd(d); setLoad(d ? `ready` : `none`); } }); return () => { live = !1; }; }, []);
  const [area, setArea] = u.useState(CX_US_PICK.area);
  const [fin, setFin] = u.useState(!0);
  const [more, setMore] = u.useState(15);
  if (!vd) return <div className="us-topics"><h2>Votes by topic</h2><p role="status">{load === `none` ? `The votes need the hosted site, because they load a data file. Try again online.` : `Loading the votes...`}</p></div>;
  const counts = new Map();
  vd.votes.forEach((v) => { if (fin && !v.final) return; const b = v.bill ? vd.bills[v.bill] : null; const a = b && b.policy_area ? b.policy_area : v.kind === `nomination` ? `Nominations` : CX_NO_AREA; counts.set(a, (counts.get(a) || 0) + 1); });
  const areas = [...counts].sort((a, b) => (a[0] === CX_NO_AREA) - (b[0] === CX_NO_AREA) || a[0].localeCompare(b[0]));
  const items = area ? cxTopicItems(vd, area, fin) : [];
  const mine = CX_US_PLACE.state ? cxUsMine(data, CX_US_PLACE.state, CX_US_PLACE.district) : null;
  const yours = (v) => {
    if (!mine) return null;
    const ppl = v.chamber === `senate` ? mine.senators : mine.rep ? [mine.rep] : [];
    const i0 = (m) => vd.members.indexOf(m.id);
    const bits = ppl.map((m) => { const c = i0(m) < 0 ? `-` : v.codes[i0(m)]; return c && c !== `-` ? `${m.name} ${CX_CAST[c].toLowerCase()}` : null; }).filter(Boolean);
    return bits.length ? bits.join(`, `) : null;
  };
  return (
    <div className="us-topics">
      <h2>Votes by topic</h2>
      <p>Each bill carries one policy area, chosen by the Congressional Research Service and shown on Congress.gov. Pick one to see the recorded votes in it, newest first. This lists votes. It does not say which agencies handle a topic, because that map needs a person's review first.</p>
      <div className="us-tools">
        <label>Topic <select value={area} onChange={(e) => { setArea(e.target.value); setMore(15); }}><option value="">Choose a topic</option>{areas.map(([a, n]) => <option key={a} value={a}>{a} ({n} {n === 1 ? `vote` : `votes`})</option>)}</select></label>
        <label className="us-check"><input type="checkbox" checked={fin} onChange={(e) => { setFin(e.target.checked); setMore(15); }} /> Only votes that decided a bill or a nominee</label>
      </div>
      {!area && <p className="us-hint">Choose a topic to see its votes.</p>}
      {area && <p className="us-count" role="status">{items.length} {items.length === 1 ? `item` : `items`} in {area}.{mine ? ` Under each vote, how ${CX_US_PLACE.state ? cxStateName(CX_US_PLACE.state) : ``}'s members voted, from the place you chose in Your members.` : ` Choose your state in Your members to see how your own members voted on each.`}</p>}
      <ul className="us-vote-list">
        {items.slice(0, more).map((it) => (
          <li key={it.key} className="us-vote">
            <p className="us-vote-what"><strong>{it.label}{it.title ? `, ${it.title}` : ``}</strong></p>
            <ul className="us-sub">
              {it.votes.map((v) => (
                <li key={v.id}>
                  <p className="us-vote-meta">{cxVoteDate(v.date)}, {v.chamber === `senate` ? `Senate` : `House`}. The question: {v.question || `not recorded`}. Result: {v.result || `not recorded`}{v.yea || v.nay ? ` (${v.yea} to ${v.nay})` : ``}. <a href={v.url} target="_blank" rel="noreferrer">The official record<span className="sp-ext"> (opens in a new tab)</span></a></p>
                  {mine && <p className="us-yours">{yours(v) ? `Your members: ${yours(v)}.` : `Your members: not in the roll for this vote.`}</p>}
                </li>
              ))}
            </ul>
            {it.url && <p><a href={it.url} target="_blank" rel="noreferrer">The bill on Congress.gov<span className="sp-ext"> (opens in a new tab)</span></a></p>}
          </li>
        ))}
      </ul>
      {items.length > more && <p><button type="button" className="cx-link-button" onClick={() => setMore(more + 15)}>Show 15 more of {items.length - more}</button></p>}
      <p className="us-hint">Not voting is not a no, and a vote is on one question: a yea on a rule or a motion is not a yea on the bill. These sources have not been read by a person for terms of use.</p>
    </div>
  );
}
function CX_UsMine({ data, g, onSee }) {
  const [st, setSt] = u.useState(CX_US_PLACE.state);
  const [di, setDi] = u.useState(CX_US_PLACE.district);
  const [vd, setVd] = u.useState(CX_USV.v);
  u.useEffect(() => { let live = !0; if (!CX_USV.v) cxUsVotesLoad().then((d) => { if (live && d) setVd(d); }); return () => { live = !1; }; }, []);
  const states = [...new Set(data.members.map((m) => m.state))].sort((a, b) => cxStateName(a).localeCompare(cxStateName(b)));
  const mine = st ? cxUsMine(data, st, di) : null;
  const card = (m, role) => {
    const c = cxCommitteeLine(g, m);
    return (
      <li key={m.id} className="us-mine-card">
        <h3>{m.name}</h3>
        <p className="us-kind">{role}</p>
        <p>Current term: {m.term_start} to {m.term_end}. Party on this term: {m.party}, as of {m.party_as_of} (a sourced field, not a judgment).</p>
        <p>{c.length ? `Committees: ${c.join(`, `)}.` : `No committee seat is listed.`}</p>
        <p>{m.url && <a href={m.url} target="_blank" rel="noreferrer">{m.name}'s official website<span className="sp-ext"> (opens in a new tab)</span></a>}</p>
        <p><button type="button" className="cx-link-button" onClick={() => onSee(g.byId.get(`m:${m.id}`))}>See {m.name} in the graph</button></p>
      </li>
    );
  };
  return (
    <div className="us-mine">
      <h2>Your members of Congress</h2>
      <p>Choose your state and, for your representative, your district. This stays on your device for this visit and is never put in a link.</p>
      <div className="us-tools">
        <label>Your state <select value={st} onChange={(e) => { CX_US_PLACE.state = e.target.value; CX_US_PLACE.district = ``; setSt(e.target.value); setDi(``); }}><option value="">Choose a state</option>{states.map((s) => <option key={s} value={s}>{cxStateName(s)}</option>)}</select></label>
        {mine && mine.dists.length > 0 && <label>Your district <select value={di} onChange={(e) => { CX_US_PLACE.district = e.target.value; setDi(e.target.value); }}><option value="">Choose a district</option>{mine.dists.map((d) => <option key={d} value={d}>{d === 0 ? `At-large (the whole state)` : `District ${d}`}</option>)}</select></label>}
      </div>
      <p className="us-src">Not sure of your district? Your address decides it. <a href={CX_HOUSE_FIND} target="_blank" rel="noreferrer">The House's official lookup<span className="sp-ext"> (opens in a new tab)</span></a> finds it.</p>
      {mine && (
        <ul className="us-mine-list">
          {mine.senators.map((m) => card(m, `United States senator for ${cxStateName(st)}`))}
          {mine.senators.length === 0 && <li className="us-mine-card"><p>{cxStateName(st)} has no senators. It is represented in Congress by a delegate in the House.</p></li>}
          {mine.rep && card(mine.rep, mine.rep.district ? `Representative for ${cxStateName(st)}'s ${cxOrd(mine.rep.district)} district` : `${mine.rep.chamber === `house` ? `Representative or delegate` : ``} for ${cxStateName(st)}`)}
        </ul>
      )}
      {mine && di === `` && mine.dists.length > 0 && <p className="us-hint">Choose a district to see your representative.</p>}
      {mine && vd && (mine.senators.length > 0 || mine.rep) && <CX_UsVotes key={`${st}-${di}`} vd={vd} people={[...mine.senators, ...(mine.rep ? [mine.rep] : [])]} />}
      {!vd && <p className="us-hint">How they voted is not shown here. Roll call votes are public records, and a missing record is not a no.</p>}
    </div>
  );
}

/* The Index: five ways into the federal government. Pick a door, then a group, then anyone, and open them in the Linked view. */
const CX_US_PICK = { area: `` };
function cxUsWhere(n) {
  if (n.kind === `member`) { const m = n.m; return m.chamber === `senate` ? `Senator, ${cxStateName(m.state)}` : m.district ? `Representative, ${cxStateName(m.state)}, district ${m.district}` : `Delegate or representative, ${cxStateName(m.state)}`; }
  if (n.kind === `committee`) return n.c.chamber === `joint` ? `Joint committee` : `${n.c.chamber === `senate` ? `Senate` : `House`} committee`;
  return n.a && n.a.parent_id ? `Part of a larger agency` : `Federal agency`;
}
function CX_UsDoors({ data, g, visible, dim, q, onOpen, onTopics }) {
  const [vd, setVd] = u.useState(CX_USV.v);
  u.useEffect(() => { let live = !0; if (!CX_USV.v) cxUsVotesLoad().then((d) => { if (live && d) setVd(d); }); return () => { live = !1; }; }, []);
  const doors = u.useMemo(() => cxUsDoors(data, g, vd), [data, g, vd]);
  const [door, setDoor] = u.useState(`members`), [grp, setGrp] = u.useState(``), [more, setMore] = u.useState(25), [openState, setOpenState] = u.useState(``);
  const cur = doors.find((d) => d.id === door), gr = cur.groups.find((x) => x.id === grp) || cur.groups[0];
  const needle = q.trim().toLowerCase();
  const pickDoor = (id) => { setDoor(id); setGrp(``); setMore(25); setOpenState(``); };
  let items = null, total = 0;
  if (gr.nodes) { items = gr.nodes.map((i) => g.nodes[i]).filter((n) => visible(n) && !dim(n) && (!needle || n.name.toLowerCase().includes(needle))); total = items.length; }
  return (
    <div className="us-index">
      <p>Five ways into the federal government. Pick one, then pick anyone to see who they are connected to, in words.</p>
      <div className="us-doors" role="group" aria-label="Ways in">
        {doors.map((d) => (
          <button key={d.id} type="button" aria-pressed={door === d.id} className={`us-door ${door === d.id ? `on` : ``}`} onClick={() => pickDoor(d.id)}>
            <span><strong>{d.label}</strong><small>{d.ready ? `${d.count} ${d.count === 1 ? d.one : d.many}` : `Loading the votes`}</small></span>
            <span className="us-ring" aria-hidden="true">{d.ready ? d.count : `...`}</span>
          </button>
        ))}
      </div>
      {cur.groups.length > 1 && (
        <div className="us-groups" role="group" aria-label="Groups">
          {cur.groups.map((x) => <button key={x.id} type="button" aria-pressed={x.id === gr.id} className={x.id === gr.id ? `on` : ``} onClick={() => { setGrp(x.id); setMore(25); }}>{x.label} <small>{x.count}</small></button>)}
        </div>
      )}
      {items && (
        <>
          <p className="us-count" role="status">{total} shown. Choose one to see its connections.</p>
          <ul className="us-list">
            {items.slice(0, more).map((n) => <li key={n.id}><button type="button" onClick={() => onOpen(n.i)}><strong>{n.name}</strong><small>{cxUsWhere(n)}</small></button></li>)}
          </ul>
          {total > more && <p><button type="button" className="cx-link-button" onClick={() => setMore(more + 25)}>Show 25 more of {total - more}</button></p>}
        </>
      )}
      {door === `states` && (
        <ul className="us-list">
          {gr.states.filter((s) => !needle || s.name.toLowerCase().includes(needle)).map((s) => (
            <li key={s.code}>
              <button type="button" aria-expanded={openState === s.code} onClick={() => setOpenState(openState === s.code ? `` : s.code)}><strong>{s.name}</strong><small>{`Senators: ${s.senators}. Representatives: ${s.representatives}.`}</small></button>
              {openState === s.code && <ul className="us-sub">{cxUsStateMembers(data, s.code).map((m) => <li key={m.id}><button type="button" onClick={() => onOpen(g.byId.get(`m:${m.id}`).i)}>{m.name}</button> <small>{m.chamber === `senate` ? `Senator` : m.district ? `District ${m.district}` : `Delegate`}</small></li>)}</ul>}
            </li>
          ))}
        </ul>
      )}
      {door === `areas` && !cur.ready && <p className="us-hint" role="status">The votes load from the hosted site. Policy areas appear when they do.</p>}
      {door === `areas` && cur.ready && (
        <>
          <p className="us-hint">Each bill has one policy area, chosen by the Congressional Research Service. The number is how many recorded votes decided something in it.</p>
          <ul className="us-list">
            {gr.areas.filter((a) => !needle || a.area.toLowerCase().includes(needle)).map((a) => <li key={a.area}><button type="button" onClick={() => onTopics(a.area)}><strong>{a.area}</strong><small>{`Votes that decided something: ${a.votes}`}</small></button></li>)}
          </ul>
        </>
      )}
    </div>
  );
}

/* The Tree: the structure as nested lists. Each committee and agency opens to what is inside; a name opens the Linked view. */
function CX_UsTreeNode({ t, g, onOpen, depth }) {
  const kids = t.children || [];
  const open = (i) => <button type="button" onClick={() => onOpen(i)}>{t.label}</button>;
  if (!kids.length) return <li>{t.node !== null && t.node !== undefined ? open(t.node) : <span>{t.label}</span>}{t.note && <small className="us-note"> {t.note}</small>}</li>;
  return (
    <li>
      <details open={depth < 1}>
        <summary>{t.label}{t.count !== undefined || kids.length ? <small> {t.count !== undefined ? t.count : kids.length}</small> : null}</summary>
        {t.note && <p className="us-note">{t.note}</p>}
        <ul>{t.node !== null && t.node !== undefined && depth > 0 && <li>{open(t.node)} <small>About it</small></li>}{kids.map((k, i) => <CX_UsTreeNode key={i} t={k} g={g} onOpen={onOpen} depth={depth + 1} />)}</ul>
      </details>
    </li>
  );
}
function CX_UsTree({ data, g, onOpen }) {
  const tree = u.useMemo(() => cxUsTree(data, g), [data, g]);
  return <div className="us-tree"><ul>{tree.map((t, i) => <CX_UsTreeNode key={i} t={t} g={g} onOpen={onOpen} depth={0} />)}</ul></div>;
}

function CX_UsGraph({ phone }) {
  const [data, setData] = u.useState(CX_US.v);
  const [state, setState] = u.useState(CX_US.p ? `ready` : `loading`);
  u.useEffect(() => { let live = !0; cxUsLoad().then((d) => { if (live) { setData(d); setState(d ? `ready` : `none`); } }); return () => { live = !1; }; }, []);
  const g = CX_US.graph;
  const [view, setView] = u.useState(phone ? `mine` : `sky`);
  const [sel, setSel] = u.useState(null);
  const [q, setQ] = u.useState(``);
  const [show, setShow] = u.useState({ member: !0, committee: !0, agency: !0 });
  const [chamber, setChamber] = u.useState(`all`);
  const [stateF, setStateF] = u.useState(``);
  const [tick, setTick] = u.useState(0);
  const [motion, setMotion] = u.useState(() => {   // still, calm, or live; a phone and anyone who asked the device for less motion start still
    try { const v = globalThis.localStorage && globalThis.localStorage.getItem(`cx-us-motion`); if (v === `still` || v === `calm` || v === `live`) return v; } catch (e) { /* no storage: use the default */ }
    const less = !!(globalThis.matchMedia && globalThis.matchMedia(`(prefers-reduced-motion: reduce)`).matches);
    return less || phone ? `still` : `calm`;
  });
  const chooseMotion = (m) => { setMotion(m); try { globalThis.localStorage.setItem(`cx-us-motion`, m); } catch (e) { /* a private window keeps it for this visit only */ } };
  const physRef = u.useRef(null), drawRef = u.useRef(null), visRef = u.useRef([]);
  const [full, setFull] = u.useState(false);   // the browser's own full screen, for the whole section
  const [solo, setSolo] = u.useState(null);   // null, { node: index }, or { state: "OH" }: show only that and what it touches
  const soloSet = u.useMemo(() => (g && solo ? cxUsSolo(g, solo) : null), [g, solo]);
  const cvs = u.useRef(null), cam = u.useRef({ x: 0, y: 0, k: 0.55 }), wrap = u.useRef(null), drag = u.useRef(null);
  const visible = u.useCallback((n) => {
    if (soloSet) return soloSet.has(n.i);
    if (n.kind === `hub`) return !0;
    if (n.kind === `member` && !show.member) return !1;
    if (n.kind === `committee` && !show.committee) return !1;
    if (n.kind === `agency` && !show.agency) return !1;
    if (chamber !== `all` && n.group !== chamber && n.group !== `joint` && n.group !== `exec`) return !1;
    return !0;
  }, [show, chamber, soloSet]);
  const dim = u.useCallback((n) => !!stateF && n.kind === `member` && n.m.state !== stateF, [stateF]);
  const nbr = u.useMemo(() => { if (!g || sel === null) return null; const s = new Set([sel]); g.adj[sel].forEach((k) => { s.add(g.edges[k].a); s.add(g.edges[k].b); }); return s; }, [g, sel]);

  // ---- drawing
  const draw = u.useCallback(() => {
    const c = cvs.current; if (!c || !g) return;
    const w = c.clientWidth, h = c.clientHeight, dpr = globalThis.devicePixelRatio || 1;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const x = c.getContext(`2d`); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
    const { x: cx, y: cy, k } = cam.current, X = (v) => w / 2 + (v + cx) * k, Y = (v) => h / 2 + (v + cy) * k;
    const lit = nbr;
    if (!soloSet && g.clusters) g.clusters.forEach((cl) => {
      const px = X(cl.x), py = Y(cl.y), r = cl.r * k;
      if (px + r < 0 || py + r < 0 || px - r > w || py - r > h) return;
      x.fillStyle = `rgba(255,255,255,.035)`; x.strokeStyle = `rgba(255,255,255,.12)`; x.lineWidth = 1;
      if (r > 0) { x.beginPath(); x.arc(px, py, r, 0, 6.2832); x.fill(); x.stroke(); }
      x.font = `600 14px Inter, system-ui, sans-serif`; x.fillStyle = `#f4f2ee`; x.textAlign = `center`;
      x.fillText(`${cl.label} · ${cl.count}`, px, py - r - 14);
    });
    if (lit) {  // the connections of the chosen node
      x.lineWidth = 1; x.strokeStyle = `rgba(255,255,255,.28)`;
      g.adj[sel].forEach((ei) => { const e = g.edges[ei], A = g.nodes[e.a], B = g.nodes[e.b]; if (!visible(A) || !visible(B)) return; x.beginPath(); x.moveTo(X(A.x), Y(A.y)); x.lineTo(X(B.x), Y(B.y)); x.stroke(); });
      if (motion !== `still`) {   // a small light travels each recorded connection of the chosen node, out and then around again
        const T = performance.now() / 1000;
        x.fillStyle = `rgba(255,255,255,.9)`;
        g.adj[sel].slice(0, 150).forEach((ei) => {
          const e = g.edges[ei], A = g.nodes[e.a], B = g.nodes[e.b]; if (!visible(A) || !visible(B)) return;
          const from = e.a === sel ? A : B, to = e.a === sel ? B : A, ph = (T * 0.45 + cxUsHash(to.id)) % 1;
          x.beginPath(); x.arc(X(from.x + (to.x - from.x) * ph), Y(from.y + (to.y - from.y) * ph), 2.4, 0, 6.2832); x.fill();
        });
      }
    }
    g.nodes.forEach((n) => {
      if (!visible(n)) return;
      const on = !lit || lit.has(n.i), isSel = n.i === sel, faded = (lit && !on) || dim(n);
      const px = X(n.x), py = Y(n.y), r = Math.max(1.6, n.r * Math.sqrt(k) * (isSel ? 1.5 : 1));
      if (px < -20 || py < -20 || px > w + 20 || py > h + 20) return;
      x.globalAlpha = faded ? 0.14 : 1; x.fillStyle = CX_US_COLORS[n.group] || `#ccc`;
      x.beginPath();
      if (n.shape === `diamond`) { x.moveTo(px, py - r * 1.3); x.lineTo(px + r, py); x.lineTo(px, py + r * 1.3); x.lineTo(px - r, py); x.closePath(); }
      else if (n.shape === `square`) x.rect(px - r, py - r, r * 2, r * 2);
      else x.arc(px, py, r, 0, 6.2832);
      x.fill();
      if (isSel) { x.lineWidth = 2; x.strokeStyle = `#fff`; x.stroke(); }
      x.globalAlpha = 1;
      const label = (n.kind === `hub` && !soloSet && k > 0.9) || isSel || (soloSet && (soloSet.size <= 70 || n.kind !== `member`)) || (k > 0.75 && n.kind === `committee`) || (k > 2.4 && n.kind !== `member`) || (k > 4 && n.kind === `member`) || (lit && on && n.kind !== `member`);
      if (label && !faded) { x.font = `${n.kind === `hub` ? 700 : 500} ${n.kind === `hub` ? 15 : 12}px Inter, system-ui, sans-serif`; x.fillStyle = `#f4f2ee`; x.textAlign = `center`; x.fillText(n.label.length > 26 ? n.label.slice(0, 25) + `…` : n.label, px, py - r - 6); }
    });
  }, [g, sel, nbr, visible, dim, soloSet, motion]);
  drawRef.current = draw;
  u.useEffect(() => { draw(); }, [draw, tick, view, state]);
  // motion: one loop, only while the Sky is showing, the tab is visible, and the map is on screen
  u.useEffect(() => {
    if (!g || state !== `ready` || view !== `sky`) return undefined;
    if (!physRef.current) physRef.current = cxUsMotionState(g);
    const S = physRef.current;
    if (motion === `still`) { cxUsStep(g, S, `still`, 0, 1, g.nodes); S.pulled = null; if (drawRef.current) drawRef.current(); return undefined; }
    let raf = 0, last = 0, alive = true, onScreen = true;
    const t0 = performance.now();
    const io = globalThis.IntersectionObserver && cvs.current ? new globalThis.IntersectionObserver((es) => { onScreen = es[0].isIntersecting; }) : null;
    if (io) io.observe(cvs.current);
    const loop = (now) => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      if (document.hidden || !onScreen || now - last < 30) return;
      const dt = last ? (now - last) / 16.7 : 1; last = now;
      cxUsStep(g, S, motion, (now - t0) / 1000, dt, visRef.current);
      if (drawRef.current) drawRef.current();
    };
    raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); if (io) io.disconnect(); S.pulled = null; };
  }, [g, state, view, motion]);
  u.useEffect(() => { const f = () => setTick((t) => t + 1); globalThis.addEventListener(`resize`, f); return () => globalThis.removeEventListener(`resize`, f); }, []);
  u.useEffect(() => {
    const f = () => { setFull(!!document.fullscreenElement); setTimeout(() => fitRef.current && fitRef.current(), 60); };
    document.addEventListener(`fullscreenchange`, f); return () => document.removeEventListener(`fullscreenchange`, f);
  }, []);
  const fitRef = u.useRef(null);
  const toggleFull = () => { try { if (document.fullscreenElement) document.exitFullscreen(); else if (wrap.current && wrap.current.requestFullscreen) wrap.current.requestFullscreen(); } catch (e) { /* a browser that refuses full screen keeps the page-sized map */ } };

  const toWorld = (ev) => { const c = cvs.current, r = c.getBoundingClientRect(), { x, y, k } = cam.current; return [(ev.clientX - r.left - r.width / 2) / k - x, (ev.clientY - r.top - r.height / 2) / k - y]; };
  const pick = (wx, wy) => { let best = null, bd = 1e9; g.nodes.forEach((n) => { if (!visible(n) || dim(n)) return; const dd = (n.x - wx) ** 2 + (n.y - wy) ** 2, rr = (Math.max(n.r, 6) + 4 / cam.current.k) ** 2; if (dd < rr && dd < bd) { bd = dd; best = n; } }); return best; };
  const zoomAt = (f, ev) => { const k0 = cam.current.k, k1 = Math.max(0.08, Math.min(9, k0 * f)); if (ev) { const [wx, wy] = toWorld(ev); const r = cvs.current.getBoundingClientRect(); cam.current = { k: k1, x: (ev.clientX - r.left - r.width / 2) / k1 - wx, y: (ev.clientY - r.top - r.height / 2) / k1 - wy }; } else cam.current = { ...cam.current, k: k1 }; setTick((t) => t + 1); };
  // fit everything that is shown into the canvas, with a margin
  const fit = () => {
    const c = cvs.current; if (!c || !g) return;
    const vis = g.nodes.filter(visible);
    if (!vis.length) return;
    const xs = vis.map((n) => n.hx), ys = vis.map((n) => n.hy), cl = !soloSet && g.clusters ? g.clusters : [];
    // the soft discs and their labels count too, so nothing is cut off at the edge
    const x0 = Math.min(...xs, ...cl.map((c) => c.x - c.r)) - 40, x1 = Math.max(...xs, ...cl.map((c) => c.x + c.r)) + 40, y0 = Math.min(...ys, ...cl.map((c) => c.y - c.r - 26)) - 40, y1 = Math.max(...ys, ...cl.map((c) => c.y + c.r)) + 40;
    // on the big desktop map the side panel sits over the right edge and the key over the bottom, so the picture is fitted into what is left
    const rx = !phone && view === `sky` ? 360 : 0, by = !phone && view === `sky` ? 56 : 0;
    const k = Math.max(0.08, Math.min(2, Math.min((c.clientWidth - rx) / (x1 - x0), (c.clientHeight - by) / (y1 - y0))));
    cam.current = { x: -(x0 + x1) / 2 - rx / (2 * k), y: -(y0 + y1) / 2 - by / (2 * k), k };
    setTick((t) => t + 1);
  };
  fitRef.current = fit;
  u.useEffect(() => { if (state === `ready` && view === `sky`) fit(); }, [state, view, show, chamber, solo]);
  const focus = (n) => { setSel(n.i); cam.current = { ...cam.current, x: -n.x, y: -n.y, k: Math.max(cam.current.k, 1.6) }; setTick((t) => t + 1); };
  const onDown = (ev) => {
    let pull = null;
    if (motion !== `still`) { const [wx, wy] = toWorld(ev); const n = pick(wx, wy); if (n && n.kind !== `hub`) pull = n.i; }
    drag.current = { sx: ev.clientX, sy: ev.clientY, cx: cam.current.x, cy: cam.current.y, moved: !1, pull };
    cvs.current.setPointerCapture?.(ev.pointerId);
  };
  const onMove = (ev) => {
    const d0 = drag.current; if (!d0) return;
    const dx = ev.clientX - d0.sx, dy = ev.clientY - d0.sy;
    if (Math.abs(dx) + Math.abs(dy) > 4) d0.moved = !0;
    if (d0.pull !== null && d0.moved) { const [wx, wy] = toWorld(ev); if (physRef.current) physRef.current.pulled = { i: d0.pull, x: wx, y: wy }; if (sel !== d0.pull) setSel(d0.pull); return; }
    if (d0.moved) { cam.current = { ...cam.current, x: d0.cx + dx / cam.current.k, y: d0.cy + dy / cam.current.k }; setTick((t) => t + 1); }
  };
  const onUp = (ev) => { const d0 = drag.current; drag.current = null; if (physRef.current) physRef.current.pulled = null; if (d0 && !d0.moved) { const [wx, wy] = toWorld(ev); const n = pick(wx, wy); setSel(n ? n.i : null); } };
  const order = u.useMemo(() => (g ? g.nodes.filter(visible).filter((n) => !dim(n)).map((n) => n.i) : []), [g, visible, dim]);
  visRef.current = u.useMemo(() => (g ? g.nodes.filter((n) => visible(n)) : []), [g, visible]);
  const move = (dir) => { if (!order.length) return; const at = order.indexOf(sel); focus(g.nodes[order[(at + dir + order.length) % order.length]]); };
  const onKey = (ev) => {
    if (ev.target.closest && ev.target.closest(`input, select, textarea`)) { if (ev.key === `Escape`) ev.target.blur(); return; }
    const K = ev.key, pan = 60 / cam.current.k;
    if (K === `]`) { ev.preventDefault(); move(1); } else if (K === `[`) { ev.preventDefault(); move(-1); }
    else if (K === `Escape`) { if (sel !== null) setSel(null); else setSolo(null); }
    else if (K === `s` || K === `S`) { ev.preventDefault(); if (solo) setSolo(null); else if (sel !== null) setSolo({ node: sel }); }
    else if (K === `+` || K === `=`) zoomAt(1.3); else if (K === `-`) zoomAt(1 / 1.3);
    else if (K === `ArrowLeft`) { ev.preventDefault(); cam.current = { ...cam.current, x: cam.current.x + pan }; setTick((t) => t + 1); }
    else if (K === `ArrowRight`) { ev.preventDefault(); cam.current = { ...cam.current, x: cam.current.x - pan }; setTick((t) => t + 1); }
    else if (K === `ArrowUp`) { ev.preventDefault(); cam.current = { ...cam.current, y: cam.current.y + pan }; setTick((t) => t + 1); }
    else if (K === `ArrowDown`) { ev.preventDefault(); cam.current = { ...cam.current, y: cam.current.y - pan }; setTick((t) => t + 1); }
    else if (K === `/`) { ev.preventDefault(); wrap.current?.querySelector(`.us-search input`)?.focus(); }
  };
  u.useEffect(() => { const c = cvs.current; if (!c) return; const w = (e) => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e); }; c.addEventListener(`wheel`, w, { passive: !1 }); return () => c.removeEventListener(`wheel`, w); });

  if (state === `loading`) return <section className="us"><h1>United States</h1><p role="status">Loading the federal record...</p></section>;
  if (!data || !g) return <section className="us"><h1>United States</h1><p role="status">The United States graph needs the hosted site. It is not part of the offline file, because it loads a data file of about half a megabyte.</p></section>;
  const results = q.trim().length >= 2 ? g.nodes.filter((n) => n.kind !== `hub` && (n.name + ` ` + (n.m ? cxStateName(n.m.state) : ``)).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 40) : [];
  const states = [...new Set(data.members.map((m) => m.state))].sort();
  const cur = sel !== null ? g.nodes[sel] : null;
  const facts = cur ? cxUsFacts(g, cur) : [];
  const link = cur ? cxUsLink(cur) : null;
  const rows = g.nodes.filter((n) => n.kind !== `hub` && visible(n) && !dim(n));
  const links = cur ? cxUsLinks(g, cur.i) : [];
  const connected = links;
  const kindWord = { member: `Member of Congress`, committee: `Committee`, agency: `Agency`, hub: `Group` };
  const soloVal = !solo ? `` : solo.state ? `s:${solo.state}` : `n:${solo.node}`;
  const soloPicker = (
    <label>Solo <select className="us-solo" value={soloVal} onChange={(e) => { const v = e.target.value; setSolo(!v ? null : v.startsWith(`s:`) ? { state: v.slice(2) } : { node: +v.slice(2) }); if (v) setView(`sky`); }}>
      <option value="">Everything</option>
      <optgroup label="A committee">{g.nodes.filter((n) => n.kind === `committee`).sort((a, b) => a.name.localeCompare(b.name)).map((n) => <option key={n.id} value={`n:${n.i}`}>{n.name}</option>)}</optgroup>
      <optgroup label="An agency">{g.nodes.filter((n) => n.kind === `agency` && !n.a.parent_id).sort((a, b) => a.name.localeCompare(b.name)).map((n) => <option key={n.id} value={`n:${n.i}`}>{n.name}</option>)}</optgroup>
      <optgroup label="A state">{states.map((c) => <option key={c} value={`s:${c}`}>{cxStateName(c)}</option>)}</optgroup>
    </select></label>
  );
  const compact = view === `sky` && !phone;
  const tabs = [[`mine`, `Your members`], [`topics`, `Votes by topic`], [`sky`, `Sky`], [`index`, `Index`], [`linked`, `Linked`], [`tree`, `Tree`]];
  const pickBtn = (n) => <button type="button" className="us-pick" onClick={() => { focus(n); }}><strong>{n.name}</strong><small>{kindWord[n.kind]}{n.m ? `, ${cxStateName(n.m.state)}${n.m.district ? ` ${n.m.district}` : ``}` : ``}</small></button>;
  return (
    <section className={`us ${view === `sky` && !phone ? `us-sky` : ``} ${view === `sky` ? `us-skyview` : ``} ${full ? `us-full` : ``}`} ref={wrap} onKeyDown={onKey} aria-labelledby="us-h">
      <header className="us-head">
        <div>{phone ? <h2 id="us-h">United States</h2> : <h1 id="us-h">United States</h1>}<p className="us-lede">Congress, its committees, and the federal agencies, from public records. Pick anything to see what it connects to, in words.</p></div>
        <div className="us-tabs" role="group" aria-label="View">{tabs.map(([id, t]) => <button key={id} type="button" aria-pressed={view === id} className={view === id ? `on` : ``} onClick={() => setView(id)}>{t}</button>)}</div>
      </header>
      {phone ? <details className="us-preview us-preview-d"><summary>About these sources (a preview)</summary><p role="note">Preview. This is built from public-domain and Federal Register records pulled {cxShortDate(cxDayET(Date.parse(data.retrieved_at)))}. The terms of those sources have not yet been read by a person, so treat it as a working view, not a finished record. Party is shown only as a dated, sourced field. Nothing here ranks or scores anyone.</p></details> : <p className="us-preview" role="note">Preview. This is built from public-domain and Federal Register records pulled {cxShortDate(cxDayET(Date.parse(data.retrieved_at)))}. The terms of those sources have not yet been read by a person, so treat it as a working view, not a finished record. Party is shown only as a dated, sourced field. Nothing here ranks or scores anyone.</p>}
      {view !== `mine` && view !== `topics` && <>
      <div className="us-tools">
        <label className="us-search"><span>Find a person, committee, or agency</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Husted, Agriculture, Treasury" /></label>
        {compact && soloPicker}
        {phone || compact ? <details className="us-filters"><summary>Filters</summary><div className="us-tools">
        <fieldset className="us-show"><legend>Show</legend>
          {[[`member`, `Members`], [`committee`, `Committees`], [`agency`, `Agencies`]].map(([k, t]) => <label key={k}><input type="checkbox" checked={show[k]} onChange={() => setShow({ ...show, [k]: !show[k] })} /> {t}</label>)}
        </fieldset>
        <label>Chamber <select value={chamber} onChange={(e) => setChamber(e.target.value)}><option value="all">Both</option><option value="senate">Senate</option><option value="house">House</option></select></label>
        <label>Highlight a state <select value={stateF} onChange={(e) => setStateF(e.target.value)}><option value="">None</option>{states.map((s) => <option key={s} value={s}>{cxStateName(s)}</option>)}</select></label>
        {!compact && soloPicker}
        </div></details> : <>
        <fieldset className="us-show"><legend>Show</legend>
          {[[`member`, `Members`], [`committee`, `Committees`], [`agency`, `Agencies`]].map(([k, t]) => <label key={k}><input type="checkbox" checked={show[k]} onChange={() => setShow({ ...show, [k]: !show[k] })} /> {t}</label>)}
        </fieldset>
        <label>Chamber <select value={chamber} onChange={(e) => setChamber(e.target.value)}><option value="all">Both</option><option value="senate">Senate</option><option value="house">House</option></select></label>
        <label>Highlight a state <select value={stateF} onChange={(e) => setStateF(e.target.value)}><option value="">None</option>{states.map((s) => <option key={s} value={s}>{cxStateName(s)}</option>)}</select></label>
        {soloPicker}
        </>}
      </div>
      {results.length > 0 && <ul className="us-results" aria-label="Search results">{results.map((n) => <li key={n.id}>{pickBtn(n)}</li>)}</ul>}
      </>}
      <div className="us-body">
        <div className="us-main">
          {view === `topics` && <CX_UsTopics data={data} />}
          {view === `mine` && <CX_UsMine data={data} g={g} onSee={(n) => { focus(n); setView(`sky`); }} />}
          {view === `sky` && (
            <div className="us-stage">
              <div className="us-motion" role="group" aria-label="Motion"><span aria-hidden="true">Motion</span>{[[`still`, `Still`], [`calm`, `Calm`], [`live`, `Live`]].map(([id, t]) => <button key={id} type="button" aria-pressed={motion === id} className={motion === id ? `on` : ``} onClick={() => chooseMotion(id)}>{t}</button>)}</div>
              <canvas ref={cvs} className="us-canvas" tabIndex={0} role="img" aria-label={`Map of ${order.length} federal nodes: members of Congress, committees, and agencies. Use the Index, Linked, or Tree view for the same information as text. Keys: right and left bracket move between nodes, arrows pan, plus and minus zoom, Escape clears, slash searches.`}
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; }} />
              <div className="us-zoom"><button type="button" aria-label="Zoom in" onClick={() => zoomAt(1.3)}>+</button><button type="button" aria-label="Zoom out" onClick={() => zoomAt(1 / 1.3)}>−</button><button type="button" aria-label="Fit everything" onClick={fit}>Fit</button>{!phone && <button type="button" aria-label={full ? `Leave full screen` : `Full screen`} aria-pressed={full} onClick={toggleFull}>{full ? `Exit` : `Full`}</button>}</div>
              <p className="us-key" aria-hidden="true"><i style={{ background: CX_US_COLORS.senate }} /> Senate <i style={{ background: CX_US_COLORS.house }} /> House <i style={{ background: CX_US_COLORS.joint }} /> Joint committees <i style={{ background: CX_US_COLORS.exec }} /> Agencies. Circles are people, diamonds are committees, squares are agencies. <span>A moving light on a line shows a recorded connection.</span></p>
            </div>
          )}
          {view === `index` && <CX_UsDoors data={data} g={g} visible={visible} dim={dim} q={q} onOpen={(i) => { setSel(i); setView(`linked`); }} onTopics={(area) => { CX_US_PICK.area = area; setView(`topics`); }} />}
          {view === `linked` && (
            <div className="us-linked">
              {!cur && <p>Choose a person, committee, or agency (search above, or in the Sky or Index views) to see everything it is connected to.</p>}
              {cur && <><h2>{cur.name}</h2><ul className="us-facts">{facts.map((f, i) => <li key={i}>{f}</li>)}</ul>
                {links.length > 0 && <><h3>Connected to {links.length}</h3><ul className="us-conn">{links.slice(0, 60).map((l, i) => <li key={i}><button type="button" onClick={() => focus(g.nodes[l.to])}>{l.name}</button> <small>{l.text}</small></li>)}</ul>{links.length > 60 && <p>And {links.length - 60} more.</p>}</>}</>}
            </div>
          )}
          {view === `tree` && <CX_UsTree data={data} g={g} onOpen={(i) => { setSel(i); setView(`linked`); }} />}
        </div>
        <aside className="us-side" aria-live="polite" aria-label="Selected">
          {cur && view !== `linked` ? <>
            <h2>{cur.name}</h2><p className="us-kind">{kindWord[cur.kind]}</p>
            <ul className="us-facts">{facts.slice(0, 4).map((f, i) => <li key={i}>{f}</li>)}</ul>
            <div className="us-actions">
              {link && <a href={link[1]} target="_blank" rel="noreferrer">Profile<span className="sp-ext"> (opens in a new tab)</span></a>}
              <button type="button" aria-pressed={!!solo} onClick={() => setSolo(solo ? null : { node: cur.i })}>{solo ? `Show everything` : `Solo`}</button>
              <button type="button" onClick={() => setView(`linked`)}>In words ({connected.length})</button>
            </div>
            <p><button type="button" className="cx-link-button" onClick={() => setSel(null)}>Clear</button></p>
          </> : cur ? (link && <p><a href={link[1]} target="_blank" rel="noreferrer">{link[0]}<span className="sp-ext"> (opens in a new tab)</span></a></p>) : <p className="us-hint">Select anyone or anything. A selected node lights its connections. {data.counts.members} members, {data.counts.committees} committees, {data.counts.agencies} agencies.</p>}
          <p className="us-src">Sources: congress-legislators (public domain), the Federal Register. Pulled {cxShortDate(cxDayET(Date.parse(data.retrieved_at)))}. A connection is a recorded relationship, not control.</p>
        </aside>
      </div>
    </section>
  );
}
function d_committees(data, ch) { return data.committees.filter((c) => c.chamber === ch); }
