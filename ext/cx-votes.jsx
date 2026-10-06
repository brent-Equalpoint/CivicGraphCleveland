/* Council roll calls, from the City Record (data/votes-2026.json, read by scripts/fetch_cityrecord.py).
   CX_VOTES is embedded by build.py in a compact form: members (full names), issues ([label, url]), f (the roll call on passage
   or adoption, by file number: [date, question, issue, codes]) and o (other recorded votes, such as laying a file on the table).
   Codes are one letter per member, in the order of `members`: y yea, n nay, a absent, r recused (printed "Recusal"), b abstain.
   An issue is [label, url, kind]: kind "cr" is a City Record issue; kind "lg" is a roll call read from Council's Legistar record because the City
   Record prints no names for that file (docs/source-notes-votes.md). x holds the reason a passed file has no names; d the votes where the two
   records differ. "How they voted" counts the City Record only; the Votes & actions lists (ext/cx-record.jsx) show every roll call with its source.
   Rules kept: receipts, not scores. Counts of what the record prints, never a percentage, a ranking, or "how often they agree".
   A vote is on one question. Absent and Recusal are not a no and not an abstention. A member with no entry has no record, not a no. */

const CX_VOTE_Q = [`Passage`, `Adoption`, `Laid on the table`];
const CX_VOTE_WORD = { y: `yea`, n: `nay`, a: `absent`, r: `recused`, b: `abstain` };
const CX_VOTE_INDEX = { v: null };
const CX_CITY_RECORD = `https://www.clevelandcitycouncil.gov/legislation-laws/city-record`;

function cxVoteIndex() {
  if (CX_VOTE_INDEX.v) return CX_VOTE_INDEX.v;
  const V = CX_VOTES;
  const rec = (file, r, o) => {
    const codes = o ? r[4] : r[3];
    const [date, q, iss] = o ? [r[1], r[2], r[3]] : [r[0], r[1], r[2]];
    const n = (c) => [...codes].filter((x) => x === c).length;
    return { file, date, question: CX_VOTE_Q[q], table: q === 2, issue: { label: V.issues[iss][0], url: V.issues[iss][1], kind: V.issues[iss][2] || `cr` }, codes, yea: n(`y`), nay: n(`n`), absent: n(`a`), recused: n(`r`), misprint: (o ? r[5] : r[4]) || null };
  };
  const main = Object.entries(V.f).map(([file, r]) => rec(file, r, !1));
  const other = V.o.map((r) => rec(r[0], r, !0));
  const byFile = new Map(main.map((r) => [r.file, r]));
  const slot = new Map(V.members.map((m, i) => [m, i]));
  CX_VOTE_INDEX.v = { main, other, all: [...main, ...other], byFile, slot, latest: [...main, ...other].map((r) => r.date).sort().pop() };
  return CX_VOTE_INDEX.v;
}
/* The roll call on a file's passage or adoption, or null. Who voted how is in .by(name). */
function cxVoteRecord(file) {
  const ix = cxVoteIndex();
  const r = ix.byFile.get(file);
  return r ? { ...r, by: (name) => (ix.slot.has(name) ? CX_VOTE_WORD[r.codes[ix.slot.get(name)]] : null) } : null;
}
function cxVoteOthers(file) {
  return cxVoteIndex().other.filter((r) => r.file === file);
}
/* Everything the record prints for one member, newest first. Files from before this year's record carry no title. */
function cxCouncilVotesOf(name) {
  const ix = cxVoteIndex();
  if (!ix.slot.has(name)) return [];
  const i = ix.slot.get(name);
  const m = new Map(CX_LEG.matters.map((x) => [x.file, x]));
  return ix.all.filter((r) => r.issue.kind !== `lg`).map((r) => ({ ...r, vote: CX_VOTE_WORD[r.codes[i]], m: m.get(r.file) || null }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.file < b.file ? -1 : 1));
}
function cxVoteCounts(list) {
  const own = list.filter((v) => !v.table);
  const c = (w) => own.filter((v) => v.vote === w).length;
  return { total: own.length, yea: c(`yea`), nay: c(`nay`), absent: c(`absent`), recused: c(`recused`) };
}
/* The Clerk's labels read "Record - Sept. 25, 2026" (and vary in punctuation); a link says what it opens. */
function cxIssueName(label) {
  return `City Record, ${String(label).replace(/^Record\s*-\s*/, ``).replace(/^([A-Za-z]+),\s+(\d)/, `$1 $2`)}`;
}
function cxVoteSummary() {
  const ix = cxVoteIndex();
  const main = ix.main.filter((r) => r.issue.kind !== `lg`);   // what the City Record prints; a roll call read from Legistar is shown on its record and lists
  const split = main.filter((r) => r.nay > 0);
  return { votes: main.length, split: split.length, latest: ix.latest, tabled: ix.other.filter((r) => r.table).length };
}
/* The City Record issues add up over the year; say how far the record runs. */
function cxVoteThrough() {
  const ix = cxVoteIndex();
  return ix.latest ? cxLongDate(ix.latest) : ``;
}

