/* v5.14 phone app: Today. Stories, City Hall receipts, and moments, all generated from the records
   for the resident's ward (or citywide before they pick a place). */


/* ---------- City Hall receipts ---------- */
const CXM_NEWEST = CX_LEG.matters.reduce((a, m) => (m.passed && m.passed > a ? m.passed : a), ``);
function cxmWhen(m) {
  const p = cxPlPath(m);
  return (p.fin && p.fin[0]) || m.passed || (p.h.length ? p.h[p.h.length - 1][0] : m.intro);
}
function cxmReceipts(ward) {
  const idx = cxLegIndex();
  const seen = new Set();
  const rows = [];
  const add = (x) => { if (!seen.has(x.m.file)) { seen.add(x.m.file); rows.push(x); } };
  if (ward) {
    cxPlWardMoney(ward).rows.forEach((r) => add({ m: r.m, fund: r }));
    idx.seats[ward - 1].items.filter((x) => x.role === `own`).forEach((x) => add({ m: x.m }));
  } else {
    cxPlCity().allFunds.filter((r) => !r.councilWide && r.counted).forEach((r) => add({ m: r.m, fund: r }));
  }
  idx.measures.filter((m) => m.status === `Tabled`).forEach((m) => add({ m }));
  const cutoff = new Date(Date.parse(`${CXM_NEWEST}T12:00:00`) - 30 * 86400000).toISOString().slice(0, 10);
  rows.forEach((x) => { x.st = cxmStatus(x.m); x.when = cxmWhen(x.m); });
  rows.sort((a, b) => (a.when < b.when ? 1 : -1));
  return [
    [`talk`, `Talking stage`, `Still in review`, rows.filter((x) => x.st.k === `talk` || x.st.k === `hold`)],
    [`new`, `Newest`, `Last 30 days of records`, rows.filter((x) => (x.st.k === `done` || x.st.k === `cond`) && x.when >= cutoff)],
    [`earlier`, `Earlier this year`, ward ? `Ward ${ward} and its member` : `Citywide ward money`, rows.filter((x) => (x.st.k === `done` || x.st.k === `cond`) && x.when < cutoff)],
    [`read`, `Left on read`, `Tabled by Council`, rows.filter((x) => x.st.k === `read`)],
  ].filter((g) => g[3].length);
}
function cxmFundLabel(r) {
  const w = r.ward ? `Ward ${r.ward} ` : ``;
  return /casino/i.test(r.m.title) ? `${w}casino revenue` : `${w}equity fund`;
}
function CxmReceiptRow({ x }) {
  const { openSheet } = useCxm();
  const signer = cxPlSigner(x.m);
  const title = x.fund ? <>{cxmFundLabel(x.fund)} → {cxEntity(x.fund.who) || `see record`}</> : cxHeadline(x.m.title);
  const amount = x.fund ? (x.fund.amount ? (x.fund.counted ? cxmMoney(x.fund.amount) : `shared`) : `amount?`) : x.st.k === `read` ? `tabled` : ``;
  return (
    <button type="button" className={`cxm-rcpt ${x.st.k === `read` ? `read` : ``}`} onClick={() => openSheet(`leg`, { file: x.m.file, fund: !!x.fund })}>
      <span className={`cxm-av cxm-av-${x.st.k}`}>{signer ? cxmInitials(signer) : `CH`}</span>
      <span className="cxm-rcpt-mid">
        <span className="cxm-rcpt-t">{title}</span>
        <span className="cxm-rcpt-s"><CxmStatusDot k={x.st.k} />{x.st.label} · {cxmDate(x.when)}</span>
      </span>
      {amount && <span className="cxm-rcpt-a">{amount}</span>}
    </button>
  );
}
function CxmReceipts() {
  const { home } = useCxm();
  const groups = u.useMemo(() => cxmReceipts(home?.ward || null), [home?.ward]);
  const [more, setMore] = u.useState({});
  return (
    <section className="cxm-section">
      <h2 className="cxm-h2">City Hall receipts<span className="cxm-dot">.</span></h2>
      <p className="cxm-mut">Who paid whom, who signed off, and where it stands. {home?.ward ? `Ward ${home.ward} money and what its council member led, plus anything Council tabled.` : `Pick your place to see your own ward's receipts.`}</p>
      {groups.map(([id, title, sub, list]) => (
        <div key={id} className="cxm-rgroup">
          <div className="cxm-rgroup-h"><strong>{title}</strong><small>{sub} · {list.length}</small></div>
          {(more[id] ? list : list.slice(0, 4)).map((x) => <CxmReceiptRow key={x.m.file} x={x} />)}
          {list.length > 4 && <button type="button" className="cxm-link" onClick={() => setMore((m) => ({ ...m, [id]: !m[id] }))}>{more[id] ? `Show fewer` : `See all ${list.length}`}</button>}
        </div>
      ))}
      <p className="cxm-fine">Relationship statuses are our plain-English labels for the record's status: Committed means passed, Talking stage means still in review, Left on read means tabled. Amounts are the limits written into each ordinance.</p>
    </section>
  );
}

