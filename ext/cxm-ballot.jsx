/* v5.14 phone app: Ballot. The same practice ballot as the desktop (lh state: districts, choices,
   local issues, answers), every contest and issue from the county lists (Hm, Um), plain-language
   issue guides (Jm), voter resources (Lm), dates (CX_DATES), and the levy keypad. */

const CXM_DISTRICTS = [[`congress`, `U.S. House district`], [`senate`, `State Senate district`], [`house`, `Ohio House district`], [`council`, `County Council district`]];
function cxmBallotGroup(it) {
  if (it.issue) return `Issues`;
  const c = it.contest;
  if (/Judge|Justice/.test(c.name)) return `Courts`;
  const a = cxArea(c.area, c.name);
  if (a === `Statewide`) return `Statewide`;
  if (a === `Countywide`) return `Countywide`;
  return `Your districts`;
}
function cxmChoiceLabel(it, sel) {
  if (!sel) return ``;
  if (sel === `undecided`) return `Undecided`;
  if (sel === `skip`) return `Skipped`;
  if (it.issue) return sel === `yes` ? `Yes` : `No`;
  return it.contest.candidates.find((c) => c.id === sel)?.name ?? ``;
}
function cxmTaxRate() {
  const f = CX_GUIDES.cost.facts.find((x) => /% income tax/.test(x[0]));
  return f ? { rate: Number(f[0].match(/(\d+(?:\.\d+)?)% income tax/)[1]), src: f[1], url: f[2] } : null;
}

