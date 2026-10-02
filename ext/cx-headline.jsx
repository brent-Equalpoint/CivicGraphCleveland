/* Short plain headlines for the feed cards (Today receipts, What's new), written by fixed rules from a record's official title.
   The card shows the headline; one tap opens the record with the whole official title. These are rules, not a person's reading:
   a headline may shorten and reorder the title's own words, and may add only the small template words listed in
   CX_HEADLINE_WORDS. It never adds a fact. scripts/test_headline.js checks that on every title in Council's record, and a title
   no rule fits gets its own first clause, not a guess. No JSX in this file, so that test can load it as it is. */

const CX_HEADLINE_WORDS = [`agreement`, `agreements`, `contract`, `contracts`, `renewal`, `with`, `grant`, `from`, `change`, `to`, `city`, `law`, `new`, `addition`, `repeal`, `of`, `approval`,
  `permit`, `objection`, `liquor`, `public`, `improvement`, `state`, `project`, `can`, `the`, `a`, `for`, `ordinance`, `section`, `sections`, `withdrawn`, `objection`, `union`, `and`, `in`, `on`, `others`];

function cxHeadClean(title) {
  let t = String(title == null ? `` : title).replace(/\uFFFD/g, `'`).replace(/\s+/g, ` `).replace(/^AN? (EMERGENCY )?(ORDINANCE|RESOLUTION)\s*/i, ``).replace(/^An emergency (ordinance|resolution)\s+/i, ``).replace(/^#\s*[\d-]+\.\s*/, ``).trim();
  if (t.length > 20 && t === t.toUpperCase()) t = t.toLowerCase();  // an all-capitals title is read in sentence case
  return cxHeadCap(t);
}
/* Sentences of a title, not splitting after an initial or an abbreviation ("Blaine A. Griffin", "Inc.", "No."). No regex lookbehind: older Safari cannot parse it. */
function cxHeadSentences(t) {
  const out = []; let start = 0; const rx = /\.\s+(?=[A-Z])/g; let h;
  while ((h = rx.exec(t))) {
    const before = t.slice(start, h.index);
    if (/^(?:[A-Z]|Inc|Co|Corp|Ltd|St|Ave|Dr|Jr|Sr|Mr|Mrs|Ms|No|vs|U\.S|C\.O)$/.test(before.split(` `).pop())) continue;
    out.push(before); start = h.index + h[0].length;
  }
  out.push(t.slice(start));
  return out.map((x) => x.trim()).filter(Boolean);
}
function cxHeadCap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function cxHeadWords(s) { return s.split(` `).filter(Boolean); }

const CX_HEAD_CONNECT = /^(to|for|in|on|with|from|by|at|through|located|providing|including|along|between|that|which|where|during|under|using|and|or|as|of|the|a|an)$/i;
const CX_HEAD_CUT_BEFORE = /^(to|for|in|on|with|from|by|at|through|located|providing|including|along|between|that|which|where|during|under|using|regarding|concerning|relating|presented|pursuant|following)$/i;

/* The first natural clause of s, at most max words, never cut inside a phrase. A clause ends at a semicolon or colon, or at a comma
   that follows at least four words and is not inside a number, a year, or a company name ("Inc."). If it is longer than max, it
   ends before the last connecting word (to, for, with, that...) that fits. It never ends on a connecting word. Returns "" if
   nothing fits, and the caller then keeps the whole title rather than cut it. */
function cxHeadClause(s, max) {
  let text = String(s || ``).replace(/\s+/g, ` `).trim();
  const trimmed = text.replace(/\s+and\s+(?:repealing|authorizing|declaring|expressing|amending|rescinding|appropriating|giving|providing\s+for)\b.*$/i, ``);
  if (cxHeadWords(trimmed).length >= 3) text = trimmed;  // a second action joined on with "and" is left for the full title
  if (!text) return ``;
  let cut = text;
  const rx = /[;:]|,(?=\s)(?!\s*(?:\d{4}\b|as\b|[A-Z]\d[A-Z]?\b|Inc\b|LLC\b|L\.L\.C|Ltd\b|Co\b|Corp\b|Jr\b|Sr\b|and\/or|or its))/g;
  let hit;
  while ((hit = rx.exec(text))) {
    if (hit[0] !== `,` || cxHeadWords(text.slice(0, hit.index)).length >= 4 || /^,\s+and\s+(?:\w+ing|to)\b/.test(text.slice(hit.index))) { cut = text.slice(0, hit.index); break; }
  }
  const tidy = (x) => { const w = cxHeadWords(x.replace(/[,\s]+$/, ``)); while (w.length && CX_HEAD_CONNECT.test(w[w.length - 1])) w.pop(); return w.join(` `).replace(/\.$/, (d) => (/\b(?:Inc|Co|Corp|Ltd|Jr|Sr)\.$/.test(w.join(` `)) ? d : ``)); };
  const w = cxHeadWords(cut);
  if (w.length <= max) return tidy(cut);
  for (let i = max; i >= 3; i--) if (CX_HEAD_CUT_BEFORE.test(w[i])) return tidy(w.slice(0, i).join(` `));
  return ``;
}

/* The name of an organization at the start of s: up to the first word that begins the next idea. */
function cxEntity(s) {
  let t = String(s || ``).replace(/\s+/g, ` `).trim();
  t = t.replace(/,?\s*(?:and\/or|or)\s+its\s+designee\b.*$/i, ``).replace(/\s+d\/?b\/?a\s+.*$/i, ``);
  const m = t.search(/\s(?:to|for|the|providing|in|as|at|by|that|which|located|whose|so|under|using)\s|[;:]|,(?!\s*(?:Inc|LLC|L\.L\.C|Ltd|Co|Corp)\b)/);
  const name = (m < 0 ? t : t.slice(0, m)).replace(/[,\s]+$/, ``);
  return /\b(?:Inc|Co|Corp|Ltd|Jr|Sr|L\.L\.C)\.$/.test(name) ? name : name.replace(/\.$/, ``);
}
function cxHeadPurpose(after, max) {
  const t = String(after || ``).replace(/^[,;\s]+/, ``).replace(/^(?:(?:and\/or|or)\s+(?:its|a)\s+(?:wholly-owned\s+subsidiary|designee|successor)[^,]*,?\s*)+/i, ``);
  const m = t.match(/^(?:to provide|providing|to|for the (?:public )?purpose of|for|in order to|relating to|so as to)\s+(.*)$/i);
  if (!m) return ``;
  const body = m[1].replace(/^the (?:public )?purpose of\s+/i, ``).replace(/\s(?:for|through|by|using|in order|so that|which|that|located)\s.*$/i, ``);
  const p = cxHeadClause(body, max || 9);
  return p && !/^(the|a|an)$/i.test(p) ? p : ``;
}
function cxHeadOfficial(prefix) {
  const t = prefix.replace(/^Authorizing\s+(?:the\s+)?/i, ``).replace(/\s+or\s+other\s+appropriate\s+\w+/i, ``).replace(/\s*(?:and\/or|or)\s+the\s+appropriate\s+\w+/i, ``).trim();
  const w = cxHeadWords(t);
  return w.length && w.length <= 7 ? cxHeadCap(t.replace(/^Mayor and the /, `Mayor and `)) : ``;
}

function cxHeadline(title) {
  const t = cxHeadClean(title);
  if (!t) return ``;
  let m;
  // "From <sender>. <subject>": lead with the subject and name the sender after it
  if (/^From\s/.test(t)) {
    let parts = cxHeadSentences(t);
    if (parts.length === 1) { const c = t.match(/^(From\s+.+?),\s+([A-Z]\w+ing\b.*)$/); if (c) parts = [c[1], c[2]]; }  // "From X, Designating ..." has a comma where a period would be
    const rest = parts.slice(1).filter((x) => !/^(City of Cleveland\b|In accordance|Pursuant)/i.test(x));
    const subject = rest.slice().sort((a, b) => cxHeadWords(b).length - cxHeadWords(a).length)[0];  // the longest line is the subject; a short one such as "Director of Senior Housing Development" is a role
    const sender = parts[0].replace(/^From\s+(?:the\s+)?/i, ``).split(`,`)[0].trim();
    if (subject && sender && cxHeadWords(sender).length <= 8) {
      const head = cxHeadline(subject);
      if (head && cxHeadWords(head).length <= 20) return `${head} (from ${sender})`;
    }
  }
  // ceremonial resolutions are already short
  if (/^(Condolences?|Congratulations|Recognition|Welcome|Commemorat\w+|Honor\w*)\s+Resolution\b/i.test(t)) return cxHeadClause(t, 18) || t;
  // Authorizing ... to enter into an agreement or contract with X ... (the agreement word must be followed directly by "with")
  if ((m = t.match(/^(Authorizing\b.*?)\s+to\s+enter\s+into\s+(?:an?\s+|one\s+or\s+more\s+|the\s+)?((?:[\w'-]+\s+){0,4}?)(agreements?|contracts?)(?:\s+without\s+competitive\s+bidding)?\s+with\s+(.+)$/i))) {
    const ent = cxEntity(m[4]);
    const lead = cxHeadCap((m[2] + m[3]).replace(/\s+/g, ` `).trim());
    const after = m[4].slice(m[4].indexOf(ent) + ent.length);
    const list = /^(?:,\s+(?!or\s+its|and\/or\s+its|Inc|LLC|L\.L\.C|Ltd|Co\b|Corp|Jr|Sr)(?:the\s+)?[A-Z]|\s+and\s+(?:the\s+)?[A-Z])/.test(after) && !/^(?:the\s+)?cities of/i.test(ent);
    const why = list ? `` : cxHeadPurpose(after, 9);
    if (ent && cxHeadWords(ent).length <= 9) return `${lead} with ${ent}${list ? ` and others` : ``}${why ? `: ${why}` : ``}`;
  }
  // a grant
  if ((m = t.match(/^Authorizing\b.*?\bto\s+(?:apply\s+for|co-sponsor|accept|submit\s+an\s+application\s+for)(?:\s+and\s+(?:accept|enter\s+into)[^,]*?)?\s+(?:an?\s+|the\s+)?(.*?\bgrant\b)(?:\s+from\s+(.+?))?(?=\s+(?:for|to|in|of)\s|,|;|$)(.*)$/i))) {
    const what = cxHeadCap(m[1].replace(/\s+/g, ` `));
    const why = cxHeadPurpose(m[3], 9) || (/^\s*(?:for|to)\s+/i.test(m[3]) ? `` : ``);
    if (cxHeadWords(what).length <= 6) return `${what}${m[2] ? ` from ${cxEntity(m[2])}` : ``}${why ? `: ${why}` : ``}`;
  }
  // renewing a contract
  if ((m = t.match(/^Authorizing\b.*?\bto\s+exercise\b.*?\boption\b.*?\brenew\s+(?:the\s+)?(?:an?\s+)?(?:[\w-]+\s+){0,2}?(contract|agreement)\b(?:\s+No\.\s*\S+)?\s+with\s+(.+)$/i))) {
    const ent = cxEntity(m[2]);
    const why = cxHeadPurpose(m[2].slice(m[2].indexOf(ent) + ent.length), 9);
    if (ent) return `${cxHeadCap(m[1])} renewal with ${ent}${why ? `: ${why}` : ``}`;
  }
  // changes to the city's laws
  if ((m = t.match(/^To\s+(amend|supplement|repeal|enact|authorize|enact new)\b\s+(.+)$/i)) && /\b(Codified Ordinances|Ordinance\s+(?:No\.\s*)?[\d-]+|Section)\b/i.test(t)) {
    const rel = t.match(/\b(?:relating to|to provide for|concerning|regarding)\s+(.+)$/i);
    const topic = rel ? cxHeadClause(rel[1].replace(/^(?:the|a|an)\s+/i, ``), 12) : ``;
    const verb = m[1].toLowerCase();
    const lead = verb === `repeal` ? `Repeal of city law` : verb === `supplement` || /enact/.test(verb) ? `New city law` : `Change to city law`;
    if (topic) return `${lead}: ${topic}`;
    const sec = t.match(/\bSections?\s+([\d.]+[a-z]?(?:\s*(?:,|and)\s*[\d.]+[a-z]?)*)/i);
    if (sec) return `${lead}: Section ${sec[1].replace(/\s+/g, ` `)}`;
  }
  // a permit
  if ((m = t.match(/^Consenting\s+(?:to\s+and\s+approving|and\s+approving)\s+the\s+issuance\s+of\s+an?\s+(.+)$/i)) || (m = t.match(/^Approving\s+the\s+issuance\s+of\s+an?\s+(.+)$/i))) {
    const p = cxHeadClause(m[1].replace(/^(?:permit|special event permit)\s+(?:for|to)\s+/i, `permit for `), 12);
    if (p) return cxHeadCap(p);
  }
  if ((m = t.match(/^(Objecting|Withdrawing\s+objection)\b(?:\s+to)?\s+(?:the\s+)?(?:issuance\s+of\s+)?(?:an?\s+|the\s+)?(.+)$/i))) {
    const what = cxHeadClause(m[2], 16);
    if (what) return `${/^Objecting/i.test(m[1]) ? `Objection to` : `Objection withdrawn:`} ${what}`;
  }
  if ((m = t.match(/^Determining\s+the\s+method\s+of\s+making\s+the\s+public\s+improvement\s+of\s+(.+)$/i))) {
    const p = cxHeadClause(m[1], 12);
    if (p) return `Public improvement: ${p}`;
  }
  if ((m = t.match(/^Giving\s+consent\s+of\s+the\s+City\s+of\s+Cleveland\s+to\s+the\s+Director\s+of\s+Transportation\s+of\s+the\s+State\s+of\s+Ohio\s+to\s+(.+)$/i))) {
    const p = cxHeadClause(m[1], 12);
    if (p) return `State project: ${p}`;
  }
  if ((m = t.match(/^Approving\s+the\s+(.+)$/i))) {
    const p = cxHeadClause(m[1], 14);
    if (p) return `Approval of the ${p}`;
  }
  // any other "Authorizing the Director ... to X": say who may do what
  if ((m = t.match(/^(Authorizing\b[^,;]*?)\s+to\s+(.+)$/i))) {
    const who = cxHeadOfficial(m[1]);
    const what = cxHeadClause(m[2], 12);
    if (who && what) return `${who} can ${what}`;
  }
  // everything else: the title's own first clause, uncut
  return cxHeadClause(t, 18) || cxHeadClause(t, 24) || t;
}
