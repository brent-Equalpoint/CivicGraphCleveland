/* How you line up (docs/plan-alignment.md). Step 1: what a member voted on in the policy areas you pick, as counts from the record, with no
   comparison to anyone. Step 2: once a person has reviewed the sample questions (ext/cx-align-text.jsx), where your answers and a member's
   recorded votes were the same, per policy area.

   Rules kept here, and checked by scripts/test_alignment.js and the `alignment` browser check:
   - Receipts, not scores. Counts per policy area only: no number across areas anywhere, no share of anything, no order by any count.
   - Only votes that decided something (the record's `final`). A senator is compared on Senate votes and a representative on House votes,
     and only on votes held while they were in that chamber (cxMemberVotes keeps a vote only when they were in its roll).
   - Present and Not voting are "no vote on this"; a member missing from a roll call is "not in the roll for this vote". Neither is a no.
   - "It depends" and "Still learning" are left out, as in the Constellation.
   - Party is not an input and is not shown here. The map is never recolored, resized, or reordered by anything in this file.
   - The policy areas you pick (CX_US_AREAS, the same up-to-five list as before) and your answers (CX_ALIGN_ANS) stay in this page's
     memory for this visit: never in a link, a cookie, storage, or a request. Nothing new is saved.
   - Step 2 is built but hidden until a person reviews the questions (CX_ALIGN_REVIEW from build.py --mark-alignment-reviewed). The browser
     check turns it on with window.__cxAlignPreview, which nothing in the app sets: not a link, not storage. */

/* ---------- pure: no screen here (scripts/test_alignment.js runs this part) ---------- */
function cxAlignOn() { return !!(typeof CX_ALIGN_REVIEW !== `undefined` && CX_ALIGN_REVIEW && CX_ALIGN_REVIEW.ok) || globalThis.__cxAlignPreview === true; }
/* Step 1: for one member and the areas picked, the votes that decided a bill or a nominee, counted by what the record says */
function cxAlignStep1(vd, m, areas) {
  const rows = cxMemberVotes(vd, m).filter((r) => r.v.final);
  return areas.map((area) => {
    const mine = rows.filter((r) => r.area === area), t = cxCastCounts(mine);
    return { area, total: mine.length, yea: t.Y, nay: t.N, present: t.P, notVoting: t.X, rows: mine };
  });
}
/* the two plain lines for one area of step 1 */
function cxAlignCountLines(c) {
  if (!c.total) return [`None on record for them in this area.`];
  return [c.total === 1 ? `1 vote that decided a bill or a nominee.` : `${c.total} votes that decided a bill or a nominee.`,
    c.present ? `Yea ${c.yea}, Nay ${c.nay}, Not voting ${c.notVoting}, Present ${c.present}.` : `Yea ${c.yea}, Nay ${c.nay}, Not voting ${c.notVoting}.`];
}
/* the record's votes by id, made once per file */
function cxAlignVotes(vd) { if (!vd.alignById) vd.alignById = new Map(vd.votes.map((v) => [v.id, v])); return vd.alignById; }
/* Step 2: for one member, per policy area, your yes and no answers set beside their recorded vote in their own chamber. There is no total
   across areas: each area stands alone, and the object has nothing else in it. kind: same, differ (a yea or nay), novote (present or not
   voting), notroll (not in that roll call), other (the question had no vote in their chamber, so it is not compared). */
