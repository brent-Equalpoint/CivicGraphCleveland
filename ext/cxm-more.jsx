/* v5.14 phone app: the legislation record ("receipt"), search, dictionary, You, decision ledger,
   and How this is built. Each reads the same data as its desktop counterpart. */

function CxmLegHistory({ m }) {
  const p = cxPlPath(m);
  const rows = p.h.length ? p.h : [[m.intro, `introduced`, `City Council`], ...(m.passed ? [[m.passed, `passed (date from the matter record)`, `City Council`]] : [])];
  return (
    <div className="cxm-hist">
      <h3 className="cxm-h3">Votes & actions</h3>
      <div className="cxm-tl"><span className="cxm-tl-d">{cxmDate(m.intro)}</span><span><strong>Introduced</strong><small>City Council</small></span></div>
      {rows.filter((r) => !(r[1] === `introduced`)).map((r, k) => <div key={k} className="cxm-tl"><span className="cxm-tl-d">{cxmDate(r[0])}</span><span><strong>{r[1].charAt(0).toUpperCase() + r[1].slice(1)}</strong><small>{r[2]}</small></span></div>)}
      {cxVoteRecord(m.file)
        ? <CX_RollCall file={m.file} />
        : <p className="cxm-note">{m.passed ? `The City Record snapshot has no member-by-member vote for this file. Council's own record shows the outcome only. A missing record is not a no.` : `This file has no passed date in Council's record, so there is no final vote to show.`}</p>}
    </div>
  );
}
function CxmLeg({ file }) {
  const { like, liked, openSeat } = useCxm();
  const m = cxmMatter(file);
  if (!m) return <div className="cxm-pad"><p className="cxm-mut">{file} is not in the 2026 record.</p></div>;
  const st = cxmStatus(m);
  const p = st.p;
  const f = cxPlCity().allFunds.find((r) => r.m.file === file);
  const q = cxmQuestionForFile(file);
  const lev = CX_SUBSTANTIVE.has(m.type) ? cxPlLever(m) : null;
  const src = CX_RSRC[file];
  const last = p.fin || (p.h.length ? p.h[p.h.length - 1] : null);
  const sponsors = m.sponsors.map((s) => [s, CX_SPONSOR_WARD[s]]);
  const inIdx = cxLegIndex().measures.some((x) => x.id === m.id);
  const latest = cxmLatestFor(file);
  return (
    <div className="cxm-pad">
      <CxmKicker>{m.file} · {m.type}</CxmKicker>
      <h2 className={`cxm-h2 ${cxShortTitle(m.title).length > 110 ? `cxm-h2-long` : ``}`}>{cxShortTitle(m.title)}</h2>
      <p className="cxm-status-line"><CxmStatusDot k={st.k} /><span><strong>Relationship status: {st.label}.</strong> {st.note}</span></p>
      {st.flip && <p className="cxm-flip">{st.flip}</p>}
      {latest && <p className="cxm-latest-line"><span className="cxm-kicker">Latest</span> {latest.what} <small>Found in the {cxShortDate(cxDayET(Date.parse(latest.at)))} check of the record.</small></p>}
      {f && (
        <div className="cxm-receipt">
          <span className="cxm-rbig">{f.amount ? cxmMoney(f.amount) : `Amount not stated`}</span>
          <small>{f.counted ? `Written into the ordinance as the limit for this item.` : f.named.length > 1 ? `Shared by Wards ${f.named.join(`, `)}; not counted toward one ward.` : `The fund named in the text may use the old ward numbers; not counted toward one ward.`}</small>
        </div>
      )}
      <h3 className="cxm-h3">Transaction details</h3>
      <dl className="cxm-dl">
        {f && <div><dt>Payment between</dt><dd>From {cxmFundLabel(f)} to {f.who || `the party named in the ordinance`}.</dd></div>}
        <div><dt>{st.k === `done` || st.k === `cond` ? `Signed off` : `Where it is`}</dt><dd>{last ? `${cxmDate(last[0])}: ${last[1]} (${last[2]})` : `Introduced ${cxmDate(m.intro)}; ${m.status}.`}</dd></div>
        {p.committees.length > 0 && <div><dt>Committees</dt><dd>{p.committees.join(`, `)}</dd></div>}
        {p.days !== null && <div><dt>Speed</dt><dd>{p.days} days from introduced to final vote{/^Emergency/.test(m.type) ? `. Emergency measures take effect right away.` : `.`}</dd></div>}
        {lev && <div><dt>Lever</dt><dd>{lev[1]}. {lev[3]}</dd></div>}
        <div><dt>Sponsored by</dt><dd>{sponsors.map(([s, w], k) => <span key={s}>{k ? `, ` : ``}{w ? <button type="button" className="cxm-link" onClick={() => openSeat(`ward-${w}`)}>{s} (Ward {w})</button> : s}</span>)}. Sponsorship is not a vote.</dd></div>
      </dl>
      {inIdx && <button type="button" className={`cxm-heart ${liked.includes(m.id) ? `on` : ``}`} aria-pressed={liked.includes(m.id)} onClick={() => like(m.id)}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z" /></svg>
        {liked.includes(m.id) ? `Saved to my letter` : `Ask about this in a letter`}
      </button>}
      {q && CX_REASONS[q.id] && <CxmDrop title="Why supporters backed it" sub="Their case, from the official record"><CX_Why q={q} /></CxmDrop>}
      <CxmLegHistory m={m} />
      <CxmDrop title="Full official title"><p>{m.title}</p></CxmDrop>
      <h3 className="cxm-h3">Sources</h3>
      <div className="cxm-row-links cxm-col">
        <CxmSrc href={m.url}>Cleveland City Council record, {m.file}</CxmSrc>
        {f?.f.text_url && <CxmSrc href={f.f.text_url}>Ordinance text</CxmSrc>}
        {src && src[0] && !f?.f.text_url && <CxmSrc href={src[0]}>Ordinance text</CxmSrc>}
        {src && src[1] && <CxmSrc href={src[1]}>Legislative summary</CxmSrc>}
      </div>
      <p className="cxm-fine">Cleveland's Legistar record, pulled {cxFresh().when} (Eastern); action history pulled {cxShortDate(cxDayET(Date.parse(CX_PL.retrieved)))}. Checked every night.</p>
    </div>
  );
}

