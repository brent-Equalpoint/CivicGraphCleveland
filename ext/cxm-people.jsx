/* v5.14 phone app: People. My leaders (all 15 council members and the mayor's administration, from
   Legistar sponsorships) and My constellation (governor, U.S. House, City Council, mayor), with the
   desktop's rules: receipts not scores, sponsorship is not a vote, no record is never a no. */

function cxmSeatById(id) {
  const idx = cxLegIndex();
  return id === `mayor` ? idx.admin : idx.seats.find((s) => s.id === id) || idx.seats[0];
}
function cxmFeature(seat, parts, chosen) {
  const pick = [...parts.own].sort((a, b) =>
    Number(chosen.some((k) => b.m.topics[k])) - Number(chosen.some((k) => a.m.topics[k])) ||
    Number(b.m.status === `Passed`) - Number(a.m.status === `Passed`) ||
    (b.m.passed ?? b.m.intro).localeCompare(a.m.passed ?? a.m.intro))[0];
  const dept = seat.ward === 0 ? [...parts.dept].sort((a, b) => Number(chosen.some((k) => b.m.topics[k])) - Number(chosen.some((k) => a.m.topics[k])))[0] : null;
  return pick ?? dept;
}
function cxmSharedYes(cand, answers) {
  return Gm.filter((g) => g.candidate === cand && g.answer === `yes` && answers[g.question] === `yes`).map((g) => Wm.find((w) => w.id === g.question)).filter(Boolean);
}

/* ---------- one shape for every profile (Cleveland, Washington, and any tab added later) ----------
   A profile is: a face, a kicker, a name, a role line, a few tiles, then the same three actions, then a one-line note.
   Stepping through people (previous and next, "3 of 17", a strip to jump) is the same for every deck. */
function CxmProfileCard({ avatar, kicker, name, sub, label, onStep, actions, note, children }) {
  const startX = u.useRef(null);
  return (
    <div className="cxm-profile cxm-rise" role="region" aria-roledescription="profile" aria-label={label}
      onPointerDown={(e) => { startX.current = e.target.closest(`button,a,select`) ? null : e.clientX; }}
      onPointerUp={(e) => { if (startX.current == null) return; const dx = e.clientX - startX.current; startX.current = null; if (dx > 60) onStep(-1); if (dx < -60) onStep(1); }}>
      <div className="cxm-prof-head">
        {avatar}
        <span>
          <span className="cxm-kicker">{kicker}</span>
          <h2 className="cxm-prof-name">{name}<span className="cxm-dot">.</span></h2>
          <small>{sub}</small>
        </span>
      </div>
      {children}
      {actions}
      {note && <p className="cxm-fine">{note}</p>}
    </div>
  );
}
/* The three actions on every profile, always in this order and always these words: Full Story, Profile, Write {first name}.
   Each is { label, onClick } or { label, href } and is left out when a profile has nothing behind it. */
