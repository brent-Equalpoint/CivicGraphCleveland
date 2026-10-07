/* v5.14 phone app: My place. "Who decides here?" for any of the city's neighborhoods, with the same
   six sections as the desktop page (cxPlaceData), plus "My local context" cards for home. */

function cxmBBox(d) {
  const n = (String(d).match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i + 1 < n.length; i += 2) { x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]); y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]); }
  return [x0, y0, x1, y1];
}
function CxmPlaceMap({ layer, hood, wards, title }) {
  const H = CX_GEO.spa.filter((s) => s.name === hood);
  const box = H.length ? H.map((h) => cxmBBox(h.d)).reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]) : null;
  const pad = box ? Math.max(box[2] - box[0], box[3] - box[1]) * 0.45 + 8 : 0;
  const vb = box ? `${box[0] - pad} ${box[1] - pad} ${box[2] - box[0] + pad * 2} ${box[3] - box[1] + pad * 2}` : CX_GEO.viewBox;
  const on = new Set(wards.map((w) => w.ward));
  return (
    <figure className="cxm-pmap">
      <svg viewBox={vb} role="img" aria-label={`${title}: ${hood} outlined; ${wards.map((w) => `Ward ${w.ward}`).join(`, `)}`} preserveAspectRatio="xMidYMid meet">
        {CX_GEO[layer].map((w) => <path key={w.id} d={w.d} className={`cxm-ward ${on.has(w.id) ? (w.id === wards[0]?.ward ? `on` : `on2`) : ``}`} />)}
        {H.map((h, i) => <path key={i} d={h.d} className="cxm-hood" />)}
        {CX_GEO[layer].filter((w) => on.has(w.id)).map((w) => <text key={`t${w.id}`} x={w.cx} y={w.cy} className="cxm-ward-t on">{w.id}</text>)}
      </svg>
      <figcaption><span className="cxm-kicker">{title}</span><strong>{wards.map((w) => `${Math.round(w.share * 100)}% Ward ${w.ward}`).join(` · `) || `No ward data`}</strong></figcaption>
    </figure>
  );
}
function CxmPlaceSec({ id, open, setOpen, title, sum, children }) {
  const on = open === id;
  return (
    <div className={`cxm-drop ${on ? `open` : ``}`}>
      <button type="button" className="cxm-drop-head" aria-expanded={on} onClick={() => setOpen(on ? null : id)}>
        <span><strong>{title}</strong><small>{sum}</small></span><CXI.Chevron size={18} className="cxm-chev" />
      </button>
      {on && <div className="cxm-drop-body cxm-fade">{children}</div>}
    </div>
  );
}
function CxmPlace() {
  const { home, setHome, placeHood, openSheet, openSeat, openRoom, go } = useCxm();
  const hood = placeHood || home?.hood || `Downtown`;
  const D = u.useMemo(() => cxPlaceData(hood), [hood]);
  const [open, setOpen] = u.useState(`rep`);
  const [lever, setLever] = u.useState(`all`);
  u.useEffect(() => setLever(`all`), [hood]);
  const isHome = home?.hood === hood;
  const wardsTxt = D.now.map((r) => `Ward ${r.ward}`).join(`, `) || `these wards`;
  const shown = lever === `all` ? D.items : D.items.filter((x) => x.lever[0] === lever);
  const passedSorted = [...D.passed].sort((a, b) => a.path.days - b.path.days);
  const pv = u.useMemo(() => cxPlaceVotes(D.items), [D]);
  const placeKey = home ? (home.ward ? `ward-${home.ward}` : home.place || ``) : ``;
  const showLocal = placeKey && (isHome || !home.hood);
  const localCards = showLocal ? cxLocalCards(placeKey, (r, n) => openRoom(r, n), (p) => (p === `leaders` ? openSeat(home.ward ? `ward-${home.ward}` : `mayor`) : go(p === `ballot` ? `ballot` : `today`))) : [];
  const localNote = home?.ward ? `Council representation follows the 2026 15-ward map. Your ballot, school district, and some services can follow different boundaries.` : home?.place === `county` ? `Your city or village government, not Cleveland's, makes most local decisions for your address.` : `Start with an official address lookup. Then come back and choose your place.`;
  const before0 = D.before[0], now0 = D.now[0];
  const complicated = before0 && now0 && before0.ward !== now0.ward;
  return (
    <div className="cxm-page cxm-rise">
      <CxmKicker>Who decides here?</CxmKicker>
      <CxmH1>{hood}</CxmH1>
      <p className="cxm-mut">Everything here comes from public records: the city's ward maps, Council's legislative database, and the ordinance text. Nothing scores anyone. Where the record is silent, it says so.</p>
      <label className="cxm-field"><span>Neighborhood</span>
        <select value={hood} onChange={(e) => { const h = e.target.value, w = cxmHoodWard(h); setHome({ hood: h, ward: w ? w.ward : null, share: w ? w.share : 0 }); }}>{D.hoods.map((h) => <option key={h} value={h}>{h}{home?.hood === h ? ` (home)` : ``}</option>)}</select>
      </label>
      {!home && <button type="button" className="cxm-link" onClick={() => openSheet(`home`)}>Set this as my place</button>}
      <p className="cxm-fine">In 2025 Council redrew the map from 17 wards to 15. Blue marks the wards that cover {hood}; the outline is the neighborhood's official boundary.</p>
      <div className="cxm-pmaps">
        <CxmPlaceMap layer="wards2014" hood={hood} wards={D.before} title="2014 to 2025 (17 wards)" />
        <CxmPlaceMap layer="wards2026" hood={hood} wards={D.now} title="From 2026 (15 wards)" />
      </div>
      {complicated && <p className="cxm-status-line">Relationship status with Ward {before0.ward}: it's complicated. The 2026 map moved most of {hood} to Ward {now0.ward}.</p>}
      {localCards.length > 0 && (
        <section className="cxm-section">
          <CxmKicker>Closest to you · {cxmHomeLabel(home)}</CxmKicker>
          <p className="cxm-mut">{localNote}</p>
          {localCards.map(([Icon, title, body, status, links]) => (
            <div key={title} className="cxm-tile">
              <strong className="cxm-tile-h"><Icon size={17} /> {title}</strong>
              <p>{body}</p>
              <small className="cxm-fine">{status}</small>
              <div className="cxm-row-links">{links.map(([label, target]) => typeof target === `function` ? <button key={label} type="button" className="cxm-link" onClick={target}>{label}</button> : <CxmSrc key={label} href={target}>{label}</CxmSrc>)}</div>
            </div>
          ))}
        </section>
      )}
      <div className="cxm-drops">
        <CxmPlaceSec id="wardrec" open={open} setOpen={setOpen} title="Your ward's record" sum={home?.ward ? `Ward ${home.ward}: votes, actions, and records that name it` : `Choose your ward to see it`}>
          <CX_WardRecord ward={home?.ward || null} onFile={(f) => openSheet(`leg`, { file: f })} onPerson={openSeat} onSetWard={() => openSheet(`home`)} head="h2" />
        </CxmPlaceSec>
        <CxmPlaceSec id="rep" open={open} setOpen={setOpen} title={`Who represents ${hood}`} sum={now0 ? `${cxPlMember(`wards2026`, now0.ward)}, Ward ${now0.ward}${D.now.length > 1 ? ` and ${D.now.length - 1} more` : ``}` : `No ward data`}>
          <h4 className="cxm-h4" aria-level="2">Now</h4>
          {D.now.map((r) => (
            <div key={r.ward} className="cxm-row cxm-row-static">
              <span><strong>Ward {r.ward} · {Math.round(r.share * 100)}%</strong><small>{cxPlMember(`wards2026`, r.ward)}</small></span>
              <button type="button" className="cxm-link" onClick={() => openSeat(`ward-${r.ward}`)}>Profile</button>
            </div>
          ))}
          <h4 className="cxm-h4" aria-level="2">Before (2014 to 2025)</h4>
          {D.before.map((r) => <div key={r.ward} className="cxm-row cxm-row-static"><span><strong>Ward {r.ward} · {Math.round(r.share * 100)}%</strong><small>{cxPlMember(`wards2014`, r.ward) ? `Listed in the city's map file: ${cxPlMember(`wards2014`, r.ward)}` : ``}</small></span></div>)}
          <p className="cxm-fine">Shares are by land area, not by how many people live there. {D.now.length > 1 ? `With ${D.now.length} council members covering parts of ${hood}, check which side of the line your address is on before you call.` : ``}</p>
          <div className="cxm-row-links"><CxmSrc href={CX_GEO.src.wards2014}>2014 ward map</CxmSrc><CxmSrc href={CX_GEO.src.wards2026}>2026 ward map (Ord. No. 1-2025)</CxmSrc><CxmSrc href={CX_GEO.src.spa}>Neighborhood boundaries</CxmSrc></div>
        </CxmPlaceSec>
        <CxmPlaceSec id="dec" open={open} setOpen={setOpen} title={`Decisions tied to ${hood}`} sum={`${cxmPl(D.items.length, `decision`, `decisions`)} in 2026 by address or name`}>
          <p className="cxm-fine">A decision is tied here when a street address in its title maps inside {hood}, or when the title names a {hood} place. Titles without an address are not counted, so this list is a floor, not the whole picture.</p>
          <div className="cxm-chips">
            <button type="button" className={lever === `all` ? `on` : ``} onClick={() => setLever(`all`)}>All ({D.items.length})</button>
            {CX_PL_LEVERS.map(([id, label]) => { const n = D.items.filter((x) => x.lever[0] === id).length; return n ? <button key={id} type="button" className={lever === id ? `on` : ``} onClick={() => setLever(id)}>{label} ({n})</button> : null; })}
          </div>
          {lever !== `all` && <p className="cxm-fine">{CX_PL_LEVERS.find((l) => l[0] === lever)[3]}</p>}
          {!D.items.length && <p className="cxm-mut">No 2026 decisions are tied to {hood} by address or name in this record.</p>}
          {shown.map(({ m, why, lever: lv, path, signer, city }) => (
            <button key={m.file} type="button" className="cxm-item" onClick={() => openSheet(`leg`, { file: m.file })}>
              <span className="cxm-tags"><span className="cxm-tag">{lv[1]}</span><span className="cxm-tag2"><i className={city ? `city` : `member`} />{city ? `Sent by the mayor's administration` : `Written by a council member`}</span>{/^Emergency/.test(m.type) && <span className="cxm-tag2"><i className="fast" />Emergency</span>}</span>
              <strong>{cxShortTitle(m.title)}</strong>
              <small>{signer ? `Signed first by ${signer}${CX_SPONSOR_WARD[signer] ? ` (Ward ${CX_SPONSOR_WARD[signer]})` : ``}` : `No council member listed`} · {m.status} · {path.days !== null ? `${path.days} days from introduced to final vote` : `no final vote yet`} · {m.file}</small>
              <small className="cxm-why">{why}</small>
            </button>
          ))}
        </CxmPlaceSec>
        <CxmPlaceSec id="liq" open={open} setOpen={setOpen} title={`Liquor permits in ${wardsTxt}`} sum={D.liquor.length ? `${cxmPl(D.liquor.length, `address`, `addresses`)} on the record` : `None in 2026`}>
          <p className="cxm-fine">This is the lever only a ward member holds. Each line shows an objection, and a later withdrawal when there was one. A withdrawal often means conditions were worked out; the record does not say what they were.</p>
          {!D.liquor.length && <p className="cxm-mut">No 2026 liquor permit resolutions in these wards.</p>}
          {D.liquor.map(({ addr, rows }) => (
            <div key={addr} className="cxm-tile">
              <strong>{/^\d/.test(addr) ? addr : `Address not in title`} <small className="cxm-mut">Ward {rows[0].ward}</small></strong>
              {rows.map((r) => <button key={r.m.file} type="button" className="cxm-liq" onClick={() => openSheet(`leg`, { file: r.m.file })}><i className={r.withdraw ? `wd` : `ob`} />{cxmDate(r.date)}: {r.withdraw ? `Objection withdrawn` : `Objection filed`}{r.repeals ? ` (repeals Res. ${r.repeals})` : ``} by {cxPlSigner(r.m)}</button>)}
            </div>
          ))}
        </CxmPlaceSec>
        <CxmPlaceSec id="fast" open={open} setOpen={setOpen} title="How fast decisions moved" sum={`Citywide, half pass within ${D.cityDays} days`}>
          <p className="cxm-fine">From the day a proposal was introduced to Council's final vote, with the committees it passed through. Emergency measures take effect as soon as they pass, so the committee hearing is usually the last chance to weigh in.</p>
          <div className="cxm-stats">
            <div><b>{D.passed.length ? cxPlMedian(D.passed.map((x) => x.path.days)) : `n/a`}</b><span>median days here</span></div>
            <div><b>{D.cityDays ?? `n/a`}</b><span>median days citywide</span></div>
            <div><b>{D.items.filter((x) => /^Emergency/.test(x.m.type)).length} of {D.items.length}</b><span>passed or pending as emergency measures</span></div>
            <div><b>{D.passed.filter((x) => x.path.days <= 7).length}</b><span>went from introduced to final vote within a week</span></div>
          </div>
          {passedSorted.map(({ m, path }) => (
            <button key={m.file} type="button" className="cxm-bar" onClick={() => openSheet(`leg`, { file: m.file })}>
              <span className="cxm-bar-t"><b>{path.days} days</b> {cxWords(cxShortTitle(m.title), 12)}</span>
              <span className="cxm-bar-track"><i style={{ width: `${Math.min(100, 6 + path.days / 1.5)}%` }} /></span>
              <small>{path.committees.length ? path.committees.join(`, `) : `no committee step recorded`} · {m.file}</small>
            </button>
          ))}
        </CxmPlaceSec>
        <CxmPlaceSec id="money" open={open} setOpen={setOpen} title={`Ward money in ${wardsTxt}`} sum={`${cxmPl(D.funds.length, `item`, `items`)} from these wards' members`}>
          <p className="cxm-fine">Each council member steers a Neighborhood Equity Fund, and casino revenue is set aside for Council use. Amounts come from the ordinance text ("not to exceed" limits when stated). Ward money is spent across the whole ward, so not all of it reaches {hood}.</p>
          {!D.funds.length && <p className="cxm-mut">No 2026 ward-money items led by these wards' members.</p>}
          {D.now.map((r) => {
            const rs = D.funds.filter((x) => x.ward === r.ward);
            if (!rs.length) return null;
            const total = rs.filter((x) => x.counted).reduce((s, x) => s + (x.amount || 0), 0);
            return (
              <div key={r.ward} className="cxm-tile">
                <strong>Ward {r.ward}, {cxPlMember(`wards2026`, r.ward)}</strong>
                <small className="cxm-mut">{cxmPl(rs.length, `item`, `items`)} · {cxmMoney(total)} in listed amounts for this ward</small>
                {rs.map((x) => (
                  <button key={x.m.file} type="button" className="cxm-fund" onClick={() => openSheet(`leg`, { file: x.m.file, fund: !0 })}>
                    <b>{x.amount ? cxmMoney(x.amount) : `Amount not stated`}</b>
                    <span>{x.who ? `to ${x.who}` : cxWords(cxShortTitle(x.m.title), 10)}{!x.counted && <em>{x.named.length > 1 ? ` Shared by Wards ${x.named.join(`, `)}; not counted in the total.` : ` Fund named in the text: Ward ${x.named.join(`, `)}, which may use the ward numbers from before 2026; not counted in the total.`}</em>}<small>Sponsors: {x.m.sponsors.filter((y) => !CX_PL_ADMIN.has(y)).join(`, `)} · {x.m.file}</small></span>
                  </button>
                ))}
              </div>
            );
          })}
          {D.councilWideFunds.length > 0 && <div className="cxm-tile"><strong>Council-wide fund rules</strong><small className="cxm-mut">Not tied to one ward</small>{D.councilWideFunds.map((x) => <button key={x.m.file} type="button" className="cxm-fund" onClick={() => openSheet(`leg`, { file: x.m.file })}><span>{cxWords(cxShortTitle(x.m.title), 18)}</span></button>)}</div>}
        </CxmPlaceSec>
        <CxmPlaceSec id="votes" open={open} setOpen={setOpen} title="What the record shows about votes" sum="Outcomes, yes. Roll calls, no.">
          <p className="cxm-fine">Council's database records the outcome of each vote (approved, adopted, amended) and each committee's recommendation. For a vote to pass an ordinance or adopt a resolution, the City Record also prints how each member voted. Where it does, that is counted here. A file with no printed vote has no record, which is not a no.</p>
          <div className="cxm-stats">
            <div><b>{D.passed.length}</b><span>decisions here with a recorded final vote</span></div>
            <div><b>{D.items.filter((x) => x.path.fin && /amended/.test(x.path.fin[1])).length}</b><span>changed before passing ("as amended")</span></div>
            <div><b>{pv.withRoll.length}</b><span>of these have a member-by-member vote in the City Record</span></div>
          </div>
          {pv.split.length > 0 && <h4 className="cxm-h4" aria-level="2">Here: votes that were not unanimous</h4>}
          {pv.split.map((x) => <button key={x.m.file} type="button" className="cxm-item" onClick={() => openSheet(`leg`, { file: x.m.file })}><strong>{cxShortTitle(x.m.title)}</strong><small>{cxVoteSplitText(x)} · {x.m.file}</small></button>)}
          {D.unusual.length > 0 && <h4 className="cxm-h4" aria-level="2">Citywide: decisions that did not simply pass</h4>}
          {D.unusual.map(({ m, p }) => <button key={m.file} type="button" className="cxm-item" onClick={() => openSheet(`leg`, { file: m.file })}><strong>{cxShortTitle(m.title)}</strong><small>{p.flags.map((f) => `${cxmDate(f[0])}: ${f[1]} (${f[2]})`).join(` · `)} · {m.file}</small></button>)}
        </CxmPlaceSec>
        <CxmPlaceSec id="how" open={open} setOpen={setOpen} title="How this page works" sum="Sources and limits">
          <ul className="cxm-list">
            <li>Maps: City of Cleveland open data, retrieved {CX_GEO.retrieved.slice(0, 10)}. Ward shares are by land area.</li>
            <li>Decisions: Council's Legistar database ({CX_LEG.count} items since Jan. 1, 2026), action histories retrieved {CX_PL.retrieved.slice(0, 10)}. Addresses in titles were located with the U.S. Census Bureau geocoder; {Object.values(CX_PL.addresses).filter((r) => r.hood).length} of {Object.keys(CX_PL.addresses).length} addresses fell inside a mapped neighborhood.</li>
            <li>"Signed first" is the first council member listed on the record. For city requests, that is usually the ward member and the committee chair, and it does not by itself show personal support.</li>
            <li>Ward money amounts are read from the ordinance text and may not match final spending.</li>
            <li>How each member voted: the City Record, Council's weekly official publication, pulled {CX_VOTES.retrieved_at.slice(0, 10)}. It prints names only for votes to pass or adopt, so a vote to suspend the rules shows no names.</li>
            <li>Not in any of these records: meetings held or calls returned. Absences appear only where the City Record prints them on a vote.</li>
          </ul>
          <h4 className="cxm-h4" aria-level="2">What this page does not do</h4>
          <ul className="cxm-list">
            <li>It does not look up or store an address. Official lookups stay on official websites.</li>
            <li>It does not match precincts or districts. Your full ballot can differ from your neighbor's.</li>
            <li>It does not tell you how to vote or rank anyone.</li>
          </ul>
        </CxmPlaceSec>
      </div>
    </div>
  );
}
