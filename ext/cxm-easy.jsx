/* v5.16 Easy mode (phone). One thing at a time, large type, plain words, always a way back.
   It is a different way through the same app, not a different app: the stories come from the shared
   story engine (ext/cx-story.jsx) and read the same records as every other screen. What it leaves out
   (maps, filters, the dictionary tab, scores of options) stays one tap away behind "Full app".
   Rules kept: nothing personal leaves the device (the place stays in this visit's memory; only the
   Easy/Full choice is saved in this browser), sourced facts only, no scores, no em dashes. */

const CXE_JOURNEYS = [
  [`rep`, `Who represents me?`, `Meet your council member and see what they did this year.`],
  [`ballot`, `What is on my ballot?`, `Dates, deadlines, and the issues on the November ballot.`],
  [`council`, `What did City Council do this year?`, `The big picture, in a few short steps.`],
  [`us`, `Who represents me in Washington?`, `Your two senators and your representative in Congress.`],
];
const CXE_UNSURE = `https://boe.cuyahogacounty.gov/voters/Find-Voting-Information-by-Address`;

function cxeCanSpeak() {
  return typeof globalThis.speechSynthesis !== `undefined` && typeof globalThis.SpeechSynthesisUtterance !== `undefined`;
}

/* the frames worth reading one at a time: practice questions and keypad buttons belong to the full app */
function cxeFrames(story) {
  return story.frames.filter((f) => f.type !== `react` && f.type !== `cta`);
}

/* A profile in five short parts, for Easy mode. The full page is one tap away. Same facts, same sources, same rules as the full profile. */
function CxeProfile({ seat, onFull }) {
  const d = u.useMemo(() => cxSeatData(seat), [seat]);
  if (!d) return <p className="cxe-text">We could not find that seat.</p>;
  const { name, parts, hoods, person } = d;
  const w = d.seat.ward;
  const rev = CX_OFFICE_REVIEW;
  const near = hoods.slice(0, 3).map((x) => x.h);
  return (
    <>
      <h1>{name}</h1>
      <p className="cxe-step">Council Member, Ward {w}{person ? `. Term: ${cxLongDate(person.start)} to ${cxLongDate(person.end)}` : ``}</p>
      <h2 className="cxe-h2">The job</h2>
      <p className="cxe-text">{CX_OFFICE_TEXT.council.summary}{rev.ok ? `` : ` A person has not yet reviewed this description, so check the source.`}</p>
      <h2 className="cxe-h2">This year</h2>
      <p className="cxe-text">{name.split(` `)[0]} led {cxmPl(parts.own.length, `proposal`, `proposals`)}, joined {cxmPl(parts.joined.length, `other`, `others`)}, and signed for a city department on {parts.dept.length}. These are counts, not grades. Putting your name on a proposal is not the same as voting for it.</p>
      <h2 className="cxe-h2">The ward</h2>
      <p className="cxe-text">{near.length ? `Ward ${w} covers all or part of ${near.join(`, `)}.` : `Ward ${w} is one of Cleveland's 15 wards.`}</p>
      <h2 className="cxe-h2">How they voted</h2>
      <p className="cxe-text">{person && cxCouncilVotesOf(person.name).length
        ? (() => { const c = cxVoteCounts(cxCouncilVotesOf(person.name)); return `The City Record prints how each member voted. So far this year, ${name.split(` `)[0]} voted yea ${cxmPl(c.yea, `time`, `times`)}, nay ${cxmPl(c.nay, `time`, `times`)}, and was listed as absent ${cxmPl(c.absent, `time`, `times`)}. That is ${c.total} votes. These are counts, not grades. Absent is not a no. The full profile lists each vote.`; })()
        : `The City Record has no named vote for this seat. A missing record is not a no.`}</p>
      <p className="cxe-text"><span className="cxm-sr">Where this comes from: </span><a href={CX_COUNCIL_SITE} target="_blank" rel="noreferrer">Cleveland City Council</a> and <a href="https://cityofcleveland.legistar.com/Legislation.aspx" target="_blank" rel="noreferrer">its legislative record</a></p>
      <button type="button" className="cxe-btn alt" onClick={onFull}>Read the full profile</button>
    </>
  );
}

