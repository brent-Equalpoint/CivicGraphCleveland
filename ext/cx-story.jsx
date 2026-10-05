/* Story engine shared by the phone app (Today) and the desktop Stories page.
   A story is data: { id, label, ini, portrait, name, when, frames: [{ k, big, small, type?, qid?, match?, cta?, go? }] }.
   Builders read the same records as every other screen and write nothing. Presentation lives elsewhere:
   CxmStory (phone, full screen) in cxm-today.jsx and CX_Stories (desktop) below. Every frame says
   where its facts come from in `small`; a frame with a record behind it carries `file` so a reader can open it.
   Plain, warm, direct words. No all-caps labels. */

function cxmSplit(seat) {
  return { own: seat.items.filter((x) => x.role === `own`), joined: seat.items.filter((x) => x.role === `joined`), dept: seat.items.filter((x) => x.role === `dept`) };
}
function cxmPl(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}
function cxmRecordFor(cand, qid) {
  return Gm.find((g) => g.candidate === cand && g.question === qid && g.answer === `yes`);
}

/* Typography for story text, shared by the phone and desktop readers. A date such as "Nov. 3" stays together, and with glue the
   last two words stay together, so a headline never wraps to a lone word or number ("Tuesday, Nov. / 3."). */
const CX_NB = String.fromCharCode(160);
function cxTight(s, glue) {
  let t = String(s == null ? `` : s).replace(/\b((?:Jan|Feb|Mar|Apr|Aug|Sept?|Oct|Nov|Dec)\.?|May|June|July) (\d)/g, (m, a, d) => a + CX_NB + d);
  if (glue) t = t.replace(/(\S+) (\S+)$/, (m, a, w) => (a.length + w.length <= 16 ? a + CX_NB + w : m));   // only when the pair is short enough to fit on a phone line
  return t;
}
/* The source of a story: the linked name and nothing else on screen. A screen reader still hears where it comes from. */
function CxSource({ source, cls }) {
  if (!source) return null;
  return (
    <p className={cls}>
      <span className="cxm-sr">Where this comes from: </span>
      {source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.label}<span className="sp-ext"> (opens in a new tab)</span></a> : source.label}
    </p>
  );
}