/* ---------- search across everything ---------- */
function CxmSearch() {
  const { openSheet, openRoom, openSeat } = useCxm();
  const [q, setQ] = u.useState(``);
  const t = q.trim().toLowerCase();
  const hit = (s) => String(s).toLowerCase().includes(t);
  const res = u.useMemo(() => {
    if (t.length < 2) return null;
    const idx = cxLegIndex();
    const nodes = [];
    const seenNode = new Set();
    Uh.forEach((r) => r.nodes.forEach((n) => { if (!seenNode.has(n.id) && (hit(n.name) || hit(n.summary))) { seenNode.add(n.id); nodes.push([r, n]); } }));
    return [
      [`Rooms`, Uh.filter((r) => hit(r.label) || hit(r.question)).map((r) => [r.label, r.question, () => openRoom(r.id)])],
      [`People`, [...idx.seats, idx.admin].filter((s) => hit(s.name) || hit(`ward ${s.ward}`)).map((s) => [s.name, s.ward ? `Ward ${s.ward}` : `City departments`, () => openSeat(s.id)])
        .concat(Hm.flatMap((c) => c.candidates.filter((x) => Qm(x.status) && hit(x.name)).map((x) => [x.name, `${c.name} · ${x.party}`, () => openSheet(`contest`, { id: c.id })])))],
      [`Laws and proposals`, CX_LEG.matters.filter((m) => hit(m.file) || hit(m.title)).slice(0, 12).map((m) => [`${m.file} · ${cxHeadline(m.title)}`, `${m.type} · ${m.status}`, () => openSheet(`leg`, { file: m.file })])],
      [`Records`, nodes.slice(0, 10).map(([r, n]) => [n.name, `${r.label} · ${n.kind}`, () => openSheet(`record`, { room: r.id, node: n.id })])],
      [`Ballot`, Hm.filter((c) => hit(c.name) || hit(c.area)).slice(0, 8).map((c) => [c.name, `${cxArea(c.area, c.name)} ${c.term}`, () => openSheet(`contest`, { id: c.id })])
        .concat(Um.filter((i) => hit(i.title) || hit(i.area) || hit(`issue ${i.number}`) || hit(Xm(i).title)).slice(0, 8).map((i) => [`Issue ${i.number}: ${Xm(i).title}`, i.area, () => openSheet(`issue`, { id: i.id })]))],
      [`Terms`, Wh.filter((e) => hit(e.term) || hit(e.meaning)).slice(0, 8).map((e) => [e.term, e.meaning, () => openSheet(`term`, { term: e.term })])],
    ].filter(([, l]) => l.length);
  }, [t]);
  return (
    <div className="cxm-pad">
      <label className="cxm-field"><span>Search rooms, people, laws, ballot, and terms</span><input type="search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try Howse-Jones, data centers, Issue 3, TIF" /></label>
      {!res && <div className="cxm-chips">{[`Howse-Jones`, `data center`, `liquor`, `Issue 3`, `levy`, `ward`].map((s) => <button key={s} type="button" onClick={() => setQ(s)}>{s}</button>)}</div>}
      {res && !res.length && <CxmEmpty title={`Nothing matches "${q.trim()}"`} body="Try a shorter word, a name, an issue number, or a file number. The search covers rooms, people, laws, the ballot, and terms." actions={[[`Clear the search`, () => setQ(``)], [`Open the dictionary`, () => openSheet(`dict`)]]} />}
      {res && res.map(([g, list]) => (
        <section key={g} className="cxm-section">
          <CxmKicker>{g} · {list.length}</CxmKicker>
          {list.map(([a, b, fn], k) => <button key={g + k} type="button" className="cxm-row" onClick={fn}><span><strong>{a}</strong><small>{b}</small></span><CXI.Arrow size={15} /></button>)}
        </section>
      ))}
    </div>
  );
}

