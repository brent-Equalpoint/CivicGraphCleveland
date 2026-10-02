/* Spanish (and any later language) for the whole app, desktop and phone.

   How it works. The app is written in English and is not changed. When the language is Spanish, this file walks the page and swaps each
   piece of text for the Spanish in a reviewed dictionary (data/i18n/es.json, built into the app), and keeps doing so as the page changes.
   English is never touched: choosing English puts every original word back.

   What the dictionary holds.
     exact     "Settings" -> "Ajustes". The English must match the text on screen after extra spaces are tidied.
     masked    The same, for sentences built around data. The varying part is written as a placeholder:
                 {n} a number (3, 1,353, 4.5)     {$} money ($20,000)     {f} a file number (1183-2026)     {d} a date (Oct 5, September 21, 2026)
                 {t} a clock time (3:45 p.m.)     {*} any other text, such as a name
               The Spanish uses the same placeholders and they are filled back in, so "{n} days until Election Day" can become
               "Faltan {n} días para el Día de las Elecciones". Dates and times are converted to Spanish form.
     keep      Text that must stay as it is (names, official titles, ordinance text). It is marked lang="en" so a screen reader uses an English voice.
   Anything with no entry stays English and is marked lang="en", which also makes the crawl in scripts/i18n/ list exactly what is untranslated.

   Rules kept: only text nodes and a few attributes are changed, never the page's structure, so the page keeps working as it was built.
   Nothing about the reader goes anywhere: the choice is kept in this browser only. */

const CX_I18N = {
  lang: `en`, dict: null, exact: null, masked: null, pats: null, keep: null,
  orig: new WeakMap(),      // text node or element attribute -> the English it had
  mine: new WeakMap(),      // the Spanish this file wrote there, so a change by the page is told apart from our own
  attrOrig: new WeakMap(),
  obs: null, queue: new Set(), timer: 0, depth: 0, stats: { done: 0, missed: new Map(), ctx: new Map() },
};
const CX_I18N_ATTRS = [`aria-label`, `placeholder`, `title`, `alt`, `aria-description`];
const CX_I18N_SKIP = /^(SCRIPT|STYLE|NOSCRIPT|CODE|PRE|TEXTAREA|CANVAS)$/;
const CX_MONTHS_ES = { Jan: `ene`, Feb: `feb`, Mar: `mar`, Apr: `abr`, May: `may`, Jun: `jun`, Jul: `jul`, Aug: `ago`, Sep: `sep`, Sept: `sep`, Oct: `oct`, Nov: `nov`, Dec: `dic` };
const CX_MONTHS_ES_LONG = { January: `enero`, February: `febrero`, March: `marzo`, April: `abril`, May: `mayo`, June: `junio`, July: `julio`, August: `agosto`, September: `septiembre`, October: `octubre`, November: `noviembre`, December: `diciembre` };
const CX_DAYS_ES = { Monday: `lunes`, Tuesday: `martes`, Wednesday: `miércoles`, Thursday: `jueves`, Friday: `viernes`, Saturday: `sábado`, Sunday: `domingo` };
const CX_MON_RX = `(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\\.?`;
const CX_MONL_RX = `(?:January|February|March|April|May|June|July|August|September|October|November|December)`;
const CX_DATE_RX = `(?:${CX_MONL_RX} \\d{1,2}(?:, \\d{4})?|${CX_MON_RX} \\d{1,2}(?:, \\d{4})?)`;
const CX_TIME_RX = `\\d{1,2}:\\d{2} ?[ap]\\.m\\.`;
const CX_MASK_KEYS = [`d`, `t`, `$`, `f`, `n`];
const CX_MASK_RX = new RegExp(String.raw`(${CX_DATE_RX})|(${CX_TIME_RX})|(\$ ?\d[\d,]*(?:\.\d+)?)|(\d{1,5}-\d{4})|(\d[\d,]*(?:\.\d+)?)`, `g`);
const CX_TOKENS = [[`f`, `\\d{1,5}-\\d{4}`], [`$`, `\\$ ?\\d[\\d,]*(?:\\.\\d+)?`], [`d`, CX_DATE_RX], [`t`, CX_TIME_RX], [`n`, `\\d[\\d,]*(?:\\.\\d+)?`]];

