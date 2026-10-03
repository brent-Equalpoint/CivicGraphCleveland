#!/usr/bin/env node
/* Tests for the At City Hall front page (ext/cx-meetings.jsx) against the real meeting record (data/meetings-2026.json).

   node scripts/test_meetings.js

   Checks that every action the Clerk uses has a plain-English label, that the lead, the week, and the "just decided" lists come out right for a given
   day, that a piece of legislation can be traced to every agenda it was on, and that the story has the right shape. No network, no browser. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'ext', 'cx-meetings.jsx'), 'utf8');
const pure = src.slice(src.indexOf('/* what the Clerk'), src.indexOf('/* ---------- the screen'));
const legis = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'legistar-2026.json'), 'utf8')).matters;
const byFile = new Map(legis.map((m) => [m.file, m]));
const ctx = vm.createContext({ cxmPl: (n, a, b) => `${n} ${n === 1 ? a : b}`, cxmMatter: (f) => byFile.get(f) || null, cxHeadline: (t) => `HEAD: ${t}` });
vm.runInContext(pure + '\n;this.api = { cxMtgAction, cxMtgKind, cxMtgSplit, cxMtgRanked, cxMtgOutcomes, cxMtgWhere, cxMtgLine, cxMtgStory, cxMtgDayWord, CX_MTG_ACTIONS, cxMtgGroup, cxMtgMix, cxMtgNote, cxMtgNoteParts };', ctx);
const A = ctx.api;
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'meetings-2026.json'), 'utf8'));
let bad = 0;
const fail = (m) => { bad++; console.log('FAIL ' + m); };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) fail(`${m}: got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`); };

// every action in the record has a plain label; a new one is caught here instead of showing raw on a phone
const actions = [...new Set(data.meetings.flatMap((m) => m.items.map((i) => i[1])).filter(Boolean))];
const unmapped = actions.filter((a) => !A.CX_MTG_ACTIONS[a]);
if (unmapped.length) fail(`actions with no plain label: ${unmapped.join(', ')}`);
eq(A.cxMtgAction(''), 'On the agenda', 'an item with no action yet is on the agenda');
eq(A.cxMtgAction('something new'), 'Something new', 'an unknown action is shown capitalized, not hidden');
eq(A.cxMtgKind('approved as amended'), 'cond', 'approved with changes gets the conditional dot');
eq(A.cxMtgKind('tabled'), 'read', 'tabled gets the left-on-read dot');

// a day in the record: Saturday Oct 3, 2026; the next Council meeting is Monday Oct 5
const s = A.cxMtgSplit(data, '2026-10-03');
eq([s.lead.date, s.lead.body], ['2026-10-05', 'City Council'], 'the lead is the next City Council meeting');
if (s.week.some((m) => m === s.lead || m.date < '2026-10-03' || m.date > '2026-10-09')) fail('the rest of the week holds the lead, a past meeting, or a meeting more than a week out');
if (s.week.length < 3) fail(`only ${s.week.length} other meetings this week`);
if (s.recent.length !== 3 || s.recent.some((m) => m.date >= '2026-10-03' || !m.items.some((i) => i[1]))) fail('"just decided" is not the three latest past meetings that acted on something');
if (s.recent.some((m, k) => k && m.date > s.recent[k - 1].date)) fail('"just decided" is not newest first');
eq(s.months.reduce((t, g) => t + g.list.length, 0), data.meetings.filter((m) => m.date < '2026-10-03').length, 'every past meeting is in exactly one month');
if (s.months[0].key < s.months[s.months.length - 1].key) fail('months are not newest first');

// words
eq(A.cxMtgDayWord('2026-10-05', '2026-10-05'), 'today', 'same day');
eq(A.cxMtgDayWord('2026-10-06', '2026-10-05'), 'tomorrow', 'next day');
eq(A.cxMtgDayWord('2026-10-08', '2026-10-05'), 'Thursday', 'within a week it is the weekday');
eq(A.cxMtgDayWord('2026-10-19', '2026-10-05'), 'Oct 19', 'beyond a week it is the date');
eq(A.cxMtgLine(s.lead, '2026-10-03').head, 'City Council meets Monday.', 'the lead sentence');
eq(A.cxMtgLine({ body: 'Safety Committee', date: '2026-10-04', items: [] }, '2026-10-03').head, 'Safety Committee meets tomorrow.', 'the day after');
eq(A.cxMtgLine({ body: 'Safety Committee', date: '2026-10-20', items: [] }, '2026-10-03').head, 'Safety Committee meets on Oct 20.', 'a later day');
if (!/No legislation is listed/.test(A.cxMtgLine({ body: 'X', date: '2026-10-20', items: [] }, '2026-10-03').sub)) fail('an empty agenda is not described honestly');
eq(A.cxMtgLine({ body: 'X', date: '2026-10-20', items: [['1-2026', '']] }, '2026-10-03').sub, 'One piece of legislation is on the agenda.', 'one item');

// ranking: the most settled outcomes come first, and nothing is dropped
const council = data.meetings.find((m) => m.body === 'City Council' && m.items.some((i) => i[1] === 'approved') && m.items.some((i) => i[1] === 'read into the record'));
const ranked = A.cxMtgRanked(council);
eq(ranked.length, council.items.length, 'ranking keeps every item');
const order = { done: 0, cond: 1, talk: 2, hold: 3, read: 4 };
if (ranked.some((i, k) => k && order[A.cxMtgKind(i[1])] < order[A.cxMtgKind(ranked[k - 1][1])])) fail('ranked items are not most-settled first');
const out = A.cxMtgOutcomes(council);
eq(out.reduce((t, o) => t + o[1], 0), council.items.filter((i) => i[1]).length, 'outcome counts add up to the items that have an action');
if (out.some((o) => /score|rank|grade|percent|%/i.test(o[0]))) fail('an outcome label reads as a grade');

// real legislation leads, ceremonial resolutions come last, and the mix is stated
const first3 = A.cxMtgRanked(s.lead).slice(0, 3).map((i) => A.cxMtgGroup(i[0]));
if (first3.some((g) => g === 'ceremonial')) fail(`the lead's top three include a ceremonial resolution: ${first3}`);
const mix = A.cxMtgMix(s.lead);
eq(mix.reduce((t, x) => t + parseInt(x[0], 10), 0), s.lead.items.length, 'the mix adds up to the agenda');
if (mix[mix.length - 1][1] !== 'ceremonial') fail('the ceremonial resolutions are not listed last in the mix');
eq(A.cxMtgMix({ items: [['1205-2026', '']] })[0][0], '1 ordinance', 'one ordinance reads in the singular');

// the Clerk's notice, cleaned
eq(A.cxMtgNote('TENTATIVE AGENDA Meeting will be live broadcast: YouTube: https://www.youtube.com/user/x * Cleveland TV Channel 20 (Spectrum Cable TV) * TV 20 Livestream online: http://ClevelandOhio.gov/TV20 * www.clevelandcitycouncil.gov'), 'The meeting will be broadcast live.', 'a notice that only says how to watch');
eq(A.cxMtgNote('ADDENDUM - In addition to legislation, the Office of Capital Projects will provide an update on the Modernization Plan. The meeting will be live broadcast. See notice for details.'), 'ADDENDUM - In addition to legislation, the Office of Capital Projects will provide an update on the Modernization Plan. The meeting will be broadcast live.', 'a notice with news in it keeps the news');
eq(A.cxMtgNote(''), '', 'no notice');
eq(A.cxMtgNoteParts('Ordinance 12-2026 will be heard. See meeting notice for details. The meeting will be live broadcast.'), ['Ordinance 12-2026 will be heard.', 'The meeting will be broadcast live.'], 'the notice comes in two pieces and loses the filler sentence')
const notes = data.meetings.map((m) => A.cxMtgNote(m.note));
if (notes.some((n) => /https?:|www\.|\*/.test(n))) fail('a cleaned notice still has a web address or a bullet');