function CxmProfileActions({ story, profile, write }) {
  const one = (a, cls) => (a.href
    ? <a key={a.label} className={cls} href={a.href} target="_blank" rel="noreferrer">{a.label}<span className="sp-ext"> (opens in a new tab)</span></a>
    : <button key={a.label} type="button" className={cls} onClick={a.onClick}>{a.label}</button>);
  return (
    <div className="cxm-row2 cxm-prof-actions">
      {story && one(story, `cxm-btn`)}
      {profile && one(profile, `cxm-btn2`)}
      {write && one(write, `cxm-btn2`)}
    </div>
  );
}
function CxmProfileNav({ i, n, onStep }) {
  if (n < 2) return null;
  return (
    <div className="cxm-prof-nav">
      <button type="button" aria-label="Previous profile" onClick={() => onStep(-1)}><CXI.Back size={18} /></button>
      <span className="cxm-sr" aria-live="polite">Profile {i + 1} of {n}</span>
      <button type="button" aria-label="Next profile" onClick={() => onStep(1)}><CXI.Arrow size={18} /></button>
    </div>
  );
}
/* items: [{ id, title, label, face }]. face is an <img> source, or initials when there is no photo. */
function CxmProfileStrip({ items, activeId, onPick, label }) {
  if (items.length < 2) return null;
  return (
    <div className="cxm-strip" role="group" aria-label={label}>
      {items.map((s) => (
        <button key={s.id} type="button" aria-pressed={s.id === activeId} className={s.id === activeId ? `on` : ``} onClick={() => onPick(s.id)} title={s.title}>
          {s.faceId !== undefined ? <CxFace id={s.faceId} name={s.title} size={44} /> : s.img ? <img src={s.img} alt="" /> : <span className="cxm-fed-av" aria-hidden="true">{s.ini}</span>}
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  );
}

/* the folder tabs at the top of People: Cleveland, Federal, and room for a third */
function CxmFolders({ items, value, onChange, label }) {
  const keys = (e) => {
    const i = items.findIndex((x) => x[0] === value);
    const n = e.key === `ArrowRight` ? i + 1 : e.key === `ArrowLeft` ? i - 1 : null;
    if (n === null) return;
    e.preventDefault();
    const bar = e.currentTarget;
    onChange(items[(n + items.length) % items.length][0]);
    setTimeout(() => { const b = bar.querySelector(`[aria-selected="true"]`); if (b) b.focus(); }, 0);
  };
  return (
    <div className="cxm-folders" role="tablist" aria-label={label} onKeyDown={keys}>
      {items.map(([id, text]) => (
        <button key={id} type="button" role="tab" id={`cxm-folder-${id}`} aria-selected={value === id} aria-controls="cxm-folder-panel" tabIndex={value === id ? 0 : -1} className={value === id ? `on` : ``} onClick={() => onChange(id)}>{text}</button>
      ))}
    </div>
  );
}

function CxmPeople() {
  const { people, setPeople } = useCxm();
  const set = (m) => setPeople((p) => ({ ...p, mode: m }));
  const view = people.mode === `const` ? `const` : people.mode === `graph` ? `graph` : `profiles`;
  return (
    <div className="cxm-page cxm-rise">
      <CxmH1>People</CxmH1>
      <CxmSeg label="People view" items={[[`profiles`, `Profiles`], [`const`, `Constellation`], [`graph`, `Graph`]]} value={view} onChange={(m) => set(m === `profiles` ? (people.mode === `us` ? `us` : `profiles`) : m)} />
      {view === `graph` ? <CX_UsGraph phone start="sky" /> : view === `const` ? <CxmConstellation /> : (
        <>
          <CxmFolders label="Whose profiles" items={[[`profiles`, `Cleveland`], [`us`, `Federal`]]} value={people.mode === `us` ? `us` : `profiles`} onChange={set} />
          <div id="cxm-folder-panel" role="tabpanel" aria-labelledby={`cxm-folder-${people.mode === `us` ? `us` : `profiles`}`} className="cxm-folder-panel">
            {people.mode === `us` ? <CxmFederal /> : <CxmProfiles />}
          </div>
        </>
      )}
    </div>
  );
}

function CxmProfiles() {
  const { prio, home, people, setPeople, liked, like, openSheet, practice } = useCxm();
  const idx = cxLegIndex();
  const [order, setOrder] = u.useState(`ward`);
  const chosen = prio.chosen;
  const commonCount = (s) => { const p = cxmSplit(s); const mine = s.ward ? [...p.own, ...p.joined] : p.dept; return chosen.filter((k) => mine.some((x) => x.m.topics[k])).length; };
  const deck = order === `common` ? [...idx.seats].sort((a, b) => commonCount(b) - commonCount(a) || a.ward - b.ward).concat(idx.admin) : [...idx.seats, idx.admin];
  const curId = people.seat || (home?.ward ? `ward-${home.ward}` : `ward-1`);
  const i = Math.max(0, deck.findIndex((s) => s.id === curId));
  const seat = deck[i];
  const parts = cxmSplit(seat);
  const isAdmin = seat.ward === 0;
  const first = isAdmin ? `The administration` : seat.name.split(` `)[0];
  const mine = isAdmin ? parts.dept : [...parts.own, ...parts.joined];
  const common = chosen.filter((k) => mine.some((x) => x.m.topics[k]));
  const groups = Object.entries(parts.own.reduce((a, x) => ((a[x.m.action] = (a[x.m.action] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
  const feature = cxmFeature(seat, parts, chosen);
  const shared = cxmSharedYes(isAdmin ? `mayor-bibb` : `council-ward-${seat.ward}`, practice.state.answers);
  const step = (d) => setPeople((p) => ({ ...p, seat: deck[(i + d + deck.length) % deck.length].id }));
  const role = isAdmin ? `City departments` : seat.ward === 6 ? `Council President` : `Council member`;
  return (
    <div className="cxm-profiles">
      <button type="button" className="cxm-row" onClick={() => openSheet(`priorities`)}><span><strong>My priorities</strong><small>{chosen.length ? `${chosen.length} of 5 chosen. They shape the common ground shown below.` : `Choose up to five to see where you overlap with each member.`}</small></span><CXI.Arrow size={15} /></button>
      <div className="cxm-controls">
        <CxmSeg label="Order" items={[[`ward`, `Ward order`], [`common`, `Most common ground first`]]} value={order} onChange={setOrder} />
      </div>
      <CxmDrop title="How to read these profiles" sub="What has your council member actually worked on?">
        <p>Think of City Council like a group project. The person who writes a proposal is the <strong>lead</strong>. Classmates can <strong>join</strong> it. City departments also turn in a lot of routine paperwork, like contract renewals, and a council member has to <strong>sign</strong> it so it can move forward. Signing that paperwork is part of the job, like a manager signing timesheets. It says little about what they personally care about.</p>
        <dl className="cxm-dl">
          <div><dt><i className="cxm-sdot" aria-hidden="true" />Led</dt><dd>Their own proposals. This is the clearest sign of what they are working on.</dd></div>
          <div><dt><i className="cxm-sdot cxm-s-joined" aria-hidden="true" />Joined</dt><dd>A colleague's proposal they signed on to support.</dd></div>
          <div><dt><i className="cxm-sdot cxm-s-read" aria-hidden="true" />Signed for a city department</dt><dd>Routine requests from the mayor's departments. The Council President and committee chairs sign many of these as part of their role.</dd></div>
        </dl>
        <p className="cxm-fine">This is not a vote record and not a score. Sponsoring a proposal is not voting for it. How each member voted, where the City Record prints it, is on the full profile. Everything comes from Cleveland's official legislative record, retrieved {CX_LEG.retrieved_at.slice(0, 10)}.</p>
      </CxmDrop>
      <CxmProfileStrip label="Jump to a council member" items={deck.map((s) => ({ id: s.id, title: s.name, img: cxmAsset(s.portrait), label: s.ward ? `W${s.ward}` : `City` }))} activeId={seat.id} onPick={(id) => setPeople((p) => ({ ...p, seat: id }))} />
      <CxmProfileCard key={seat.id} avatar={<CxmPortrait seat={seat} size={84} />} onStep={step} label={`${seat.name}, profile ${i + 1} of ${deck.length}`}
        kicker={<>{isAdmin ? `CITY DEPARTMENTS` : `WARD ${seat.ward}`}{seat.id === (home?.ward ? `ward-${home.ward}` : ``) && <b className="cxm-yours"> · YOUR WARD</b>}</>}
        name={seat.name} sub={`${role} · Cleveland`}
        actions={<CxmProfileActions story={{ label: `Full Story`, onClick: () => openSheet(`seat`, { seat: seat.id }) }} profile={{ label: `Profile`, onClick: () => openSheet(`profile`, { seat: seat.id }) }} write={{ label: isAdmin ? `Write the mayor` : `Write ${first}`, onClick: () => openSheet(`letter`, { seat: seat.id }) }} />}
        note="Receipts, not scores. Sponsorship is not a vote. 2026 council records.">
        <div className="cxm-tile cxm-tile-acc">
          <span className="cxm-kicker">Common ground</span>
          {chosen.length ? (
            <>
              <p><strong className="cxm-big">{common.length}<small>/{chosen.length}</small></strong> of your priorities show up in what {first} {isAdmin ? `sent to Council` : `led or joined`} this year.</p>
              <div className="cxm-chips static">{chosen.map((k) => <span key={k} className={common.includes(k) ? `on` : ``}>{common.includes(k) ? `● ` : `○ `}{CX_SHORT[k]}</span>)}</div>
            </>
          ) : <p>Pick your priorities to see where you overlap. <button type="button" className="cxm-link" onClick={() => openSheet(`priorities`)}>Choose priorities</button></p>}
          {shared.length > 0 && <p className="cxm-fine">From your constellation answers: you both backed {shared.map((w) => w.title.toLowerCase()).join(`, `)}.</p>}
        </div>
        <div className="cxm-tile">
          <span className="cxm-kicker">{isAdmin ? `MOST OF WHAT WE SENT COUNCIL WAS ABOUT` : `THIS YEAR, MOST OF WHAT I LED`}</span>
          <strong className="cxm-a">{isAdmin ? `City contracts, grants, and project steps.` : groups.length ? `${CX_ACTION_BY_ID[groups[0][0]].label}.` : `Nothing led yet this year.`}</strong>
          {!isAdmin && groups.length > 0 && <small className="cxm-mut">{cxNum(groups[0][1])} of {cxNum(parts.own.length)} proposals {first} led</small>}
        </div>
        <div className="cxm-roles">
          {!isAdmin && <div><b>{parts.own.length}</b><span><i className="cxm-rd own" />Led</span></div>}
          {!isAdmin && <div><b>{parts.joined.length}</b><span><i className="cxm-rd joined" />Joined</span></div>}
          <div><b>{parts.dept.length}</b><span><i className="cxm-rd dept" />{isAdmin ? `Requests sent` : `Signed for the city`}</span></div>
        </div>
        {chosen.length > 0 && (
          <div className="cxm-tile">
            <span className="cxm-kicker">On what you care about</span>
            {chosen.map((k) => {
              const o = parts.own.filter((x) => x.m.topics[k]).length, j = parts.joined.filter((x) => x.m.topics[k]).length, d = parts.dept.filter((x) => x.m.topics[k]).length;
              const val = isAdmin ? (d ? `${d} sent` : `None`) : o || j ? [o ? `Led ${o}` : ``, j ? `Joined ${j}` : ``].filter(Boolean).join(` · `) : `Nothing yet`;
              return <div key={k} className="cxm-kv"><span>{CX_SHORT[k]}</span><b>{val}</b></div>;
            })}
          </div>
        )}
        <div className="cxm-tile">
          <span className="cxm-kicker">{isAdmin ? `A REQUEST ON YOUR PRIORITIES` : `SOMETHING I LED THIS YEAR`}</span>
          {feature ? (
            <>
              <small className="cxm-mut">{CX_ACTION_BY_ID[feature.m.action].label}</small>
              <button type="button" className="cxm-link-block" onClick={() => openSheet(`leg`, { file: feature.m.file })}>{cxWords(feature.m.short, 24)}</button>
              <div className="cxm-row2">
                <span className="cxm-mut">{cxmStatus(feature.m).label} · {feature.m.file}</span>
                <button type="button" className={`cxm-heart ${liked.includes(feature.m.id) ? `on` : ``}`} aria-pressed={liked.includes(feature.m.id)} onClick={() => like(feature.m.id)}>
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z" /></svg>
                  {liked.includes(feature.m.id) ? `Saved to my letter` : `Ask about this`}
                </button>
              </div>
            </>
          ) : <p className="cxm-mut">No proposal to show yet.</p>}
        </div>
        <CxmLatest seat={seat} limit={2} />
      </CxmProfileCard>
      <CxmProfileNav i={i} n={deck.length} onStep={step} />
      {liked.length > 0 && <p className="cxm-fine">{cxmPl(liked.length, `proposal`, `proposals`)} saved to your letters. They stay on this device for this visit.</p>}
    </div>
  );
}

function CxmMeasures({ list, chosen, limit = 5 }) {
  const { openSheet } = useCxm();
  const [all, setAll] = u.useState(!1);
  return (
    <>
      {(all ? list : list.slice(0, limit)).map(({ m }) => (
        <button key={m.id} type="button" className="cxm-item" onClick={() => openSheet(`leg`, { file: m.file })}>
          <strong>{m.file} · {m.short}</strong>
          <small>{cxmStatus(m).label}{chosen.filter((p) => m.topics[p]).map((p) => ` · Your priority: ${CX_SHORT[p]}`).join(``)}</small>
        </button>
      ))}
      {list.length > limit && <button type="button" className="cxm-link" onClick={() => setAll(!all)}>{all ? `Show fewer` : `Show all ${list.length}`}</button>}
    </>
  );
}
function CxmSeat({ seatId }) {
  const { prio, openSheet, openRoom } = useCxm();
  const seat = cxmSeatById(seatId);
  const parts = cxmSplit(seat);
  const chosen = prio.chosen;
  const byPrio = (list) => [...list].sort((a, b) => Number(chosen.some((p) => b.m.topics[p])) - Number(chosen.some((p) => a.m.topics[p])));
  const first = seat.name.split(` `)[0];
  return (
    <div className="cxm-pad">
      <div className="cxm-prof-head"><CxmPortrait seat={seat} size={64} /><span><span className="cxm-kicker">{seat.ward ? `WARD ${seat.ward}` : `CITY ADMINISTRATION`}</span><h2 className="cxm-h2">{seat.name}</h2></span></div>
      <p>{cxSummary(seat, parts.own, parts.joined, parts.dept)}</p>
      <button type="button" className="cxm-link" onClick={() => openRoom(seat.ward ? `council` : `administration`, seat.ward ? seat.id : `mayor`)}>Open on the map</button>
      <CxmLatest seat={seat} limit={5} />
      {seat.ward > 0 && chosen.length > 0 && (
        <div className="cxm-tile">
          <h3 className="cxm-h3">What this means for your priorities</h3>
          {chosen.map((p) => {
            const o = parts.own.filter((x) => x.m.topics[p]).length, j = parts.joined.filter((x) => x.m.topics[p]).length, d = parts.dept.filter((x) => x.m.topics[p]).length;
            return <p key={p}><strong>{wm.find((w) => w.id === p).label}:</strong> {o || j ? `${first} ${cxDid(o, j)} on this.` : `No proposals ${first} led or joined this year matched this by title.`}{d > 0 ? ` They also signed ${cxNum(d)} department ${d === 1 ? `request` : `requests`} on it.` : ``}</p>;
          })}
          <p className="cxm-fine">A title match is a starting point. Open a proposal to see what it actually does.</p>
        </div>
      )}
      {seat.ward > 0 && (
        <section className="cxm-section">
          <h3 className="cxm-h3"><i className="cxm-rd own" /> What {first} led, in plain words <span>{parts.own.length}</span></h3>
          {!parts.own.length && <p className="cxm-mut">No proposals led by this member are in the 2026 record.</p>}
          {CX_ACTIONS.map((a) => {
            const list = byPrio(parts.own.filter((x) => x.m.action === a.id));
            if (!list.length) return null;
            return <CxmDrop key={a.id} title={`${a.label} (${list.length})`} sub={`What this means for you: ${a.means}`}><CxmMeasures list={list} chosen={chosen} /></CxmDrop>;
          })}
        </section>
      )}
      {seat.ward > 0 && parts.joined.length > 0 && <CxmDrop title={`Proposals they joined (${parts.joined.length})`}><CxmMeasures list={byPrio(parts.joined)} chosen={chosen} /></CxmDrop>}
      {parts.dept.length > 0 && (
        <CxmDrop title={seat.ward ? `Routine department requests they signed (${parts.dept.length})` : `Requests city departments sent to Council (${parts.dept.length})`} open={seat.ward === 0}>
          <p className="cxm-fine">City departments send requests like contract renewals, grant applications, and project steps. {seat.ward ? `Signing one is part of the job and does not show personal support.` : `Council still has to approve each one.`} Items that match your priorities are listed first.</p>
          <CxmMeasures list={byPrio(parts.dept)} chosen={chosen} />
        </CxmDrop>
      )}
      <button type="button" className="cxm-btn cxm-wide" onClick={() => openSheet(`letter`, { seat: seat.id })}>Write to {seat.ward ? seat.name : `the mayor`}</button>
    </div>
  );
}

function CxmLetter({ seatId }) {
  const { prio, liked } = useCxm();
  const seat = cxmSeatById(seatId);
  const parts = cxmSplit(seat);
  const items = [...parts.own, ...parts.joined, ...parts.dept];
  const extra = cxLegIndex().measures.filter((m) => liked.includes(m.id) && !items.some((x) => x.m.id === m.id)).map((m) => ({ m, role: `joined` }));
  const levels = prio.chosen.length ? prio.v : {};
  const [text, setText] = u.useState(() => cxLetter(seat, prio.chosen, levels, [...items, ...extra], liked));
  const [msg, setMsg] = u.useState(``);
  const copy = async () => { try { await navigator.clipboard.writeText(text); setMsg(`Copied. Paste it into an email or letter.`); } catch { setMsg(`Select the text and copy it.`); } };
  return (
    <div className="cxm-pad">
      <CxmKicker>Your letter</CxmKicker>
      <h2 className="cxm-h2">Write to {seat.ward ? seat.name : `the mayor`}</h2>
      <p className="cxm-mut">A starting draft built from your priorities, the proposals you saved, and this record. Edit it in your own words. Nothing is sent from here.</p>
      <label className="cxm-field"><span className="cxm-sr">Letter draft</span><textarea rows={14} value={text} onChange={(e) => setText(e.target.value)} /></label>
      <div className="cxm-row2">
        <button type="button" className="cxm-btn" onClick={copy}>Copy letter</button>
        <CxmSrc href={seat.ward ? `https://www.clevelandcitycouncil.gov/find-my-ward` : `https://www.clevelandohio.gov/contact`}>{seat.ward ? `Ward contact details` : `City contact directory`}</CxmSrc>
      </div>
      {msg && <p className="cxm-fine" role="status">{msg}</p>}
    </div>
  );
}

/* ---------- constellation ---------- */
const CXM_OFFICES = [[`council`, `City Council`], [`mayor`, `Mayor Bibb`], [`governor`, `Governor`], [`house`, `U.S. House`]];
function cxmOfficeKind(o) {
  return o === `house` ? `vote` : o === `council` ? `sponsor` : o === `mayor` ? `mayor` : `statement`;
}
function cxmOfficePeople(office, districts) {
  if (office === `council`) return { list: CX_COUNCIL_PEOPLE, contest: null };
  if (office === `mayor`) return { list: CX_MAYOR_PEOPLE, contest: null };
  const contest = office === `governor` ? Hm.find((c) => c.id === `contest-1`) : districts.congress ? Hm.find((c) => c.area === `Congressional District ${districts.congress}`) : null;
  return { list: contest ? contest.candidates.filter((c) => Qm(c.status)) : [], contest };
}
/* label sits outside its dot: left side reads leftward, right side rightward, top and bottom centered */
function cxmStarLabel(a, x, y) {
  const c = Math.cos(a);
  if (c > 0.15) return { x: x + 10, y: y + 3.5, style: { textAnchor: `start` } };
  if (c < -0.15) return { x: x - 10, y: y + 3.5, style: { textAnchor: `end` } };
  return { x, y: Math.sin(a) < 0 ? y - 11 : y + 17, style: { textAnchor: `middle` } };
}
function CxmConstellation() {
  const { people, setPeople, practice, answer, openSheet, openSeat, home } = useCxm();
  const office = people.office;
  const qs = Wm.filter((w) => w.scope === office);
  const qi = Math.min(people.q, Math.max(0, qs.length - 1));
  const q = qs[qi];
  const kind = cxmOfficeKind(office);
  const answers = practice.state.answers;
  const { list, contest } = cxmOfficePeople(office, practice.state.districts);
  const stats = list.map((p) => ({ ...p, ...rh(p.id, answers, kind) }));
  const hl = q && answers[q.id] ? new Set(Gm.filter((g) => g.question === q.id && g.answer === `yes`).map((g) => g.candidate)) : new Set();
  const file = q ? ([...CX_COUNCIL_Q, ...CX_MAYOR_Q].find((x) => x[1] === q.id) || [])[0] : null;
  const setQ = (n) => setPeople((p) => ({ ...p, q: n }));
  const intro = office === `mayor`
    ? `The mayor is not on the November ballot. This compares your answers with proposals Mayor Bibb's administration sent to City Council in 2026, either in his name or as a city department request. Sending a proposal shows the administration backs it. Council still decides.`
    : office === `council`
      ? `Council is not on the November ballot. This shows how your answers line up with the 2026 proposals your council members chose to sponsor. Sponsoring shows support; it is not a floor vote. A member who did not sponsor has no record here, never a no.`
      : `Your practice candidate choice never fills in these answers. This small evidence sample is not a political identity test or a recommendation.`;
  /* the whole idea in two sentences; the longer rules fold into "How to read this map" below */
  const lead = office === `mayor`
    ? `The closer the mayor is to You, the more of your yes and no answers match what his administration sent to Council in 2026. Sending a proposal is not a vote, and a missing record is never a no.`
    : office === `council`
      ? `The closer a council member is to You, the more of your yes and no answers match what they sponsored in 2026. Sponsoring is not a vote, and a missing record is never a no.`
      : office === `governor`
        ? `The closer a candidate is to You, the more of your yes and no answers match what their campaign has said. A statement is not a vote, and a missing record is never a no.`
        : `The closer a member is to You, the more of your yes and no answers match how they voted. A vote is on one question, and a missing record is never a no.`;
  const tap = (p) => {
    if (/^council-ward-/.test(p.id)) openSeat(p.id.replace(/^council-/, ``));
    else if (p.id === `mayor-bibb`) openSeat(`mayor`);
    else if (contest) openSheet(`contest`, { id: contest.id });
  };
  const short = (p) => (office === `council` ? cxmSurname(p.name) : cxmSurname(p.name.split(` & `)[0]));
  const n = stats.length;
  const qcard = q && (
    <div className="cxm-tile cxm-qcard cxm-rise" key={q.id}>
      <span className="cxm-kicker">{kind === `mayor` ? `ADMINISTRATION PROPOSAL` : kind === `sponsor` ? `COUNCIL PROPOSAL` : kind === `vote` ? `RECORDED VOTE` : `CAMPAIGN STATEMENT`} · QUESTION {qi + 1} OF {qs.length}{file ? ` · ${file}` : ``}</span>
      <small className="cxm-qtitle">{q.title}</small>
      <strong className="cxm-q">{q.question}</strong>
      <small className="cxm-mut">{q.explanation}</small>
      <CxmAnswers value={answers[q.id]} onPick={(v) => answer(q.id, v)} />
      <span className="cxm-row-links"><CxmSrc href={q.url}>Read the {kind === `sponsor` || kind === `mayor` ? `official record` : kind === `vote` ? `roll call` : `campaign source`}</CxmSrc><small className="cxm-mut">{q.date}</small></span>
      <small className="cxm-fine">"It depends", "Still learning" and missing records are excluded, never counted as disagreement.</small>
    </div>
  );
  return (
    <div className="cxm-const">
      <div className="cxm-chips">{CXM_OFFICES.map(([id, l]) => <button key={id} type="button" className={office === id ? `on` : ``} onClick={() => setPeople((p) => ({ ...p, office: id, q: 0 }))}>{l}</button>)}</div>
      <div className="cxm-tile cxm-tile-acc"><p>{lead}</p></div>
      {office === `house` && !practice.state.districts.congress && (
        <div className="cxm-tile cxm-tile-acc">
          <strong>Which U.S. House district are you in?</strong>
          <p className="cxm-mut">Cleveland is split between two districts. Your address decides which.</p>
          <div className="cxm-chips">{$m.congress.map((d) => <button key={d} type="button" onClick={() => practice.update((s) => ({ ...s, districts: { ...s.districts, congress: d } }))}>District {Number(d)}</button>)}</div>
          <CxmSrc href="https://boe.cuyahogacounty.gov/voters/Find-Voting-Information-by-Address">Look it up by address</CxmSrc>
        </div>
      )}
      {n === 0 && qcard}
      {n > 0 && (
        <div className="cxm-cgraph">
          <div className="cxm-cgraph-box">
            <svg viewBox="-10 -16 360 314" role="img" aria-label="Constellation: the closer a person is to you, the more of your yes and no answers match their record">
              {[132, 114, 89, 64].map((r) => <circle key={r} cx="170" cy="140" r={r} className="cxm-cring" />)}
              {stats.map((p, k) => {
                const a = (k / n) * Math.PI * 2 - Math.PI / 2, r = p.total ? 64 + (1 - p.same / p.total) * 50 : 132;
                const x = 170 + Math.cos(a) * r, y = 140 + Math.sin(a) * r;
                const mineWard = office === `council` && home?.ward && p.id === `council-ward-${home.ward}`;
                const chosen = contest && practice.state.selections[contest.id] === p.id;
                const face = cxFaceSrc(p.id);
                return (
                  <g key={p.id} role="button" tabIndex={0} className={`cxm-star ${face ? `has-face` : ``}`} style={{ "--d": `${(k % 8) * 40}ms` }} aria-label={`${p.name}: ${p.total ? `same on ${p.same} of ${p.total}` : `not compared yet`}. Open.`} onClick={() => tap(p)} onKeyDown={(ev) => { if (ev.key === `Enter` || ev.key === ` `) { ev.preventDefault(); tap(p); } }}>
                    {chosen && <circle cx={x} cy={y} r={face ? 16 : 12} className="cxm-halo" />}
                    {face ? (
                      <>
                        <circle cx={x} cy={y} r={11.5} className={`cxm-star-ring ${mineWard ? `mine` : p.total ? `on` : `off`} ${hl.has(p.id) ? `hl` : ``}`} />
                        <CX_SvgFace id={p.id} name={p.name} r={10} cx={x} cy={y} src={face} />
                      </>
                    ) : <circle cx={x} cy={y} r={p.total ? 7 : 5} className={`${mineWard ? `mine` : p.total ? `on` : `off`} ${hl.has(p.id) ? `hl` : ``}`} />}
                    <text {...cxmStarLabel(a, face ? x + Math.sign(Math.cos(a)) * 4 : x, y)} className={`cxm-star-t ${p.total || hl.has(p.id) ? `on` : ``}`}>{short(p)}</text>
                  </g>
                );
              })}
              <circle cx="170" cy="140" r="17" className="cxm-you-dot" /><text x="170" y="144" className="cxm-you-t">You</text>
            </svg>
          </div>
          {!stats.some((p) => p.total) && <p className="cxm-status-line" role="status">Answer yes or no to an idea with a documented record to place someone on the map.</p>}
          {qcard}
          <CxmDrop title="How to read this map" sub="Nearer, missing records, and everyone's record">
            <p className="cxm-mut">{intro}</p>
            <p className="cxm-mut">{hl.size ? `White rings: who is on the record for this question. ` : ``}Nearer means more agreement on the answered records of this type. Direction has no meaning. {contest ? `A dotted halo marks your practice choice. ` : ``}Party and ballot selection do not affect distance. {office === `council` ? `Not sponsoring is no record, never a no. The gold dot is your ward's member. ` : ``}Tap a person to open them.</p>
            <p className="cxm-mut">A missing record is not a no. Different {office === `council` || office === `mayor` ? `people` : `candidates`} may have different evidence coverage; a fraction is not an overall {office === `council` || office === `mayor` ? `rating` : `candidate rating`}.</p>
            {stats.map((p) => {
              const chosen = contest && practice.state.selections[contest.id] === p.id;
              return <button key={p.id} type="button" className="cxm-row" onClick={() => tap(p)}><span><strong>{p.name}</strong><small>{p.party}{chosen ? ` · Your practice choice` : ``}</small><small>{p.total ? `${p.same} of ${p.total} comparable records agree · ${p.missing} missing` : `Not compared · no matching yes/no answer and sourced position yet`}</small></span><CXI.Arrow size={15} /></button>;
            })}
          </CxmDrop>
        </div>
      )}
      {q && answers[q.id] && (
        <>
          <CxmDrop title={CX_REASONS[q.id] ? `Why supporters backed it` : `What the record says`} sub={CX_REASONS[q.id] ? `Their case, from the official record` : `From the source behind this question`}>
            <CX_Why q={q} />
            {hl.size > 0 && (office === `council` || office === `mayor`) && (
              <>
                <span className="cxm-kicker">Put their name on it</span>
                <div className="cxm-chips">{stats.filter((p) => hl.has(p.id)).map((p) => <button key={p.id} type="button" onClick={() => tap(p)}>{short(p)}{/^council-ward-(\d+)/.test(p.id) ? ` · Ward ${p.id.replace(/\D+/g, ``)}` : ``} ›</button>)}</div>
              </>
            )}
            {file ? <button type="button" className="cxm-btn2" onClick={() => openSheet(`leg`, { file })}>See the full record, {file}</button> : <CxmSrc href={q.url}>{kind === `vote` ? `House roll call` : `Campaign page`}</CxmSrc>}
          </CxmDrop>
        </>
      )}
      {q && (
        <div className="cxm-row2">
          <button type="button" className="cxm-btn2" disabled={qi === 0} onClick={() => setQ(qi - 1)}>Previous</button>
          <button type="button" className="cxm-btn" onClick={() => setQ((qi + 1) % qs.length)}>{qi < qs.length - 1 ? `Next question` : `Back to the first`}</button>
        </div>
      )}
      <p className="cxm-fine">{q ? q.date : ``}</p>
    </div>
  );
}