function cxAlignLine(vd, Q, ans, m, areas) {
  const at = vd.members.indexOf(m.id), byId = cxAlignVotes(vd), keep = areas ? new Set(areas) : null, per = new Map();
  for (const q of Q.questions) {
    if (keep && !keep.has(q.area)) continue;
    if (!per.has(q.area)) per.set(q.area, { area: q.area, questions: 0, answered: 0, same: 0, of: 0, none: 0, other: 0, rows: [] });
    const a = per.get(q.area), an = ans[q.id];
    a.questions += 1;
    if (an !== `yes` && an !== `no`) continue;   // It depends and Still learning are left out
    a.answered += 1;
    const id = q.votes[m.chamber];
    if (!id) { a.other += 1; a.rows.push({ q, an, vote: null, cast: null, kind: `other` }); continue; }
    const v = byId.get(id), c = at < 0 || !v ? `-` : v.codes[at] || `-`;
    if (c === `Y` || c === `N`) { a.of += 1; const same = (c === `Y`) === (an === `yes`); if (same) a.same += 1; a.rows.push({ q, an, vote: v, cast: c, kind: same ? `same` : `differ` }); }
    else { a.none += 1; a.rows.push({ q, an, vote: v, cast: c, kind: c === `-` ? `notroll` : `novote` }); }
  }
  return { member: m.id, areas: [...per.values()] };
}
/* the plain lines for one area of step 2: what was the same, what they did not vote on (always shown), and what is not compared */
function cxAlignLineText(a, chamber) {
  if (!a.answered) return [`You have not answered a question here yet.`];
  const out = [];
  if (a.of) out.push(a.of === 1 ? `You answered the same on ${a.same} of 1 question you answered that this member voted on.` : `You answered the same on ${a.same} of ${a.of} questions you answered that this member voted on.`);
  else if (a.none) out.push(`This member did not vote on any question you answered here.`);
  if (a.of || a.none) out.push(`Questions you answered that this member did not vote on: ${a.none}.`);
  if (a.other) out.push(chamber === `senate` ? `Questions you answered that had no Senate vote, so they are not compared: ${a.other}.` : `Questions you answered that had no House vote, so they are not compared: ${a.other}.`);
  return out;
}
/* the record's word for a member's vote on one question, never a no for a missing vote */
function cxAlignCastWord(c) {
  return c === `Y` ? `Yea` : c === `N` ? `Nay` : c === `P` ? `Present, so no vote on this` : c === `X` ? `Not voting, so no vote on this` : `Not in the roll for this vote`;
}
const CX_ALIGN_ANSWERS = [[`yes`, `Yes, I support it`], [`no`, `No, I oppose it`], [`depends`, `It depends`], [`learning`, `Still learning`]];
/* who the compare table lists, and in which order: by name or by state, never by any count */
function cxAlignWho(data, who, st, di) {
  if (who === `senate`) return data.members.filter((m) => m.chamber === `senate`);
  if (who === `house`) return data.members.filter((m) => m.chamber === `house`);
  if (!st) return [];
  if (who === `state`) return data.members.filter((m) => m.state === st);
  return data.members.filter((m) => m.state === st && (m.chamber === `senate` || (di !== `` && String(m.district ?? 0) === String(di))));
}
function cxAlignOrder(list, by) {
  const nm = (m) => `${m.last || m.name}|${m.name}`;
  const byName = (a, b) => nm(a).localeCompare(nm(b));
  if (by === `state`) return [...list].sort((a, b) => cxStateName(a.state).localeCompare(cxStateName(b.state)) || (a.chamber === `senate` ? 0 : 1) - (b.chamber === `senate` ? 0 : 1) || (a.district ?? 0) - (b.district ?? 0) || byName(a, b));
  return [...list].sort(byName);
}
function cxAlignWhere(m) { return m.chamber === `senate` ? `Senator, ${cxStateName(m.state)}` : m.district ? `Representative, ${cxStateName(m.state)}, district ${m.district}` : `Representative, ${cxStateName(m.state)}`; }

