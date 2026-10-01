/* Cleveland Civic Graph v5 rebuild: extension components.
   Compiled with esbuild (jsxFactory u.createElement) and spliced into the
   CivicAtlas module so they share React, icons, and dialog primitives. */

const CXI = {
  Arrow: _, Ext: v, Back: g, Check: C, Book: b, Users: ce, Landmark: M, Pin: P, Shield: B, File: O,
  Help: T, Reset: L, Building: x, Search: ae, Download: E, Layers: N, Sparkles: se, Zap: fe, Wallet: ue,
  School: A, Home: j, Scale: ie, Chevron: w, Sliders: oe, List: te, Leaf: ee, Bus: S, Vote: le, Clock: re, X: de,
};

/* JSX treats lowercase tags as HTML, so dialog primitives get capitalized aliases */
const CXD = { Root: _s, Content: bs, Header: xs, Title: Ss, Desc: Cs };

function cxDict() {
  return Wh;
}
function cxFindTerm(term) {
  const t = String(term).toLowerCase();
  return Wh.find((e) => e.term.toLowerCase() === t);
}

/* Wrap known dictionary terms in plain text with inline definition buttons. */
function CX_Definable({ text, onTerm, limit = 4 }) {
  if (!text) return null;
  const terms = [...Wh].map((e) => e.term).sort((a, b) => b.length - a.length);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`);
  const re = new RegExp(`\\b(${terms.map(esc).join(`|`)})s?\\b`, `i`);
  const out = [];
  const used = new Set();
  let rest = text;
  let key = 0;
  while (rest && used.size < limit) {
    const m = rest.match(re);
    if (!m) break;
    const word = m[0];
    const base = m[1].toLowerCase();
    const idx = m.index;
    if (used.has(base)) {
      out.push(rest.slice(0, idx + word.length));
      rest = rest.slice(idx + word.length);
      continue;
    }
    used.add(base);
    out.push(rest.slice(0, idx));
    out.push(
      <button key={`d${key++}`} type="button" className="inline-definition" title={`Define ${base}`} onClick={() => onTerm(base)}>
        {word}
      </button>,
    );
    rest = rest.slice(idx + word.length);
  }
  out.push(rest);
  return <>{out}</>;
}

/* ---------- 4-step guided view (Start, Meaning, Power, Proof) ---------- */
function CX_SimpleGuide({ room, onSelect, onTerm, onRegistry }) {
  const [step, setStep] = u.useState(0);
  const steps = [`Start`, `Meaning`, `Power`, `Proof`];
  const pathNodes = room.path.map((id) => room.nodes.find((n) => n.id === id)).filter(Boolean);
  const termEntries = room.terms.map((t) => cxFindTerm(t)).filter(Boolean);
  const counts = room.nodes.reduce((acc, n) => ((acc[n.evidence] = (acc[n.evidence] ?? 0) + 1), acc), {});
  const next = () => setStep((s) => Math.min(3, s + 1));
  return (
    <div className="simple-guide" aria-label="Guided civic explanation">
      <div className="simple-guide-heading">
        <div>
          <span className="atlas-eyebrow"><CXI.Help size={14} /> YOUR GUIDED VIEW</span>
          <strong>Take this one step at a time</strong>
        </div>
        {step > 0 && (
          <button type="button" className="simple-guide-reset" onClick={() => setStep(0)}>
            <CXI.Reset size={13} /> Start over
          </button>
        )}
      </div>
      <div className="simple-guide-steps" role="tablist" aria-label="Guided explanation steps">
        {steps.map((s, i) => (
          <button key={s} type="button" role="tab" aria-selected={step === i} className={step === i ? `active` : i < step ? `complete` : ``} onClick={() => setStep(i)}>
            <span>{i < step ? <CXI.Check size={11} /> : i + 1}</span>
            <span>{s}</span>
          </button>
        ))}
      </div>
      <div className="simple-guide-panel" role="tabpanel">
        {step === 0 && (
          <>
            <h3 aria-level="2">{room.question}</h3>
            <p><CX_Definable text={room.answer} onTerm={onTerm} limit={2} /></p>
            <p className="simple-guide-note">You do not need to understand the whole map first. Choose one doorway, and we will keep the relevant path in view.</p>
            <div className="simple-guide-actions">
              <button type="button" className="simple-guide-primary" onClick={next}>Guide me through it <CXI.Arrow size={15} /></button>
              <span>or choose a starting point below</span>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <span className="simple-guide-kicker">IN PLAIN WORDS</span>
            <h3>A few words that unlock this topic</h3>
            <dl className="simple-guide-facts">
              {termEntries.map((t) => (
                <div key={t.term}>
                  <dt><button type="button" className="inline-definition" onClick={() => onTerm(t.term)}>{t.term}</button></dt>
                  <dd>{t.meaning}</dd>
                </div>
              ))}
            </dl>
            <p className="simple-guide-note">Each word opens the civic dictionary with an example and where it fits.</p>
            <div className="simple-guide-actions">
              <button type="button" className="simple-guide-primary" onClick={next}>Who has power here? <CXI.Arrow size={15} /></button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <span className="simple-guide-kicker">WHO CAN ACT</span>
            <h3>Follow these stops in order</h3>
            <p>These are suggested stops, not a chain of command. Open one to see what it can decide and how it connects.</p>
            <div className="simple-guide-related">
              {pathNodes.map((n, i) => (
                <button type="button" key={n.id} onClick={() => onSelect(n.id)}>
                  <span>
                    <strong>{i + 1}. {n.name}</strong>
                    <small>{n.region}</small>
                  </span>
                  <CXI.Arrow size={15} />
                </button>
              ))}
            </div>
            <div className="simple-guide-actions">
              <button type="button" className="simple-guide-primary" onClick={next}>How do we know? <CXI.Arrow size={15} /></button>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <span className="simple-guide-kicker">CHECK THE RECORD</span>
            <h3>What the evidence supports, and what is missing</h3>
            <div className="simple-guide-evidence">
              {Object.entries(counts).map(([k, c]) => (
                <span key={k} className="cx-evidence-chip" data-state={k}><i aria-hidden="true" />{c} · {Kh[k] ?? k}</span>
              ))}
            </div>
            <p>{room.gap}</p>
            <div className="simple-guide-actions simple-guide-actions-stack">
              <a className="simple-guide-primary" href={room.actionUrl} target="_blank" rel="noreferrer">{room.action} <CXI.Ext size={15} /></a>
              <button type="button" className="simple-guide-secondary" onClick={onRegistry}><CXI.Shield size={15} /> Open the source registry</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Doorways shown on the home room ---------- */
/* the doorways on the Simple home; the phone Explore tab reads the same list */
const CX_DOORWAYS = [
  [`energy-entry`, `Zap`, `Energy power map`, `Who owns, contracts, runs, and regulates your electricity.`, `room`, `energy`],
  [`contract-entry`, `File`, `Decision & contract ledger`, `Follow real Cleveland records, with gaps shown.`, `panel`, `ledger`],
  [`housing-entry`, `Home`, `Housing & land`, `Inspections, planning, Housing Court, and rentals.`, `room`, `housing`],
  [`safety-entry`, `Shield`, `Public safety`, `Departments, oversight, courts, and local spending.`, `room`, `safety`],
  [`energy-entry cx-eco-entry`, `Layers`, `Civic ecosystem`, `Hospitals, schools, funders, and networks beyond City Hall.`, `room`, `ecosystem`],
  [`energy-entry cx-muni-entry`, `Pin`, `Cities & municipalities`, `Is your address in Cleveland? Who governs it?`, `room`, `municipalities`],
];
function CX_DomainGrid({ onRoom, onPanel }) {
  return (
    <div className="simple-domain-grid" role="group" aria-label="Start with a topic">
      {CX_DOORWAYS.map(([cls, icon, title, sub, kind, target]) => {
        const Icon = CXI[icon];
        return (
          <button type="button" key={title} className={`energy-entry ${cls}`} onClick={() => (kind === `room` ? onRoom(target) : onPanel(target))}>
            <span><Icon size={22} /><strong>{title}</strong><small>{sub}</small></span>
            <CXI.Arrow size={18} />
          </button>
        );
      })}
    </div>
  );
}

function CX_TextConnections({ room, visibleIds, onSelect }) {
  const bc = cxBroadcast(room);
  const edges = room.edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));
  const byId = new Map(room.nodes.map((n) => [n.id, n]));
  const seenGroup = new Set();
  return (
    <section className="atlas-text-connections" aria-label="Relationships in words">
      <h3>Connections, in words</h3>
      <p>Every line on the map, written out. Solid lines on the map are sourced or recorded; dashed lines are interpretation or a missing record.</p>
      <div>
        {edges.map((e) => {
          const s = byId.get(e.source);
          const t = byId.get(e.target);
          if (!s || !t) return null;
          if (bc.ids.has(e.id)) {
            const key = `${e.source}|${e.relation}`;
            if (seenGroup.has(key)) return null;
            seenGroup.add(key);
            const group = edges.filter((x) => x.source === e.source && x.relation === e.relation && bc.ids.has(x.id));
            return (
              <article key={key}>
                <button type="button" onClick={() => onSelect(s.id)}>{cxSentence(s.name, e.relation, `each of these ${group.length}`, cxPluralNode(s)).replace(/\.$/, ``)}: {group.map((x) => byId.get(x.target)?.name).filter(Boolean).join(`, `)}.</button>
                {e.note && <p>{e.note}</p>}
              </article>
            );
          }
          return (
            <article key={e.id}>
              <button type="button" onClick={() => onSelect(t.id === `people` ? s.id : t.id)}>
                {cxSentence(s.name, e.relation, t.name, cxPluralNode(s))}
              </button>
              {e.note && <p>{e.note}</p>}
              {e.url
                ? <a href={e.url} target="_blank" rel="noreferrer">{Kh[e.evidence] ?? `Source`} · relationship source <CXI.Ext size={12} /></a>
                : <small>{Kh[e.evidence] ?? `Evidence`} · entity sources available; no dedicated relationship citation</small>}
            </article>
          );
        })}
        {!edges.length && <p>No relationships are visible with the current filters.</p>}
      </div>
    </section>
  );
}

/* ---------- Research-preview release card (Audit mode) ---------- */
function CX_ReleaseCard({ onBench }) {
  return (
    <div className="atlas-release-card">
      <span className="atlas-eyebrow">RESEARCH PREVIEW · {CX_BUILD.version.toUpperCase()}</span>
      <h3>What this release can and cannot tell you</h3>
      <p>Records were reviewed on {CX_BUILD.sources}. This page shows sources, gaps, and interpretations with labels. The research agents, source monitoring, and review console described in the architecture pack are designed but not running, so nothing here updates by itself.</p>
      <button type="button" className="atlas-full-button" onClick={onBench}><CXI.Sparkles size={16} /> How this is built</button>
    </div>
  );
}

/* ---------- Resident check dialog ---------- */
function CX_ResidentCheck({ open, onOpenChange, room, node, edges, nodes, onSelect }) {
  const [done, setDone] = u.useState({});
  u.useEffect(() => setDone({}), [room.id, node.id]);
  const layer = room.layers.find((l) => l.id === node.layer);
  const cards = [
    {
      id: `who`, icon: CXI.Landmark, title: `Who has authority here?`,
      body: <><strong>{node.name}</strong> sits in <strong>{layer?.label ?? `this room`}</strong>. {node.summary}</>,
    },
    {
      id: `where`, icon: CXI.Pin, title: `Where does it apply?`,
      body: <>It applies to <strong>{node.region}</strong>. {room.region !== node.region ? `Room scope: ${room.region}.` : ``}</>,
    },
    {
      id: `next`, icon: CXI.Arrow, title: `What can I do next?`,
      body: <><strong>{room.action}.</strong> Then open the official record for {node.label} and check the date it was reviewed ({node.checked}).</>,
    },
  ];
  const count = Object.values(done).filter(Boolean).length;
  const nearby = edges.slice(0, 5).map((e) => {
    const otherId = e.source === node.id ? e.target : e.source;
    return { e, other: nodes.find((n) => n.id === otherId) };
  }).filter((x) => x.other);
  return (
    <CXD.Root open={open} onOpenChange={onOpenChange}>
      <CXD.Content className="atlas-dialog cx-resident-dialog atlas-resident-dialog">
        <CXD.Header>
          <CXD.Title>Resident check</CXD.Title>
          <CXD.Desc>Three questions every resident should be able to answer before acting.</CXD.Desc>
        </CXD.Header>
        <div className="resident-check">
          <div className="resident-check-intro">
            <span className="atlas-eyebrow">{room.label.toUpperCase()} · {node.label}</span>
            <h2>Can you answer these three questions?</h2>
            <p>Read each card, then mark it when it makes sense to you. If one does not, open a nearby record or the dictionary. Nothing here is saved or sent anywhere.</p>
          </div>
          <div className="resident-check-progress" aria-live="polite">
            <span>{count} of 3 answered</span>
            <div><i style={{ width: `${(count / 3) * 100}%` }} /></div>
          </div>
          <div className="resident-check-grid">
            {cards.map((c) => {
              const Icon = c.icon;
              const isDone = !!done[c.id];
              return (
                <article key={c.id} className={`resident-check-card ${isDone ? `complete` : ``}`}>
                  <div className="resident-check-card-heading">
                    <span><Icon size={16} /> {c.title}</span>
                    {isDone && <CXI.Check size={16} />}
                  </div>
                  <p>{c.body}</p>
                  <button type="button" className="resident-check-done" aria-pressed={isDone} onClick={() => setDone((d) => ({ ...d, [c.id]: !d[c.id] }))}>
                    {isDone ? <><CXI.Check size={14} /> I can answer this</> : `Mark as understood`}
                  </button>
                </article>
              );
            })}
          </div>
          {nearby.length > 0 && (
            <div className="resident-check-nearby">
              <h3>Still unsure? Look at a connected record</h3>
              <div>
                {nearby.map(({ e, other }) => (
                  <button type="button" key={e.id} onClick={() => { onSelect(other.id); onOpenChange(!1); }}>
                    <span><strong>{other.name}</strong><small>{e.relation} · {Kh[e.evidence] ?? ``}</small></span>
                    <CXI.Arrow size={15} />
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="resident-check-footer">
            <p className="resident-check-evidence"><span className="cx-evidence-chip" data-state={node.evidence}><i aria-hidden="true" />{Kh[node.evidence] ?? node.evidence}</span> Reviewed {node.checked}</p>
            <button type="button" onClick={() => setDone({})}><CXI.Reset size={14} /> Start over</button>
            <a href={node.url} target="_blank" rel="noreferrer">Open the official source <CXI.Ext size={13} /></a>
          </div>
        </div>
      </CXD.Content>
    </CXD.Root>
  );
}

/* ---------- My local context (aux page) ---------- */
/* v5.7: the place a resident picks is shared (this visit only) so My leaders can open on their ward. */
const CX_PLACE = { v: `` };
/* v5.14: the cards are plain data so the phone app shows the same guidance */
function cxLocalCards(place, onGo, onPanel) {
  const ward = place.startsWith(`ward-`) ? _h.find(([n]) => `ward-${n}` === place) : null;
  const outside = place === `county`;
  const unsure = place === `unsure`;
  return ward
    ? [
        [CXI.Users, `Your council member`, `${ward[1]} represents Ward ${ward[0]} on the 119th Cleveland City Council.`, `Official ward directory`, [[`Open the record`, () => onGo(`council`, `ward-${ward[0]}`)], [`Compare with my priorities`, () => onPanel(`leaders`)], [`Confirm your ward`, `https://www.clevelandcitycouncil.gov/find-my-ward`]]],
        [CXI.Vote, `Your ballot`, `Your address, not your ward, decides your full ballot. Countywide races and issues are the same for every Cleveland voter.`, `Board of Elections`, [[`Practice your ballot`, () => onPanel(`ballot`)], [`Official sample ballot`, `https://boe.cuyahogacounty.gov/voters/Get-a-Sample-Ballot`]]],
        [CXI.Landmark, `City services`, `The mayor's administration runs departments such as Public Works, Building & Housing, and Public Utilities.`, `City contact directory`, [[`See who runs services`, () => onGo(`administration`, `mayor`)], [`City contact directory`, `https://www.clevelandohio.gov/contact`]]],
        [CXI.Scale, `Courts that may apply`, `Cleveland Municipal Court and Housing Court handle different case types. Courts follow law, not wards.`, `Court information`, [[`Which court handles my problem?`, () => onGo(`courts`, `municipal-court`)], [`Municipal Court`, `https://clevelandmunicipalcourt.org/`]]],
      ]
    : outside
      ? [
          [CXI.Pin, `Your city or village`, `Your local government is probably not Cleveland City Hall. Check your address to find the right city, village, or township.`, `Board of Elections lookup`, [[`Cities & municipalities`, () => onGo(`municipalities`, `cx-other-municipalities`)], [`Find voting information by address`, `https://boe.cuyahogacounty.gov/voters/Find-Voting-Information-by-Address`]]],
          [CXI.Vote, `Your ballot`, `Countywide races and issues are shared across Cuyahoga County. Local races depend on your address.`, `Board of Elections`, [[`Practice your ballot`, () => onPanel(`ballot`)], [`Official sample ballot`, `https://boe.cuyahogacounty.gov/voters/Get-a-Sample-Ballot`]]],
          [CXI.Building, `County services`, `Cuyahoga County government serves every community in the county, separately from any city hall.`, `Cuyahoga County`, [[`Open county government`, () => onGo(`state-federal`, `county`)], [`Cuyahoga County`, `https://cuyahogacounty.gov/`]]],
          [CXI.Bus, `Shared regional systems`, `Transit, sewer service, and regional planning cross city lines.`, `Regional authorities`, [[`See regional authorities`, () => onGo(`municipalities`, `rta`)], [`GCRTA`, `https://www.riderta.com/`]]],
        ]
      : unsure
        ? [
            [CXI.Search, `Find out first`, `The Board of Elections lookup tells you your city, ward, precinct, and districts from your address, on their site.`, `Board of Elections lookup`, [[`Find voting information by address`, `https://boe.cuyahogacounty.gov/voters/Find-Voting-Information-by-Address`]]],
            [CXI.Pin, `Cleveland or not?`, `Several neighbors have their own governments, including East Cleveland and Bratenahl. A similar name does not mean the same city.`, `Cities & municipalities`, [[`Compare nearby governments`, () => onGo(`municipalities`, `cx-east-cleveland`)]]],
          ]
        : [];
}
function CX_LocalContext({ onGo, onPanel }) {
  const [place, setPlaceState] = u.useState(CX_PLACE.v);
  const setPlace = (v) => { CX_PLACE.v = v; setPlaceState(v); };
  const ward = place.startsWith(`ward-`) ? _h.find(([n]) => `ward-${n}` === place) : null;
  const outside = place === `county`;
  const unsure = place === `unsure`;
  const cards = cxLocalCards(place, onGo, onPanel);
  const selectedTitle = ward ? `Ward ${ward[0]}, City of Cleveland` : outside ? `Elsewhere in Cuyahoga County` : unsure ? `Not sure yet` : ``;
  return (
    <section className="civic-page resident-context">
      <span className="atlas-eyebrow"><CXI.Pin size={15} /> MY LOCAL CONTEXT</span>
      <h1>See the parts of government closest to you.</h1>
      <p className="civic-lede">Choose a place, and the atlas brings forward the offices, ballots, and courts most likely to apply. We never ask for your address. Official lookups happen on official websites.</p>
      <div className="context-privacy cx-privacy">
        <CXI.Shield size={20} />
        <div>
          <strong>Private to this visit</strong>
          <p>Your choice stays in this page's memory and is not saved, shared, or added to links. Reloading clears it.</p>
        </div>
      </div>
      <div className="civic-card context-picker">
        <label htmlFor="cx-place"><CXI.Pin size={16} /> Where do you live?</label>
        <select id="cx-place" value={place} onChange={(e) => setPlace(e.target.value)}>
          <option value="">Choose a place</option>
          <optgroup label="City of Cleveland">
            {_h.map(([n, name]) => <option key={n} value={`ward-${n}`}>Ward {n} · {name}</option>)}
          </optgroup>
          <option value="county">Elsewhere in Cuyahoga County</option>
          <option value="unsure">I am not sure</option>
        </select>
        <small>Do not know your ward? Choose "I am not sure" and use the official lookup.</small>
      </div>
      {place && (
        <>
          <div className="civic-card context-selected">
            <div>
              <span className="atlas-eyebrow">YOUR CONTEXT</span>
              <h2>{selectedTitle}</h2>
              <p>{ward ? `Council representation follows the 2026 15-ward map. Your ballot, school district, and some services can follow different boundaries.` : outside ? `Your city or village government, not Cleveland's, makes most local decisions for your address.` : `Start with an official address lookup. Then come back and choose your place.`}</p>
            </div>
            <div className="civic-links">
              <button type="button" className="civic-action" onClick={() => setPlace(``)}>Clear</button>
            </div>
          </div>
          <div className="civic-grid context-grid">
            {cards.map(([Icon, title, body, status, links]) => (
              <article key={title} className="civic-card context-card">
                <div className="context-card-title"><Icon size={20} /><h2>{title}</h2></div>
                <p>{body}</p>
                <span className="context-status"><CXI.Shield size={14} /> {status}</span>
                <div className="civic-links">
                  {links.map(([label, target]) => typeof target === `function`
                    ? <button type="button" key={label} className="cx-link-button" onClick={target}>{label} <CXI.Arrow size={14} /></button>
                    : <a key={label} href={target} target="_blank" rel="noreferrer">{label} <CXI.Ext size={13} /></a>)}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      <details className="context-notes">
        <summary><CXI.Help size={16} /> What this page does not do</summary>
        <ul>
          <li>It does not look up or store an address. Official lookups stay on official websites.</li>
          <li>It does not match precincts or districts. Your full ballot can differ from your neighbor's.</li>
          <li>It does not tell you how to vote or rank anyone.</li>
        </ul>
      </details>
    </section>
  );
}

/* ---------- Decision & contract ledger (aux page) ---------- */
function CX_Ledger({ onGo }) {
  const entries = u.useMemo(() => cxLedgerEntries(), []);
  const [domain, setDomain] = u.useState(`all`);
  const [state, setState] = u.useState(`all`);
  const list = entries.filter((e) => (domain === `all` || e.domain === domain) && (state === `all` || e.evidence === state));
  const [sel, setSel] = u.useState(entries[0]?.id);
  const cur = list.find((e) => e.id === sel) ?? list[0];
  const domains = [...new Set(entries.map((e) => e.domain))];
  const n = (k) => entries.filter((e) => e.evidence === k).length;
  return (
    <section className="civic-page cx-ledger contract-ledger-surface">
      <span className="atlas-eyebrow"><CXI.File size={15} /> DECISION & CONTRACT LEDGER</span>
      <h1>Follow a decision to its record.</h1>
      <p className="civic-lede">Each entry is a real Cleveland record already loaded in this atlas. The ledger shows what the record supports and lists what is still missing. It does not total money, score officials, or infer votes.</p>
      <div className="ledger-summary">
        <div><strong>{entries.length}</strong><span>Records</span></div>
        <div><strong>{n(`verified`)}</strong><span>Recorded actions</span></div>
        <div><strong>{n(`under-review`) + n(`partial`) + n(`context`)}</strong><span>Partial or context</span></div>
        <div><strong>{n(`missing`)}</strong><span>Records needed</span></div>
      </div>
      <div className="ledger-toolbar">
        <span>Filters change the list, not the records.</span>
        <div className="cx-ledger-filters">
          <label>Topic <select value={domain} onChange={(e) => setDomain(e.target.value)}>
            <option value="all">All topics</option>
            {domains.map((d) => <option key={d} value={d}>{CX_DOMAIN_LABEL[d] ?? d}</option>)}
          </select></label>
          <label>Evidence <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="all">All evidence</option>
            {Object.entries(CX_EVIDENCE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></label>
        </div>
      </div>
      <div className="ledger-layout">
        <div className="ledger-list" role="group" aria-label="Ledger records">
          {list.map((e) => (
            <button type="button" key={e.id} className={cur?.id === e.id ? `selected` : ``} aria-pressed={cur?.id === e.id} onClick={() => setSel(e.id)}>
              <span className={`ledger-domain ledger-domain-${e.domain}`}>{CX_DOMAIN_LABEL[e.domain] ?? e.domain}</span>
              <strong>{e.short}</strong>
              <small>{e.title}</small>
              <em>{CX_EVIDENCE_LABEL[e.evidence]}</em>
            </button>
          ))}
          {!list.length && <CX_Empty title="No records match these filters" body={`The ledger holds ${entries.length} records. Clearing the filters shows all of them.`} actions={[[`Clear the filters`, () => { setDomain(`all`); setState(`all`); }]]} />}
        </div>
        {cur && (
          <article className="ledger-detail" aria-live="polite">
            <div className="ledger-detail-top">
              <span className={`ledger-domain ledger-domain-${cur.domain}`}>{CX_DOMAIN_LABEL[cur.domain] ?? cur.domain}</span>
              <span className={`ledger-evidence ledger-evidence-${cur.evidence}`}>{CX_EVIDENCE_LABEL[cur.evidence]}</span>
            </div>
            <h3 aria-level="2">{cur.title}</h3>
            <p className="ledger-summary-copy">{cur.summary}</p>
            <dl>
              {cur.fields.map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}
            </dl>
            <div className="ledger-detail-section">
              <h4 aria-level="3"><CXI.Help size={13} /> Still missing</h4>
              <ul>{cur.missing.map((m) => <li key={m}>{m}</li>)}</ul>
            </div>
            <div className="ledger-detail-section">
              <h4 aria-level="3"><CXI.Shield size={13} /> Source</h4>
              <a href={cur.source[1]} target="_blank" rel="noreferrer">{cur.source[0]} <CXI.Ext size={13} /></a>
              <small>Review recorded {cur.checked}. A source link is not an independent audit of every claim.</small>
            </div>
            <div className="ledger-related">
              <span>{cur.related.join(` · `)}</span>
              <button type="button" className="cx-link-button" onClick={() => onGo(cur.room, cur.node)}>Show this record on the map <CXI.Arrow size={14} /></button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

/* ---------- How this is built: Civic Intelligence Bench (aux page) ---------- */
function CX_Bench() {
  const [tab, setTab] = u.useState(`pipeline`);
  const [stepIdx, setStepIdx] = u.useState(0);
  const [group, setGroup] = u.useState(`all`);
  const tabs = [[`pipeline`, `Pipeline`], [`seats`, `Seats`], [`states`, `States & gates`], [`plan`, `Delivery plan`], [`contracts`, `Evidence rules`]];
  const groups = [...new Set(CX_SEATS.map((s) => s[1]))];
  const W0 = 1000;
  const cols = 4;
  const pos = (i) => {
    const row = Math.floor(i / cols);
    const colRaw = i % cols;
    const col = row % 2 ? cols - 1 - colRaw : colRaw;
    return { x: 20 + col * ((W0 - 40) / cols) + 10, y: 16 + row * 118 };
  };
  const bw = (W0 - 40) / cols - 20;
  return (
    <section className="civic-page cx-bench">
      <span className="atlas-eyebrow"><CXI.Sparkles size={15} /> CIVIC INTELLIGENCE BENCH</span>
      <h1>How a resident question becomes a public record.</h1>
      <p className="civic-lede">A resident asks "Who decided this?" The system should return a short answer with jurisdiction, date, source, and uncertainty. The map, text view, Simple view, and Audit view all read the same approved records. No agent publishes. A named person approves each public change.</p>
      <div className="atlas-release-card cx-status-card">
        <span className="atlas-eyebrow">HONEST STATUS · OCTOBER 1, 2026</span>
        <h3 aria-level="2">The architecture is designed. Part of the machinery now runs.</h3>
        <p>Every night a script turns Council's public record into one packet per ordinance or resolution. Rule-based checks play the Examiner and the Skeptic, and only a named publisher, through a signed GitHub workflow, can approve an exact version. Approved records show a Reviewed mark on profiles, with who checked them and what they found. Not running yet: agents that read documents, a member-by-member vote source, and a correction desk. Anything not marked Reviewed was gathered by hand, with sources and gaps labeled.</p>
      </div>
      <CX_BenchStatus />
      <div className="cx-tabs" role="tablist" aria-label="Architecture sections">
        {tabs.map(([id, label]) => (
          <button type="button" role="tab" key={id} aria-selected={tab === id} className={tab === id ? `active` : ``} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === `pipeline` && (
        <div className="cx-pipeline">
          <svg viewBox={`0 0 ${W0} 372`} role="group" aria-label="Eleven-step pipeline from intake to follow-through, with a correction loop back to the evidence registry. Choose a step to read it.">
            <defs>
              <marker id="cx-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10" fill="currentColor" /></marker>
            </defs>
            {CX_PIPELINE.map((_s, i) => {
              if (i === CX_PIPELINE.length - 1) return null;
              const a = pos(i), c = pos(i + 1);
              const sameRow = Math.floor(i / cols) === Math.floor((i + 1) / cols);
              if (sameRow) {
                const dir = c.x > a.x ? 1 : -1;
                return <line key={`l${i}`} className="cx-flow" x1={dir > 0 ? a.x + bw : a.x} y1={a.y + 36} x2={dir > 0 ? c.x - 4 : c.x + bw + 4} y2={c.y + 36} markerEnd="url(#cx-arrow)" />;
              }
              return <path key={`l${i}`} className="cx-flow" d={`M${a.x + bw / 2},${a.y + 72} L${c.x + bw / 2},${c.y - 4}`} markerEnd="url(#cx-arrow)" />;
            })}
            <path className="cx-flow cx-loop" d={`M${pos(10).x + bw / 2},${pos(10).y - 4} L${pos(5).x + bw / 2},${pos(5).y + 76}`} markerEnd="url(#cx-arrow)" />
            <text className="cx-loop-label" x={pos(10).x + bw / 2 + 10} y={pos(10).y - 18}>corrections return to the evidence packet</text>
            {CX_PIPELINE.map(([name], i) => {
              const p = pos(i);
              const humanGate = i === 9;
              return (
                <g key={name} className={`cx-step ${stepIdx === i ? `active` : ``} ${humanGate ? `human` : ``}`} tabIndex={0} role="button" aria-pressed={stepIdx === i} aria-label={`Step ${i + 1}: ${name}`}
                  onClick={() => setStepIdx(i)} onKeyDown={(e) => { if (e.key === `Enter` || e.key === ` `) { e.preventDefault(); setStepIdx(i); } }}>
                  <rect x={p.x} y={p.y} width={bw} height={72} rx={9} />
                  <text x={p.x + 14} y={p.y + 26} className="cx-step-num">{String(i + 1).padStart(2, `0`)}</text>
                  <text x={p.x + 14} y={p.y + 52} className="cx-step-name">{name}</text>
                </g>
              );
            })}
          </svg>
          <div className="cx-step-detail" aria-live="polite">
            <span className="atlas-eyebrow">STEP {stepIdx + 1} OF {CX_PIPELINE.length}</span>
            <h3>{CX_PIPELINE[stepIdx][0]}</h3>
            <p>{CX_PIPELINE[stepIdx][1]}</p>
            <div className="cx-step-nav">
              <button type="button" disabled={stepIdx === 0} onClick={() => setStepIdx(stepIdx - 1)}><CXI.Back size={14} /> Previous</button>
              <button type="button" disabled={stepIdx === CX_PIPELINE.length - 1} onClick={() => setStepIdx(stepIdx + 1)}>Next <CXI.Arrow size={14} /></button>
            </div>
          </div>
          <div className="civic-card">
            <h2>Research spokes</h2>
            <p>One question can route to several spokes. Each returns its own evidence packet, and no researcher approves its own finding.</p>
            <div className="cx-chips">{CX_SPOKES.map((s) => <span key={s}>{s}</span>)}</div>
          </div>
        </div>
      )}

      {tab === `seats` && (
        <div>
          <div className="ledger-toolbar cx-toolbar">
            <span>{CX_SEATS.length} seats. Each seat stops at its authority boundary.</span>
            <label>Group <select value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="all">All seats</option>
              {groups.map((g0) => <option key={g0} value={g0}>{g0}</option>)}
            </select></label>
          </div>
          <div className="atlas-table-scroll">
            <table className="cx-table">
              <caption className="sr-only">Seats, what each must produce, and what each cannot do</caption>
              <thead><tr><th>Seat</th><th>Must produce</th><th>Cannot do</th></tr></thead>
              <tbody>
                {CX_SEATS.filter((s) => group === `all` || s[1] === group).map(([name, grp, must, cannot]) => (
                  <tr key={name}><td><strong>{name}</strong><small>{grp}</small></td><td>{must}</td><td className="cx-cannot">{cannot}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === `states` && (
        <div className="civic-grid cx-two">
          <div className="civic-card">
            <h2>Workflow states</h2>
            <div className="atlas-table-scroll">
              <table className="cx-table">
                <caption className="sr-only">Workflow states with entry, exit, and failure paths</caption>
                <thead><tr><th>State</th><th>Exit when</th><th>Failure path</th></tr></thead>
                <tbody>{CX_STATES.map(([s, entry, exit, fail]) => <tr key={s}><td><code>{s}</code><small>{entry}</small></td><td>{exit}</td><td className="cx-cannot">{fail}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          <div className="civic-card">
            <h2>Review gates that cannot be skipped</h2>
            <ol className="cx-gates">{CX_GATES.map((g0) => <li key={g0}>{g0}</li>)}</ol>
          </div>
        </div>
      )}

      {tab === `plan` && (
        <div>
          <p className="cx-note">Start with one bounded journey: "Who authorized a named city decision, and what was the recorded vote?" Then one energy contract and one education levy, keeping their authority chains separate.</p>
          <div className="atlas-table-scroll">
            <table className="cx-table">
              <caption className="sr-only">Delivery stages with acceptance checks and status</caption>
              <thead><tr><th>Stage</th><th>Deliverable</th><th>Acceptance check</th><th>Status</th></tr></thead>
              <tbody>{CX_STAGES.map(([n0, name, del, acc, st]) => (
                <tr key={n0}><td><strong>{n0}. {name}</strong></td><td>{del}</td><td>{acc}</td><td><span className={`cx-status cx-status-${st}`}><i aria-hidden="true" />{CX_STAGE_STATUS[st]}</span></td></tr>
              ))}</tbody>
            </table>
          </div>
          <h2 className="cx-h2">Acceptance cases</h2>
          <div className="cx-cases">
            {CX_CASES.map(([when, then]) => (
              <article key={when}><span className="atlas-eyebrow">WHEN</span><strong>{when}</strong><span className="atlas-eyebrow">THEN</span><p>{then}</p></article>
            ))}
          </div>
        </div>
      )}

      {tab === `contracts` && (
        <div className="civic-grid cx-two">
          <div className="civic-card">
            <h2>Evidence states</h2>
            <dl className="cx-dl">{CX_EVIDENCE_STATES.map(([k, d]) => <div key={k}><dt><code>{k}</code></dt><dd>{d}</dd></div>)}</dl>
            <p className="atlas-muted">A cryptographic hash proves a stored record was not changed after capture. It does not prove the content is true.</p>
          </div>
          <div className="civic-card">
            <h2>What the public page reads</h2>
            <p>The front end reads only a versioned, approved projection. Every record carries: id, type, label, plain summary, jurisdiction, geography, as-of date, evidence state, source anchors, validity, related records, next step, revision, and accessibility text.</p>
            <h2>Guardrails for values alignment</h2>
            <ul className="cx-gates">
              <li>Compare issue by issue, using roll calls, sponsored measures, official statements, and dates.</li>
              <li>Never infer beliefs from party, and never turn one vote into an ideology.</li>
              <li>"Not enough evidence" and "not applicable" are real answers.</li>
              <li>Label every projected effect as a scenario, not an outcome.</li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- Enhanced dictionary body ---------- */
function CX_Dictionary({ query, setQuery, category, setCategory, onRoom, onClose }) {
  const all = cxDict();
  const q = query.trim().toLowerCase();
  const featured = q ? all.find((e) => e.term.toLowerCase() === q) : null;
  const results = all.filter((e) =>
    (category === `all` || cxDictCategory(e) === category) &&
    `${e.term} ${e.meaning} ${e.example}`.toLowerCase().includes(q),
  );
  const related = featured ? all.filter((e) => e !== featured && (e.room === featured.room || cxDictCategory(e) === cxDictCategory(featured))).slice(0, 6) : [];
  const roomOf = (e) => Uh.find((r) => r.id === e.room);
  return (
    <>
      <div className="atlas-dictionary-controls">
        <label className="atlas-dictionary-search">
          <CXI.Search size={17} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try ward, levy, jurisdiction…" aria-label="Search the civic dictionary" />
        </label>
        <label className="atlas-dictionary-category">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {CX_DICT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>
      {featured && (
        <section className="atlas-dictionary-featured cx-featured" aria-live="polite">
          <span className="atlas-eyebrow">{cxDictCategory(featured).toUpperCase()}</span>
          <h3>{featured.term}</h3>
          <p>{featured.meaning}</p>
          <small>Example: {featured.example}</small>
          {related.length > 0 && (
            <div className="atlas-dictionary-related">
              <strong>Related</strong>
              {related.map((r) => <button type="button" key={r.term} onClick={() => setQuery(r.term)}>{r.term}</button>)}
            </div>
          )}
          <div className="atlas-dictionary-actions">
            <button type="button" onClick={() => { onRoom(featured.room); onClose(); }}>Show me where this fits <CXI.Arrow size={14} /></button>
            {roomOf(featured)?.actionUrl && <a href={roomOf(featured).actionUrl} target="_blank" rel="noreferrer">Official context <CXI.Ext size={13} /></a>}
          </div>
        </section>
      )}
      <div className="atlas-dictionary-results">
        {results.filter((e) => e !== featured).map((e) => (
          <article key={e.term}>
            <h3>{e.term}</h3>
            <p>{e.meaning}</p>
            <small>{e.example}</small>
            <button type="button" onClick={() => setQuery(e.term)}>Explain it simply <CXI.Arrow size={14} /></button>
            <button type="button" onClick={() => { onRoom(e.room); onClose(); }}>Show me where this fits <CXI.Arrow size={14} /></button>
          </article>
        ))}
        {!results.length && <CX_Empty title={query.trim() ? `No definition for "${query.trim()}" yet` : `Nothing in this category`} body="The dictionary explains civic words. Try a shorter word, or look at every category." actions={[[`Show every word`, () => { setQuery(``); setCategory(`all`); }]]} />}
      </div>
      <span className="atlas-muted">{all.length} plain-language definitions. These are summaries to help you read records, not legal definitions.</span>
    </>
  );
}

/* ---------- Design style switch: Bento Blue (default) or Original ---------- */
function CX_ThemeSwitch() {
  const read = () => document.documentElement.getAttribute(`data-cx-theme`) === `original` ? `original` : `bento`;
  const [t, setT] = u.useState(read);
  function flip() {
    const n = t === `bento` ? `original` : `bento`;
    document.documentElement.setAttribute(`data-cx-theme`, n);
    try { localStorage.setItem(`cx-theme`, n); } catch {}
    setT(n);
  }
  const name = t === `bento` ? `Bento Blue` : `Original`;
  return (
    <button type="button" className="cx-theme-switch" onClick={flip} title="Switch design style"
      aria-label={`Design style: ${name}. Switch to ${t === `bento` ? `Original` : `Bento Blue`}.`}>
      <i className="cx-theme-dot" aria-hidden="true" />
      <span>Style: <b>{t === `bento` ? `Bento` : `Original`}</b></span>
    </button>
  );
}

/* v5.7: plain place labels for ballot races. The county catalogue labels statewide races "County Wide District". */
const CX_STATEWIDE = /^(Governor|Attorney General|Auditor of State|Secretary of State|Treasurer of State|United States Senator|Justice of the Supreme Court|Chief Justice)/;
function cxArea(area, name) {
  const a = String(area || ``);
  if (name && (CX_STATEWIDE.test(name) || /Ohio Constitution/.test(name))) return `Statewide`;
  if (/^county wide district$/i.test(a)) return `Countywide`;
  if (/^8th district court of appeals$/i.test(a)) return `8th District Court of Appeals`;
  return a;
}

/* v5.16 desktop empty result: the same three parts as the phone (what was looked for, why, one next step) */
function CX_Empty({ title, body, actions }) {
  return (
    <div className="cx-empty" role="status">
      <strong>{title}</strong>
      <p>{body}</p>
      {actions && actions.length > 0 && <div className="cx-empty-actions">{actions.map(([label, fn]) => <button key={label} type="button" className="cx-link-button" onClick={fn}>{label}</button>)}</div>}
    </div>
  );
}