function CxmBallot() {
  const { practice, openSheet, setOverlay, openOffice } = useCxm();
  const st = practice.state;
  const items = th(st);
  const days = cxmDaysTo(CXM_ELECTION);
  const groups = [`Statewide`, `Your districts`, `Countywide`, `Courts`, `Issues`].map((g) => [g, items.filter((it) => cxmBallotGroup(it) === g)]).filter(([, l]) => l.length);
  const chosenN = items.filter((it) => st.selections[it.id] && st.selections[it.id] !== `skip`).length;
  const lv = cxmLevies();
  const setD = (k, v) => practice.update((s) => ({ ...s, districts: { ...s.districts, [k]: v } }));
  const [open, setOpen] = u.useState({});
  const over = cxElectionPhase() === `after`;   // once the election has passed there are no polls to open, and the official results are one tap down in the dates (CxmDates)
  return (
    <div className="cxm-page cxm-rise">
      <CxmKicker>{over ? `The November 3 election is over.` : `Tuesday, Nov. 3 · Polls open 6:30 a.m. to 7:30 p.m.`}</CxmKicker>
      <CxmH1>My ballot</CxmH1>
      <p className="cxm-lede">{over ? `Your ballot, to look back on. Follow the evidence.` : `Your ballot. A little clearer. Try a choice. Follow the evidence. Take your time.`}</p>
      <p className="cxm-status-line"><span>This never casts a vote. Choices stay in this visit unless you choose to save on this browser. Manual practice ballot · precinct not verified.</span></p>
      {cxmRegisterStory() && (
        <button type="button" className="cxm-card cxm-card-acc cxm-keycard cxm-keycard-reg" onClick={() => setOverlay({ type: `story`, list: [cxmRegisterStory()], i: 0, f: 0 })}>
          <span><strong>{cxmDaysTo(CX_REG_DATE) === 0 ? `Register to vote: today is the deadline` : cxmDaysTo(CX_REG_DATE) > 0 ? `Register to vote` : `Not registered? Here is where you stand`}</strong><small>A short walkthrough with links to the official sites.</small></span><b>RV</b>
        </button>
      )}
      <CxmDates />
      <p className="cxm-fine">{days > 0 ? `${days} days to Election Day. ` : ``}All times are Eastern time. An application requests a ballot; it is not your completed ballot.</p>
      <div className="cxm-tile cxm-tile-acc">
        <strong>Set my districts</strong>
        <p className="cxm-mut">Your address, not your ward, decides your full ballot. Type your address and your districts are found on this phone, or pick them yourself. Nothing is saved or sent.</p>
        <button type="button" className="cxm-btn cxm-btn-dark" onClick={() => setOverlay({ type: `districts` })}>Find my districts by address</button>
        <div className="cxm-dgrid">
          {CXM_DISTRICTS.map(([k, label]) => (
            <label key={k} className="cxm-field"><span>{label}</span>
              <select value={st.districts[k]} onChange={(e) => setD(k, e.target.value)}>
                <option value="">Not set</option>
                {$m[k].map((d) => <option key={d} value={d}>District {Number(d)}</option>)}
              </select>
            </label>
          ))}
        </div>
        <p className="cxm-fine">Only odd-numbered County Council districts are on the ballot this year. Countywide races and issues are included. Add your districts and local issues from the official ballot. We do not infer them from a city ward.</p>
        <CxmSrc href={ah}>Check with the Board of Elections</CxmSrc>
      </div>
      <div className="cxm-tile">
        <span className="cxm-kicker">Make room for a question</span>
        <strong>You don't have to know everything.</strong>
        <p className="cxm-mut">Open a race to see what each person has said or voted on. Missing evidence stays missing.</p>
      </div>
      {lv.length > 0 && (
        <>
          <button type="button" className="cxm-card cxm-card-acc cxm-keycard" onClick={() => setOverlay({ type: `story`, list: cxmLevyStories(), i: 0, f: 0 })}>
            <span><strong>What would the county levies cost you?</strong><small>Two short stories: the cost, what each pays for, and what people say.</small></span><b>$</b>
          </button>
          <button type="button" className="cxm-link" onClick={() => openSheet(`levies`)}>All the tax issues on your ballot</button>
        </>
      )}
      {cxmIssueStories().length > 0 && (
        <button type="button" className="cxm-card cxm-card-acc cxm-keycard cxm-keycard-issues" onClick={() => setOverlay({ type: `story`, list: cxmIssueStories(), i: 0, f: 0 })}>
          <span><strong>The other questions on every ballot in the county</strong><small>Short stories for State Issue 3 and county Issues 12, 13, and 14: what each asks, and what people on each side say.</small></span><b><CxStoryArt id="ballot" /></b>
        </button>
      )}
      {groups.map(([g, list]) => (
        <section key={g} className="cxm-section">
          <CxmKicker>{g} · {list.length}</CxmKicker>
          <div className="cxm-tile cxm-tile-list">
            {(open[g] || list.length <= 8 ? list : list.slice(0, 8)).map((it) => {
              const sel = st.selections[it.id];
              const name = it.contest ? it.contest.name : `Issue ${it.issue.number}: ${Xm(it.issue).title}`;
              const sub = it.contest ? `${cxArea(it.contest.area, it.contest.name)} ${it.contest.term}`.trim() : `${cxArea(it.issue.area, Xm(it.issue).title)}${Ym(it.issue) ? `` : ` · plain-language review not loaded`}`;
              return (
                <button key={it.id} type="button" className="cxm-row" onClick={() => openSheet(it.contest ? `contest` : `issue`, { id: it.id })}>
                  <span><strong>{name}</strong><small>{sub}</small>{sel && <small className="cxm-pick"><i />{cxmChoiceLabel(it, sel)}</small>}</span><CXI.Arrow size={15} />
                </button>
              );
            })}
            {list.length > 8 && <button type="button" className="cxm-link" onClick={() => setOpen((o) => ({ ...o, [g]: !o[g] }))}>{open[g] ? `Show fewer` : `Show all ${list.length}`}</button>}
          </div>
        </section>
      ))}
      <button type="button" className="cxm-btn2 cxm-wide" onClick={() => openSheet(`local`)}>Add a local issue from my precinct ({st.localIssues.length} added)</button>
      <CxmOutcomes items={items} />
      <button type="button" className="cxm-btn cxm-wide" onClick={() => openSheet(`review`)}>Review my practice ballot ({chosenN} chosen)</button>
      <div className="cxm-tile">
        <strong>Your practice ballot</strong>
        <p className="cxm-mut">{chosenN} of {items.length} races and issues marked. Choices stay in this browser. Anyone using this browser profile could see saved choices.</p>
        <button type="button" className={`cxm-switch ${practice.saved ? `on` : ``}`} aria-pressed={practice.saved} onClick={() => practice.remember(!practice.saved)}><span>Save on this browser<small>{practice.saved ? `Saved in this browser` : `Visit only · reload clears choices unless saved`}</small></span><i><b /></i></button>
        <button type="button" className="cxm-link" onClick={() => practice.clear()}>Clear my practice data</button>
        {practice.message && <p className="cxm-fine" role="status">{practice.message}</p>}
        <button type="button" className="cxm-link" onClick={() => openOffice(`governor`)}>See how governor candidates line up with your answers</button>
      </div>
      <section className="cxm-section">
        <CxmKicker>Voter education</CxmKicker>
        <h2 className="cxm-h2">A little understanding goes a long way.</h2>
        <p className="cxm-mut">One question at a time. Learn who decides, what a vote means, and where to get help.</p>
        <h3 className="cxm-h3">Who does what?</h3>
        {CX_WHO_DOES.map(([t, d]) => <CxmDrop key={t} title={t}><p>{d}</p></CxmDrop>)}
        <div className="cxm-row-links">
          <CxmSrc href="https://www.usa.gov/branches-of-government">Federal branches explained</CxmSrc>
          <CxmSrc href="https://www.legislature.ohio.gov/">Ohio legislature</CxmSrc>
          <CxmSrc href="https://www.clevelandcitycouncil.gov/">City Council</CxmSrc>
        </div>
        <div className="cxm-tile">
          <strong>Three steps before choosing</strong>
          <ol className="cxm-list">
            <li>Find the exact office or proposal on your ballot.</li>
            <li>Look at the official record and what the person actually controls.</li>
            <li>Compare the tradeoffs with what matters to you. You can keep learning without choosing a side.</li>
          </ol>
        </div>
        {Lm.map(([label, url, desc]) => <a key={label} className="cxm-row" href={url} target="_blank" rel="noreferrer"><span><strong>{label}</strong><small>{desc}</small></span><CXI.Ext size={15} /></a>)}
        <CxmDrop title="Statewide races at a glance" sub={`${Im.length} races from the county list dated September 17`}>
          {Im.map((r) => (
            <div key={r.name} className="cxm-glance"><strong>{r.name}</strong><small>{r.area}</small><ul className="cxm-list">{r.people.map(([n, p]) => <li key={n}>{n} · {p}</li>)}</ul>{r.writeins && <small className="cxm-fine">Valid write-ins: {r.writeins}</small>}</div>
          ))}
        </CxmDrop>
        <p className="cxm-fine">Source review: September 22, 2026. This guide is a dated snapshot, not an election office. Confirm current instructions with the Board of Elections.</p>
      </section>
    </div>
  );
}