/* ---------- the questions file and your answers, in memory only ---------- */
const CX_ALIGN = { p: null, v: null, none: !1 };
/* the questions load only when step 2 is on and a screen needs them (hosted site: /us/align-2026.json, written by build.py) */
function cxAlignLoad() {
  if (!cxAlignOn()) return Promise.resolve(null);
  if (!CX_ALIGN.p) {
    const web = typeof fetch === `function` && /^https?:$/.test(String(globalThis.location?.protocol || ``));
    CX_ALIGN.p = (web ? fetch(`/us/align-2026.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null))
      .then((d) => { CX_ALIGN.v = d && d.questions ? d : null; CX_ALIGN.none = !CX_ALIGN.v; return CX_ALIGN.v; });
  }
  return CX_ALIGN.p;
}
const CX_ALIGN_ANS = { v: {}, subs: new Set() };
function cxAlignAnswer(id, a) { const v = { ...CX_ALIGN_ANS.v }; if (a) v[id] = a; else delete v[id]; CX_ALIGN_ANS.v = v; CX_ALIGN_ANS.subs.forEach((f) => f()); }
function cxAlignClear() { CX_ALIGN_ANS.v = {}; CX_ALIGN_ANS.subs.forEach((f) => f()); }

/* ---------- the screens ---------- */
function useCxAlignAns() {
  const [, bump] = u.useState(0);
  u.useEffect(() => { const f = () => bump((x) => x + 1); CX_ALIGN_ANS.subs.add(f); return () => { CX_ALIGN_ANS.subs.delete(f); }; }, []);
  return CX_ALIGN_ANS.v;
}
/* the recorded votes, loaded only once something here needs them */
function useCxAlignVotes(need) {
  const [vd, setVd] = u.useState(CX_USV.v);
  u.useEffect(() => { if (!need || vd) return undefined; let live = !0; cxUsVotesLoad().then((d) => { if (live) setVd(d); }); return () => { live = !1; }; }, [need]);
  return vd || CX_USV.v;
}
function useCxAlignQ() {
  const on = cxAlignOn();
  const [Q, setQ] = u.useState(CX_ALIGN.v);
  u.useEffect(() => { if (!on || Q) return undefined; let live = !0; cxAlignLoad().then((d) => { if (live) setQ(d); }); return () => { live = !1; }; }, [on]);
  return on ? Q || CX_ALIGN.v : null;
}
function CX_AlignExt() { return <span className="sp-ext"> (opens in a new tab)</span>; }

/* the policy areas you pick: the same list of up to five as the rest of the United States pages (CX_US_AREAS, memory only) */
function CX_AlignPicker({ vd, open: open0 }) {
  const chosen = useCxUsAreas();
  const [open, setOpen] = u.useState(open0 !== undefined ? open0 : !chosen.length);
  const list = vd ? cxUsAreaList(vd) : [];
  const toggle = (a) => cxUsAreasSet(chosen.includes(a) ? chosen.filter((x) => x !== a) : chosen.length < 5 ? [...chosen, a] : chosen);
  return (
    <details className="ual-pick" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary><span className="ual-pick-t">Your policy areas</span><small>{chosen.length ? <>{chosen.map((a, k) => <u.Fragment key={a}>{k ? `; ` : ``}<span>{a}</span></u.Fragment>)}</> : `None chosen yet`}</small></summary>
      <p className="ual-hint">Choose up to five. They stay on this page for this visit and are never saved or sent.</p>
      {!vd ? <p className="ual-hint" role="status">Loading the votes...</p> : (
        <fieldset className="ual-areas">
          <legend className="usm-sr">Policy areas</legend>
          {list.map((a) => (
            <label key={a.area} data-area={a.area} className={chosen.includes(a.area) ? `on` : undefined}>
              <input type="checkbox" checked={chosen.includes(a.area)} disabled={!chosen.includes(a.area) && chosen.length >= 5} onChange={() => toggle(a.area)} />
              <span>{a.area}</span><small>{a.votes === 1 ? `1 vote` : `${a.votes} votes`}</small>
            </label>
          ))}
        </fieldset>
      )}
    </details>
  );
}
/* one recorded vote, with the official roll call and the bill */
function CX_AlignVote({ r }) {
  return (
    <li className="ual-vote">
      <p className="ual-vt"><b className="ual-cast">{CX_CAST[r.c]}</b><span>{cxVoteWhat(r)}</span></p>
      <p className="ual-vm"><span>{cxVoteDate(r.v.date)}</span>{`. `}<span>{r.v.result || `Result not recorded`}</span>{r.v.yea || r.v.nay ? <span>{` (Yea ${r.v.yea}, Nay ${r.v.nay})`}</span> : null}<span>.</span></p>
      <p className="ual-links"><a href={r.v.url} target="_blank" rel="noreferrer">The official record<CX_AlignExt /></a>{r.b && r.b.url ? <a href={r.b.url} target="_blank" rel="noreferrer">The bill on Congress.gov<CX_AlignExt /></a> : null}</p>
    </li>
  );
}
/* step 1, one area: the counts, and the votes behind them one tap down */
function CX_AlignArea({ c }) {
  const [all, setAll] = u.useState(!1);
  const L = cxAlignCountLines(c);
  if (!c.total) return <div className="ual-row ual-row-flat"><b>{c.area}</b><span>{L[0]}</span></div>;
  return (
    <details className="ual-row" data-area={c.area}>
      <summary><b>{c.area}</b><span>{L[0]}</span><span>{L[1]}</span></summary>
      <ul className="ual-votes">{(all ? c.rows : c.rows.slice(0, 8)).map((r) => <CX_AlignVote key={r.v.id} r={r} />)}</ul>
      {c.rows.length > 8 && !all && <button type="button" className="usm-more" onClick={() => setAll(!0)}>{`Show all ${c.rows.length}`}</button>}
    </details>
  );
}
/* the review state and the size of the sample, said every time step 2 shows */
function CX_AlignStatus({ Q }) {
  const n = Q ? Q.questions.length : 0, areas = Q ? new Set(Q.questions.map((q) => q.area)).size : 0;
  return (
    <div className="ual-status">
      <p>{CX_ALIGN_REVIEW.ok ? `Read against their sources by ${CX_ALIGN_REVIEW.by} on ${CX_ALIGN_REVIEW.checked}.` : `A person has not reviewed these questions yet.`}</p>
      {Q && <p>{`This is a sample of ${n} questions in ${areas} policy areas, not everything Congress voted on.`}</p>}
    </div>
  );
}
/* step 2, one area, for one member: the lines, and each question you answered beside their recorded vote */
function CX_AlignAreaLine({ a, m }) {
  const L = cxAlignLineText(a, m.chamber);
  if (!a.answered) return <div className="ual-row ual-row-flat"><b>{a.area}</b><span>{L[0]}</span></div>;
  const kind = { same: `Same answer`, differ: `Not the same`, novote: `No vote on this`, notroll: `Not in the roll`, other: `Not compared` };
  return (
    <details className="ual-row" data-area={a.area}>
      <summary><b>{a.area}</b>{L.map((t, k) => <span key={k}>{t}</span>)}</summary>
      <ul className="ual-votes">
        {a.rows.map((r) => (
          <li key={r.q.id} className="ual-vote" data-kind={r.kind}>
            <p className="ual-vt"><b className="ual-cast">{kind[r.kind]}</b><span>{r.q.q}</span></p>
            <p className="ual-vm"><span>{r.an === `yes` ? `You: Yes, I support it.` : `You: No, I oppose it.`}</span>{` `}<span>{r.kind === `other` ? (m.chamber === `senate` ? `This member: voted on only in the House.` : `This member: voted on only in the Senate.`) : `This member: ${cxAlignCastWord(r.cast)}.`}</span></p>
            {r.vote && <p className="ual-links"><a href={r.vote.url} target="_blank" rel="noreferrer">The official record<CX_AlignExt /></a></p>}
          </li>
        ))}
      </ul>
    </details>
  );
}
/* step 2 for one member (the sheet and the profile): "How you line up on what you picked" */
function CX_AlignMine({ m, where, vd, onAnswer }) {
  const Q = useCxAlignQ(), ans = useCxAlignAns(), chosen = useCxUsAreas();
  const H = where === `profile` ? `h2` : `h3`, hid = `ual-mine-h-${where}`;
  const line = Q && vd ? cxAlignLine(vd, Q, ans, m, chosen) : null;
  const without = Q ? chosen.filter((a) => !Q.questions.some((q) => q.area === a)) : [];
  const any = line && line.areas.some((a) => a.answered);
  return (
    <section className={`ual ual-mine ual-${where}`} aria-labelledby={hid}>
      <H id={hid}>How you line up on what you picked</H>
      <CX_AlignStatus Q={Q} />
      {!Q ? <p className="ual-hint" role="status">{CX_ALIGN.none ? `The questions need the hosted site. Try again online.` : `Loading the questions...`}</p>
        : !chosen.length ? <p className="ual-hint">Choose policy areas above first.</p>
        : <>
          {line && line.areas.length > 0 && <ul className="ual-rows">{line.areas.map((a) => <li key={a.area}><CX_AlignAreaLine a={a} m={m} /></li>)}</ul>}
          {without.length > 0 && <p className="ual-hint"><span>No questions in the sample for:</span>{` `}{without.map((a, k) => <u.Fragment key={a}>{k ? `; ` : ``}<span>{a}</span></u.Fragment>)}<span>.</span></p>}
          {!any && line && line.areas.length > 0 && <p className="ual-hint">Answer the questions in your areas to see this.</p>}
        </>}
      <p className="ual-hint">Only your yes and no answers count. It depends and Still learning are left out. Not voting is not a no.</p>
      {onAnswer && Q && chosen.length > 0 && line && line.areas.length > 0 && <button type="button" className="usm-btn" onClick={onAnswer}>Answer the questions</button>}
    </section>
  );
}
/* what this member voted on in your areas (step 1), and how you line up (step 2, when it is on) */
function CX_AlignMember({ m, where = `sheet`, onCompare }) {
  const chosen = useCxUsAreas();
  const [want, setWant] = u.useState(!1);
  const need = chosen.length > 0 || want;
  const vd = useCxAlignVotes(need);
  const H = where === `profile` ? `h2` : `h3`, hid = `ual-h-${where}`;
  const rows = vd && chosen.length ? cxAlignStep1(vd, m, chosen) : [];
  return (
    <>
      <section className={`ual ual-${where}`} aria-labelledby={hid}>
        <H id={hid}>In your policy areas</H>
        {!need ? <>
          <p className="ual-hint">See what this member voted on in up to five policy areas you choose.</p>
          <button type="button" className="usm-btn" onClick={() => setWant(!0)}>Choose policy areas</button>
        </> : <>
          <CX_AlignPicker vd={vd} />
          {vd && rows.length > 0 && <ul className="ual-rows">{rows.map((c) => <li key={c.area}><CX_AlignArea c={c} /></li>)}</ul>}
          {vd && <p className="ual-hint">{`Counts from the official roll calls of the ${vd.congress}th Congress, not a rating of anyone. Only votes that decided a bill or a nominee are counted. Not voting is not a no.`}</p>}
          {onCompare && <button type="button" className="usm-btn" onClick={onCompare}>Compare members</button>}
        </>}
      </section>
      {cxAlignOn() && need && <CX_AlignMine m={m} where={where} vd={vd} onAnswer={onCompare ? () => onCompare(`questions`) : null} />}
    </>
  );
}
/* one sample question, with its sources and the four answers */
function CX_AlignQ({ q, Q, vd, n, of }) {
  const ans = useCxAlignAns(), a = ans[q.id] || ``;
  const b = vd && vd.bills[q.bill], byId = vd ? cxAlignVotes(vd) : null;
  const votes = byId ? [`senate`, `house`].filter((ch) => q.votes[ch]).map((ch) => byId.get(q.votes[ch])).filter(Boolean) : [];
  const hid = `ual-q-${q.id}`;
  return (
    <article className="ual-q" aria-labelledby={hid} data-q={q.id}>
      <p className="ual-qk">{`Question ${n} of ${of}`}</p>
      <h4 id={hid} className="ual-qq">{q.q}</h4>
      <dl className="ual-qd">
        <div><dt>What it does</dt><dd>{q.does}</dd></div>
        {q.not ? <div><dt>What it does not do</dt><dd>{q.not}</dd></div> : null}
        {q.cra && Q.cra_note ? <div><dt>How this kind of vote works</dt><dd><span>{Q.cra_note.text}</span>{` `}<a href={Q.cra_note.url} target="_blank" rel="noreferrer">{Q.cra_note.label}<CX_AlignExt /></a></dd></div> : null}
      </dl>
      <p className="ual-bill"><span>The bill:</span>{` `}<span>{b ? `${b.label}, ${b.title}` : q.bill}</span></p>
      <p className="ual-links">
        <a href={q.src.url} target="_blank" rel="noreferrer">{q.src.label}<CX_AlignExt /></a>
        {q.text ? <a href={q.text.url} target="_blank" rel="noreferrer">{q.text.label}<CX_AlignExt /></a> : null}
        {b && b.url ? <a href={b.url} target="_blank" rel="noreferrer">The bill on Congress.gov<CX_AlignExt /></a> : null}
      </p>
      {votes.length > 0 && (
        <details className="ual-qv">
          <summary>{votes.length === 1 ? `The recorded vote` : `The recorded votes`}</summary>
          <ul>{votes.map((v) => <li key={v.id}><span>{v.chamber === `senate` ? `Senate` : `House`}</span>{`, `}<span>{cxVoteDate(v.date)}</span>{`: `}<span>{v.result || `Result not recorded`}</span>{v.yea || v.nay ? <span>{` (Yea ${v.yea}, Nay ${v.nay})`}</span> : null}<span>.</span>{` `}<a href={v.url} target="_blank" rel="noreferrer">The official record<CX_AlignExt /></a></li>)}</ul>
        </details>
      )}
      <fieldset className="ual-answers">
        <legend>Your answer</legend>
        {CX_ALIGN_ANSWERS.map(([k, t]) => (
          <label key={k} className={a === k ? `on` : undefined}>
            <input type="radio" name={`ual-a-${q.id}`} value={k} checked={a === k} onChange={() => cxAlignAnswer(q.id, k)} />
            <span>{t}</span>
          </label>
        ))}
      </fieldset>
    </article>
  );
}
/* the questions in the areas you picked, area by area, in the order of the file */
function CX_AlignQuestions({ Q, vd }) {
  const chosen = useCxUsAreas(), ans = useCxAlignAns();
  if (!Q) return <p className="ual-hint" role="status">{CX_ALIGN.none ? `The questions need the hosted site. Try again online.` : `Loading the questions...`}</p>;
  if (!chosen.length) return <p className="ual-hint">Choose policy areas above to see their questions.</p>;
  const skip = new Map((Q.skipped || []).map((s) => [s.area, s.why]));
  const answered = Object.keys(ans).filter((id) => Q.questions.some((q) => q.id === id)).length;
  return (
    <div className="ual-qs">
      <p className="ual-hint">Each question is about one bill that a recorded vote decided. A yea is support for what the bill does and a nay is opposition. Answer only the ones you want to.</p>
      {chosen.map((area) => {
        const qs = Q.questions.filter((q) => q.area === area);
        return (
          <section key={area} className="ual-qarea" aria-label={area}>
            <h4 className="ual-qa">{area}</h4>
            {qs.length ? qs.map((q, k) => <CX_AlignQ key={q.id} q={q} Q={Q} vd={vd} n={k + 1} of={qs.length} />)
              : <p className="ual-hint">{skip.get(area) || `No questions in the sample for this area. It had too few recorded votes that decided a bill.`}</p>}
          </section>
        );
      })}
      {answered > 0 && <p><button type="button" className="usm-btn" onClick={cxAlignClear}>Clear my answers</button></p>}
    </div>
  );
}
/* Compare members: everyone you choose to list, side by side, by name or by state, never by any count. Desktop: the left menu's
   "Compare members"; phone: People, and the map's Show panel. */
function CX_AlignCompare({ data, phone, onOpen, focus }) {
  const chosen = useCxUsAreas();
  const vd = useCxAlignVotes(!0);
  const on = cxAlignOn();
  const Q = useCxAlignQ(), ans = useCxAlignAns();
  const [who, setWho] = u.useState(`mine`);
  const [st, setSt] = u.useState(CX_US_PLACE.state), [di, setDi] = u.useState(CX_US_PLACE.district);
  const [order, setOrder] = u.useState(`name`);
  const [more, setMore] = u.useState(25);
  const qRef = u.useRef(null);
  u.useEffect(() => { if (focus === `questions` && on && qRef.current) setTimeout(() => { if (qRef.current) { qRef.current.scrollIntoView({ block: `start` }); const h = qRef.current.querySelector(`h3`); if (h) h.focus({ preventScroll: !0 }); } }, 60); }, [focus, !!Q]);
  const states = [...new Set(data.members.map((m) => m.state))].sort((a, b) => cxStateName(a).localeCompare(cxStateName(b)));
  const dists = st ? [...new Set(data.members.filter((m) => m.state === st && m.chamber === `house`).map((m) => m.district ?? 0))].sort((a, b) => a - b) : [];
  const setPlace = (s, d) => { if (who === `mine`) { CX_US_PLACE.state = s; CX_US_PLACE.district = d; cxPlacePersist(); } setSt(s); setDi(d); setMore(25); };
  const list = cxAlignOrder(cxAlignWho(data, who, st, di), order);
  const shown = list.slice(0, more);
  const g = CX_US.graph;
  const nodeOf = (m) => (g ? g.byId.get(`m:${m.id}`) : null);
  const cell = (m, area) => {
    const c = vd ? cxAlignStep1(vd, m, [area])[0] : null;
    const a = on && Q && vd ? cxAlignLine(vd, Q, ans, m, [area]).areas[0] : null;
    return (
      <>
        {c ? cxAlignCountLines(c).map((t, k) => <span key={k} className="ual-c1">{t}</span>) : <span className="ual-c1">...</span>}
        {a && a.answered > 0 && cxAlignLineText(a, m.chamber).map((t, k) => <span key={`b${k}`} className="ual-c2">{t}</span>)}
        {on && Q && !a ? <span className="ual-c2">No questions in the sample.</span> : null}
      </>
    );
  };
  const name = (m) => { const n = nodeOf(m); return n && onOpen ? <button type="button" className="ual-name" onClick={() => onOpen(n.i)}><span>{m.name}</span><small>{cxAlignWhere(m)}</small></button> : <p className="ual-name"><span>{m.name}</span><small>{cxAlignWhere(m)}</small></p>; };
  const seg = (label, val, set, opts) => (
    <div className="ual-seg" role="group" aria-label={label}>
      <span className="ual-seg-l" aria-hidden="true">{label}</span>
      <div className="cxm-seg">{opts.map(([id, t]) => <button key={id} type="button" aria-pressed={val === id} className={val === id ? `on` : ``} onClick={() => { set(id); setMore(25); }}>{t}</button>)}</div>
    </div>
  );
  return (
    <div className="ual-compare">
      <h2>Compare members</h2>
      <p className="ual-lead">What members voted on in the policy areas you pick, side by side, from the official roll calls. Members are listed by name or by state, never by these counts.</p>
      <CX_AlignPicker vd={vd} open={!chosen.length} />
      <div className="ual-tools">
        {seg(`Who`, who, (v) => { setWho(v); if (v === `mine`) { setSt(CX_US_PLACE.state); setDi(CX_US_PLACE.district); } }, [[`mine`, `Your members`], [`state`, `A state`], [`senate`, `Senate`], [`house`, `House`]])}
        {(who === `mine` || who === `state`) && (
          <div className="ual-fields">
            <label className="usm-field"><span>{who === `mine` ? `Your state` : `State`}</span><select value={st} onChange={(e) => setPlace(e.target.value, ``)}><option value="">Choose a state</option>{states.map((s) => <option key={s} value={s}>{cxStateName(s)}</option>)}</select></label>
            {who === `mine` && dists.length > 0 && <label className="usm-field"><span>Your district</span><select value={di} onChange={(e) => setPlace(st, e.target.value)}><option value="">Choose a district</option>{dists.map((d) => <option key={d} value={String(d)}>{d === 0 ? `At large` : `District ${d}`}</option>)}</select></label>}
          </div>
        )}
        {seg(`Order`, order, setOrder, [[`name`, `By name`], [`state`, `By state`]])}
      </div>
      {who === `mine` && <p className="ual-hint">Your place stays on this device and is never put in a link.</p>}
      {on && <><CX_AlignStatus Q={Q} />{chosen.length > 0 && <p><button type="button" className="usm-btn" onClick={() => { if (qRef.current) { qRef.current.scrollIntoView({ block: `start` }); const h = qRef.current.querySelector(`h3`); if (h) h.focus({ preventScroll: !0 }); } }}>Answer the questions</button></p>}</>}
      {!chosen.length ? <p className="ual-hint">Choose policy areas above to compare members.</p>
        : !list.length ? <p className="ual-hint">{who === `mine` ? `Choose your state, and your district for your representative.` : `Choose a state.`}</p>
        : !vd ? <p className="ual-hint" role="status">Loading the votes...</p>
        : <>
          <p className="ual-count" role="status">{list.length === 1 ? `1 member, ${order === `name` ? `by name` : `by state`}.` : `${list.length} members, ${order === `name` ? `by name` : `by state`}.`}</p>
          {phone ? (
            <ul className="ual-cards" aria-label="Members side by side">
              {shown.map((m) => (
                <li key={m.id} className="ual-card" data-member={m.id}>
                  {name(m)}
                  <dl>{chosen.map((area) => <div key={area} data-area={area}><dt>{area}</dt><dd>{cell(m, area)}</dd></div>)}</dl>
                </li>
              ))}
            </ul>
          ) : (
            <div className="ual-table-wrap">
              <table className="ual-table">
                <caption className="usm-sr">What each member voted on in your policy areas, one row for each member</caption>
                <thead><tr><th scope="col">Member</th>{chosen.map((area) => <th scope="col" key={area}>{area}</th>)}</tr></thead>
                <tbody>{shown.map((m) => <tr key={m.id} data-member={m.id}><th scope="row">{name(m)}</th>{chosen.map((area) => <td key={area} data-area={area}>{cell(m, area)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
          {list.length > more && <p><button type="button" className="usm-more" onClick={() => setMore(more + 25)}>{`Show 25 more of ${list.length - more}`}</button></p>}
        </>}
      <p className="ual-hint">Counts of what the record says, not a rating of anyone. Only votes that decided a bill or a nominee are counted. A senator is counted on Senate votes and a representative on House votes. Not voting is not a no, and a missing record is not a no.</p>
      {on && (
        <section className="ual-qsec" ref={qRef} aria-labelledby="ual-qs-h">
          <h3 id="ual-qs-h" tabIndex={-1}>Questions in your areas</h3>
          <CX_AlignQuestions Q={Q} vd={vd} />
        </section>
      )}
    </div>
  );
}
