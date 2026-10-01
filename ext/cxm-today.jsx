/* v5.14 phone app: Today. Stories, City Hall receipts, and moments, all generated from the records
   for the resident's ward (or citywide before they pick a place). */

function cxmSplit(seat) {
  return { own: seat.items.filter((x) => x.role === `own`), joined: seat.items.filter((x) => x.role === `joined`), dept: seat.items.filter((x) => x.role === `dept`) };
}
function cxmPl(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}
function cxmRecordFor(cand, qid) {
  return Gm.find((g) => g.candidate === cand && g.question === qid && g.answer === `yes`);
}

/* ---------- stories ---------- */
function cxmWardStory(w, answers) {
  const seat = cxLegIndex().seats[w - 1];
  const parts = cxmSplit(seat);
  const money = cxPlWardMoney(w);
  const first = seat.name.split(` `)[0];
  const frames = [];
  if (money.counted.length) {
    frames.push({ k: `WARD ${w} · 2026`, big: `Ward ${w} steered ${cxmMoney(money.total)} to local groups.`, small: `Casino revenue and Neighborhood Equity money that the ordinance text ties to Ward ${w}: ${cxmPl(money.counted.length, `item`, `items`)}.` });
    const top = money.counted[0];
    frames.push({ k: `BIGGEST ITEM`, big: `${cxmMoney(top.amount)}${top.who ? ` to ${top.who}` : ``}.`, small: `${cxWords(cxShortTitle(top.m.title), 22)} ${top.m.file}.` });
  } else {
    frames.push({ k: `WARD ${w} · 2026`, big: `No ward money tied to Ward ${w} in this year's records yet.`, small: `Missing here means none was found in the ordinance text, not that nothing happened.` });
  }
  const liq = cxPlCity().liquorRows.filter((r) => r.ward === w);
  if (liq.length) {
    const wd = liq.filter((r) => r.withdraw).length, ob = liq.length - wd;
    const big = ob && wd ? `${cxmPl(ob, `objection`, `objections`)} filed, ${wd} withdrawn.` : ob ? `${cxmPl(ob, `objection`, `objections`)} filed.` : `${cxmPl(wd, `objection`, `objections`)} withdrawn.`;
    frames.push({ k: `LIQUOR PERMITS`, big, small: liq.filter((r) => r.addr).slice(0, 3).map((r) => `${r.withdraw ? `Withdrew` : `Objected`}: ${r.addr}, ${cxmDate(r.date)}`).join(`. `) || `The addresses are not in these titles.` });
  }
  frames.push({ k: `WHAT ${first.toUpperCase()} LED`, big: parts.own.length ? `${first} led ${cxmPl(parts.own.length, `proposal`, `proposals`)} this year.` : `${first} did not lead a proposal in this record.`, small: cxSummary(seat, parts.own, parts.joined, parts.dept) });
  const q = [...CX_COUNCIL_Q, ...CX_MAYOR_Q].map((x) => ({ x, m: cxmMatter(x[0]), w: Wm.find((z) => z.id === x[1]) }))
    .filter((o) => o.m && o.w && o.m.sponsors.some((s) => CX_SPONSOR_WARD[s] === w))
    .sort((a, b) => Number(!!answers[a.w.id]) - Number(!!answers[b.w.id]))[0];
  if (q) frames.push({ k: `YOUR TURN`, big: q.w.title, small: q.w.question, type: `react`, qid: q.w.id, match: { who: seat.name, seat: seat.id, portrait: seat.portrait, question: q.w.question, how: `put their name on the proposal`, file: q.x[0], cand: `council-ward-${w}` } });
  return { id: `ward`, label: `Ward ${w}`, ini: cxmInitials(seat.name), portrait: seat.portrait, name: `${seat.name} · Ward ${w}`, when: `Your council member, 2026 so far`, frames };
}
function cxmCouncilStory() {
  const idx = cxLegIndex();
  const c = cxPlCity();
  const withFinal = idx.measures.filter((m) => cxPlPath(m).days !== null).length;
  const denied = c.unusual.filter((x) => x.m.status === `Passed` && x.p.flags.some((f) => /denial/.test(f[1])));
  const tabled = idx.measures.filter((m) => m.status === `Tabled`);
  const frames = [
    { k: `2026 SO FAR`, big: `${CX_LEG.count.toLocaleString(`en-US`)} items introduced.`, small: `As of ${cxmDate(CX_LEG.retrieved_at)}, from Council's Legistar record. ${idx.measures.length} are ordinances or resolutions; the rest are ceremonial resolutions, communications, and agenda items.` },
    { k: `SPEED`, big: `Half passed within ${c.cityDays} days.`, small: `Of the ${withFinal} proposals with a recorded final vote, counted from the day each was introduced.` },
  ];
  if (denied.length) frames.push({ k: `ON AGAIN, OFF AGAIN`, big: `${denied.length === 1 ? `One proposal` : `${denied.length} proposals`} passed after a committee recommended denial.`, small: `${cxmStatus(denied[0].m).flip} ${cxWords(cxShortTitle(denied[0].m.title), 16)} ${denied[0].m.file}.` });
  if (tabled.length) frames.push({ k: `LEFT ON READ`, big: `${cxmPl(tabled.length, `item was`, `items were`)} tabled.`, small: tabled.map((m) => cxWords(cxShortTitle(m.title), 12)).join(` · `) });
  frames.push({ k: `WHAT WE WON'T SHOW`, big: `Votes we can't prove.`, small: `Council's database records outcomes, not how each member voted, and the 2026 City Record lists passed legislation without roll calls. So this app shows outcomes and sponsors only.` });
  return { id: `council`, label: `Council`, ini: `CC`, name: `Cleveland City Council`, when: `15 members · 2026 so far`, frames };
}
function cxmMayorStory(answers) {
  const admin = cxLegIndex().admin;
  const qs = CX_MAYOR_Q.map((x) => ({ x, w: Wm.find((z) => z.id === x[1]), r: CX_REASONS[x[1]] })).filter((o) => o.w);
  const frames = [{ k: `SENT BY THE MAYOR'S ADMINISTRATION`, big: `${admin.items.length} requests sent to Council this year.`, small: `City departments send requests like contracts, grants, and project steps. Council still decides each one.` }];
  qs.filter((o) => o.r && o.r.points.length).slice(0, 2).forEach((o) => frames.push({ k: o.w.title.toUpperCase(), big: `${o.w.title}.`, small: `${o.r.points[0]} ${o.x[0]}.` }));
  const q = [...qs].sort((a, b) => Number(!!answers[a.w.id]) - Number(!!answers[b.w.id]))[0];
  if (q) frames.push({ k: `YOUR TURN`, big: q.w.title, small: q.w.question, type: `react`, qid: q.w.id, match: { who: `Mayor Bibb's administration`, seat: `mayor`, portrait: admin.portrait, question: q.w.question, how: `sent the proposal to Council`, file: q.x[0], cand: `mayor-bibb` } });
  return { id: `mayor`, label: `Mayor`, ini: `JB`, portrait: admin.portrait, name: `Mayor Bibb's administration`, when: `What it sent to Council in 2026`, frames };
}
function cxmLevies() {
  return Um.filter((i) => Jm[i.number] && /\$\d+ per \$100,000/.test(Jm[i.number].yes)).map((i) => ({ issue: i, title: Jm[i.number].title, per: Number(Jm[i.number].yes.match(/\$(\d+) per \$100,000/)[1]), note: Jm[i.number].consider }));
}
function cxmBallotStory() {
  const days = cxmDaysTo(CXM_ELECTION);
  const county = Um.filter((i) => i.area === `COUNTY WIDE DISTRICT`).length;
  const i3 = Um.find((i) => i.number === 3);
  const nx = cxDatesNow().find((x) => x.state === `next` || x.state === `today`);
  const frames = [{ k: `ELECTION DAY`, big: days > 1 ? `${days} days. Tuesday, Nov. 3.` : days === 1 ? `Tomorrow. Tuesday, Nov. 3.` : days === 0 ? `Today is Election Day.` : `Election Day has passed.`, small: days < 0 ? `Official results come from the Cuyahoga County Board of Elections.` : `${Hm.length} contests on the county's candidate list and ${county} countywide issues, plus local issues that depend on your precinct.` }];
  if (nx && nx.iso !== CXM_ELECTION) frames.push({ k: nx.state === `today` ? `TODAY` : `NEXT DEADLINE`, big: `${nx.text}: ${nx.state === `today` ? `today` : nx.label}.`, small: nx.state === `today` ? `Times are Eastern. Check the details with the Board of Elections.` : `${nx.days === 1 ? `Tomorrow` : `${nx.days} days from today`}. Times are Eastern.` });
  if (i3) frames.push({ k: `STATE ISSUE 3`, big: `${Xm(i3).title}.`, small: Xm(i3).no });
  const lv = cxmLevies();
  if (lv.length) frames.push({ k: `THE LEVIES`, big: `${cxmPl(lv.length, `county levy`, `county levies`)}. What would they cost you?`, small: `Type your home's value and see the county's own estimate.`, type: `cta`, cta: `Type my home's value`, go: `keypad` });
  return { id: `ballot`, label: `Your ballot`, ini: days > 0 ? String(days) : `✓`, name: `Your ballot`, when: `Election Day is Tuesday, Nov. 3`, frames };
}
function cxmSamePerson(a, b) {
  const n = (s) => String(s).toLowerCase().replace(/[^a-z\s-]/g, ``).trim().split(/\s+/);
  const x = n(a), y = n(b);
  if (!x.length || !y.length || x[0] !== y[0]) return !1;
  const sx = x[x.length - 1], sy = y[y.length - 1];
  return sx === sy || sy.startsWith(`${sx}-`) || sx.startsWith(`${sy}-`);
}
function cxmHoodStory(hood) {
  const before = cxPlShares(`wards2014`, hood);
  const now = cxPlShares(`wards2026`, hood);
  if (!now.length) return null;
  const b = before[0], n0 = now[0];
  const frames = [];
  if (b && b.ward !== n0.ward) frames.push({ k: `RELATIONSHIP STATUS`, big: `${hood} and Ward ${b.ward}: it's complicated.`, small: `${Math.round(b.share * 100)}% of ${hood} was Ward ${b.ward} on the 2014 map, used through 2025.` });
  else frames.push({ k: `RELATIONSHIP STATUS`, big: `${hood} and Ward ${n0.ward}: still together.`, small: `The ward number stayed the same when the map changed from 17 wards to 15.` });
  frames.push({ k: `2026 MAP`, big: `${Math.round(n0.share * 100)}% of ${hood} is now Ward ${n0.ward}.`, small: `${now.slice(1).map((r) => `${Math.round(r.share * 100)}% Ward ${r.ward}`).join(`, `)}${now.length > 1 ? `. ` : ``}Shares are by land area, not by how many people live there.` });
  const m14 = b ? cxPlMember(`wards2014`, b.ward).trim() : ``, m26 = cxPlMember(`wards2026`, n0.ward).trim();
  const same = m14 && m26 && cxmSamePerson(m14, m26);
  frames.push({ k: `THE TWIST`, big: same && b.ward !== n0.ward ? `Same council member, new ward number.` : same ? `Same council member.` : `A different council member now.`, small: `The city's 2014 map file lists ${m14 || `no member`} for Ward ${b ? b.ward : `?`}; the 2026 file lists ${m26} for Ward ${n0.ward}.`, type: `cta`, cta: `Open My place`, go: `place` });
  return { id: `hood`, label: hood.length > 11 ? `${hood.slice(0, 10)}…` : hood, ini: cxmInitials(hood.replace(/[-.]/g, ` `)), name: hood, when: `Your neighborhood`, frames };
}
function cxmStories(home, answers) {
  return [home?.ward ? cxmWardStory(home.ward, answers) : null, cxmCouncilStory(), cxmMayorStory(answers), cxmBallotStory(), home?.hood ? cxmHoodStory(home.hood) : null].filter(Boolean);
}

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
  const title = x.fund ? <>{cxmFundLabel(x.fund)} → {x.fund.who || `see record`}</> : cxShortTitle(x.m.title);
  const amount = x.fund ? (x.fund.amount ? (x.fund.counted ? cxmMoney(x.fund.amount) : `shared`) : `amount?`) : x.st.k === `read` ? `tabled` : ``;
  return (
    <button type="button" className={`cxm-rcpt ${x.st.k === `read` ? `read` : ``}`} onClick={() => openSheet(`leg`, { file: x.m.file, fund: !!x.fund })}>
      <span className={`cxm-av cxm-av-${x.st.k}`}>{signer ? cxmInitials(signer) : `CH`}</span>
      <span className="cxm-rcpt-mid">
        <span className="cxm-rcpt-t">{title}</span>
        {x.fund && <span className="cxm-rcpt-w">{cxWords(cxShortTitle(x.m.title), 14)}</span>}
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
  const { home, openSheet, setOverlay, practice, seen, go, liked } = useCxm();
  const answers = practice.state.answers;
  const stories = u.useMemo(() => cxmStories(home, answers), [home?.ward, home?.hood, Object.keys(answers).length]);
  const moments = u.useMemo(() => cxmMoments(home), [home?.ward]);
  const days = cxmDaysTo(CXM_ELECTION);
  const nextDate = cxDatesNow().find((x) => x.state === `next` || x.state === `today`);
  const line = !home ? `Hey neighbor. Tell me where home is and I'll show you what City Hall decided for your block.`
    : !seen.ward && home.ward ? `Ward ${home.ward} has a new story, and City Hall's receipts are in.`
    : liked.length ? `You've got ${cxmPl(liked.length, `question`, `questions`)} ready for City Hall. That's how it starts.`
    : `Tap any receipt to see who paid whom and who signed off.`;
  return (
    <div className="cxm-page cxm-rise">
      <CxmSays>{line}</CxmSays>
      {!home && (
        <button type="button" className="cxm-card cxm-card-acc" onClick={() => openSheet(`home`)}>
          <strong>Make this yours</strong><span>Pick your neighborhood to see your ward, your council member, and your receipts.</span>
        </button>
      )}
      <div className="cxm-stories" role="list">
        {stories.map((s, i) => (
          <button key={s.id} type="button" role="listitem" className={`cxm-story-btn ${seen[s.id] ? `seen` : ``}`} aria-label={`${s.label} story${seen[s.id] ? `, seen` : `, new`}`} onClick={() => setOverlay({ type: `story`, list: stories, i, f: 0 })}>
            <span className="cxm-ring">{s.portrait ? <img src={cxmAsset(s.portrait)} alt="" /> : <span>{s.ini}</span>}</span>
            <small>{s.label}</small>
          </button>
        ))}
      </div>
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
        <CxmKicker>MOMENTS FOR YOU</CxmKicker>
        {moments.map((m, i) => (
          <button key={m.id} type="button" className="cxm-card cxm-moment-card" onClick={() => setOverlay({ type: `moment`, list: moments, i, lens: 0 })}>
            <span className="cxm-kicker cxm-soft">{m.kicker}</span>
            <strong>{m.teaser}</strong>
            <small>Tap to zoom from you to the city</small>
          </button>
        ))}
      </section>
    </div>
  );
}