/* ---------- dictionary ---------- */
function CxmDict({ focus }) {
  const { openRoom } = useCxm();
  const [q, setQ] = u.useState(focus || ``);
  const [cat, setCat] = u.useState(`all`);
  const t = q.trim().toLowerCase();
  const featured = t ? Wh.find((e) => e.term.toLowerCase() === t) : null;
  const list = Wh.filter((e) => e !== featured && (cat === `all` || cxDictCategory(e) === cat) && `${e.term} ${e.meaning} ${e.example}`.toLowerCase().includes(t));
  const related = featured ? Wh.filter((e) => e !== featured && (e.room === featured.room || cxDictCategory(e) === cxDictCategory(featured))).slice(0, 6) : [];
  return (
    <div className="cxm-pad">
      <CxmKicker>Civic dictionary · {Wh.length} terms</CxmKicker>
      <label className="cxm-field"><span>Look up a word</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try ward, levy, jurisdiction…" /></label>
      <div className="cxm-chips cxm-hchips"><button type="button" className={cat === `all` ? `on` : ``} onClick={() => setCat(`all`)}>All</button>{CX_DICT_CATEGORIES.map((c) => <button key={c} type="button" className={cat === c ? `on` : ``} onClick={() => setCat(c)}>{c}</button>)}</div>
      {featured && (
        <div className="cxm-tile cxm-tile-acc">
          <span className="cxm-kicker">{cxDictCategory(featured)}</span>
          <h3 className="cxm-h2">{featured.term}</h3>
          <p>{featured.meaning}</p>
          <small className="cxm-mut">Example: {featured.example}</small>
          {related.length > 0 && <div className="cxm-chips">{related.map((r) => <button key={r.term} type="button" onClick={() => setQ(r.term)}>{r.term}</button>)}</div>}
          {Uh.some((r) => r.id === featured.room) && <button type="button" className="cxm-link" onClick={() => openRoom(featured.room)}>Show me where this fits</button>}
        </div>
      )}
      {list.map((e) => (
        <div key={e.term} className="cxm-term-row">
          <button type="button" className="cxm-link-block" onClick={() => setQ(e.term)}>{e.term}</button>
          <p>{e.meaning}</p>
          <small className="cxm-mut">{e.example}</small>
        </div>
      ))}
      {!list.length && !featured && <CxmEmpty title={t ? `No definition for "${q.trim()}" yet` : `Nothing in this category`} body="The dictionary explains civic words. Try a shorter word, or look at every category." actions={[[`Show every word`, () => { setQ(``); setCat(`all`); }]]} />}
      <p className="cxm-fine">Plain-language summaries, not legal definitions.</p>
    </div>
  );
}

/* ---------- Settings (the sheet behind the top-bar Settings button) ----------
   Only things about this app on this phone: how it looks, how it reads, who guides you, and what the app is.
   Anything about government or your choices lives elsewhere: My priorities (People tab), Follow a decision (Explore tab),
   and My place (its own tab). */
