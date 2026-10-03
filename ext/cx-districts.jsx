/* v5.17 Districts by address, on the device.
   A resident types a street address and sees their U.S. House, Ohio Senate, Ohio House, and County Council districts, their Cleveland
   ward, their city, and their school district. Nothing is sent anywhere and nothing is saved: the street list (data/districts-2026.json,
   built by scripts/fetch_districts.py from public records) is loaded into the page, the address is matched against it in memory, and the
   typed text lives only in this component until it is closed.
   The street list holds streets and house-number ranges, never people. A block where a district line crosses it lists both answers and
   says so. The page always says this is a guide and links to the Board of Elections.
   The street-name rules (cxDistNorm, cxDistCore) must match scripts/fetch_districts.py; scripts/test_districts.py checks both against
   scripts/fixtures/dist-norm.json. */

const CX_DIST = { data: null, loading: null };
function cxDistLoad() {
  if (CX_DIST.data) return Promise.resolve(CX_DIST.data);
  if (CX_DIST.loading) return CX_DIST.loading;
  CX_DIST.loading = (async () => {
    const tag = typeof document !== `undefined` && document.getElementById(`cx-districts-gz`);
    let text;
    if (tag) {   // the single file: compressed inside the page, opened with the browser's own decompressor
      if (typeof DecompressionStream === `undefined`) throw new Error(`browser`);
      const bin = atob(tag.textContent.trim()), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      text = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream(`gzip`))).text();
    } else {
      const r = await fetch(`/districts/districts-2026.json`);
      if (!r.ok) throw new Error(`fetch`);
      text = await r.text();
    }
    CX_DIST.data = JSON.parse(text);
    return CX_DIST.data;
  })().catch((e) => { CX_DIST.loading = null; throw e; });
  return CX_DIST.loading;
}

