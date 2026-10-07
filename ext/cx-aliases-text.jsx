/* Well known names that find a neighborhood in the place picker (docs/source-notes-aliases.md). Typing "Little Italy" finds University and says
   "Little Italy is part of University." The names are a short list in the source, never data: each row names one alias, the neighborhood the
   city's maps (data/geo-2026.json) call it, and the page of the City Planning Commission's plan that supports it. The words typed are
   matched on the device and never sent or put in a link. Only a neighborhood that the typed letters do not already find gets its alias line. */

/* ALIASES-TEXT-START
   Interpretive text: everything from here to ALIASES-TEXT-END. Each row pairs a well known name with the neighborhood that holds it, from the
   City Planning Commission's Connecting Cleveland 2020 Citywide Plan (the 2024 file, https://www.clevelandohio.gov/sites/clevelandohio/files/planning/Connecting%20Cleveland%202020%20CWP-%20FULL%20DOCUMENT%202024.pdf),
   read on Oct 7, 2026; the page, the words relied on, and the address check for each row are in docs/source-notes-aliases.md. A person reads each
   row against its page and then runs:
       python build.py --mark-aliases-reviewed "Your Name"
   Until then, and again after any change here, the line that says "{name} is part of {neighborhood}." carries a notice that a person has not
   reviewed these names. Rules: every neighborhood is spelled exactly as in data/geo-2026.json; a row needs its page; no dashes; "is part of" for
   every row. Weaker rows (the name appears only in passing, or the pairing rests on an address) are marked "weak" and the notes say why. The list is
   strict JSON (no trailing comma) so the tests and the browser check read it as it is. */
const CX_ALIASES = [
  {"alias": "Little Italy", "hood": "University", "page": 479, "weak": false},
  {"alias": "University Circle", "hood": "University", "page": 479, "weak": false},
  {"alias": "Gordon Square", "hood": "Detroit Shoreway", "page": 342, "weak": false},
  {"alias": "Warehouse District", "hood": "Downtown", "page": 384, "weak": false},
  {"alias": "Playhouse Square", "hood": "Downtown", "page": 384, "weak": false},
  {"alias": "Larchmere", "hood": "Buckeye-Shaker Square", "page": 453, "weak": false},
  {"alias": "Kamm's Corners", "hood": "Kamm's", "page": 304, "weak": false},
  {"alias": "Battery Park", "hood": "Detroit Shoreway", "page": 342, "weak": true},
  {"alias": "AsiaTown", "hood": "Goodrich-Kirtland Pk", "page": 390, "weak": true},
  {"alias": "Chinatown", "hood": "Goodrich-Kirtland Pk", "page": 392, "weak": true},
  {"alias": "Waterloo", "hood": "North Shore Collinwood", "page": 506, "weak": true}
];
/* ALIASES-TEXT-END */

/* ---------- pure: how typed letters are matched, and what the notice says ---------- */
/* letters only, lower case, no accents, apostrophes, periods, or hyphens: "Kamms", "kamm's", and "St.Clair" all compare the same */
function cxAliasFold(s) {
  return String(s == null ? `` : s).normalize(`NFD`).replace(/[̀-ͯ]/g, ``).toLowerCase().replace(/['’.\-]/g, ``).replace(/\s+/g, ` `).trim();
}
/* the neighborhoods whose names hold what was typed (the rule the picker has always had, with the folding above) */
function cxAliasNames(q, hoods) {
  const f = cxAliasFold(q);
  return f ? hoods.filter((h) => cxAliasFold(h).includes(f)) : hoods.slice();
}
/* the alias rows a typed word finds: at least three letters, and the start of the alias or of one of its words; a row is left out when its
   neighborhood is already found by name, so a name result never carries an alias line */
function cxAliasFind(q, hoods) {
  const f = cxAliasFold(q);
  if (f.length < 3) return [];
  const byName = new Set(cxAliasNames(q, hoods));
  const seen = new Set();
  return CX_ALIASES.filter((a) => {
    if (!hoods.includes(a.hood) || byName.has(a.hood)) return false;
    const w = cxAliasFold(a.alias);
    if (!(w.startsWith(f) || w.split(` `).some((x) => x.startsWith(f)) || f.startsWith(w))) return false;
    if (seen.has(a.alias)) return false;
    seen.add(a.alias);
    return true;
  });
}
function cxAliasReview() {
  const r = typeof CX_ALIASES_REVIEW !== `undefined` ? CX_ALIASES_REVIEW : { ok: !1 };
  return r.ok ? `These names were read against the City Planning Commission's plan by ${r.by} on ${cxLongDate(r.checked)}.` : `A person has not reviewed these names.`;
}