function CxVoteLine({ v, who }) {
  const title = v.m ? cxWords(cxShortTitle(v.m.title), 14) : null;
  return (
    <li>
      {cxLongDate(v.date)}. {v.m ? <a href={v.m.url} target="_blank" rel="noreferrer">{v.file}</a> : <>File {v.file}</>}
      {title ? <>: {title}{/[….]$/.test(title) ? `` : `.`}</> : <> (from before this year's record; no title is loaded).</>} {who ? `${who} voted ${v.vote}` : `Vote`} on {v.question.toLowerCase()}, {v.yea} yea and {v.nay} nay{v.absent ? `, ${v.absent} absent` : ``}.{` `}
      <a href={v.issue.url} target="_blank" rel="noreferrer">{cxIssueName(v.issue.label)}<span className="sp-ext"> (opens in a new tab)</span></a>
    </li>
  );
}

/* "How they voted" for one council member. Used by the desktop profile, the phone sheet, and Easy mode links to it. */
function CX_VotesSection({ person, first }) {
  const list = u.useMemo(() => (person ? cxCouncilVotesOf(person.name) : []), [person]);
  const c = cxVoteCounts(list);
  const nays = list.filter((v) => v.vote === `nay` && !v.table);
  const tabled = list.filter((v) => v.table);
  if (!person || !list.length) return <p>The City Record snapshot has no named vote for this seat. A missing record is not a no.</p>;
  return (
    <>
      <p>The City Record, Council's official weekly publication, prints how each member voted on a vote to pass an ordinance or adopt a resolution. This is what it prints for {first}, from {cxmPl(c.total, `vote`, `votes`)} so far this year (through the meeting of {cxVoteThrough()}).</p>
      <ul className="sp-counts">
        <li><strong>{c.yea}</strong> voted yea</li>
        <li><strong>{c.nay}</strong> voted nay</li>
        <li><strong>{c.absent}</strong> listed as absent</li>
        {c.recused > 0 && <li><strong>{c.recused}</strong> listed under Recusal</li>}
      </ul>
      <p className="sp-note">These are counts of what is printed, not grades. Each vote is on one question about one file. Absent is not a no and not an abstention. A vote to suspend the rules prints only a tally with no names, so it is not counted here.</p>
      {nays.length > 0 ? <details><summary>Votes where {first} voted nay ({nays.length})</summary><ul className="sp-list">{nays.map((v) => <CxVoteLine key={v.file + v.date} v={v} who={first} />)}</ul></details>
        : <p>{first} did not vote nay on any of these votes.</p>}
      <details><summary>Every vote printed for {first} ({list.length})</summary>
        <ul className="sp-list">{list.map((v) => <CxVoteLine key={v.file + v.date + v.question} v={v} who={first} />)}</ul>
        {tabled.length > 0 && <p className="sp-note">{cxmPl(tabled.length, `of these is a vote on laying a file on the table`, `of these are votes on laying a file on the table`)}. Those are listed but not counted above, because a yea on tabling is not a yea on the proposal.</p>}
      </details>
      <p className="sp-src">Source: <a href={CX_CITY_RECORD} target="_blank" rel="noreferrer">The City Record<span className="sp-ext"> (opens in a new tab)</span></a>, published weekly by the City Clerk, Clerk of Council. Pulled {cxShortDate(cxDayET(Date.parse(CX_VOTES.retrieved_at)))}. A person has not yet read the City Record's terms of use.</p>
    </>
  );
}

/* The roll call on one file, for a legislation screen: names by how they voted. Returns null when the record prints none. */
function CX_RollCall({ file }) {
  const r = cxVoteRecord(file);
  if (!r) return null;
  const names = (w) => CX_VOTES.members.filter((m) => r.by(m) === w);
  const row = (w, label) => (names(w).length ? <p className="cxm-fine"><strong>{label} ({names(w).length}):</strong> {names(w).join(`, `)}</p> : null);
  return (
    <div className="cx-rollcall">
      <h3 className="cxm-h3">How members voted</h3>
      <p className="cxm-fine">{cxLongDate(r.date)}, on {r.question.toLowerCase()}: {r.yea} yea, {r.nay} nay{r.absent ? `, ${r.absent} absent` : ``}.</p>
      {row(`yea`, `Yea`)}{row(`nay`, `Nay`)}{row(`absent`, `Absent`)}{row(`recused`, `Recusal`)}
      <p className="cxm-fine">From the <a href={r.issue.url} target="_blank" rel="noreferrer">{cxIssueName(r.issue.label)}<span className="sp-ext"> (opens in a new tab)</span></a> issue. Absent is not a no and not an abstention.{cxVoteOthers(file).length ? ` This file was also the subject of another recorded vote, on ${cxVoteOthers(file).map((o) => `${o.question.toLowerCase()} on ${cxLongDate(o.date)}`).join(`, `)}.` : ``}</p>
    </div>
  );
}

/* For a place page: which of its decisions have a recorded roll call, and which of those were not unanimous (with who voted nay). */
function cxPlaceVotes(items) {
  const withRoll = items.map((x) => ({ m: x.m, r: cxVoteRecord(x.m.file) })).filter((x) => x.r);
  const names = (r, w) => CX_VOTES.members.filter((m) => r.by(m) === w);
  const split = withRoll.filter((x) => x.r.nay > 0).map((x) => ({ ...x, nays: names(x.r, `nay`), absent: names(x.r, `absent`) }))
    .sort((a, b) => (a.r.date < b.r.date ? 1 : -1));
  return { withRoll, split };
}
function cxVoteSplitText(x) {
  return `${cxLongDate(x.r.date)}: ${x.r.yea} yea, ${x.r.nay} nay. Nay: ${x.nays.join(`, `)}.${x.absent.length ? ` Absent (not a no): ${x.absent.join(`, `)}.` : ``}`;
}
