#!/usr/bin/env node
/* List every piece of English the app can show, from the real source, for translating and for checking coverage.

   node scripts/i18n/inventory.js          writes i18n/work/inventory.json

   Reads ext/*.jsx (our code) and build/work/CivicAtlas.pretty.js (the compiled Sep 23 desktop app, produced by build.py), parses them,
   and collects string literals, template literals, JSX text, and whole sentences. A template such as `Ward ${w} casino revenue` becomes the
   pattern "Ward {*} casino revenue". A paragraph made of text and simple inline elements (a bold word, a link) is also listed as ONE sentence
   with the elements written <1>...</1>, <2>...</2>, because translating its pieces alone cannot get the word order right. Code that is not
   text (CSS classes, ids, keys, URLs, regular expressions) is left out by where it sits in the code and by what it looks like. Each entry keeps
   the file, line, and property it came from, so a translator has context. Nothing here is translated. Text from official records (titles,
   ordinance text, statements) is not in the source and is not listed. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const babel = require('prettier/plugins/babel');

const SKIP_KEYS = new Set(['className', 'class', 'id', 'key', 'type', 'role', 'href', 'src', 'rel', 'target', 'd', 'viewBox', 'fill', 'stroke', 'style', 'htmlFor', 'for', 'name', 'value', 'data-node', 'data-room', 'data-level', 'xmlns', 'transform', 'points', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'fontFamily', 'font', 'kind', 'layer', 'node', 'room', 'tab', 'panel', 'mode', 'sheet', 'sector', 'status', 'evidence', 'domain', 'icon', 'tone', 'variant', 'size', 'method', 'cache', 'inputMode', 'autoComplete', 'pattern', 'accept', 'lang', 'locale', 'color', 'background', 'borderColor', 'display', 'animation', 'position']);
const UI_KEYS = new Set(['children', 'title', 'label', 'text', 'name', 'summary', 'description', 'aria-label', 'placeholder', 'alt', 'heading', 'body', 'sub', 'question', 'answer', 'big', 'small', 'k', 'note', 'means', 'example', 'meaning', 'term', 'gap', 'say', 'msg', 'hint', 'intro', 'lede', 'cta', 'prompt', 'tip', 'yes', 'no', 'consider']);
const INLINE = new Set(['strong', 'b', 'em', 'i', 'a', 'span', 'small', 'mark', 'u', 'sup', 'sub', 'abbr', 'time', 'cite', 'kbd']);

function normalize(s) { return s.replace(/\s+/g, ' ').trim(); }

/* Text inside JSX the way React reads it: each line is trimmed at its line breaks, empty lines go, and lines join with one space. */
function jsxText(raw) {
  const lines = raw.split(/\r\n|\n/);
  const out = [];
  lines.forEach((l, i) => {
    let t = l;
    if (i > 0) t = t.replace(/^\s+/, '');
    if (i < lines.length - 1) t = t.replace(/\s+$/, '');
    if (t) out.push(t);
  });
  return out.join(' ');
}
function exprText(c) {
  const e = c.expression;
  if (!e || e.type === 'JSXEmptyExpression') return '';
  if (e.type === 'StringLiteral') return e.value;
  if (e.type === 'TemplateLiteral') {
    let s = '';
    e.quasis.forEach((q, i) => { s += q.value.cooked != null ? q.value.cooked : q.value.raw; if (i < e.expressions.length) s += '{*}'; });
    return s;
  }
  return '{*}';
}
/* One element whose children are text, expressions, and simple inline elements, as a single sentence; null if it is not like that. */
function richOf(el) {
  const kids = el.children || [];
  let k = 0, hasText = false, hasEl = false, s = '';
  for (const c of kids) {
    if (c.type === 'JSXText') {
      const t = jsxText(c.value);
      // a space at the edge of a text run on the same line is real (React keeps it); at a line break it is not
      const lead = /^[ \t]+\S/.test(c.value) ? ' ' : '';
      const trail = /\S[ \t]+$/.test(c.value) ? ' ' : '';
      s += lead + t + trail;
      if (/[A-Za-z]/.test(t)) hasText = true;
    } else if (c.type === 'JSXExpressionContainer') s += exprText(c);
    else if (c.type === 'JSXElement') {
      const nm = c.openingElement.name && c.openingElement.name.name;
      if (!INLINE.has(nm)) return null;
      let inner = '';
      for (const g of c.children || []) {
        if (g.type === 'JSXText') inner += jsxText(g.value);
        else if (g.type === 'JSXExpressionContainer') inner += exprText(g);
        else return null;
      }
      if (!inner) return null;
      k++; s += `<${k}>${inner}</${k}>`; hasEl = true;
    } else return null;
  }
  return hasText && hasEl ? s : null;
}