/* ---------- street names: the same rules as scripts/fetch_districts.py ---------- */
const CX_DIST_DIRS = { north: `n`, south: `s`, east: `e`, west: `w`, northeast: `ne`, northwest: `nw`, southeast: `se`, southwest: `sw` };
const CX_DIST_TYPES = { street: `st`, avenue: `ave`, av: `ave`, road: `rd`, boulevard: `blvd`, drive: `dr`, court: `ct`, place: `pl`, lane: `ln`, parkway: `pkwy`, terrace: `ter`, circle: `cir`, highway: `hwy`, trail: `trl`, square: `sq`, way: `way`, alley: `aly`, expressway: `expy`, turnpike: `tpke`, pike: `pike`, route: `rte`, freeway: `fwy`, plaza: `plz`, crossing: `xing`, heights: `hts`, center: `ctr`, park: `park` };
const CX_DIST_DIRSET = new Set(Object.values(CX_DIST_DIRS)), CX_DIST_TYPESET = new Set(Object.values(CX_DIST_TYPES));
function cxDistOrdinal(t) {
  const n = Number(t), m = n % 100;
  return t + (m >= 10 && m <= 20 ? `th` : { 1: `st`, 2: `nd`, 3: `rd` }[n % 10] || `th`);
}
function cxDistNorm(s) {
  const toks = String(s).toLowerCase().split(`&`).join(` and `).replace(/[.,#'’]/g, ` `).split(`-`).join(` `).split(/\s+/).filter(Boolean);
  return toks.map((t) => { t = CX_DIST_DIRS[t] || CX_DIST_TYPES[t] || t; return /^\d+$/.test(t) ? cxDistOrdinal(t) : t; }).join(` `);
}
function cxDistCore(key) {
  let t = key.split(` `);
  while (t.length > 1 && CX_DIST_DIRSET.has(t[0])) t = t.slice(1);
  if (t.length > 1 && CX_DIST_DIRSET.has(t[t.length - 1])) t = t.slice(0, -1);
  if (t.length > 1 && CX_DIST_TYPESET.has(t[t.length - 1])) t = t.slice(0, -1);
  return t.join(` `);
}

/* "1234 E 116th St, Apt 3, Cleveland, OH 44108" -> { number, street, zip } */
function cxDistParse(text) {
  let t = String(text).trim();
  const zm = t.match(/\b(\d{5})(?:-\d{4})?\s*$/);
  const zip = zm ? zm[1] : ``;
  if (zm) t = t.slice(0, zm.index).trim();
  t = t.replace(/[,\s]*\b(?:usa|united states)\b\s*$/i, ``).replace(/[,\s]*\b(?:oh|ohio)\b\s*$/i, ``).trim();
  const m = t.match(/^(\d+)(?:-?[A-Za-z](?=\s)|\s\d\/\d(?=\s))?\s+(.+)$/);
  if (!m) return { number: 0, street: ``, zip };
  let street = m[2].split(`,`)[0];
  street = street.replace(/\s*(?:\b(?:apt|apartment|unit|ste|suite|fl|floor|bldg|building|rm|room|lot)\b|#).*$/i, ``).trim();
  return { number: Number(m[1]), street, zip, rest: m[2] };
}
function cxDistTitle(key) {
  return key.split(` `).map((w) => (CX_DIST_DIRSET.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(` `);
}

/* ---------- the lookup ---------- */
function cxDistTupleIds(D, hits) {
  const ids = new Set();
  hits.forEach((h) => { const v = h.range[4]; (v >= 0 ? [v] : D.splits[-1 - v]).forEach((x) => ids.add(x)); });
  return [...ids].sort((a, b) => a - b);
}
function cxDistFind(D, text) {
  const q = cxDistParse(text);
  if (!q.number || !q.street) return { status: `badinput` };
  const typed = cxDistNorm(q.street);
  const toks = typed.split(` `);
  const matchRanges = (key) => (D.streets[key] || []).filter((r) => q.number >= r[0] && q.number <= r[1] && (r[2] === `B` || (r[2] === `E`) === (q.number % 2 === 0)));
  // the street ends at a street type (St, Ave, Rd...) and maybe a direction after it; what follows is a city or state. Try each possible end,
  // earliest first. Never drop words from a street that already matched by name, so a wrong street cannot be picked up by accident.
  const cuts = [];
  toks.forEach((w, i) => { if (i >= 1 && CX_DIST_TYPESET.has(w)) { cuts.push(i + 1); if (CX_DIST_DIRSET.has(toks[i + 1])) cuts.push(i + 2); } });
  if (!cuts.length) cuts.push(toks.length);
  for (const n of cuts) {
    const key = toks.slice(0, n).join(` `);
    let cands = D.streets[key] ? [key] : [];
    if (!cands.length) {
      const pool = D.cores[cxDistCore(key)] || [];
      const dir = CX_DIST_DIRSET.has(toks[0]) ? toks[0] : ``;
      const typ = CX_DIST_TYPESET.has(toks[n - 1]) ? toks[n - 1] : ``;
      cands = pool.filter((c) => (!dir || c.split(` `)[0] === dir) && (!typ || c.split(` `).includes(typ)));
      if (!cands.length && !typ) cands = pool;
    }
    let hits = [];
    cands.forEach((c) => matchRanges(c).forEach((r) => hits.push({ key: c, range: r })));
    if (q.zip && hits.some((h) => h.range[3] === q.zip)) hits = hits.filter((h) => h.range[3] === q.zip);
    if (!hits.length) continue;
    const keys = [...new Set(hits.map((h) => h.key))];
    if (keys.length > 1) {   // more than one street fits (E 116th St and W 116th St): ask which, unless every one gives the same answer
      const per = keys.map((k) => ({ key: k, ids: cxDistTupleIds(D, hits.filter((h) => h.key === k)) }));
      if (new Set(per.map((p) => p.ids.join(`,`))).size > 1) return { status: `pick`, choices: per.map((p) => ({ key: p.key, label: cxDistTitle(p.key), zips: [...new Set(hits.filter((h) => h.key === p.key).map((h) => h.range[3]))].filter(Boolean) })) };
    }
    const ids = cxDistTupleIds(D, hits);
    return { status: `ok`, number: q.number, street: cxDistTitle(keys[0]), zip: q.zip || hits[0].range[3] || ``, ids, boundary: ids.length > 1 };
  }
  return { status: `notfound` };
}
/* the answers as rows: a value, or "a or b" when the block is on a boundary */
function cxDistRows(D, res) {
  const T = res.ids.map((i) => D.tuples[i]);
  const col = (k, f) => [...new Set(T.map((t) => f(t[k])).filter((x) => x !== `` && x != null))];
  const num = (v) => (v ? String(Number(v)) : ``);
  return {
    congress: col(0, num), senate: col(1, num), house: col(2, num), council: col(3, num), ward: col(4, num),
    place: col(5, (v) => (v >= 0 ? D.places[v] : ``)), school: col(6, (v) => (v >= 0 ? D.schools[v] : ``)),
  };
}
const cxDistOr = (list) => list.join(` or `);

/* ---------- the finder ---------- */
function CX_DistrictFinder({ onUse, onClose, phone }) {
  const [text, setText] = u.useState(``);
  const [state, setState] = u.useState({ k: `ask` });
  const find = async (value) => {
    const v = value == null ? text : value;
    setState({ k: `loading` });
    let D;
    try { D = await cxDistLoad(); } catch { setState({ k: `error` }); return; }
    const res = cxDistFind(D, v);
    if (res.status === `ok`) setState({ k: `ok`, res, rows: cxDistRows(D, res), D });
    else setState({ k: res.status, res });
  };
  const again = () => { setText(``); setState({ k: `ask` }); };
  const submit = (e) => { e.preventDefault(); if (text.trim()) find(); };
  const boe = ah;   // the Board of Elections page for looking up voting information by address (set in the ballot code)
  if (state.k === `ok`) {
    const { res, rows } = state;
    const seat = rows.ward.length === 1 ? cxLegIndex().seats[Number(rows.ward[0]) - 1] : null;
    const onBallot = rows.council.length && rows.council.every((c) => $m.council.includes(String(c).padStart(2, `0`)));
    return (
      <div className="dist-body dist-rise" aria-live="polite">
        <span className="cxm-kicker">Your districts</span>
        <p className="cxm-story-big">{`${res.number} ${res.street}`}</p>
        {res.boundary && <p className="dist-edge">This block sits on a district line, so it shows both answers. Confirm yours with the Board of Elections.</p>}
        <dl className="dist-rows">
          <div><dt>U.S. House</dt><dd>{`District ${cxDistOr(rows.congress)}`}</dd></div>
          <div><dt>Ohio Senate</dt><dd>{`District ${cxDistOr(rows.senate)}`}</dd></div>
          <div><dt>Ohio House</dt><dd>{`District ${cxDistOr(rows.house)}`}</dd></div>
          {rows.council.length > 0 && <div><dt>County Council</dt><dd>{`District ${cxDistOr(rows.council)}`}<small>{onBallot ? `On the ballot this year` : `Not on the ballot this year`}</small></dd></div>}
          {rows.ward.length > 0 && <div><dt>Cleveland ward</dt><dd>{`Ward ${cxDistOr(rows.ward)}`}{seat && <small>{`Council member ${seat.name}`}</small>}</dd></div>}
          {rows.place.length > 0 && <div><dt>City or village</dt><dd>{cxDistOr(rows.place)}</dd></div>}
          {rows.school.length > 0 && <div><dt>School district</dt><dd>{cxDistOr(rows.school)}</dd></div>}
        </dl>
        <div className="dist-actions">
          {onUse && !res.boundary && <button type="button" className="cxm-btn" onClick={() => onUse(rows)}>Use these on my ballot</button>}
          <button type="button" className="cxm-btn2" onClick={again}>Try another address</button>
        </div>
        <p className="dist-fine">Not saved. Close this and it is gone. This is a guide made from public street and district records. Your registered address decides your ballot, so <a href={boe} target="_blank" rel="noreferrer">confirm it with the Board of Elections<span className="sp-ext"> (opens in a new tab)</span></a>.</p>
        <p className="dist-fine">Sources: U.S. Census Bureau street address ranges (2025) and legislative district maps, Cuyahoga County Council district map (2022 to 2032), City of Cleveland ward map.</p>
      </div>
    );
  }
  return (
    <form className="dist-body dist-rise" onSubmit={submit} autoComplete="off">
      <span className="cxm-kicker">Find my districts</span>
      <p className="cxm-story-big">{state.k === `notfound` ? `We could not find that address.` : state.k === `badinput` ? `Start with the house number.` : state.k === `error` ? `The street list did not load.` : state.k === `pick` ? `Which street?` : `Type your address.`}</p>
      <p className="cxm-story-small">
        {state.k === `notfound` ? `Check the spelling and add the ZIP code. Only Cuyahoga County addresses are covered. New streets and some apartment buildings may be missing.`
          : state.k === `badinput` ? `For example: 1234 E 116th St, or 601 Lakeside Ave 44114.`
          : state.k === `error` ? `Check your connection and try again. The street list loads only when you use this.`
          : state.k === `pick` ? `More than one street fits. Pick yours.`
          : `It stays on this device. Nothing is saved or sent.`}
      </p>
      {state.k === `pick` && (
        <div className="dist-picks" role="group" aria-label="Which street?">
          {state.res.choices.map((c) => <button key={c.key} type="button" className="cxm-btn2" onClick={() => find(`${cxDistParse(text).number} ${c.label}${c.zips[0] ? ` ${c.zips[0]}` : ``}`)}>{c.label}{c.zips.length ? ` · ${c.zips.join(`, `)}` : ``}</button>)}
        </div>
      )}
      <label className="dist-field">
        <span className="cxm-sr">Your address</span>
        <input type="text" inputMode="text" name="cx-find-districts" autoComplete="off" autoCorrect="off" autoCapitalize="words" spellCheck={false} placeholder="1234 E 116th St, Cleveland" value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="dist-actions">
        <button type="submit" className="cxm-btn" disabled={!text.trim() || state.k === `loading`}>{state.k === `loading` ? `Looking...` : `Find my districts`}</button>
      </div>
      <p className="dist-fine">Only Cuyahoga County. We match your address against a street list in this page, on this device.</p>
    </form>
  );
}

/* the desktop page and the shared pieces */
function CX_DistrictsPage() {
  return (
    <section className="sp lv dist-page" aria-labelledby="dist-h">
      <h1 id="dist-h">Find my districts</h1>
      <p className="sp-lede">Type your address and see your U.S. House, Ohio Senate, Ohio House, and County Council districts, your Cleveland ward, your city, and your school district. The address stays on this computer: nothing is saved, and nothing is sent.</p>
      <div className="dist-card"><CX_DistrictFinder /></div>
    </section>
  );
}