/* Spanish forms of a captured date, time, or number */
function cxI18nDate(s) {
  let m = s.match(/^(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2})(?:, (\d{4}))?$/);
  if (m) return `${m[2]} de ${CX_MONTHS_ES_LONG[m[1]]}${m[3] ? ` de ${m[3]}` : ``}`;
  m = s.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\.? (\d{1,2})(?:, (\d{4}))?$/);
  if (m) return `${m[2]} ${CX_MONTHS_ES[m[1]] || m[1].toLowerCase()}${m[3] ? ` ${m[3]}` : ``}`;
  return s;
}
function cxI18nTime(s) { return s.replace(/ ?a\.m\./, ` a. m.`).replace(/ ?p\.m\./, ` p. m.`); }

/* A pattern such as "{n} days until {*}" becomes a regular expression; its placeholders are remembered in order. */
function cxI18nCompile(en) {
  const names = [];
  const rx = en.split(/(\{[n$fdt*]\})/).map((part) => {
    const m = part.match(/^\{([n$fdt*])\}$/);
    if (!m) return part.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`);
    names.push(m[1]);
    if (m[1] === `*`) return `(.*?)`;
    return `(${CX_TOKENS.find((t) => t[0] === m[1])[1]})`;
  }).join(``);
  return { rx: new RegExp(`^${rx}$`), names };
}
function cxI18nFill(es, names, caps) {
  let i = 0;
  return es.replace(/\{([n$fdt*])\}/g, (m, k) => {
    const v = caps[i++];
    if (v == null) return m;
    if (k === `d`) return cxI18nDate(v);
    if (k === `t`) return cxI18nTime(v);
    if (k === `*`) { const t = cxI18nCap(v); return t == null ? v : t; }
    return v;
  });
}
/* Text the page dropped into a sentence (a date, a time, a status word, a whole phrase) in Spanish if the dictionary has it as it stands; otherwise null. */
function cxI18nCap(v) {
  const bare = v.trim();
  if (!bare) return null;
  if (new RegExp(`^${CX_DATE_RX}$`).test(bare)) return v.replace(bare, cxI18nDate(bare));
  if (new RegExp(`^${CX_TIME_RX}$`).test(bare)) return v.replace(bare, cxI18nTime(bare));
  if (CX_I18N.depth < 3) {   // the dropped-in text may itself be a sentence the dictionary knows ("Safety Committee recommended approval")
    CX_I18N.depth++;
    try { const hit = cxI18nText(bare); if (hit != null) return v.replace(bare, hit); } finally { CX_I18N.depth--; }
  }
  const w = v.replace(/\bWards? (\d+)(?:, (\d+))?(?: and (\d+))?/g, (m0) => m0.replace(/^Wards\b/, `Distritos`).replace(/^Ward\b/, `Distrito`));
  return w !== v ? w : null;
}
function cxI18nLoad(dict) {
  const d = dict || {};
  CX_I18N.dict = d;
  CX_I18N.exact = new Map(Object.entries(d.exact || {}));
  CX_I18N.keep = new Set(d.keep || []);
  const all = Object.entries(d.masked || {});
  CX_I18N.maskedMap = new Map(all.filter(([en]) => !en.includes(`{*}`)));   // typed placeholders only: looked up directly
  // a pattern whose key starts with ~ only applies if at least one inserted part is something the dictionary can translate, so it cannot swallow other text
  CX_I18N.pats = all.filter(([en]) => en.includes(`{*}`)).map(([key, es]) => { const guard = key.startsWith(`~`); const en = guard ? key.slice(1) : key; return { en, es, guard, anchor: en.split(/\{[^}]+\}/).sort((a, b) => b.length - a.length)[0], ...cxI18nCompile(en) }; });
  // the more literal text a pattern has, the earlier it is tried
  CX_I18N.pats.sort((a, b) => b.en.replace(/\{[^}]+\}/g, ``).length - a.en.replace(/\{[^}]+\}/g, ``).length);
}

/* The Spanish for one string, or null if the dictionary has none. Leading and trailing spaces are kept. */
function cxI18nText(en) {
  if (!CX_I18N.exact) return null;
  const lead = en.match(/^\s*/)[0], trail = en.match(/\s*$/)[0];
  const core = en.slice(lead.length, en.length - trail.length).replace(/\s+/g, ` `);
  if (!core) return null;
  let es = CX_I18N.exact.get(core);
  if (es == null && CX_I18N.keep.has(core)) return null;
  if (es == null && CX_I18N.maskedMap.size) {
    const caps = [];
    const key = core.replace(CX_MASK_RX, (...a) => { const g = a.slice(1, 6); const i = g.findIndex((x) => x != null); caps.push(g[i]); return `{${CX_MASK_KEYS[i]}}`; });
    if (caps.length) { const hit = CX_I18N.maskedMap.get(key); if (hit != null) es = cxI18nFill(hit, [], caps); }
  }
  if (es == null) {
    for (const p of CX_I18N.pats) {
      if (p.anchor.length > 3 && !core.includes(p.anchor)) continue;
      const m = core.match(p.rx);
      if (!m) continue;
      if (p.guard && !p.names.some((k, i) => k === `*` && cxI18nCap(m[i + 1]) != null)) continue;
      es = cxI18nFill(p.es, p.names, m.slice(1)); break;
    }
  }
  if (es == null) {  // a bare date, time, or number is only converted
    if (new RegExp(`^${CX_DATE_RX}$`).test(core)) es = cxI18nDate(core);
    else if (new RegExp(`^${CX_TIME_RX}$`).test(core)) es = cxI18nTime(core);
    else {  // "Tuesday, November 3, 2026" and the like
      const wd = core.match(new RegExp(`^(${Object.keys(CX_DAYS_ES).join(`|`)}),? (${CX_DATE_RX})$`));
      if (wd) es = `${CX_DAYS_ES[wd[1]]} ${cxI18nDate(wd[2])}`;
    }
  }
  if (es != null) es = es.replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g, (m, mo, d, y) => (+mo >= 1 && +mo <= 12 && +d <= 31 ? `${+d} de ${Object.values(CX_MONTHS_ES_LONG)[+mo - 1]} de ${y.length === 2 ? `20${y}` : y}` : m));   // 1/3/29 is January 3 in the source, so say so
  return es == null ? null : lead + es + trail;
}
/* Does this text have English words in it, so that it is worth marking and listing? Numbers, symbols, and single capitalized words (names) do not. */
function cxI18nHasEnglish(s) {
  const words = s.match(/[A-Za-z][A-Za-z'’-]+/g) || [];
  return words.length >= 2 || (words.length === 1 && /^[a-z]/.test(words[0]) && words[0].length > 3);
}

/* ---------- whole sentences with a bold word or a link in them ----------
   A paragraph such as  The person who writes a proposal is the <strong>lead</strong>.  reaches the page as several pieces of text around
   an element. Translating each piece alone cannot get the word order right, so an element whose children are text and simple inline
   elements (bold, a link, a span with only text) is first looked up as one sentence, with each inline element written as <1>...</1>,
   <2>...</2>, in order. If the dictionary has that sentence, its Spanish is shared out to the same text nodes, keeping the page's elements
   exactly as they were. If not, the pieces are translated one by one as before. */
const CX_INLINE_TAG = /^(STRONG|B|EM|I|A|SPAN|SMALL|MARK|U|SUP|SUB|ABBR|TIME|CITE|KBD)$/;
function cxI18nOrigOf(n) { return CX_I18N.mine.get(n) === n.nodeValue && CX_I18N.orig.has(n) ? CX_I18N.orig.get(n) : n.nodeValue; }
function cxI18nRichParse(el) {
  let hasText = !1, hasEl = !1, key = ``;
  const tags = [];
  for (const c of el.childNodes) {
    if (c.nodeType === 3) { const v = cxI18nOrigOf(c); key += v; if (/[A-Za-z]/.test(v)) hasText = !0; }
    else if (c.nodeType === 1) {
      if (!CX_INLINE_TAG.test(c.tagName) || c.hasAttribute(`data-no-translate`) || c.childNodes.length !== 1 || c.firstChild.nodeType !== 3) return null;
      tags.push(c); key += `<${tags.length}>${cxI18nOrigOf(c.firstChild)}</${tags.length}>`; hasEl = !0;
    } else if (c.nodeType !== 8) return null;
  }
  return hasText && hasEl ? { key: key.replace(/\s+/g, ` `).trim(), tags } : null;
}
function cxI18nRich(el) {
  const parsed = cxI18nRichParse(el);
  if (!parsed) return !1;
  const es = cxI18nText(parsed.key);
  if (es == null || es === parsed.key) return !1;
  // split the Spanish into the gaps between tags and the text inside each tag
  const gaps = [], inner = {};
  let rest = es, m;
  while ((m = rest.match(/^([\s\S]*?)<(\d+)>([\s\S]*?)<\/\2>/))) { gaps.push(m[1]); inner[m[2]] = m[3]; rest = rest.slice(m[0].length); }
  gaps.push(rest);
  const n = parsed.tags.length;
  if (Object.keys(inner).length !== n || gaps.length !== n + 1 || !parsed.tags.every((_, i) => inner[i + 1] != null)) return !1;
  // the order of elements on the page cannot change, so the tags must come in order 1, 2, 3 ...
  const order = [...es.matchAll(/<(\d+)>/g)].map((x) => +x[1]);
  if (order.some((v, i) => v !== i + 1)) return !1;
  // gap g goes to the first text node of the run of text nodes before element g (the last gap, after the last element)
  let g = 0, runStart = !0;
  for (const c of el.childNodes) {
    if (c.nodeType === 3) {
      const old = cxI18nOrigOf(c);
      CX_I18N.orig.set(c, old);
      const val = runStart ? gaps[g] : ``;
      CX_I18N.mine.set(c, val); c.nodeValue = val; runStart = !1;
    } else if (c.nodeType === 1) {
      const idx = parsed.tags.indexOf(c);
      CX_I18N.orig.set(c.firstChild, cxI18nOrigOf(c.firstChild));
      CX_I18N.mine.set(c.firstChild, inner[idx + 1]); c.firstChild.nodeValue = inner[idx + 1];
      g = idx + 1; runStart = !0;
    }
  }
  el.setAttribute(`data-cx-rich`, ``);
  CX_I18N.stats.done++;
  return !0;
}

function cxI18nNode(n) {
  const host = n.parentElement && (n.parentElement.hasAttribute(`data-cx-rich`) ? n.parentElement : n.parentElement.parentElement && n.parentElement.parentElement.hasAttribute(`data-cx-rich`) ? n.parentElement.parentElement : null);
  if (host && CX_I18N.lang === `es`) { if (CX_I18N.mine.get(n) !== n.nodeValue) cxI18nSchedule(host); if (CX_I18N.mine.has(n)) return; }
  const prev = CX_I18N.orig.get(n);
  const cur = n.nodeValue;
  if (prev != null && CX_I18N.mine.get(n) === cur) return;          // our own Spanish, unchanged
  const en = cur;                                                     // new text from the page
  if (!en || !en.trim()) return;
  const p = n.parentElement;
  if (!p || CX_I18N_SKIP.test(p.tagName) || p.closest(`[data-no-translate]`)) return;
  const es = CX_I18N.lang === `es` ? cxI18nText(en) : null;
  CX_I18N.orig.set(n, en);
  if (es != null && es !== en) {
    CX_I18N.mine.set(n, es); n.nodeValue = es; CX_I18N.stats.done++;
    if (p.getAttribute(`lang`) === `en` && p.hasAttribute(`data-cx-auto-en`)) { p.removeAttribute(`lang`); p.removeAttribute(`data-cx-auto-en`); }
  } else {
    CX_I18N.mine.delete(n);
    const kept = CX_I18N.lang === `es` && CX_I18N.keep && CX_I18N.keep.has(en.trim().replace(/\s+/g, ` `));
    if (kept) {                                                       // English on purpose (a name, an official title): a phrase is marked English for a screen reader, and it is not a gap
      if (en.trim().split(/\s+/).length >= 4 && !p.hasAttribute(`lang`)) { p.setAttribute(`lang`, `en`); p.setAttribute(`data-cx-auto-en`, ``); }
    } else if (CX_I18N.lang === `es` && cxI18nHasEnglish(en)) {      // left in English by a gap: say so to a screen reader, and list it
      if (!p.hasAttribute(`lang`)) { p.setAttribute(`lang`, `en`); p.setAttribute(`data-cx-auto-en`, ``); }
      const k = en.trim().replace(/\s+/g, ` `);
      CX_I18N.stats.missed.set(k, (CX_I18N.stats.missed.get(k) || 0) + 1);
      if (!CX_I18N.stats.ctx.has(k)) CX_I18N.stats.ctx.set(k, (p.parentElement || p).textContent.replace(/\s+/g, ` `).trim().slice(0, 220));
    }
  }
}
function cxI18nAttrs(el) {
  if (el.closest && el.closest(`[data-no-translate]`)) return;
  for (const a of CX_I18N_ATTRS) {
    const v = el.getAttribute && el.getAttribute(a);
    if (!v) continue;
    let rec = CX_I18N.attrOrig.get(el);
    if (!rec) { rec = {}; CX_I18N.attrOrig.set(el, rec); }
    if (rec[a] && rec[a].es === v) continue;
    const es = CX_I18N.lang === `es` ? cxI18nText(v) : null;
    rec[a] = { en: v, es };
    if (es != null && es !== v) el.setAttribute(a, es);
    else if (CX_I18N.lang === `es` && cxI18nHasEnglish(v)) { const k = v.trim().replace(/\s+/g, ` `); CX_I18N.stats.missed.set(`[${a}] ${k}`, (CX_I18N.stats.missed.get(`[${a}] ${k}`) || 0) + 1); }
  }
}
function cxI18nWalk(root) {
  if (!root) return;
  if (root.nodeType === 3) { cxI18nNode(root); return; }
  if (root.nodeType !== 1) return;
  if (CX_I18N_SKIP.test(root.tagName)) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null);
  let n = root;
  do {
    if (n.nodeType === 3) cxI18nNode(n);
    else if (n.nodeType === 1 && !CX_I18N_SKIP.test(n.tagName)) { cxI18nAttrs(n); if (CX_I18N.lang === `es`) cxI18nRich(n); }
  } while ((n = w.nextNode()));
}
function cxI18nFlush() {
  CX_I18N.timer = 0;
  const q = [...CX_I18N.queue]; CX_I18N.queue.clear();
  for (const x of q) if (x.isConnected !== false) cxI18nWalk(x);
  if (CX_I18N.lang === `es`) document.title = cxI18nText(CX_I18N.title || document.title) || document.title;
}
function cxI18nSchedule(x) {
  CX_I18N.queue.add(x);
  if (!CX_I18N.timer) CX_I18N.timer = setTimeout(cxI18nFlush, 30);
}
function cxI18nObserve() {
  if (CX_I18N.obs || typeof MutationObserver === `undefined`) return;
  CX_I18N.obs = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === `characterData`) cxI18nSchedule(m.target);
      else if (m.type === `attributes`) cxI18nSchedule(m.target);
      else m.addedNodes.forEach((a) => cxI18nSchedule(a));
    }
  });
  CX_I18N.obs.observe(document.body, { subtree: !0, childList: !0, characterData: !0, attributes: !0, attributeFilter: CX_I18N_ATTRS });
}
/* Put every original word back */
function cxI18nRestore() {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null);
  let n = w.currentNode;
  const nodes = [];
  while ((n = w.nextNode())) nodes.push(n);
  for (const x of nodes) {
    if (x.nodeType === 3) {
      const en = CX_I18N.orig.get(x);
      if (en != null && CX_I18N.mine.get(x) === x.nodeValue) x.nodeValue = en;
      CX_I18N.mine.delete(x);
    } else {
      const rec = CX_I18N.attrOrig.get(x);
      if (rec) for (const a of Object.keys(rec)) if (rec[a].es != null && x.getAttribute(a) === rec[a].es) x.setAttribute(a, rec[a].en);
      CX_I18N.attrOrig.delete(x);
      if (x.hasAttribute && x.hasAttribute(`data-cx-auto-en`)) { x.removeAttribute(`lang`); x.removeAttribute(`data-cx-auto-en`); }
      if (x.removeAttribute) x.removeAttribute(`data-cx-rich`);
    }
  }
}

/* The reader's choice, kept in this browser only */
function cxLangStored() { try { return localStorage.getItem(`cx-lang`) === `es` ? `es` : `en`; } catch { return `en`; } }
function cxLangDict() {
  const tag = typeof document !== `undefined` && document.getElementById(`cx-i18n-es`);
  if (tag) { try { return Promise.resolve(JSON.parse(tag.textContent)); } catch { return Promise.resolve(null); } }
  const web = typeof fetch === `function` && /^https?:$/.test(String(globalThis.location?.protocol || ``));
  return web ? fetch(`/i18n/es.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null);
}
const CX_LANG_LISTEN = new Set();
function cxSetLang(lang) {
  const next = lang === `es` ? `es` : `en`;
  try { localStorage.setItem(`cx-lang`, next); } catch {}
  const apply = () => {
    if (CX_I18N.lang === `es` && next === `en`) cxI18nRestore();
    CX_I18N.lang = next; CX_I18N.stats.missed.clear();
    document.documentElement.lang = next;
    if (next === `es`) { cxI18nObserve(); cxI18nWalk(document.body); cxI18nFlush(); }
    CX_LANG_LISTEN.forEach((f) => f(next));
  };
  if (next === `es` && !CX_I18N.dict) return cxLangDict().then((d) => { cxI18nLoad(d || { exact: {}, masked: {}, keep: [] }); CX_I18N.title = document.title; apply(); });
  apply();
  return Promise.resolve();
}
function useCxLang() {
  const [lang, setLang] = u.useState(CX_I18N.lang);
  // the language can change between this component's first draw and the moment it starts listening, so catch up once it does
  u.useEffect(() => { CX_LANG_LISTEN.add(setLang); setLang(CX_I18N.lang); return () => CX_LANG_LISTEN.delete(setLang); }, []);
  return [lang, cxSetLang];
}
/* Start in the saved language once the page has drawn */
function cxI18nBoot() {
  if (cxLangStored() === `es`) setTimeout(() => cxSetLang(`es`), 0);
}
/* For scripts/i18n/crawl.js only: with this flag in local storage, the crawl can ask which text had no Spanish. Nothing is sent anywhere. */
try { if (localStorage.getItem(`cx-i18n-debug`)) { globalThis.__cxI18n = CX_I18N; globalThis.__cxI18nText = cxI18nText; } } catch {}
cxI18nBoot();

/* ---------- the language buttons and the notice that Spanish is a draft ---------- */
/* One button that switches the language. It names the language it switches to, in that language. */
function CX_LangButton({ cls }) {
  const [lang, setLang] = useCxLang();
  const es = lang === `es`;
  return (
    <button type="button" className={cls || `cx-lang-btn`} data-no-translate lang={es ? `en` : `es`} aria-label={es ? `Switch to English` : `Cambiar a español`} onClick={() => setLang(es ? `en` : `es`)}>
      {es ? `English` : `Español`}
    </button>
  );
}
/* The language choice as two buttons, for Settings */
function CX_LangChoice() {
  const [lang, setLang] = useCxLang();
  return (
    <div className="cxm-seg" role="group" aria-label="Language / Idioma" data-no-translate>
      <button type="button" lang="en" aria-pressed={lang === `en`} className={lang === `en` ? `on` : ``} onClick={() => setLang(`en`)}>English</button>
      <button type="button" lang="es" aria-pressed={lang === `es`} className={lang === `es` ? `on` : ``} onClick={() => setLang(`es`)}>Español</button>
    </div>
  );
}
const CX_LANG_NOTE = { gone: !1 };
function CX_LangNotice() {
  const [lang] = useCxLang();
  const [gone, setGone] = u.useState(() => { try { return sessionStorage.getItem(`cx-es-note`) === `1`; } catch { return CX_LANG_NOTE.gone; } });
  if (lang !== `es` || gone) return null;
  const close = () => { CX_LANG_NOTE.gone = !0; try { sessionStorage.setItem(`cx-es-note`, `1`); } catch {} setGone(!0); };
  return (
    <div className="cx-notice" role="status" lang="es" data-no-translate>
      <span>Esta traducción es un borrador. Una persona todavía no la ha revisado. Los títulos y textos oficiales de las leyes y los registros siguen en inglés.</span>
      <button type="button" onClick={close}>Entendido</button>
    </div>
  );
}