/* ---------- stories ---------- */
function cxmWardStory(w, answers) {
  const seat = cxLegIndex().seats[w - 1];
  const parts = cxmSplit(seat);
  const money = cxPlWardMoney(w);
  const first = seat.name.split(` `)[0];
  const frames = [];
  if (money.counted.length) {
    frames.push({ k: `Ward ${w}, this year`, big: `Ward ${w} steered ${cxmMoney(money.total)} to local groups.`, small: `Casino revenue and Neighborhood Equity money that the ordinance text ties to Ward ${w}: ${cxmPl(money.counted.length, `item`, `items`)}.` });
    const top = money.counted[0];
    frames.push({ k: `The biggest item`, big: `${cxmMoney(top.amount)}${top.who ? ` to ${top.who}` : ``}.`, small: `${cxWords(cxShortTitle(top.m.title), 22)} ${top.m.file}.` });
  } else {
    frames.push({ k: `Ward ${w}, this year`, big: `No ward money tied to Ward ${w} in this year's records yet.`, small: `Missing here means none was found in the ordinance text, not that nothing happened.` });
  }
  const liq = cxPlCity().liquorRows.filter((r) => r.ward === w);
  if (liq.length) {
    const wd = liq.filter((r) => r.withdraw).length, ob = liq.length - wd;
    const big = ob && wd ? `${cxmPl(ob, `objection`, `objections`)} filed, ${wd} withdrawn.` : ob ? `${cxmPl(ob, `objection`, `objections`)} filed.` : `${cxmPl(wd, `objection`, `objections`)} withdrawn.`;
    frames.push({ k: `Liquor permits`, big, small: liq.filter((r) => r.addr).slice(0, 3).map((r) => `${r.withdraw ? `Withdrew` : `Objected`}: ${r.addr}, ${cxmDate(r.date)}`).join(`. `) || `The addresses are not in these titles.` });
  }
  const person = CX_PEOPLE.people.find((p) => p.title === `Council Member` && cxmSamePerson(p.name, seat.name));
  const mv = person ? cxCouncilVotesOf(person.name) : [];
  if (mv.length) {
    const c = cxVoteCounts(mv);
    frames.push({ k: `How ${first} voted`, big: `The City Record lists ${first}'s vote on ${c.total} recorded votes this year.`,
      small: `${first} voted yea ${cxmPl(c.yea, `time`, `times`)}, nay ${cxmPl(c.nay, `time`, `times`)}, and was listed as absent ${cxmPl(c.absent, `time`, `times`)}. These are counts, not grades. Absent is not a no.` });
  }
  frames.push({ k: `What ${first} led`, big: parts.own.length ? `${first} led ${cxmPl(parts.own.length, `proposal`, `proposals`)} this year.` : `${first} did not lead a proposal in this record.`, small: cxSummary(seat, parts.own, parts.joined, parts.dept) });
  const q = [...CX_COUNCIL_Q, ...CX_MAYOR_Q].map((x) => ({ x, m: cxmMatter(x[0]), w: Wm.find((z) => z.id === x[1]) }))
    .filter((o) => o.m && o.w && o.m.sponsors.some((s) => CX_SPONSOR_WARD[s] === w))
    .sort((a, b) => Number(!!answers[a.w.id]) - Number(!!answers[b.w.id]))[0];
  if (q) frames.push({ k: `Your turn`, big: q.w.title, small: q.w.question, type: `react`, qid: q.w.id, match: { who: seat.name, seat: seat.id, portrait: seat.portrait, question: q.w.question, how: `put their name on the proposal`, file: q.x[0], cand: `council-ward-${w}` } });
  return { id: `ward`, label: `Ward ${w}`, ini: cxmInitials(seat.name), portrait: seat.portrait, name: `${seat.name} · Ward ${w}`, when: `Your council member, 2026 so far`, deeper: { label: `Read the profile of ${seat.name}`, kind: `profile`, seat: seat.id }, source: { label: `Cleveland City Council's public record (Legistar)`, url: `https://cityofcleveland.legistar.com/Legislation.aspx` }, frames };
}
function cxmCouncilStory() {
  const idx = cxLegIndex();
  const c = cxPlCity();
  const withFinal = idx.measures.filter((m) => cxPlPath(m).days !== null).length;
  const denied = c.unusual.filter((x) => x.m.status === `Passed` && x.p.flags.some((f) => /denial/.test(f[1])));
  const tabled = idx.measures.filter((m) => m.status === `Tabled`);
  const frames = [
    { k: `This year so far`, big: `Council has taken up ${CX_LEG.count.toLocaleString(`en-US`)} items this year.`, small: `That is the count in Council's public record on ${cxmDate(CX_LEG.retrieved_at)}. ${idx.measures.length} are ordinances or resolutions. The rest are ceremonial resolutions, letters, and agenda items.` },
    { k: `How fast`, big: `Half passed within ${c.cityDays} days.`, small: `That counts the ${withFinal} proposals with a recorded final vote, from the day each was introduced.` },
  ];
  if (denied.length) frames.push({ k: `A reversal`, big: `${denied.length === 1 ? `One proposal` : `${denied.length} proposals`} passed after a committee recommended denial.`, small: `${cxmStatus(denied[0].m).flip} ${cxWords(cxShortTitle(denied[0].m.title), 16)} ${denied[0].m.file}.` });
  if (tabled.length) frames.push({ k: `Set aside`, big: `Council set aside ${cxmPl(tabled.length, `item`, `items`)} this year.`, small: `Tabled means put on hold. ` + tabled.map((m) => cxWords(cxShortTitle(m.title), 12)).join(` · `) });
  const vs = cxVoteSummary();
  frames.push({ k: `How members voted`, big: `${vs.votes} recorded votes name every member.`, small: `The City Record prints each member's vote when Council passes an ordinance or adopts a resolution. ${vs.split} of the ${vs.votes} had at least one nay. Each member's profile lists theirs. Absent is not a no.` });
  return { id: `council`, label: `Council`, ini: `CC`, name: `Cleveland City Council`, when: `15 members · 2026 so far`, deeper: { label: `See what is new in Council's record`, kind: `sheet`, sheet: `news`, panel: `news` }, source: { label: `Cleveland City Council's public record (Legistar)`, url: `https://cityofcleveland.legistar.com/Legislation.aspx` }, frames };
}
/* Not in the story rows for now (taken out Oct 5, 2026 at Brent's request). To bring it back, add cxmMayorStory(answers) to the list in cxmStories after cxmCouncilStory(). */
function cxmMayorStory(answers) {
  const admin = cxLegIndex().admin;
  const qs = CX_MAYOR_Q.map((x) => ({ x, w: Wm.find((z) => z.id === x[1]), r: CX_REASONS[x[1]] })).filter((o) => o.w);
  const frames = [{ k: `From the Mayor's office`, big: `${admin.items.length} requests sent to Council this year.`, small: `City departments send requests like contracts, grants, and project steps. Council still decides each one.` }];
  qs.filter((o) => o.r && o.r.points.length).slice(0, 2).forEach((o) => frames.push({ k: ``, big: `${o.w.title}.`, small: `${o.r.points[0]} ${o.x[0]}.` }));
  return { id: `mayor`, label: `Mayor`, ini: `JB`, portrait: admin.portrait, name: `Mayor Bibb's administration`, when: `What it sent to Council in 2026`, deeper: { label: `Read the profile of the Mayor`, kind: `profile`, seat: `mayor` }, source: { label: `Cleveland City Council's public record (Legistar)`, url: `https://cityofcleveland.legistar.com/Legislation.aspx` }, frames };
}
function cxmLevies() {
  return Um.filter((i) => Jm[i.number] && /\$\d+ per \$100,000/.test(Jm[i.number].yes)).map((i) => ({ issue: i, title: Jm[i.number].title, per: Number(Jm[i.number].yes.match(/\$(\d+) per \$100,000/)[1]), note: Jm[i.number].consider }));
}
function cxmBallotStory() {
  const days = cxmDaysTo(CXM_ELECTION);
  const county = Um.filter((i) => i.area === `COUNTY WIDE DISTRICT`).length;
  const i3 = Um.find((i) => i.number === 3);
  const nx = cxDatesNow().find((x) => x.state === `next` || x.state === `today`);
  const frames = [{ k: `Election Day`, big: days > 1 ? `${days} days. Tuesday, Nov. 3.` : days === 1 ? `Tomorrow. Tuesday, Nov. 3.` : days === 0 ? `Today is Election Day.` : `Election Day has passed.`, small: days < 0 ? `Official results come from the Cuyahoga County Board of Elections.` : `${Hm.length} contests on the county's candidate list and ${county} countywide issues, plus local issues that depend on your precinct.` }];
  if (nx && nx.iso !== CXM_ELECTION) frames.push({ k: nx.state === `today` ? `Today` : `Next deadline`, big: `${nx.text}: ${nx.state === `today` ? `today` : nx.label}.`, small: nx.state === `today` ? `${/[ap]\.m\./.test(nx.text) ? `All times are Eastern time. ` : ``}Check the exact closing time with the Board of Elections.` : `${nx.days === 1 ? `Tomorrow` : `${nx.days} days from today`}.${/[ap]\.m\./.test(nx.text) ? ` All times are Eastern time.` : ``}` });
  if (i3) frames.push({ k: `State Issue 3`, big: `${Xm(i3).title}.`, small: Xm(i3).no });
  const lv = cxmLevies();
  if (lv.length) frames.push({ k: `Levies`, big: `${cxmPl(lv.length, `county levy`, `county levies`)}. What would they cost you?`, small: `Short stories with the cost, what each pays for, and what people say. We do not tell you how to vote.`, type: `cta`, cta: `See the levy stories`, go: `levystories` });
  return { id: `ballot`, label: `Your ballot`, ini: days > 0 ? String(days) : `✓`, name: `Your ballot`, when: `Election Day is Tuesday, Nov. 3`, deeper: { label: `Open my ballot`, kind: `tab`, tab: `ballot`, panel: `ballot` }, source: { label: `Cuyahoga County Board of Elections`, url: `https://boe.cuyahogacounty.gov/` }, frames };
}
/* Register to vote: a short walkthrough, shown until Election Day and first in the row in the week of the deadline (Ohio closes registration 30 days before the election).
   It links to the official sites and says what this app cannot do: it cannot register anyone and it sends nothing about the person. The steps are Ohio's general rules
   written in plain words; a person has not yet read them against the Secretary of State's pages, and the last frame says so. */