/* ---------- story viewer ---------- */
function CxmStory() {
  const { overlay, setOverlay, practice, answer, like, liked, seen, setSeen, go, openSheet } = useCxm();
  const { list, i, f } = overlay;
  const s = list[i];
  const fr = s.frames[Math.min(f, s.frames.length - 1)];
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
        <span className="cxm-story-who">{s.portrait ? <img src={cxmAsset(s.portrait)} alt="" /> : <span>{s.ini}</span>}<span><strong>{s.name}</strong><small>{s.when}</small></span></span>
        <button type="button" aria-label="Close story" onClick={() => setOverlay(null)}><CXI.X size={22} /></button>
      </div>
      <div className="cxm-story-body">
        <div key={`${i}-${f}`} className="cxm-rise">
          <span className="cxm-kicker">{fr.k}</span>
          <p className="cxm-story-big">{fr.big}</p>
          <p className="cxm-story-small">{fr.small}</p>
        </div>
        {fr.type !== `react` && (
          <>
            <button type="button" className="cxm-tap cxm-tap-l" aria-label="Previous" onClick={prev} />
            <button type="button" className="cxm-tap cxm-tap-r" aria-label="Next" onClick={next} />
          </>
        )}
      </div>
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
        <button type="button" className="cxm-btn cxm-btn-light" onClick={() => { if (fr.go === `keypad`) setOverlay({ type: `keypad`, mode: `home`, kp: `150000` }); else { setOverlay(null); go(fr.go); } }}>{fr.cta}</button>
      )}
      {!fr.type && <span className="cxm-story-hint">Tap the right side to keep going</span>}
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
      <span className="cxm-kicker cxm-soft">IT'S A</span>
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
        <span className="cxm-kicker">{(CXM_GUIDES[guide] || `Erie`).toUpperCase()}</span>
        <strong>Your first question for City Hall is saved. Send it whenever you're ready.</strong>
        <button type="button" className="cxm-link" onClick={() => { setToast(null); openSheet(`letter`, { seat: home?.ward ? `ward-${home.ward}` : `mayor` }); }}>Open my letter · {cxmPl(liked.length, `question`, `questions`)}</button>
      </span>
      <button type="button" aria-label="Dismiss" onClick={() => setToast(null)}><CXI.X size={18} /></button>
    </div>
  );
}