function CxmContest({ id }) {
  const { practice, openOffice, openSheet } = useCxm();
  const c = Hm.find((x) => x.id === id);
  if (!c) return null;
  const info = qm(c);
  const sel = practice.state.selections[id];
  const onBallot = th(practice.state).some((it) => it.id === id);
  const pick = (v) => practice.update((s) => ({ ...s, selections: { ...s.selections, [id]: s.selections[id] === v ? undefined : v } }));
  const office = Km(c);
  const cands = c.candidates.filter((x) => Qm(x.status));
  const others = c.candidates.filter((x) => !Qm(x.status));
  return (
    <div className="cxm-pad">
      <CxmKicker>Record and role · {cxArea(c.area, c.name)}</CxmKicker>
      <h2 className="cxm-h2">{c.name}</h2>
      {c.term && <small className="cxm-mut">{c.term}</small>}
      <p><strong>What this office can do.</strong> {info.can}</p>
      <p className="cxm-mut"><strong>Limits.</strong> {info.limits}</p>
      <CxOfficeNote contest={c} skipTicket />
      <CxmSrc href={info.url}>Official authority source</CxmSrc>
      <CxOfficeTicket contest={c} />
      {!onBallot && <p className="cxm-status-line">This race is not in the districts you set, so a choice here won't be kept. Set your districts on the Ballot tab.</p>}
      <h3 className="cxm-h3">Candidates <span>{cands.length}</span></h3>
      <p className="cxm-fine">Tap a name to practice your pick. Record opens what is on file for that candidate.</p>
      {cands.map((x) => (
        <div key={x.id} className="cxm-cand-row">
          <button type="button" className={`cxm-cand ${sel === x.id ? `on` : ``}`} aria-pressed={sel === x.id} onClick={() => pick(x.id)}>
            <strong>{x.name}</strong><small>{x.party}{x.status === `write-in` ? ` · valid write-in` : ``} · filed {x.filed}</small>
          </button>
          <button type="button" className="cxm-cand-rec" aria-label={`${x.name}: candidate record`} onClick={() => openSheet(`cand`, { id: x.id })}>
            Record<CXI.Arrow size={13} />
          </button>
        </div>
      ))}
      <div className="cxm-row2">
        <button type="button" className={`cxm-btn2 ${sel === `undecided` ? `on` : ``}`} onClick={() => pick(`undecided`)}>Still deciding</button>
        <button type="button" className={`cxm-btn2 ${sel === `skip` ? `on` : ``}`} onClick={() => pick(`skip`)}>Skip this race</button>
      </div>
      {others.length > 0 && <p className="cxm-fine">Also on the county list but not valid: {others.map((x) => `${x.name} (${x.status})`).join(`, `)}.</p>}
      {office && <button type="button" className="cxm-btn cxm-wide" onClick={() => openOffice(office)}>{office === `governor` ? `See their stated plans next to your answers` : `See their past votes next to your answers`}</button>}
      <p className="cxm-fine">Your choice stays in this browser. Party labels come from the Board of Elections candidate list (page {c.page}). A party does not establish how someone will decide.</p>
      <CxmSrc href={Bm}>Official candidate list</CxmSrc>
    </div>
  );
}
function CxmIssue({ id }) {
  const { practice, setOverlay, closeSheet } = useCxm();
  const i = Um.find((x) => x.id === id);
  if (!i) return null;
  const g = Xm(i);
  const sel = practice.state.selections[id];
  const pick = (v) => practice.update((s) => ({ ...s, selections: { ...s.selections, [id]: s.selections[id] === v ? undefined : v } }));
  const onBallot = th(practice.state).some((it) => it.id === id);
  const story = cxIssueStoryFor(i.number);   // Issues 3 and 10 to 14 have a short story with both sides; the row on the Ballot tab leads to it
  return (
    <div className="cxm-pad">
      <CxmKicker>Issue {i.number} · {cxArea(i.area, g.title)}</CxmKicker>
      <h2 className="cxm-h2">{g.title}</h2>
      {story && (
        <button type="button" className="cxm-card cxm-card-acc cxm-keycard cxm-keycard-issues" onClick={() => { closeSheet(); setOverlay({ type: `story`, list: story.list, i: story.i, f: 0 }); }}>
          <span><strong>Read the short story</strong><small>What it asks, what changes, and what people on each side say, with sources.</small></span><b><CxStoryArt id={story.list[story.i].id} /></b>
        </button>
      )}
      {!Ym(i) && <p className="cxm-status-line">A detailed plain-language review is not loaded for this issue. Read the official wording below.</p>}
      <p className="cxm-fine">Tap yes or no to practice your pick. It stays in this browser.</p>
      <button type="button" className={`cxm-cand ${sel === `yes` ? `on` : ``}`} aria-pressed={sel === `yes`} onClick={() => pick(`yes`)}><strong>A yes vote means</strong><small>{g.yes}</small></button>
      <button type="button" className={`cxm-cand ${sel === `no` ? `on` : ``}`} aria-pressed={sel === `no`} onClick={() => pick(`no`)}><strong>A no vote means</strong><small>{g.no}</small></button>
      <p><strong>Consider.</strong> {g.consider}</p>
      <div className="cxm-row2">
        <button type="button" className={`cxm-btn2 ${sel === `undecided` ? `on` : ``}`} onClick={() => pick(`undecided`)}>Still deciding</button>
        <button type="button" className={`cxm-btn2 ${sel === `skip` ? `on` : ``}`} onClick={() => pick(`skip`)}>Skip</button>
      </div>
      {!onBallot && <p className="cxm-fine">This local issue is not on your practice ballot yet. Add it from "Add a local issue".</p>}
      <CxmDrop title="Official wording" sub={`County issue list, page ${i.page}`}><pre className="cxm-pre">{i.text}</pre></CxmDrop>
      <CxmSrc href={`${Fm}#page=${i.page}`}>Read the actual proposal, county issue list page {i.page}</CxmSrc>
    </div>
  );
}
function CxmLocalIssues() {
  const { practice, openSheet } = useCxm();
  const [q, setQ] = u.useState(``);
  const local = Um.filter((i) => i.area !== `COUNTY WIDE DISTRICT`);
  const t = q.trim().toLowerCase();
  const list = local.filter((i) => !t || `${i.area} ${i.title} ${i.text} ${i.number}`.toLowerCase().includes(t));
  const toggle = (id) => practice.update((s) => ({ ...s, localIssues: s.localIssues.includes(id) ? s.localIssues.filter((x) => x !== id) : [...s.localIssues, id] }));
  return (
    <div className="cxm-pad">
      <CxmKicker>Local issues · {local.length}</CxmKicker>
      <h2 className="cxm-h2">Which local issues are on your ballot?</h2>
      <p className="cxm-mut">A local issue can apply to just one precinct. Check your sample ballot, then add the ones that apply to you.</p>
      <label className="cxm-field"><span>Search by place, precinct, or words</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cleveland 03-Q, Sunday sales, school…" /></label>
      {!list.length && <CxmEmpty title={`No local issue matches "${q.trim()}"`} body="Local issues are listed by place and precinct. Try a place name, a precinct code, or a word from the issue. Your sample ballot from the Board of Elections shows exactly which ones apply to you." actions={[[`Clear the search`, () => setQ(``)], [`Open the official sample ballot lookup`, () => globalThis.open(`https://boe.cuyahogacounty.gov/voters/Find-Voting-Information-by-Address`, `_blank`, `noopener`)]]} />}
      {list.slice(0, 60).map((i) => {
        const on = practice.state.localIssues.includes(i.id);
        return (
          <div key={i.id} className="cxm-row cxm-row-static">
            <span><strong>Issue {i.number} · {i.area}</strong><small>{i.title}</small></span>
            <span className="cxm-row-links"><button type="button" className="cxm-link" onClick={() => openSheet(`issue`, { id: i.id })}>Read</button><button type="button" className={`cxm-btn2 cxm-sm ${on ? `on` : ``}`} aria-pressed={on} onClick={() => toggle(i.id)}>{on ? `Added` : `Add`}</button></span>
          </div>
        );
      })}
      {list.length > 60 && <p className="cxm-fine">Showing 60 of {list.length}. Search to narrow the list.</p>}
      <CxmSrc href="https://boe.cuyahogacounty.gov/voters/Get-a-Sample-Ballot">Get your sample ballot</CxmSrc>
    </div>
  );
}

/* ---------- find my districts: the address is matched on this phone and never saved or sent ---------- */
function CxmDistricts() {
  const { setOverlay, practice } = useCxm();
  const use = (rows) => {
    const pad = (v) => String(v).padStart(2, `0`);
    const pick = (k, list) => (list.length === 1 && $m[k].includes(pad(list[0])) ? pad(list[0]) : ``);
    practice.update((s) => ({ ...s, districts: { ...s.districts, congress: pick(`congress`, rows.congress), senate: pick(`senate`, rows.senate), house: pick(`house`, rows.house), council: pick(`council`, rows.council) } }));
    setOverlay(null);
  };
  return (
    <div className="cxm-overlay cxm-story cxm-story-districts" role="dialog" aria-modal="true" aria-label="Find my districts">
      <div className="cxm-story-head"><span /><button type="button" aria-label="Close" onClick={() => setOverlay(null)}><CXI.X size={22} /></button></div>
      <CX_DistrictFinder phone onUse={use} />
    </div>
  );
}

/* ---------- the levies guide as a phone sheet; the number pad stays one tap away ---------- */
function CxmLevies() {
  const { setOverlay, closeSheet } = useCxm();
  const open = (n) => { const list = cxmLevyStories(); closeSheet(); setOverlay({ type: `story`, list, i: Math.max(0, list.findIndex((x) => x.id === `levy-${n}`)), f: 0 }); };
  return <div className="cxm-pad"><CX_Levies onOpen={open} onPad={() => setOverlay({ type: `keypad`, mode: `home`, kp: `150000` })} /></div>;
}

/* ---------- levy and tax keypad ---------- */
function CxmKeypad() {
  const { overlay, setOverlay } = useCxm();
  const { mode, kp } = overlay;
  const v = Number(kp || 0);
  const lv = cxmLevies();
  const tax = cxmTaxRate();
  const press = (k) => {
    const cur = kp === `0` ? `` : kp || ``;
    if (k === `del`) setOverlay({ ...overlay, kp: cur.slice(0, -1) || `0` });
    else if ((cur + k).length <= 9) setOverlay({ ...overlay, kp: (cur + k).replace(/^0+/, ``) || `0` });
  };
  return (
    <div className="cxm-overlay cxm-keypad cxm-pop" role="dialog" aria-modal="true" aria-label="Cost calculator">
      <div className="cxm-story-head">
        <button type="button" aria-label="Close" onClick={() => setOverlay(null)}><CXI.X size={22} /></button>
        <div className="cxm-kseg">{[[`home`, `Home value`], ...(tax ? [[`pay`, `Yearly pay`]] : [])].map(([id, l]) => <button key={id} type="button" className={mode === id ? `on` : ``} onClick={() => setOverlay({ ...overlay, mode: id, kp: id === `home` ? `150000` : `50000` })}>{l}</button>)}</div>
        <span style={{ width: 44 }} />
      </div>
      <div className="cxm-kdisp"><small>{mode === `pay` ? `What you earn in a year` : `Your home's market value`}</small><strong>{cxmMoney(v)}</strong></div>
      <div className="cxm-kres">
        {mode === `home` && lv.map((l) => <div key={l.issue.id}><span>Issue {l.issue.number} · {l.title}</span><b>about {cxmMoney((v * l.per) / 100000)} a year</b></div>)}
        {mode === `home` && <small>County estimates per $100,000 of market value, from the issue guides. {lv.map((l) => l.note).filter((x) => /combined levy|not a personalized/.test(x)).slice(0, 1).join(` `)} Not your tax bill.</small>}
        {mode === `pay` && tax && <div><span>Cleveland income tax, {tax.rate}%</span><b>{cxmMoney((v * tax.rate) / 100)} a year</b></div>}
        {mode === `pay` && tax && <small>Work in another city? A credit for tax paid there can lower it. The split by department is not loaded yet. Source: <a href={tax.url} target="_blank" rel="noreferrer">{tax.src}</a>.</small>}
      </div>
      <div className="cxm-keys">{[`1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `00`, `0`, `del`].map((k) => <button key={k} type="button" aria-label={k === `del` ? `Delete` : k} onClick={() => press(k)}>{k === `del` ? `⌫` : k}</button>)}</div>
      <button type="button" className="cxm-btn cxm-btn-dark" onClick={() => setOverlay(null)}>Done</button>
    </div>
  );
}

/* ---------- the desktop's "What could change?" step, one card per choice ---------- */
function CxmOutcomes({ items }) {
  const { practice, openSheet } = useCxm();
  const st = practice.state;
  const chosen = items.filter((it) => st.selections[it.id] && ![`undecided`, `skip`].includes(st.selections[it.id]));
  return (
    <section className="cxm-section">
      <CxmKicker>What could happen, with limits</CxmKicker>
      <h2 className="cxm-h2">What might your choices affect?</h2>
      <p className="cxm-mut">Start with the person or proposal you selected. A future outcome depends on other voters, other officials, laws, funding and implementation. We do not calculate winning odds or promise results.</p>
      {!chosen.length && <p className="cxm-status-line">Make a practice choice first. You can still open any candidate's record from a race above.</p>}
      {chosen.map((it) => {
        const v = st.selections[it.id];
        const cand = it.contest?.candidates.find((c) => c.id === v);
        const g = it.issue ? Xm(it.issue) : null;
        return (
          <div key={it.id} className="cxm-tile">
            <span className="cxm-kicker">{it.contest ? it.contest.name : `Issue ${it.issue.number}`}</span>
            <strong>{cand ? cand.name : `${v === `yes` ? `Yes` : `No`} · ${g.title}`}</strong>
            {cand ? (
              <>
                <p className="cxm-mut">{qm(it.contest).can}</p>
                <CxOfficeNote contest={it.contest} />
                <p className="cxm-mut">{Gm.some((x) => x.candidate === cand.id) ? `Sourced examples are available. Open the record to see plans, history, dependencies and tradeoffs.` : `No reviewed candidate-specific policy record is loaded. No future position is inferred.`}</p>
                <button type="button" className="cxm-link" onClick={() => openSheet(`cand`, { id: cand.id })}>Explore record & possibilities</button>
              </>
            ) : (
              <>
                <p className="cxm-mut">{v === `yes` ? g.yes : g.no}</p>
                <p className="cxm-mut">{g.consider}</p>
                <CxmSrc href={`${Fm}#page=${it.issue.page}`}>Read the actual proposal</CxmSrc>
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}

/* ---------- candidate record: the same evidence the desktop record shows ---------- */
function CxmCand({ id }) {
  const { practice } = useCxm();
  const c = Hm.find((x) => x.candidates.some((y) => y.id === id));
  const cand = c?.candidates.find((y) => y.id === id);
  if (!cand) return null;
  const info = qm(c);
  const recs = Gm.filter((g) => g.candidate === id);
  const ans = (v) => (CXM_ANS.find((a) => a[0] === v) || [])[1] || `Not answered`;
  return (
    <div className="cxm-pad">
      <CxmKicker>Candidate record</CxmKicker>
      <h2 className="cxm-h2">{cand.name}</h2>
      <small className="cxm-mut">{cand.party} · {c.name} · {cxArea(c.area, c.name)}</small>
      <div className="cxm-tile">
        <span className="cxm-kicker">What this office can do</span>
        <p>{info.can}</p>
        <p className="cxm-mut">{info.limits}</p>
        <CxOfficeNote contest={c} skipTicket />
        <CxmSrc href={info.url}>Authority reference</CxmSrc>
        <CxOfficeTicket contest={c} />
      </div>
      <h3 className="cxm-h3">Evidence, then possibilities</h3>
      <p className="cxm-mut">These are selected examples. A past vote records an action; a campaign statement records a promise. They are shown separately.</p>
      {!recs.length && (
        <div className="cxm-status-line"><span><strong>No record on file yet.</strong> This candidate is on the official list. We have not added any votes or statements for them, and that is not the same as nothing existing. No match or outcome is inferred.</span></div>
      )}
      {recs.map((g) => {
        const w = Wm.find((x) => x.id === g.question);
        if (!w) return null;
        return (
          <div key={g.question} className="cxm-tile">
            <span className="cxm-kicker">{w.kind === `vote` ? `PAST VOTE` : `CAMPAIGN STATEMENT`}</span>
            <strong>{w.title}</strong>
            <p>{g.detail}</p>
            <small className="cxm-mut">Your answer: {ans(practice.state.answers[w.id])} · Recorded position: {g.answer === `yes` ? `Yes` : g.answer === `no` ? `No` : g.answer}</small>
            <span className="cxm-row-links"><CxmSrc href={w.url}>Read the evidence</CxmSrc><small className="cxm-mut">{w.date}</small></span>
            <CxmDrop title="What could change?" sub="Scenario analysis, not a forecast">
              <p>{g.scenario}</p>
              <strong>Questions and tradeoffs</strong>
              <p className="cxm-mut">{g.tradeoff}</p>
            </CxmDrop>
          </div>
        );
      })}
      <CxmSrc href={`${Bm}#page=${c.page}`}>Official candidate entry, page {c.page}</CxmSrc>
    </div>
  );
}

/* ---------- review + private worksheet (same content as the desktop worksheet) ---------- */
function cxmWorksheet(st) {
  const items = th(st);
  const text = [
    `CLEVELAND CIVIC ATLAS · PRACTICE ONLY`,
    `November 3, 2026 · Manual district setup; precinct not verified.`,
    `This is not an official ballot and has not been submitted.`,
    `Source snapshot reviewed September 22, 2026.`,
    ``,
    ...items.map((e) => {
      const t = st.selections[e.id];
      const pick = e.contest?.candidates.find((c) => c.id === t)?.name || { yes: `Yes`, no: `No`, skip: `Left blank`, undecided: `Still deciding` }[t] || `Not answered`;
      return e.contest
        ? `${e.contest.name} · ${`${cxArea(e.contest.area, e.contest.name)} ${e.contest.term}`.trim()}\n  ${pick}`
        : `Issue ${e.issue.number}: ${Xm(e.issue).title} · ${cxArea(e.issue.area, Xm(e.issue).title)}\n  ${pick}`;
    }),
    ``,
    `MY EXPLICIT POLICY ANSWERS`,
    ...Wm.map((e) => `${e.question}\n  ${(CXM_ANS.find((a) => a[0] === st.answers[e.id]) || [])[1] || `Not answered`}`),
    ``,
    `Official sample ballots: https://boe.cuyahogacounty.gov/voters/Get-a-Sample-Ballot`,
    `Candidate list: ` + Bm,
    `Issue list: ` + Fm,
  ].join(`\n`);
  const url = URL.createObjectURL(new Blob([text], { type: `text/plain` }));
  const a = document.createElement(`a`);
  a.href = url;
  a.download = `cleveland-practice-ballot-2026.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function CxmReview() {
  const { practice, openSheet } = useCxm();
  const st = practice.state;
  const items = th(st);
  const n = items.filter((it) => st.selections[it.id] && ![`skip`, `undecided`].includes(st.selections[it.id])).length;
  const label = (it) => {
    const t = st.selections[it.id];
    return it.contest?.candidates.find((c) => c.id === t)?.name || { yes: `Yes`, no: `No`, skip: `Left blank`, undecided: `Still deciding` }[t] || `Not answered`;
  };
  return (
    <div className="cxm-pad">
      <CxmKicker>Review</CxmKicker>
      <h2 className="cxm-h2">Your practice review</h2>
      <p className="cxm-mut">{cxmPl(n, `choice`, `choices`)} made. This is your practice worksheet, not a verified precinct ballot or a vote submission.</p>
      <button type="button" className="cxm-btn cxm-wide" onClick={() => cxmWorksheet(st)}>Download my private worksheet</button>
      <p className="cxm-fine">The downloaded file includes your political choices. Keep it wherever you feel comfortable storing that information.</p>
      <div className="cxm-tile cxm-tile-list">
        {items.map((it) => (
          <button key={it.id} type="button" className="cxm-row" onClick={() => openSheet(it.contest ? `contest` : `issue`, { id: it.id })}>
            <span><strong>{it.contest ? it.contest.name : `Issue ${it.issue.number}: ${Xm(it.issue).title}`}</strong><small>{it.contest ? `${cxArea(it.contest.area, it.contest.name)} ${it.contest.term}`.trim() : cxArea(it.issue.area, Xm(it.issue).title)}</small><small className={st.selections[it.id] ? `cxm-pick` : ``}>{st.selections[it.id] && <i />}{label(it)}</small></span>
            <CXI.Arrow size={15} />
          </button>
        ))}
      </div>
      <div className="cxm-tile">
        <strong>Before you vote for real</strong>
        <p className="cxm-mut">Check your official sample ballot, registration, polling place and current voting instructions. This site cannot register you, request a mail ballot or submit a vote.</p>
        <CxmSrc href="https://boe.cuyahogacounty.gov/voters/Get-a-Sample-Ballot">Check the official sample ballot</CxmSrc>
      </div>
    </div>
  );
}