function CxmEasy() {
  const { home, setHome, practice, setEasy, go, openSeat, openSheet, deskEasy, leaveEasy } = useCxm();
  const answers = practice.state.answers;
  const [view, setView] = u.useState({ k: `home` });
  const [speaking, setSpeaking] = u.useState(!1);
  const boxRef = u.useRef(null);
  const stopSpeaking = () => { if (cxeCanSpeak()) globalThis.speechSynthesis.cancel(); setSpeaking(!1); };
  u.useEffect(() => () => { if (cxeCanSpeak()) globalThis.speechSynthesis.cancel(); }, []);
  u.useEffect(() => {
    stopSpeaking();
    if (boxRef.current) { boxRef.current.scrollTop = 0; boxRef.current.focus({ preventScroll: !0 }); }
  }, [view.k, view.j, view.f, view.seat]);

  // the Washington question loads its data file on demand (hosted site only)
  const [usData, setUsData] = u.useState(CX_US.v);
  const [usLoad, setUsLoad] = u.useState(CX_US.p ? `ready` : `idle`);
  const [usVotes, setUsVotes] = u.useState(CX_USV.v);
  u.useEffect(() => { if (view.k !== `usplace` || usLoad !== `idle`) return; setUsLoad(`loading`); cxUsLoad().then((d) => { setUsData(d); setUsLoad(d ? `ready` : `none`); }); cxUsVotesLoad().then((d) => { if (d) setUsVotes(d); }); }, [view.k, usLoad]);
  const [usSt, setUsSt] = u.useState(CX_US_PLACE.state);
  const [usDi, setUsDi] = u.useState(CX_US_PLACE.district);
  const story = u.useMemo(() => {
    if (view.k !== `story`) return null;
    if (view.j === `us`) return usData && CX_US.graph && usSt ? cxUsStory(usData, CX_US.graph, usSt, usDi, usVotes) : null;
    if (view.j === `rep`) return home?.ward ? cxmWardStory(home.ward, answers) : null;
    return view.j === `council` ? cxmCouncilStory() : cxmBallotStory();
  }, [view.k, view.j, home?.ward, usData, usSt, usDi, usVotes]);
  const frames = story ? cxeFrames(story) : [];
  const f = Math.min(view.f || 0, Math.max(frames.length - 1, 0));
  const fr = frames[f];
  const last = story && f === frames.length - 1;

  const begin = (j) => setView(j === `rep` && !home?.ward ? { k: `place`, j } : j === `us` ? { k: `usplace` } : { k: `story`, j, f: 0 });
  const toHome = () => setView({ k: `home` });
  // on a phone, "full" is the phone app; on a desktop it is the desktop site, which needs a moment to draw before it can be steered
  const toFull = (after, deskAfter) => {
    if (deskEasy) { leaveEasy(); const fn = deskAfter || after; if (fn && deskAfter) setTimeout(fn, 500); return; }
    setEasy(!1); if (after) setTimeout(after, 0);
  };
  const speak = () => {
    if (!cxeCanSpeak()) return;
    if (speaking) { stopSpeaking(); return; }
    const text = boxRef.current ? boxRef.current.innerText : ``;
    const say = new globalThis.SpeechSynthesisUtterance(text);
    const es = CX_I18N.lang === `es`;
    say.lang = es ? `es-US` : `en-US`;
    if (es) { const v = (globalThis.speechSynthesis.getVoices() || []).find((x) => /^es(-|_|$)/i.test(x.lang)); if (v) say.voice = v; }
    say.onend = () => setSpeaking(!1);
    say.onerror = () => setSpeaking(!1);
    globalThis.speechSynthesis.cancel();
    globalThis.speechSynthesis.speak(say);
    setSpeaking(!0);
  };
  const hoods = cxPlCity().hoods;
  const pickHood = (h) => {
    if (!h) return;
    const w = cxmHoodWard(h);
    if (!w) return;
    setHome({ hood: h, ward: w.ward, share: w.share });
    setView({ k: `story`, j: `rep`, f: 0 });
  };
  const pickWard = (n) => {
    if (!n) return;
    setHome({ hood: ``, ward: Number(n), share: 0 });
    setView({ k: `story`, j: `rep`, f: 0 });
  };

  return (
    <div className="cxm cxe">
      <header className="cxe-bar">
        <span className="cxe-brand">Civic Graph</span>
        <span className="cxe-bar-actions">
          <CX_LangButton />
          {view.k !== `home` && <button type="button" onClick={toHome}>Start over</button>}
          <button type="button" onClick={() => toFull()}>{deskEasy ? `Full site` : `Full app`}</button>
        </span>
      </header>
      <main className="cxe-main" ref={boxRef} tabIndex={-1} id="cxe-content">
        {view.k === `home` && (
          <>
            <h1>Hello. What would you like to know?</h1>
            <p className="cxe-text">Pick one. Each takes about a minute. Nothing you choose is sent anywhere.</p>
            {CXE_JOURNEYS.map(([id, title, sub]) => (
              <button key={id} type="button" className="cxe-choice" onClick={() => begin(id)}><strong>{title}</strong><span>{sub}</span></button>
            ))}
            <p className="cxe-text">Want to look around on your own? Choose {deskEasy ? `Full site` : `Full app`} at the top.</p>
          </>
        )}
        {view.k === `place` && (
          <>
            <h1>Where do you live?</h1>
            <p className="cxe-text">Pick your neighborhood. This stays on your phone for this visit and is not saved or sent.</p>
            <label className="cxe-field"><span>Your neighborhood</span>
              <select defaultValue="" onChange={(e) => pickHood(e.target.value)}>
                <option value="">Choose your neighborhood</option>
                {hoods.map((h) => { const w = cxmHoodWard(h); return w ? <option key={h} value={h}>{h}, Ward {w.ward}</option> : null; })}
              </select>
            </label>
            <label className="cxe-field"><span>Or pick your ward, if you know it</span>
              <select defaultValue="" onChange={(e) => pickWard(e.target.value)}>
                <option value="">Choose your ward</option>
                {_h.map(([n]) => <option key={n} value={n}>Ward {n}</option>)}
              </select>
            </label>
            <p className="cxe-text">Not sure? Your address decides your ward. The county's lookup will tell you.</p>
            <a className="cxe-btn alt" href={CXE_UNSURE} target="_blank" rel="noreferrer">Find my ward by address (opens in a new tab)</a>
            <button type="button" className="cxe-btn alt" onClick={() => begin(`council`)}>Skip this and see what City Council did</button>
          </>
        )}
        {view.k === `story` && story && fr && (
          <>
            <p className="cxe-step">{story.name}</p>
            <p className="cxe-step">Step {f + 1} of {frames.length}</p>
            {fr.k ? <p className="cxe-kicker">{fr.k}</p> : null}
            <h1 className="cxe-big">{fr.big}</h1>
            <p className="cxe-text">{fr.small}</p>
            <CxSource source={story.source} cls="cxe-text" />
            {last && (
              <div className="cxe-end">
                <p className="cxe-big2">That is the end of this one.</p>
                {view.j === `rep` && home?.ward && <button type="button" className="cxe-btn" onClick={() => setView({ k: `profile`, j: `rep`, seat: `ward-${home.ward}` })}>Read the short profile of {cxmMember(home.ward)}</button>}
                {view.j === `ballot` && <button type="button" className="cxe-btn" onClick={() => toFull(() => go(`ballot`), () => CX_NAV.panel(`ballot`))}>Open my ballot</button>}
                {view.j === `us` && !deskEasy && <button type="button" className="cxe-btn" onClick={() => toFull(() => go(`today`))}>Open the full app</button>}
                {view.j === `us` && deskEasy && <button type="button" className="cxe-btn" onClick={() => toFull(() => CX_NAV.panel(`us`), () => CX_NAV.panel(`us`))}>See them in the United States graph</button>}
                {view.j === `council` && <button type="button" className="cxe-btn" onClick={() => toFull(() => go(`today`), () => CX_NAV.panel(`news`))}>{deskEasy ? `See what is new in Council's record` : `See City Hall's receipts`}</button>}
                <button type="button" className="cxe-btn alt" onClick={toHome}>Pick another question</button>
              </div>
            )}
          </>
        )}
        {view.k === `usplace` && (
          <>
            <h1>Who represents you in Washington?</h1>
            {usLoad === `none` && <p className="cxe-text">This question needs the hosted site, because it loads a data file. Try again online.</p>}
            {usLoad !== `none` && !usData && <p className="cxe-text" role="status">Loading the list of members of Congress...</p>}
            {usData && (() => {
              const states = [...new Set(usData.members.map((m) => m.state))].sort((a, b) => cxStateName(a).localeCompare(cxStateName(b)));
              const mine = usSt ? cxUsMine(usData, usSt, usDi) : null;
              return (
                <>
                  <p className="cxe-text">Pick your state. If your state has more than one district, pick yours too. This stays on your device and is never sent.</p>
                  <label className="cxe-field"><span>Your state</span>
                    <select value={usSt} onChange={(e) => { CX_US_PLACE.state = e.target.value; CX_US_PLACE.district = ``; setUsSt(e.target.value); setUsDi(``); cxPlacePersist(); }}>
                      <option value="">Choose your state</option>{states.map((s) => <option key={s} value={s}>{cxStateName(s)}</option>)}
                    </select>
                  </label>
                  {mine && mine.dists.length > 0 && (
                    <label className="cxe-field"><span>Your district</span>
                      <select value={usDi} onChange={(e) => { CX_US_PLACE.district = e.target.value; setUsDi(e.target.value); cxPlacePersist(); }}>
                        <option value="">Choose your district</option>{mine.dists.map((d) => <option key={d} value={d}>{d === 0 ? `The whole state (at-large)` : `District ${d}`}</option>)}
                      </select>
                    </label>
                  )}
                  <p className="cxe-text">Not sure of your district? Your address decides it. The House's lookup will tell you.</p>
                  <a className="cxe-btn alt" href={CX_HOUSE_FIND} target="_blank" rel="noreferrer">Find my district (opens in a new tab)</a>
                  <button type="button" className="cxe-btn" disabled={!usSt || (mine && mine.dists.length > 0 && usDi === ``)} onClick={() => setView({ k: `story`, j: `us`, f: 0 })}>Show me</button>
                </>
              );
            })()}
          </>
        )}
        {view.k === `profile` && <CxeProfile seat={view.seat} onFull={() => toFull(() => openSheet(`profile`, { seat: view.seat }), () => cxOpenProfile(view.seat))} />}
        {view.k === `story` && !story && (
          <>
            <h1>We need your ward first.</h1>
            <button type="button" className="cxe-btn" onClick={() => setView({ k: `place`, j: `rep` })}>Choose where I live</button>
          </>
        )}
      </main>
      {view.k === `story` && story && fr && (
        <nav className="cxe-nav" aria-label="Steps">
          <button type="button" className="cxe-btn alt" disabled={f === 0} onClick={() => setView({ ...view, f: f - 1 })}>Back</button>
          <button type="button" className="cxe-btn" disabled={last} onClick={() => setView({ ...view, f: f + 1 })}>Next</button>
        </nav>
      )}
      <footer className="cxe-actions">
        {cxeCanSpeak() && <button type="button" aria-pressed={speaking} onClick={speak}>{speaking ? `Stop reading` : `Read it to me`}</button>}
        <button type="button" onClick={() => globalThis.print()}>Save or print this page</button>
      </footer>
    </div>
  );
}