function CxmYou() {
  const { openSheet, guide, setGuide, theme, setTheme, large, setLarge, setEasy, closeSheet } = useCxm();
  const canSave = cxStorageOk();
  const [msg, setMsg] = u.useState(``);
  const share = async () => {
    const url = String(location.href).replace(/#.*$/, ``);
    try { if (navigator.share) { await navigator.share({ title: `Cleveland Civic Graph`, url }); return; } await navigator.clipboard.writeText(url); setMsg(`Link copied. It opens this screen on a phone or a computer. Nothing personal is in it.`); } catch { setMsg(url); }
  };
  return (
    <div className="cxm-pad">
      <h2 className="cxm-h2">Settings</h2>
      <p className="cxm-mut">These settings stay in this browser on this phone. Nothing is sent anywhere.</p>
      <section className="cxm-section">
        <CxmKicker>Display</CxmKicker>
        <div className="cxm-kv"><span>Language / Idioma</span><CX_LangChoice /></div>
        <div className="cxm-kv"><span>Style</span><CxmSeg label="Style" items={[[`bento`, `Bento`], [`original`, `Original`]]} value={theme} onChange={setTheme} /></div>
        <div className="cxm-kv"><span>Light or dark</span><CX_ModeChoice /></div>
        <button type="button" className={`cxm-switch ${large ? `on` : ``}`} aria-pressed={large} onClick={() => setLarge(!large)}><span>Larger text</span><i><b /></i></button>
        <button type="button" className="cxm-row" onClick={() => { setEasy(!0); closeSheet(); }}><span><strong>Easy mode</strong><small>One step at a time, bigger text, and Read it to me</small></span><CXI.Arrow size={15} /></button>
        {!canSave && <p className="cxm-fine" role="status">This browser is not saving settings, so Easy mode, style, and your guide start over each time you open the page. Private browsing can cause this.</p>}
      </section>
      <section className="cxm-section">
        <CxmKicker>Your guide</CxmKicker>
        <div className="cxm-guides">{Object.entries(CXM_GUIDES).map(([k, n]) => <button key={k} type="button" className={guide === k ? `on` : ``} aria-pressed={guide === k} onClick={() => setGuide(k)}><CxmGuide kind={k} size={52} /><span>{n}</span></button>)}</div>
      </section>
      <section className="cxm-section">
        <CxmKicker>About and sharing</CxmKicker>
        <button type="button" className="cxm-row" onClick={() => openSheet(`bench`)}><span><strong>How this is built</strong><small>Sources, method, and what is not running yet</small></span><CXI.Arrow size={15} /></button>
        <button type="button" className="cxm-row" onClick={share}><span><strong>Share this screen</strong><small>A plain link to where you are. Your place and choices stay out of it.</small></span><CXI.Arrow size={15} /></button>
        <button type="button" className="cxm-row" onClick={() => { location.hash = `desktop`; }}><span><strong>Desktop view</strong><small>The full map with Simple, Explore, and Audit modes</small></span><CXI.Arrow size={15} /></button>
        {msg && <p className="cxm-fine" role="status">{msg}</p>}
      </section>
    </div>
  );
}

/* ---------- My priorities (opened from the People tab, where they are used) ---------- */
function CxmPriorities() {
  const { prio, home, openSheet, liked } = useCxm();
  return (
    <div className="cxm-pad">
      <h2 className="cxm-h2">My priorities</h2>
      <p className="cxm-mut">Your choices stay in this browser on this phone. Nothing is sent anywhere.</p>
      <section className="cxm-section">
        <CxmKicker>Pick up to five</CxmKicker>
        <p className="cxm-mut">Start with what matters. Then look at a real decision. A priority tells the atlas what you want to examine. Your position on a specific policy is a separate choice. Everything is optional. "Still deciding" means you want to learn more.</p>
        <div className="cxm-progress" aria-live="polite"><span>{prio.chosen.length} of 5 priorities selected</span><span aria-hidden="true">{[1, 2, 3, 4, 5].map((k) => <i key={k} className={k <= prio.chosen.length ? `on` : ``} />)}</span></div>
        {wm.map((w) => (
          <div key={w.id} className="cxm-tile">
            <strong>{w.label}</strong>
            <small className="cxm-mut">{w.description}</small>
            <small className="cxm-qline">{w.example}</small>
            <div className="cxm-chips">{Tm.map((t) => <button key={t.id || `skip`} type="button" className={prio.v[w.id] === t.id ? `on` : ``} aria-pressed={prio.v[w.id] === t.id} onClick={() => prio.setLevel(w.id, t.id)}>{t.label}</button>)}</div>
            <button type="button" className="cxm-link" onClick={() => openSheet(`guides`, { id: w.id })}>What this means in Cleveland</button>
          </div>
        ))}
        {prio.msg && <p className="cxm-fine" role="status">{prio.msg}</p>}
      </section>
      <section className="cxm-section">
        <CxmKicker>Then look at a real decision</CxmKicker>
        {Dm.map((d) => (
          <button key={d.id} type="button" className="cxm-row" onClick={() => openSheet(`decision`, { id: d.id })}>
            <span><strong>{d.title}</strong><small>{d.status}{prio.s[d.id] ? ` · Your view: ${Em.find((e) => e.id === prio.s[d.id])?.label}` : ``}</small></span><CXI.Arrow size={15} />
          </button>
        ))}
      </section>
      <section className="cxm-section">
        <CxmKicker>Letters</CxmKicker>
        <button type="button" className="cxm-row" onClick={() => openSheet(`letter`, { seat: home?.ward ? `ward-${home.ward}` : `mayor` })}><span><strong>{home?.ward ? `Write to ${cxmMember(home.ward)}` : `Write to the mayor`}</strong><small>{liked.length ? `${cxmPl(liked.length, `proposal`, `proposals`)} saved to ask about` : `No proposals saved yet`}</small></span><CXI.Arrow size={15} /></button>
      </section>
      <p className="cxm-status-line"><CxmStatusDot k="rec" /><span><strong>Private to this browser.</strong> Ordinary shared map links do not include these choices.</span></p>
      <button type="button" className={`cxm-switch ${prio.rem ? `on` : ``}`} aria-pressed={prio.rem} onClick={() => prio.setRemember(!prio.rem)}><span>Remember on this device</span><i><b /></i></button>
      <div className="cxm-row2">
        <button type="button" className="cxm-btn2" onClick={() => cxmExportChoices(prio)}>Export</button>
        <button type="button" className="cxm-btn2" onClick={prio.clear}>Clear my choices</button>
      </div>
    </div>
  );
}
function CxmPriorityGuide({ id }) {
  const { openSheet } = useCxm();
  const g = CX_GUIDES[id];
  const w = wm.find((x) => x.id === id);
  if (!g) return null;
  return (
    <div className="cxm-pad">
      <CxmKicker>What this means in Cleveland</CxmKicker>
      <h2 className="cxm-h2">{w?.label}</h2>
      <p>{g.means}</p>
      <p className="cxm-mut">{g.like}</p>
      <h3 className="cxm-h3">In Cleveland</h3>
      {g.facts.map(([t, src, url, when]) => <p key={t}>{t} <CxmSrc href={url}>{src}, {when}</CxmSrc></p>)}
      <h3 className="cxm-h3">Who decides</h3>
      <ul className="cxm-list">{g.who.map((t) => <li key={t}>{t}</li>)}</ul>
      <h3 className="cxm-h3">What people weigh</h3>
      <ul className="cxm-list">{g.tradeoffs.map((t) => <li key={t}>{t}</li>)}</ul>
      <h3 className="cxm-h3">Questions to ask</h3>
      <ul className="cxm-list">{g.ask.map((t) => <li key={t}>{t}</li>)}</ul>
    </div>
  );
}

/* ---------- decision ledger ---------- */
function CxmLedger() {
  const { openRoom } = useCxm();
  const entries = u.useMemo(() => cxLedgerEntries(), []);
  const [dom, setDom] = u.useState(`all`);
  const [ev, setEv] = u.useState(`all`);
  const list = entries.filter((e) => (dom === `all` || e.domain === dom) && (ev === `all` || e.evidence === ev));
  const domains = [...new Set(entries.map((e) => e.domain))];
  const n = (k) => entries.filter((e) => e.evidence === k).length;
  return (
    <div className="cxm-pad">
      <CxmKicker>Decisions and contracts</CxmKicker>
      <h2 className="cxm-h2">Follow a decision to its record.</h2>
      <p className="cxm-mut">Each entry is a real Cleveland record already loaded in this atlas. The ledger shows what the record supports and lists what is still missing. It does not total money, score officials, or infer votes.</p>
      <div className="cxm-stats">
        <div><b>{entries.length}</b><span>Records</span></div>
        <div><b>{n(`verified`)}</b><span>Recorded actions</span></div>
        <div><b>{n(`under-review`) + n(`partial`) + n(`context`)}</b><span>Partial or context</span></div>
        <div><b>{n(`missing`)}</b><span>Records needed</span></div>
      </div>
      <p className="cxm-fine">Filters change the list, not the records.</p>
      <span className="cxm-kicker">Topic</span>
      <div className="cxm-chips"><button type="button" className={dom === `all` ? `on` : ``} onClick={() => setDom(`all`)}>All topics</button>{domains.map((d) => <button key={d} type="button" className={dom === d ? `on` : ``} onClick={() => setDom(d)}>{CX_DOMAIN_LABEL[d] ?? d}</button>)}</div>
      <span className="cxm-kicker">Evidence</span>
      <div className="cxm-chips"><button type="button" className={ev === `all` ? `on` : ``} onClick={() => setEv(`all`)}>All evidence</button>{Object.entries(CX_EVIDENCE_LABEL).map(([k, l]) => <button key={k} type="button" className={ev === k ? `on` : ``} onClick={() => setEv(k)}>{l}</button>)}</div>
      {!list.length && <CxmEmpty title="No records match these filters" body={`The ledger holds ${entries.length} records. Clearing the filters shows all of them.`} actions={[[`Clear the filters`, () => { setDom(`all`); setEv(`all`); }]]} />}
      {list.map((e) => (
        <CxmDrop key={e.id} title={e.short || e.title} sub={`${CX_DOMAIN_LABEL[e.domain] ?? e.domain} · ${CX_EVIDENCE_LABEL[e.evidence]}`}>
          <strong>{e.title}</strong>
          <p>{e.summary}</p>
          <dl className="cxm-dl">{e.fields.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          <strong>Still missing</strong>
          <ul className="cxm-list">{e.missing.map((x) => <li key={x}>{x}</li>)}</ul>
          <strong>Source</strong>
          <CxmSrc href={e.source[1]}>{e.source[0]}</CxmSrc>
          <p className="cxm-fine">Review recorded {e.checked}. A source link is not an independent audit of every claim.</p>
          {e.related?.length > 0 && <p className="cxm-fine">{e.related.join(` · `)}</p>}
          <button type="button" className="cxm-link" onClick={() => openRoom(e.room, e.node)}>Show this record on the map</button>
        </CxmDrop>
      ))}
    </div>
  );
}

/* ---------- how this is built ---------- */
function CxmBench() {
  const [tab, setTab] = u.useState(`pipeline`);
  const [step, setStep] = u.useState(0);
  const [group, setGroup] = u.useState(`all`);
  const groups = [...new Set(CX_SEATS.map((x) => x[1]))];
  return (
    <div className="cxm-pad">
      <CxmKicker>How this is built</CxmKicker>
      <h2 className="cxm-h2">How a resident question becomes a public record.</h2>
      <p className="cxm-mut">A resident asks "Who decided this?" The system should return a short answer with jurisdiction, date, source, and uncertainty. The map, text view, Simple view, and Audit view all read the same approved records. No agent publishes. A named person approves each public change.</p>
      <div className="cxm-tile">
        <span className="cxm-kicker">Where things stand · September 24, 2026</span>
        <strong>The architecture is designed. The machinery is not running.</strong>
        <p className="cxm-mut">Research agents, source polling, the evidence store, the review console, and the publishing service are specified here, not live. The records in this atlas were gathered and reviewed by hand, with sources and gaps labeled.</p>
        <p className="cxm-fine">{CX_BUILD.version}. Base: {CX_BUILD.base}. Sources reviewed {CX_BUILD.sources}. Council records: Cleveland Legistar, {CX_LEG.count} items, retrieved {CX_LEG.retrieved_at.slice(0, 10)}. This phone app reads the same records as the desktop app.</p>
      </div>
      <CxmSeg label="Architecture sections" items={[[`pipeline`, `Pipeline`], [`seats`, `Seats`], [`states`, `States & gates`], [`plan`, `Delivery plan`], [`contracts`, `Evidence rules`]]} value={tab} onChange={setTab} />
      {tab === `pipeline` && (
        <>
          <div className="cxm-steps" role="group" aria-label="Steps">
            {CX_PIPELINE.map(([name], i) => (
              <button key={name} type="button" className={`cxm-step ${step === i ? `on` : ``} ${i === 9 ? `human` : ``}`} aria-pressed={step === i} onClick={() => setStep(i)}>
                <span>{String(i + 1).padStart(2, `0`)}</span>{name}
              </button>
            ))}
          </div>
          <div className="cxm-tile cxm-tile-acc" aria-live="polite">
            <span className="cxm-kicker">STEP {step + 1} OF {CX_PIPELINE.length}</span>
            <strong>{CX_PIPELINE[step][0]}</strong>
            <p className="cxm-mut">{CX_PIPELINE[step][1]}</p>
            <div className="cxm-row2">
              <button type="button" className="cxm-btn2" disabled={step === 0} onClick={() => setStep(step - 1)}>Previous</button>
              <button type="button" className="cxm-btn2" disabled={step === CX_PIPELINE.length - 1} onClick={() => setStep(step + 1)}>Next</button>
            </div>
          </div>
          <p className="cxm-fine">Step 10 is the human gate. When a correction is confirmed, corrections return to the evidence packet and the review starts again.</p>
          <div className="cxm-tile">
            <strong>Research spokes</strong>
            <p className="cxm-mut">One question can route to several spokes. Each returns its own evidence packet, and no researcher approves its own finding.</p>
            <div className="cxm-chips">{CX_SPOKES.map((x) => <span key={x}>{x}</span>)}</div>
          </div>
        </>
      )}
      {tab === `seats` && (
        <>
          <p className="cxm-fine">{CX_SEATS.length} seats. Each seat stops at its authority boundary.</p>
          <div className="cxm-chips"><button type="button" className={group === `all` ? `on` : ``} onClick={() => setGroup(`all`)}>All seats</button>{groups.map((g) => <button key={g} type="button" className={group === g ? `on` : ``} onClick={() => setGroup(g)}>{g}</button>)}</div>
          {CX_SEATS.filter((x) => group === `all` || x[1] === group).map(([name, grp, must, cannot]) => (
            <div key={name} className="cxm-tile">
              <strong>{name}</strong><small className="cxm-mut">{grp}</small>
              <dl className="cxm-dl"><div><dt>Must produce</dt><dd>{must}</dd></div><div><dt>Cannot do</dt><dd>{cannot}</dd></div></dl>
            </div>
          ))}
        </>
      )}
      {tab === `states` && (
        <>
          <h3 className="cxm-h3">Workflow states</h3>
          {CX_STATES.map(([st, entry, exit, fail]) => (
            <div key={st} className="cxm-tile">
              <code className="cxm-code">{st}</code><small className="cxm-mut">{entry}</small>
              <dl className="cxm-dl"><div><dt>Exit when</dt><dd>{exit}</dd></div><div><dt>Failure path</dt><dd>{fail}</dd></div></dl>
            </div>
          ))}
          <h3 className="cxm-h3">Review gates that cannot be skipped</h3>
          <ol className="cxm-list">{CX_GATES.map((g) => <li key={g}>{g}</li>)}</ol>
        </>
      )}
      {tab === `plan` && (
        <>
          <p className="cxm-mut">Start with one bounded journey: "Who authorized a named city decision, and what was the recorded vote?" Then one energy contract and one education levy, keeping their authority chains separate.</p>
          {CX_STAGES.map(([n0, name, del, acc, st]) => (
            <div key={n0} className="cxm-tile">
              <strong>{n0}. {name}</strong>
              <dl className="cxm-dl"><div><dt>Deliverable</dt><dd>{del}</dd></div><div><dt>Acceptance check</dt><dd>{acc}</dd></div></dl>
              <small className="cxm-status-inline"><i className={`cxm-sdot cxm-st-${st}`} aria-hidden="true" />{CX_STAGE_STATUS[st]}</small>
            </div>
          ))}
          <h3 className="cxm-h3">Acceptance cases</h3>
          {CX_CASES.map(([when, then]) => (
            <div key={when} className="cxm-tile">
              <span className="cxm-kicker">When</span><strong>{when}</strong>
              <span className="cxm-kicker">Then</span><p className="cxm-mut">{then}</p>
            </div>
          ))}
        </>
      )}
      {tab === `contracts` && (
        <>
          <h3 className="cxm-h3">Evidence states</h3>
          <dl className="cxm-dl">{CX_EVIDENCE_STATES.map(([k, d]) => <div key={k}><dt><code className="cxm-code">{k}</code></dt><dd>{d}</dd></div>)}</dl>
          <p className="cxm-fine">A cryptographic hash proves a stored record was not changed after capture. It does not prove the content is true.</p>
          <h3 className="cxm-h3">What the public page reads</h3>
          <p className="cxm-mut">The front end reads only a versioned, approved projection. Every record carries: id, type, label, plain summary, jurisdiction, geography, as-of date, evidence state, source anchors, validity, related records, next step, revision, and accessibility text.</p>
          <h3 className="cxm-h3">Guardrails for values alignment</h3>
          <ul className="cxm-list">
            <li>Compare issue by issue, using roll calls, sponsored measures, official statements, and dates.</li>
            <li>Never infer beliefs from party, and never turn one vote into an ideology.</li>
            <li>"Not enough evidence" and "not applicable" are real answers.</li>
            <li>Label every projected effect as a scenario, not an outcome.</li>
          </ul>
        </>
      )}
    </div>
  );
}

/* ---------- the desktop's decision lens: one reviewed decision, your view, the record ---------- */
function cxmExportChoices(prio) {
  const t = { version: 2, exportedAt: new Date().toISOString(), priorities: prio.v, policyChoices: prio.s, note: `Personal choices only. This file contains no candidate recommendation.` };
  const url = URL.createObjectURL(new Blob([JSON.stringify(t, null, 2)], { type: `application/json` }));
  const a = document.createElement(`a`);
  a.href = url;
  a.download = `my-cleveland-civic-choices.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function CxmDecision({ id }) {
  const { prio, openSheet } = useCxm();
  const d = Dm.find((x) => x.id === id);
  if (!d) return null;
  const mine = wm.filter((w) => prio.v[w.id]);
  return (
    <div className="cxm-pad">
      <p className="cxm-status-line"><CxmStatusDot k={d.reviewed ? `rec` : `talk`} />{d.status}</p>
      <h2 className="cxm-h2">{d.question}</h2>
      <p>{d.summary}</p>
      {d.reviewed && (
        <div className="cxm-tile">
          <strong>Your view on this specific decision</strong>
          <small className="cxm-mut">Your answer stays separate from issue importance and party identity.</small>
          {Em.map((e) => (
            <button key={e.id} type="button" className={`cxm-cand ${prio.s[d.id] === e.id ? `on` : ``}`} aria-pressed={prio.s[d.id] === e.id} onClick={() => prio.setStance(d.id, prio.s[d.id] === e.id ? `` : e.id)}>
              <strong>{e.label}</strong><small>{e.detail}</small>
            </button>
          ))}
        </div>
      )}
      {mine.length
        ? <div className="cxm-tile"><strong>Questions connected to your priorities</strong><small className="cxm-mut">{mine.map((w) => w.label).join(` · `)}</small></div>
        : <p className="cxm-fine">Choose a priority to bring its questions forward. You can also continue without choosing.</p>}
      <h3 className="cxm-h3">{d.reviewed ? `What the official record supports` : `What this example teaches`}</h3>
      <ul className="cxm-list">{d.facts.map((f) => <li key={f}>{f}</li>)}</ul>
      <h3 className="cxm-h3">Questions to ask about this decision</h3>
      {(d.prompts || []).map(([pid, q]) => (
        <div key={pid} className={`cxm-kvq ${prio.v[pid] ? `on` : ``}`}>
          <span>{wm.find((w) => w.id === pid)?.label}{prio.v[pid] && <small> · Your priority: {Tm.find((t) => t.id === prio.v[pid])?.label}</small>}</span>
          <p>{q}</p>
        </div>
      ))}
      {(d.people || []).length > 0 && (
        <>
          <h3 className="cxm-h3">People named in the reviewed record</h3>
          <p className="cxm-fine">Sponsorship is a documented action. It is not a substitute for an individual roll-call vote.</p>
          {d.people.map(([who, rel, vote]) => (
            <div key={who} className="cxm-tile"><strong>{who}</strong><small className="cxm-mut">{rel}</small><small className="cxm-fine">Vote evidence: {vote}</small></div>
          ))}
        </>
      )}
      <h3 className="cxm-h3">Evidence and gaps</h3>
      <p className="cxm-mut">{d.need}</p>
      <div className="cxm-row-links cxm-col">{(d.sources || []).map(([t, href]) => <CxmSrc key={href} href={href}>{t}</CxmSrc>)}</div>
      <p className="cxm-fine">A matching choice can be shown only for the same proposal and stage. This page does not turn sponsorship, party, or one vote into a complete political identity.</p>
    </div>
  );
}