const CX_REG_DATE = `2026-10-05`;
const CX_REG_SOS = { label: `Ohio Secretary of State: check or register to vote`, url: `https://olvr.ohiosos.gov/` };
const CX_REG_BOE = { label: `Cuyahoga County Board of Elections`, url: `https://boe.cuyahogacounty.gov/` };
function cxmRegisterStory() {
  const toDeadline = cxmDaysTo(CX_REG_DATE);
  if (cxmDaysTo(CXM_ELECTION) < 0) return null;
  const open = toDeadline >= 0;
  const frames = [
    { k: `Register to vote`, big: toDeadline === 0 ? `Today is the last day to register.` : toDeadline === 1 ? `Tomorrow is the last day to register.` : toDeadline > 1 ? `${toDeadline} days left to register.` : `The registration deadline has passed.`,
      small: open ? `Check the exact closing time with the Board of Elections.` : `Ohio closed registration on Oct. 5. Check where you stand.`,
      type: `link`, link: { label: open ? `Check or register now` : `Check my registration`, url: CX_REG_SOS.url } },
    { k: `Step 1`, big: `First, check if you are already registered.`, small: `If you moved or changed your name, update it.`, type: `link`, link: { label: `Check my registration`, url: CX_REG_SOS.url } },
  ];
  if (open) {
    frames.push({ k: `Who can register`, big: `You can register if you are a U.S. citizen, are 18 by Nov. 3, and have lived in Ohio 30 days.`, small: `Not sure you qualify? Ask the Board of Elections.`, src: CX_REG_SOS });
    frames.push({ k: `Step 2`, big: `Not registered, or you moved? Register online.`, small: `You need your date of birth, address, and Ohio driver license or state ID number. No Ohio ID? Use a paper form.`, type: `link`, link: { label: `Register online`, url: CX_REG_SOS.url } });
    frames.push({ k: `Paper form`, big: `Prefer paper? Mail it or bring it in.`, small: `A mailed form must be postmarked by the deadline.`, src: CX_REG_BOE });
  }
  frames.push({ k: `After the deadline`, big: `Missed it? Contact the Board of Elections.`, small: `Ohio has no same-day registration. A late form counts for the next election.`, type: `link`, link: { label: `Contact the Board of Elections`, url: CX_REG_BOE.url } });
  frames.push({ k: `Do it on the official site`, big: `We cannot register you. The official sites can.`, small: `We only link to them and send nothing about you. A person has not yet checked these steps against the official pages.`, src: CX_REG_SOS });
  return { id: `register`, label: `Register`, ini: `RV`, name: `Register to vote`, when: open ? `Deadline: Monday, Oct. 5` : `The deadline was Monday, Oct. 5`, source: CX_REG_BOE, frames };
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
  if (b && b.ward !== n0.ward) frames.push({ k: `Your ward`, big: `${hood} and Ward ${b.ward}: it's complicated.`, small: `${Math.round(b.share * 100)}% of ${hood} was Ward ${b.ward} on the 2014 map, used through 2025.` });
  else frames.push({ k: `Your ward`, big: `${hood} and Ward ${n0.ward}: still together.`, small: `The ward number stayed the same when the map changed from 17 wards to 15.` });
  frames.push({ k: `The new map`, big: `${Math.round(n0.share * 100)}% of ${hood} is now Ward ${n0.ward}.`, small: `${now.slice(1).map((r) => `${Math.round(r.share * 100)}% Ward ${r.ward}`).join(`, `)}${now.length > 1 ? `. ` : ``}Shares are by land area, not by how many people live there.` });
  const m14 = b ? cxPlMember(`wards2014`, b.ward).trim() : ``, m26 = cxPlMember(`wards2026`, n0.ward).trim();
  const same = m14 && m26 && cxmSamePerson(m14, m26);
  frames.push({ k: `What changed`, big: same && b.ward !== n0.ward ? `Same council member, new ward number.` : same ? `Same council member.` : `A different council member now.`, small: `The city's 2014 map file lists ${m14 || `no member`} for Ward ${b ? b.ward : `?`}; the 2026 file lists ${m26} for Ward ${n0.ward}.`, type: `cta`, cta: `Open My place`, go: `place` });
  return { id: `hood`, label: hood.length > 11 ? `${hood.slice(0, 10)}…` : hood, ini: cxmInitials(hood.replace(/[-.]/g, ` `)), name: hood, when: `Your neighborhood`, deeper: { label: `Open My place`, kind: `tab`, tab: `place`, panel: `place` }, source: { label: `City of Cleveland ward maps (2014 and 2026), from the city's open data` }, frames };
}
function cxmStories(home, answers) {
  return [home?.ward ? cxmWardStory(home.ward, answers) : null, cxmCouncilStory(), cxmRegisterStory(), cxmBallotStory(), ...cxmLevyStories(), home?.hood ? cxmHoodStory(home.hood) : null].filter(Boolean);
}