/* ---------- moments ---------- */
function cxmMoments(home) {
  const w = home?.ward || null;
  const member = w ? cxmMember(w) : ``;
  const out = [];
  if (w) {
    const money = cxPlWardMoney(w);
    const all = cxPlCity().allFunds.filter((r) => !r.councilWide && r.counted);
    const cityTotal = all.reduce((s, x) => s + (x.amount || 0), 0);
    const top = money.counted[0];
    out.push({
      id: `money`, kicker: `Money Ward ${w} steers`, teaser: top ? `${cxmMoney(top.amount)} went to ${top.who || `a ward project`}.` : `No Ward ${w} money shows up in this year's records yet.`,
      lenses: [
        top ? [`${cxmMoney(top.amount)} went to ${top.who || `a ward project`}.`, `Each council member steers casino revenue and Neighborhood Equity money to local groups. This is the largest Ward ${w} item on record this year: ${cxWords(cxShortTitle(top.m.title), 16)}`] : [`No ward money for Ward ${w} shows up in this year's records yet.`, `Missing here means no ward-tied item was found in the 2026 ordinance text, not that nothing happened.`],
        money.counted.length ? [`Ward ${w}: ${cxmPl(money.counted.length, `item`, `items`)}, ${cxmMoney(money.total)} this year.`, money.counted.slice(0, 4).map((r) => `${r.who || cxWords(cxShortTitle(r.m.title), 6)}, ${cxmMoney(r.amount)}`).join(`. `) + `.`] : [`Ward ${w}: nothing found yet.`, `Items appear here as soon as the record has them.`],
        [`Across Cleveland: ${all.length} items, about ${cxmMoney(cityTotal)}, in ${new Set(all.map((r) => r.ward)).size} wards.`, `Items shared by several wards aren't counted toward any one ward. Amounts are the limits written into each ordinance.`],
      ],
      who: [[member, `Ward ${w}`, !0]], note: `Each item is legislation sponsored by the ward's council member.`,
      member: money.counted.length ? `Your council member, ${member}, sponsored every counted item here.` : `No ward-tied items found for ${member} yet. That's no record, not a no.`,
      qid: null, q: `Is this how you'd want Ward ${w}'s share spent?`, file: top ? top.m.file : null,
    });
  }
  const dc = CX_REASONS[`cc-datacenters`], dq = Wm.find((x) => x.id === `cc-datacenters`), dm = cxmMatter(`556-2026`);
  if (dc && dq && dm) {
    const R = dc.points;
    const sp = dm.sponsors.filter((s) => CX_SPONSOR_WARD[s]);
    const backed = w && sp.some((s) => CX_SPONSOR_WARD[s] === w);
    out.push({
      id: `dc`, kicker: `Your electric bill`, teaser: `A pause on data centers is partly about what you pay for power.`,
      lenses: [[`A pause on data centers is partly about your electric bill.`, `${R[0]} ${R[1]}`], [w ? `The pause covers Ward ${w} the same as every ward.` : `The pause covers every ward the same way.`, R[3]], [`Council wants rules written before any get built.`, `${R[4]} ${R[2]}`]],
      who: sp.map((s) => [s, `Ward ${CX_SPONSOR_WARD[s]}`, CX_SPONSOR_WARD[s] === w]), note: `${dm.file}, ${cxmStatus(dm).label.toLowerCase()} ${cxmDate(cxmWhen(dm))}. The reasons are the sponsors' case, from the ordinance text.`,
      member: !w ? `Pick your place to see whether your council member sponsored it.` : backed ? `Your council member, ${member}, put their name on it.` : `${member} isn't listed as a sponsor. That's no record, not a no.`,
      qid: dq.id, q: dq.question, file: dm.file,
    });
  }
  const pf = CX_REASONS[`my-permit-fees`], tif = CX_REASONS[`my-eastside-tif`], pq = Wm.find((x) => x.id === `my-permit-fees`), pm0 = cxmMatter(`622-2026`);
  if (pf && tif && pq && pm0) {
    const wards = (((tif.points[0] || ``).match(/Wards? ((?:\d+(?:, | and |,)?)+)/) || [])[1] || ``).match(/\d+/g)?.map(Number) || [];
    const inD = w && wards.includes(w);
    const sp = pm0.sponsors.filter((s) => CX_SPONSOR_WARD[s]);
    out.push({
      id: `fees`, kicker: `Building near you`, teaser: inD ? `Build a new home in the East Side district and the city may waive your permit fees.` : `New homes in one East Side district pay no city permit fees.`,
      lenses: [
        inD ? [`Build a new home here and the city may waive your permit fees.`, pf.points[1]] : [`Your permit fees stay the same.`, `This change covers only the East Side TIF District${w ? `, and Ward ${w} isn't in it` : ``}. ${pf.points[1]}`],
        inD ? [`Part of Ward ${w} sits inside the new East Side district.`, tif.points[1]] : [`The district covers parts of Wards ${wards.join(` and `)}.`, w ? `Nothing about permit fees changes in Ward ${w}. If a deal like this matters for your ward, that's a question for ${member}.` : tif.points[1]],
        [`It's a bet on building where little has been built for decades.`, `${pf.points[0]} ${pf.points[2]}`],
      ],
      who: sp.map((s) => [s, `Ward ${CX_SPONSOR_WARD[s]}`, CX_SPONSOR_WARD[s] === w]), note: `Also requested by the mayor's administration. ${pm0.file}, ${cxmStatus(pm0).label.toLowerCase()} ${cxmDate(cxmWhen(pm0))}.`,
      member: !w ? `Pick your place to see whether your council member sponsored it.` : sp.some((s) => CX_SPONSOR_WARD[s] === w) ? `Your council member, ${member}, put their name on it.` : `${member} isn't listed as a sponsor. That's no record, not a no.`,
      qid: pq.id, q: pq.question, file: pm0.file,
    });
  }
  return out;
}

/* ---------- Today ---------- */
function CxmToday() {
  const { home, openSheet, setOverlay, practice, seen, go, setEasy } = useCxm();
  const answers = practice.state.answers;
  const stories = u.useMemo(() => cxmStories(home, answers), [home?.ward, home?.hood, Object.keys(answers).length]);
  const moments = u.useMemo(() => cxmMoments(home), [home?.ward]);
  const [note, setNote] = u.useState(CXM_NOTICE.v);
  const days = cxmDaysTo(CXM_ELECTION);
  const nextDate = cxDatesNow().find((x) => x.state === `next` || x.state === `today`);
  return (
    <div className="cxm-page cxm-rise">
      {note && <div className="cxm-notice" role="status"><span>{note}</span><button type="button" onClick={() => { CXM_NOTICE.v = null; setNote(null); }}>Got it</button></div>}
      <div className="cxm-stories" role="group" aria-label="Stories">
        {stories.map((s, i) => (
          <button key={s.id} type="button" className={`cxm-story-btn ${seen[s.id] ? `seen` : ``}`} aria-label={`${s.label} story${seen[s.id] ? `, seen` : `, new`}`} onClick={() => setOverlay({ type: `story`, list: stories, i, f: 0 })}>
            <span className="cxm-ring" aria-hidden="true">{s.portrait ? <img src={cxmAsset(s.portrait)} alt="" /> : <span>{s.ini}</span>}</span>
            <small>{s.label}</small>
          </button>
        ))}
      </div>
      {!home && (
        <button type="button" className="cxm-setplace" onClick={() => openSheet(`home`)}>
          <span><strong>Set your neighborhood</strong><small>See your ward, council member, and receipts.</small></span><CXI.Arrow size={16} />
        </button>
      )}
      <button type="button" className="cxm-card cxm-count" onClick={() => go(`ballot`)}>
        <span>
          <strong>{days > 1 ? `${days} days` : days === 1 ? `1 day` : days === 0 ? `Today` : `Done`}</strong>
          <small>{days > 0 ? `until Election Day, Tuesday, Nov. 3` : days === 0 ? `is Election Day. Polls are open 6:30 a.m. to 7:30 p.m.` : `Election Day was Tuesday, Nov. 3. See the official results.`}</small>
        </span>
        <em>My ballot <CXI.Arrow size={14} /></em>
        {nextDate && nextDate.iso !== CXM_ELECTION && <small className="cxm-next">{nextDate.state === `today` ? `Today: ` : `Next: `}{nextDate.label}, {nextDate.text.replace(/ by .*| ends at .*/, ``).toLowerCase()}{nextDate.state === `next` ? ` (${nextDate.days === 1 ? `tomorrow` : `in ${nextDate.days} days`})` : ``}</small>}
      </button>
      <CxmWhatsNew />
      <CxmReceipts />
      <section className="cxm-section">
        <h2 className="cxm-h2">Close to home<span className="cxm-dot">.</span></h2>
        {moments.map((m, i) => (
          <button key={m.id} type="button" className="cxm-card cxm-moment-card" onClick={() => setOverlay({ type: `moment`, list: moments, i, lens: 0 })}>
            <span className="cxm-kicker cxm-soft">{m.kicker}</span>
            <strong>{m.teaser}</strong>
            <small>Tap to zoom from you to the city</small>
          </button>
        ))}
      </section>
      <button type="button" className="cxm-link cxm-easy-link" onClick={() => setEasy(!0)}>Want a simpler view? Try Easy mode</button>
    </div>
  );
}

/* ---------- story viewer ---------- */
function CxmStory() {
  const { overlay, setOverlay, practice, answer, like, liked, seen, setSeen, go, openSheet, setStoryBack } = useCxm();
  const { list, i, f } = overlay;
  const s = list[i];
  const [asText, setAsText] = u.useState(!1);
  const deeper = (d) => {
    const back = { ...overlay };
    setOverlay(null);
    if (d.kind === `profile`) openSheet(`profile`, { seat: d.seat });
    else if (d.kind === `sheet`) openSheet(d.sheet);
    else go(d.tab);
    setStoryBack(back);
  };
  const hv = useCxLevyHome();
  const fr = cxLevyView(s.frames[Math.min(f, s.frames.length - 1)], hv);
  const own = fr.type === `react` || fr.type === `home` || fr.type === `more`;   // frames with their own controls: the tap zones would be in the way
  u.useEffect(() => { if (!seen[s.id]) setSeen((x) => ({ ...x, [s.id]: !0 })); }, [s.id]);
  const next = () => {
    if (f < s.frames.length - 1) setOverlay({ ...overlay, f: f + 1 });
    else if (i < list.length - 1) setOverlay({ ...overlay, i: i + 1, f: 0 });
    else setOverlay(null);
  };
  const prev = () => { if (f > 0) setOverlay({ ...overlay, f: f - 1 }); else if (i > 0) setOverlay({ ...overlay, i: i - 1, f: 0 }); };
  const val = fr.qid ? practice.state.answers[fr.qid] : null;
  const m = fr.match ? cxmMatter(fr.match.file) : null;
  const asked = m && liked.includes(m.id);
  const pick = (v) => {
    answer(fr.qid, v);
    if (v === `yes` && fr.match && cxmRecordFor(fr.match.cand, fr.qid)) setOverlay({ type: `crush`, match: fr.match, back: { ...overlay } });
  };
  return (
    <div className={`cxm-overlay cxm-story cxm-story-${s.id}`} role="dialog" aria-modal="true" aria-label={`${s.name} story`}>
      <div className="cxm-bars">{s.frames.map((_, k) => <i key={k} className={k <= f ? `on` : ``} />)}</div>
      <div className="cxm-story-head">
        <span className="cxm-story-who">{s.portrait ? <img src={cxmAsset(s.portrait)} alt="" /> : <span>{s.ini}</span>}<span><strong>{s.name}</strong><small>{cxTight(s.when)}</small></span></span>
        <button type="button" aria-label="Close story" onClick={() => setOverlay(null)}><CXI.X size={22} /></button>
      </div>
      <div className="cxm-story-bar2"><button type="button" className="cxm-story-text" aria-pressed={asText} onClick={() => setAsText(!asText)}>{asText ? `Back to the story` : `Read as text`}</button></div>
      <p className="cxm-sr" aria-live="polite" aria-atomic="true">{asText ? `` : `Step ${Math.min(f, s.frames.length - 1) + 1} of ${s.frames.length}. ${fr.k ? `${fr.k}. ` : ``}${fr.fig ? `${fr.fig} ` : ``}${fr.big} ${fr.small}`}</p>
      {asText && (
        <div className="cxm-story-all">
          <ol>{s.frames.map((x, n) => <li key={n}>{x.k ? <span className="cxm-kicker">{x.k}</span> : null}{x.fig ? <p className="cxm-story-fig">{x.fig}</p> : null}<p className={`cxm-story-big ${x.q ? `q` : ``}`}>{cxTight(x.big, !0)}</p><p className="cxm-story-small">{cxTight(x.small)}</p></li>)}</ol>
          {s.deeper && <button type="button" className="cxm-btn cxm-btn-light" onClick={() => deeper(s.deeper)}>{s.deeper.label}</button>}
        </div>
      )}
      {!asText && <div className="cxm-story-body">
        <div key={`${i}-${f}`} className="cxm-rise">
          {fr.k ? <span className="cxm-kicker">{fr.k}</span> : null}
          {fr.fig ? <p className="cxm-story-fig">{fr.fig}</p> : null}
          <p className={`cxm-story-big ${fr.q ? `q` : ``}`}>{cxTight(fr.big, !0)}</p>
          <p className="cxm-story-small">{cxTight(fr.small)}</p>
          {fr.src ? <CxSource source={fr.src} cls="cxm-story-src2" /> : null}
        </div>
        {!own && (
          <>
            <button type="button" className="cxm-tap cxm-tap-l" aria-label="Previous" onClick={prev} />
            <button type="button" className="cxm-tap cxm-tap-r" aria-label="Next" onClick={next} />
          </>
        )}
      </div>}
      {fr.type === `home` && (
        <div className="cxm-story-react cxm-rise">
          <CxLevyPad />
          <button type="button" className="cxm-btn" onClick={next}>Next <CXI.Arrow size={15} /></button>
        </div>
      )}
      {fr.type === `more` && (
        <div className="cxm-story-react cxm-rise">
          <CxLevyMore n={Number(String(s.id).replace(`levy-`, ``))} />
          {i < list.length - 1 && <button type="button" className="cxm-btn" onClick={next}>Next story <CXI.Arrow size={15} /></button>}
        </div>
      )}
      <CxSource source={s.source} cls="cxm-story-src" />
      {fr.type === `react` && (
        <div className="cxm-story-react cxm-rise">
          <CxmAnswers value={val} onPick={pick} />
          <div className="cxm-row2">
            {m && <button type="button" className="cxm-btn2" onClick={() => like(m.id)}>{asked ? `Added to your letter` : `Ask about this`}</button>}
            <button type="button" className="cxm-btn" onClick={next}>Next <CXI.Arrow size={15} /></button>
          </div>
        </div>
      )}
      {fr.type === `cta` && (
        <button type="button" className="cxm-btn cxm-btn-light" onClick={() => { if (fr.go === `keypad`) setOverlay({ type: `keypad`, mode: `home`, kp: `150000` }); else if (fr.go === `levystories`) { const n = list.findIndex((x) => x.id === `levy-10`); setOverlay(n >= 0 ? { ...overlay, i: n, f: 0 } : null); } else if (fr.go === `levies`) { setOverlay(null); openSheet(`levies`); } else { setOverlay(null); go(fr.go); } }}>{fr.cta}</button>
      )}
      {!asText && (!fr.type || fr.type === `more`) && s.deeper && f >= s.frames.length - 1 && <button type="button" className="cxm-btn cxm-btn-light" onClick={() => deeper(s.deeper)}>{s.deeper.label}</button>}
      {!asText && !fr.type && <span className="cxm-story-hint">{f >= s.frames.length - 1 ? `That is the last step` : `Tap the right side to keep going`}</span>}
    </div>
  );
}

/* ---------- zoom rings ---------- */
function CxmRings({ lens, ward, onLens }) {
  const L = [`You`, ward ? `Ward ${ward}` : `Your ward`, `Cleveland`];
  return (
    <div className="cxm-rings">
      <svg width="190" height="190" viewBox="0 0 250 250" aria-hidden="true">
        <circle cx="125" cy="125" r="118" className={lens === 2 ? `cxm-ring-on` : lens > 2 ? `cxm-ring-in` : `cxm-ring-off`} />
        <circle cx="125" cy="125" r="78" className={lens === 1 ? `cxm-ring-on` : lens > 1 ? `cxm-ring-in` : `cxm-ring-off`} />
        <circle cx="125" cy="125" r="34" className={lens === 0 ? `cxm-ring-you` : `cxm-ring-in`} />
        <text x="125" y="30" className={`cxm-ring-t ${lens === 2 ? `on` : ``}`}>CLEVELAND</text>
        <text x="125" y="68" className={`cxm-ring-t ${lens === 1 ? `on` : ``}`}>{(ward ? `WARD ${ward}` : `YOUR WARD`)}</text>
        <text x="125" y="130" className={`cxm-ring-you-t ${lens === 0 ? `on` : ``}`}>You</text>
      </svg>
      <div className="cxm-lens">{L.map((l, k) => <button key={l} type="button" className={lens === k ? `on` : ``} onClick={() => onLens(k)}>{lens === k && <i />}{l}</button>)}</div>
    </div>
  );
}
function CxmMoment() {
  const { overlay, setOverlay, home, practice, answer, like, liked } = useCxm();
  const [local, setLocal] = u.useState({});
  const { list, i, lens } = overlay;
  const mo = list[i];
  const set = (o) => setOverlay({ ...overlay, ...o });
  const val = mo.qid ? practice.state.answers[mo.qid] : local[mo.id];
  const m = mo.file ? cxmMatter(mo.file) : null;
  const label = lens === 0 ? `Zoom out to ${home?.ward ? `Ward ${home.ward}` : `your ward`}` : lens === 1 ? `Zoom out to Cleveland` : lens === 2 ? `Who decided this?` : i < list.length - 1 ? `Next moment` : `Done`;
  const adv = () => (lens < 3 ? set({ lens: lens + 1 }) : i < list.length - 1 ? set({ i: i + 1, lens: 0 }) : setOverlay(null));
  return (
    <div className="cxm-overlay cxm-moment" role="dialog" aria-modal="true" aria-label={mo.kicker}>
      <div className="cxm-story-head"><span className="cxm-kicker cxm-soft">{mo.kicker}</span><button type="button" aria-label="Close" onClick={() => setOverlay(null)}><CXI.X size={22} /></button></div>
      {lens < 3 && <CxmRings lens={lens} ward={home?.ward} onLens={(k) => set({ lens: k })} />}
      {lens < 3 && (
        <div key={`${i}-${lens}`} className="cxm-rise cxm-moment-text"><h2>{mo.lenses[lens][0]}</h2><p>{mo.lenses[lens][1]}</p></div>
      )}
      {lens === 3 && (
        <div className="cxm-rise cxm-moment-who">
          <h2>Who decided this<span className="cxm-dot">.</span></h2>
          <div className="cxm-tile">
            {mo.who.map(([n, wl, yours]) => <div key={n} className="cxm-who-row"><span><i className="cxm-sdot cxm-s-done" />{n}</span><small className={yours ? `cxm-yours` : ``}>{yours ? `YOUR WARD` : wl}</small></div>)}
            <p className="cxm-fine">{mo.note}</p>
          </div>
          <p>{mo.member}</p>
          <strong className="cxm-q">{mo.q}</strong>
          <CxmAnswers value={val} onPick={(v) => (mo.qid ? answer(mo.qid, v) : setLocal((x) => ({ ...x, [mo.id]: v })))} />
          {m && <button type="button" className="cxm-link" onClick={() => like(m.id)}>{liked.includes(m.id) ? `Added to your letter` : `Ask about this in a letter`}</button>}
        </div>
      )}
      <div className="cxm-grow" />
      {(lens < 3 || val) && <button type="button" className="cxm-btn cxm-btn-big" onClick={adv}>{label}</button>}
    </div>
  );
}

/* ---------- common ground reveal ---------- */
function CxmCrush() {
  const { overlay, setOverlay, like, liked } = useCxm();
  const { match, back } = overlay;
  const m = cxmMatter(match.file);
  const dots = u.useMemo(() => Array.from({ length: 16 }, (_, k) => { const a = (k / 16) * Math.PI * 2, d = 110 + (k % 3) * 28; return { x: Math.round(Math.cos(a) * d), y: Math.round(Math.sin(a) * d), s: 8 + (k % 3) * 2, c: k % 4, dl: (k % 5) * 0.04 }; }), []);
  return (
    <div className="cxm-overlay cxm-crush" role="dialog" aria-modal="true" aria-label="Common ground">
      <div className="cxm-burst" aria-hidden="true">{dots.map((d, k) => <i key={k} className={`c${d.c}`} style={{ "--x": `${d.x}px`, "--y": `${d.y}px`, width: d.s, height: d.s, animationDelay: `${d.dl}s` }} />)}</div>
      <div className="cxm-pair cxm-beat"><span className="cxm-pair-you">You</span>{match.portrait ? <img src={cxmAsset(match.portrait)} alt="" /> : <span>{cxmInitials(match.who)}</span>}</div>
      <span className="cxm-kicker cxm-soft">It's a</span>
      <h2 className="cxm-crush-h">Common ground<span>!</span></h2>
      <p>You and {match.who} land on the same side of this one.</p>
      <p className="cxm-crush-q">{match.question}</p>
      <p className="cxm-fine">You said yes. They {match.how} ({match.file}). Sponsorship is not a vote. That's the whole match. No percentages.</p>
      <div className="cxm-grow" />
      {m && <button type="button" className="cxm-btn cxm-btn-big" onClick={() => { if (!liked.includes(m.id)) like(m.id); setOverlay(back || null); }}>Ask them something</button>}
      <button type="button" className="cxm-link cxm-link-light" onClick={() => setOverlay(back || null)}>Keep going</button>
    </div>
  );
}

/* ---------- celebration ---------- */
function CxmToast() {
  const { toast, setToast, liked, guide, home, openSheet } = useCxm();
  u.useEffect(() => { const t = setTimeout(() => setToast(null), 6000); return () => clearTimeout(t); }, [toast]);
  return (
    <div className="cxm-toast cxm-pop" role="status">
      <CxmGuide kind={guide} size={52} />
      <span>
        <span className="cxm-kicker">{CXM_GUIDES[guide] || `Erie`}</span>
        <strong>Your first question for City Hall is saved. Send it whenever you're ready.</strong>
        <button type="button" className="cxm-link" onClick={() => { setToast(null); openSheet(`letter`, { seat: home?.ward ? `ward-${home.ward}` : `mayor` }); }}>Open my letter · {cxmPl(liked.length, `question`, `questions`)}</button>
      </span>
      <button type="button" aria-label="Dismiss" onClick={() => setToast(null)}><CXI.X size={18} /></button>
    </div>
  );
}
