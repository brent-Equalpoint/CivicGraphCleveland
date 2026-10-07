/* v5.17 People > Federal: Washington as profiles, the same shape as the Cleveland profiles (a face, a name, a few plain tiles, a way to step
   through the people), instead of the graph. A person chooses a state and a district (kept in memory only, never in a link); the people
   are that state's two senators and the district's representative. The graph, the topic explorer, and every vote stay one tap away.
   Everything comes from the same records as the United States page: the congress-legislators record of current members (public domain)
   and the recorded votes of the current Congress. Party is a sourced field on the member's current term, never a label we add.
   Counts, not grades: a vote is on one question, and not voting is not a no. */

/* federal members have no photo in our records, so a face is their initials */
function CxmFedAvatar({ id, name }) {
  return <CxFace id={id} name={name} size={84} className="cxm-fed-av-lg" />;
}

function CxmFederal() {
  const { openSheet, setOverlay, practice, setPeople } = useCxm();
  const [data, setData] = u.useState(CX_US.v);
  const [vd, setVd] = u.useState(CX_USV.v);
  const [st, setSt] = u.useState(CX_US_PLACE.state || `OH`);
  const [di0, setDi] = u.useState(CX_US_PLACE.district);
  const [i, setI] = u.useState(0);
  const [gone, setGone] = u.useState(!1);   // the file's request ended with nothing
  const [wait, again] = useCxWait(gone), seq = u.useRef(0), live = u.useRef(!0);
  const load = (retry) => { const mine = ++seq.current; setGone(!1); cxUsLoad(retry).then((d) => { if (!live.current || mine !== seq.current) return; if (d) setData(d); setGone(!d); }); };
  u.useEffect(() => { live.current = !0; load(!1); if (!CX_USV.v) cxUsVotesLoad().then((d) => { if (live.current && d) setVd(d); }); return () => { live.current = !1; }; }, []);
  if (!data) {
    const web = cxIsWeb();   // the single offline file has no server to ask, so it says so and offers no Try again
    return <CxFail state={wait} loading="Loading the people in Washington..." title={web ? `We could not load the people in Washington.` : `The people in Washington are not in the offline file.`}
      body={web ? `This page reads the federal record from this website, and it did not arrive. Check your connection, then try again. The rest of the app still works.` : `They load from the hosted site. People in Cleveland and the rest of this file still work.`}
      retry={web ? () => { again(); load(!0); } : null} />;
  }
  const g = CX_US.graph;
  const states = [...new Set(data.members.map((m) => m.state))].sort((a, b) => cxStateName(a).localeCompare(cxStateName(b)));
  // a district the resident already chose on the ballot (or found by address) carries over, for Ohio
  const bc = practice.state.districts.congress;
  const di = di0 || (st === `OH` && bc ? String(Number(bc)) : ``);
  const mine = cxUsMine(data, st, di);
  const deck = [...mine.senators, ...(mine.rep ? [mine.rep] : [])];
  const cur = deck[Math.min(i, Math.max(0, deck.length - 1))];
  const step = (d) => setI((x) => (x + d + deck.length) % Math.max(1, deck.length));
  const place = `${cxStateName(st)}${mine.rep && mine.rep.district ? ` · District ${mine.rep.district}` : ``}`;
  const setPlace = (s, d) => { CX_US_PLACE.state = s; CX_US_PLACE.district = d; setSt(s); setDi(d); setI(0); cxPlacePersist(); };
  const body = cur ? (() => {
    const isSen = cur.chamber === `senate`;
    const com = cxCommitteeLine(g, cur);
    const rows = vd ? cxMemberVotes(vd, cur).filter((r) => r.v.final) : null;
    const t = rows ? cxCastCounts(rows) : null;
    const role = isSen ? `United States senator` : cur.district ? `U.S. representative` : `U.S. representative or delegate`;
    const yours = !isSen && mine.rep && cur.id === mine.rep.id;
    return (
      <CxmProfileCard key={cur.id} avatar={<CxmFedAvatar id={cur.id} name={cur.name} />} onStep={step} label={`${cur.name}, card ${deck.indexOf(cur) + 1} of ${deck.length}`}
        kicker={<>{isSen ? `U.S. Senate` : cur.district ? `U.S. House · District ${cur.district}` : `U.S. House`}{yours && <b className="cxm-yours"> · YOUR DISTRICT</b>}</>} name={cur.name} sub={<><span>{role}</span>{` · `}<span>{cxStateName(cur.state)}</span></>}
        actions={<CxmProfileActions story={{ label: `Their record`, onClick: () => openSheet(`usvotes`, { id: cur.id }) }} profile={cur.url ? { label: `Profile`, href: cur.url } : null} />}
        note="Receipts, not scores. A vote is on one question. Records from the current Congress.">
        <div className="cxm-tile cxm-tile-acc">
          <span className="cxm-kicker">Their term</span>
          <p><strong className="cxm-a">{`Runs from ${cxVoteDate(cur.term_start)} to ${cxVoteDate(cur.term_end)}`}</strong></p>
          <p className="cxm-fine">{`Party on this term: ${cur.party}, as of ${cxVoteDate(cur.party_as_of)}. A sourced field, not a judgment.`}</p>
        </div>
        <div className="cxm-tile">
          <span className="cxm-kicker">What they work on</span>
          <strong className="cxm-a">{com.length ? com.slice(0, 3).join(`, `) : `No committee seat is listed.`}</strong>
          {com.length > 3 && <small className="cxm-mut">{`Plus ${com.length - 3} more.`}</small>}
          <small className="cxm-mut">Committees do much of the work in Congress.</small>
        </div>
        {t && (
          <div className="cxm-roles cxm-roles-votes">
            <div><b>{t.Y}</b><span>Yea</span></div>
            <div><b>{t.N}</b><span>Nay</span></div>
            <div><b>{t.X + t.P}</b><span>Not voting</span></div>
          </div>
        )}
        {t && <p className="cxm-fine">{`Votes that decided a bill or a nominee in the ${vd.congress}th Congress: ${rows.length}. Counts, not a score. Not voting is not a no.`}</p>}
        {!vd && <p className="cxm-fine">Loading how they voted. A missing record is not a no.</p>}
        {rows && rows.length > 0 && (
          <div className="cxm-tile">
            <span className="cxm-kicker">Their latest votes that decided something</span>
            {rows.slice(0, 3).map((r) => (
              <div key={r.v.id} className="cxm-vrow"><span>{cxWords(cxVoteWhat(r))}</span><small><b>{CX_CAST[r.c]}</b> · {cxVoteDate(r.v.date)}</small></div>
            ))}
          </div>
        )}
      </CxmProfileCard>
    );
  })() : null;
  return (
    <div className="cxm-profiles">
      <CxmDrop title="Your place in Washington" sub={place}>
        <p className="cxm-fine">Choose your state and district. This stays on your device and is never put in a link.</p>
        <CxmRememberPlace />
        <label className="cxm-field"><span>Your state</span>
          <select value={st} onChange={(e) => setPlace(e.target.value, ``)}>{states.map((s) => <option key={s} value={s}>{cxStateName(s)}</option>)}</select>
        </label>
        {mine.dists.length > 0 && (
          <label className="cxm-field"><span>Your district</span>
            <select value={di} onChange={(e) => setPlace(st, e.target.value)}>
              <option value="">Choose a district</option>
              {mine.dists.map((d) => <option key={d} value={String(d)}>{d === 0 ? `At large` : `District ${d}`}</option>)}
            </select>
          </label>
        )}
        {st === `OH` && <button type="button" className="cxm-btn2" onClick={() => setOverlay({ type: `districts` })}>Find my district by address</button>}
        <p className="cxm-fine">Not sure of your district? Your address decides it. <a href={CX_HOUSE_FIND} target="_blank" rel="noreferrer">The House's official lookup<span className="sp-ext"> (opens in a new tab)</span></a></p>
      </CxmDrop>
      {mine.dists.length > 0 && !mine.rep && (
        <div className="cxm-tile">
          <label className="cxm-field"><span>Choose your district to see your representative.</span>
            <select value={di} onChange={(e) => setPlace(st, e.target.value)}>
              <option value="">Choose a district</option>
              {mine.dists.map((d) => <option key={d} value={String(d)}>{d === 0 ? `At large` : `District ${d}`}</option>)}
            </select>
          </label>
          {st === `OH` && <button type="button" className="cxm-btn2" onClick={() => setOverlay({ type: `districts` })}>Find my district by address</button>}
        </div>
      )}
      <CxmProfileStrip label="Jump to a person" items={deck.map((m) => ({ id: m.id, title: m.name, faceId: m.id, label: m.chamber === `senate` ? `Senate` : `House` }))} activeId={cur ? cur.id : ``} onPick={(id) => setI(Math.max(0, deck.findIndex((m) => m.id === id)))} />
      {body}
      <CxmProfileNav i={Math.min(i, deck.length - 1)} n={deck.length} onStep={step} />
      <button type="button" className="cxm-row cxm-row-compare" onClick={() => { CX_USM_START.page = `compare`; setPeople((p) => ({ ...p, mode: `graph` })); }}><span><strong>Compare members by policy area</strong><small>What each one voted on in the areas you pick, side by side</small></span><CXI.Arrow size={16} /></button>
      <button type="button" className="cxm-row" onClick={() => setPeople((p) => ({ ...p, mode: `graph` }))}><span><strong>Explore Congress as a graph</strong><small>Every member, committee, and agency, and the topic explorer</small></span><CXI.Arrow size={16} /></button>
      <p className="cxm-fine">Members and committees: the congress-legislators record of current members (public domain). Votes: the recorded roll calls of the current Congress. <span>Photos: the U.S. Government Publishing Office's Member Guide (public domain).</span></p>
    </div>
  );
}

/* all of one member's votes, in a sheet */
function CxmUsVotes({ id }) {
  const [data, setData] = u.useState(CX_US.v);
  const [vd, setVd] = u.useState(CX_USV.v);
  u.useEffect(() => { let live = !0; cxUsLoad().then((d) => { if (live && d) setData(d); }); cxUsVotesLoad().then((d) => { if (live && d) setVd(d); }); return () => { live = !1; }; }, []);
  const m = data && data.members.find((x) => x.id === id);
  if (!data || !vd) return <div className="cxm-pad"><p className="cxm-mut" role="status">Loading the recorded votes...</p></div>;
  if (!m) return <div className="cxm-pad"><p>We could not find that member.</p></div>;
  return <div className="cxm-pad us"><CX_UsVotes vd={vd} people={[m]} /></div>;
}