/* ---------- desktop Stories page (sidebar: Stories) ---------- */
function cxStoryHome() {
  const w = /^ward-(\d+)$/.exec(CX_PLACE.v || ``);
  return w ? { hood: ``, ward: Number(w[1]) } : null;
}
function CX_StoryFrame({ fr: fr0, s, onGo, plain }) {
  const hv = useCxLevyHome();
  const fr = cxLevyView(fr0, hv);
  const m = fr.match ? cxmMatter(fr.match.file) : null;
  return (
    <>
      {fr.k ? <p className="cx-story-k">{fr.k}</p> : null}
      {fr.fig ? <p className="cx-story-fig">{fr.fig}</p> : null}
      <p className={`cx-story-big ${fr.q ? `q` : ``}`}>{cxTight(fr.big, !0)}</p>
      <p className="cx-story-small">{cxTight(fr.small)}</p>
      {fr.src ? <CxSource source={fr.src} cls="cx-story-src2" /> : null}
      {fr.type === `home` && !plain && <CxLevyPad />}
      {fr.type === `more` && <CxLevyMore n={Number(String(s.id).replace(`levy-`, ``))} />}
      {fr.type === `react` && (
        <div className="cx-story-act">
          <p><strong>{fr.small}</strong></p>
          <button type="button" className="cx-story-btn" onClick={() => CX_NAV.panel(`constellation`)}>Think it over in My constellation <CXI.Arrow size={14} /></button>
          {m && <a className="cx-story-link" href={m.url} target="_blank" rel="noreferrer">Read the record, file {m.file} (opens in a new tab)</a>}
        </div>
      )}
      {fr.type === `link` && fr.link && <div className="cx-story-act"><a className="cx-story-btn" href={fr.link.url} target="_blank" rel="noreferrer">{fr.link.label}<span className="sp-ext"> (opens in a new tab)</span></a></div>}
      {fr.type === `cta` && <div className="cx-story-act"><button type="button" className="cx-story-btn" onClick={() => (fr.go === `levystories` && onGo ? onGo(`levy-10`) : CX_NAV.panel(fr.go === `place` ? `place` : fr.go === `levies` ? `levies` : `ballot`))}>{fr.go === `place` ? `Open Who decides here?` : fr.go === `levies` ? `See the levies` : fr.go === `levystories` ? fr.cta : `Open the voter guide`} <CXI.Arrow size={14} /></button></div>}
      <CxSource source={s.source} cls="cx-story-src" />
    </>
  );
}
const CX_STORY_POS = { id: null, f: 0 };  // where the desktop reader was, so coming back from Go deeper lands in the same place
function cxGoDeeper(d) {
  if (d.kind === `profile`) cxOpenProfile(d.seat);
  else CX_NAV.panel(d.panel);
}
function CX_Stories() {
  const stories = u.useMemo(() => cxmStories(cxStoryHome(), {}), []);
  const start = Math.max(0, stories.findIndex((x) => x.id === CX_STORY_POS.id));
  const [i, setI] = u.useState(start);
  const [f, setF] = u.useState(start >= 0 && CX_STORY_POS.id ? Math.min(CX_STORY_POS.f, stories[start].frames.length - 1) : 0);
  const [text, setText] = u.useState(!1);
  const s = stories[i];
  const fr = s.frames[Math.min(f, s.frames.length - 1)];
  const lastFrame = f === s.frames.length - 1;
  u.useEffect(() => { CX_STORY_POS.id = s.id; CX_STORY_POS.f = f; }, [s.id, f]);
  const pick = (n) => { setI(n); setF(0); };
  const next = () => (!lastFrame ? setF(f + 1) : i < stories.length - 1 ? pick(i + 1) : null);
  const prev = () => (f > 0 ? setF(f - 1) : i > 0 ? (setI(i - 1), setF(stories[i - 1].frames.length - 1)) : null);
  const onKey = (e) => {
    if (e.target.closest && e.target.closest(`a, select, input, textarea`)) return;
    if (e.key === `ArrowRight`) { e.preventDefault(); next(); }
    else if (e.key === `ArrowLeft`) { e.preventDefault(); prev(); }
  };
  return (
    <section className="cx-stories" aria-labelledby="cx-stories-h">
      <h1 id="cx-stories-h">Stories</h1>
      <p className="cx-stories-lede">Short, plain stories made from official records. Pick one, then use the Next button or the arrow keys.{!cxStoryHome() ? ` Choose your ward in Who decides here? to add a story about your own council member.` : ``}</p>
      <div className="cx-stories-pick" role="group" aria-label="Choose a story">
        {stories.map((x, n) => (
          <button key={x.id} type="button" className={n === i ? `on` : ``} aria-current={n === i ? `true` : undefined} onClick={() => pick(n)}>
            <span className="cx-stories-ring">{x.portrait ? <img src={cxmAsset(x.portrait)} alt="" /> : <span>{x.ini}</span>}</span>
            <span>{x.label}</span>
          </button>
        ))}
      </div>
      <div className="cx-story-reader" role="region" aria-label={`${s.name} story`} onKeyDown={onKey}>
        <div className="cx-story-head"><strong>{s.name}</strong><span>{s.when}</span></div>
        {!text && (
          <>
            <div className="cx-story-body" aria-live="polite" aria-atomic="true"><CX_StoryFrame key={`${i}-${f}`} fr={fr} s={s} onGo={(id) => { const n = stories.findIndex((x) => x.id === id); if (n >= 0) pick(n); }} /></div>
            {lastFrame && s.deeper && <div className="cx-story-act"><button type="button" className="cx-story-btn" onClick={() => cxGoDeeper(s.deeper)}>{s.deeper.label} <CXI.Arrow size={14} /></button></div>}
            <div className="cx-story-nav">
              <button type="button" className="cx-story-btn alt" onClick={prev} disabled={i === 0 && f === 0}>Back</button>
              <span className="cx-story-count">Step {f + 1} of {s.frames.length}</span>
              <button type="button" className="cx-story-btn" onClick={next} disabled={lastFrame && i === stories.length - 1}>{lastFrame && i < stories.length - 1 ? `Next story` : `Next`}</button>
            </div>
          </>
        )}
        {text && (
          <ol className="cx-story-all">{s.frames.map((x, n) => <li key={n}><CX_StoryFrame fr={x} s={{ ...s, source: null }} plain /></li>)}</ol>
        )}
        {text && <CxSource source={s.source} cls="cx-story-src" />}
        <button type="button" className="cx-link-button" aria-pressed={text} onClick={() => setText(!text)}>{text ? `Show one step at a time` : `Read this story as text`}</button>
      </div>
    </section>
  );
}