function looksLikeText(s, uiKey, how) {
  const t = normalize(s);
  if (t.length < 2) return false;
  if (!/[A-Za-z]{2}/.test(t)) return false;
  if (/^(https?:|\/|#|\.|data:|mailto:|cxm-|cx-|atlas-|sp-|us-|cxe-)/.test(t)) return false;
  if (/^[a-z0-9_]+(?:[-_.:/][a-z0-9_]+)+$/.test(t)) return false;                   // ids and paths: contest-8-candidate-2, radix.slottable
  if (/^[a-z][a-zA-Z0-9]*$/.test(t) && !uiKey) return false;                       // a camelCase or lowercase identifier
  if (/(=>|\bfunction\b|\bconst\b|\blet\b|\bvar\b|\breturn\b|rgba?\(|translate\(|scale\(|calc\(|\bpx\b|\bvar\(--|^\w+\(.*\)$)/.test(t)) return false;
  const words = t.match(/[A-Za-z][A-Za-z'’-]*/g) || [];
  if (words.length === 1) return uiKey && (/^[A-Z“"(]/.test(t) || how === 'jsx') && t.length >= 3;   // a lone lowercase word is real text only when it is JSX text (" added)", "proposals")
  if (/^[a-z0-9 :;,.#>\[\]()=%*+~!-]+$/.test(t) && !/[A-Z]/.test(t) && !/[.?!]/.test(t) && words.length < 4) return false;   // css-like
  return true;
}

function walk(node, visit, parents) {
  if (!node || typeof node.type !== 'string') return;
  visit(node, parents);
  parents.push(node);
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'start' || k === 'end' || k === 'extra' || k === 'tokens' || k === 'comments') continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && walk(c, visit, parents));
    else if (v && typeof v.type === 'string') walk(v, visit, parents);
  }
  parents.pop();
}

function keyOf(node, parents) {
  // the property or JSX attribute this value sits under, or "children" for JSX text and expression children
  for (let i = parents.length - 1; i >= 0; i--) {
    const p = parents[i];
    if (p.type === 'JSXAttribute') return p.name && (p.name.name || (p.name.namespace && p.name.name.name)) || '';
    if (p.type === 'ObjectProperty' || p.type === 'Property') {
      const k = p.key; return k && (k.name || k.value) ? String(k.name || k.value) : '';
    }
    if (p.type === 'JSXElement' || p.type === 'JSXFragment') return 'children';
    if (p.type === 'CallExpression' || p.type === 'ArrayExpression') continue;
  }
  return '';
}

const NOT_SHOWN_CALLS = ['getAttribute', 'setAttribute', 'querySelector', 'querySelectorAll', 'getElementById', 'addEventListener', 'removeEventListener', 'matchMedia', 'getItem', 'setItem', 'removeItem', 'createElement', 'fetch', 'require', 'import', 'test', 'startsWith', 'endsWith', 'includes', 'indexOf', 'split', 'join', 'match', 'replace', 'matches', 'closest', 'classList', 'toggle', 'add', 'remove', 'contains', 'has', 'get', 'set', 'push'];

function scan(file, src) {
  if (/cx-i18n\.jsx$/.test(file)) return [];   // the translator's own Spanish strings are not English to translate
  const ast = babel.parsers.babel.parse(src, { filepath: file, parser: 'babel' });
  const out = [];
  const lineOf = (n) => (n.loc ? n.loc.start.line : 0);
  const isLibrary = /CivicAtlas\.pretty\.js$/.test(file);
  const add = (en, node, parents, how) => {
    const key = keyOf(node, parents);
    if (SKIP_KEYS.has(key) && !UI_KEYS.has(key)) return;
    const par = parents[parents.length - 1];
    const uiKey = UI_KEYS.has(key) || how === 'jsx' || (par && par.type === 'ArrayExpression');   // a capitalized word in a list, such as ["ballot", "Ballot", icon], is a label
    if (!looksLikeText(en, uiKey, how)) return;
    if (/^Definir /.test(normalize(en))) return;   // Spanish already, in ext/cx-ui.jsx
    if (isLibrary && lineOf(node) < 9600) return;   // libraries come first in the compiled file; the app's own text starts near line 9,600
    out.push({ en: normalize(en), file: path.basename(file), line: lineOf(node), key: key || (how === 'jsx' ? 'children' : '') });
  };
  walk(ast.program || ast, (node, parents) => {
    if (node.type === 'StringLiteral') {
      const par = parents[parents.length - 1];
      if (par && (par.type === 'ImportDeclaration' || par.type === 'ExportNamedDeclaration' || par.type === 'ExportAllDeclaration')) return;
      if (par && par.type === 'ObjectProperty' && par.key === node) return;                // a property name
      if (par && par.type === 'MemberExpression') return;
      if (par && par.type === 'BinaryExpression' && ['===', '!==', '==', '!='].includes(par.operator)) return;   // a comparison, not shown
      if (par && par.type === 'SwitchCase') return;
      if (par && par.type === 'CallExpression' && par.callee && NOT_SHOWN_CALLS.includes(par.callee.property && par.callee.property.name || par.callee.name)) return;
      add(node.value, node, parents, 'str');
    } else if (node.type === 'TemplateLiteral') {
      let s = '';
      node.quasis.forEach((q, i) => { s += q.value.cooked != null ? q.value.cooked : q.value.raw; if (i < node.expressions.length) s += '{*}'; });
      const par = parents[parents.length - 1];
      if (par && par.type === 'TaggedTemplateExpression') return;
      if (par && par.type === 'CallExpression' && par.callee && NOT_SHOWN_CALLS.includes(par.callee.property && par.callee.property.name || par.callee.name)) return;
      add(s, node, parents, 'tpl');
    } else if (node.type === 'JSXText') {
      add(jsxText(node.value), node, parents, 'jsx');
    } else if (node.type === 'JSXElement') {
      const r = richOf(node);
      if (r && looksLikeText(r.replace(/<\/?\d+>/g, ''), true) && !(isLibrary && lineOf(node) < 9600)) out.push({ en: normalize(r), file: path.basename(file), line: lineOf(node), key: 'rich' });
    }
  }, []);
  return out;
}

function main() {
  const rows = [];
  const files = fs.readdirSync(path.join(ROOT, 'ext')).filter((f) => f.endsWith('.jsx')).map((f) => path.join(ROOT, 'ext', f));
  const pretty = path.join(ROOT, 'build', 'work', 'CivicAtlas.pretty.js');
  if (fs.existsSync(pretty)) files.push(pretty); else console.error('build/work/CivicAtlas.pretty.js is missing: run python build.py first for the compiled desktop app.');
  for (const f of files) {
    try { rows.push(...scan(f, fs.readFileSync(f, 'utf8'))); }
    catch (e) { console.error(`could not parse ${f}: ${String(e.message).slice(0, 120)}`); process.exitCode = 1; }
  }
  const byText = new Map();
  for (const r of rows) {
    const e = byText.get(r.en);
    if (!e) byText.set(r.en, { en: r.en, where: [{ file: r.file, line: r.line, key: r.key }], n: 1 });
    else { e.n++; if (e.where.length < 3) e.where.push({ file: r.file, line: r.line, key: r.key }); }
  }
  const list = [...byText.values()].sort((a, b) => (a.where[0].file + a.where[0].line.toString().padStart(6, '0')).localeCompare(b.where[0].file + b.where[0].line.toString().padStart(6, '0')));
  list.forEach((e, i) => { e.id = i + 1; });
  const dir = path.join(ROOT, 'i18n', 'work'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'inventory.json'), JSON.stringify(list, null, 0));
  const words = list.reduce((s, e) => s + (e.en.match(/[A-Za-z][A-Za-z'’-]*/g) || []).length, 0);
  const pats = list.filter((e) => e.en.includes('{*}')).length;
  const rich = list.filter((e) => /<\d+>/.test(e.en)).length;
  console.log(`${list.length} distinct strings (${pats} with a changing part, ${rich} whole sentences with a bold word or link), about ${words} words, from ${files.length} files`);
}
main();