// tracing a piece of legislation
const w = A.cxMtgWhere(data, '556-2026');
eq(w.map((x) => x.m.date), ['2026-07-15', '2026-07-15', '2026-06-25', '2026-04-27'], 'the data center ordinance, newest first (it was introduced at the Apr 27 Council meeting)');
eq(w.map((x) => x.m.body).sort(), ['City Council', 'City Council', 'Committee of the Whole', 'Utilities Committee'], 'and where it was heard');
eq(A.cxMtgWhere(data, '9999-2026'), [], 'a file on no agenda has no meetings');

// the story
const story = A.cxMtgStory(data, '2026-10-03');
eq(story.id, 'hall-2026-10-05', 'the story is new each week');
if (story.frames.length < 4 || story.frames[story.frames.length - 1].type !== 'cta') fail('the story should end on a call to open the page');
if (!story.frames.some((f) => /^HEAD: /.test(f.big))) fail('the story does not lead with a plain headline of an item');
if (story.frames.some((f) => /—|–/.test(JSON.stringify(f)))) fail('a dash in the story');
eq(A.cxMtgStory(null, '2026-10-03'), null, 'no data, no story');

console.log(bad ? `${bad} failed` : `ok  city hall meetings (${data.meetings.length} meetings)`);
process.exit(bad ? 1 : 0);
