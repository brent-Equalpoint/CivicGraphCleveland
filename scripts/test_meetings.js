#!/usr/bin/env node
/* Tests for the At City Hall front page (ext/cx-meetings.jsx) against the real meeting record (data/meetings-2026.json).

   node scripts/test_meetings.js

   Checks that every action the Clerk uses has a plain-English label, that the lead, the week, and the "just decided" lists come out right for a given
   day, that a piece of legislation can be traced to every agenda it was on, and that the story has the right shape. No network, no browser. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'ext', 'cx-meetings.jsx'), 'utf8');
const pure = src.slice(src.indexOf('/* what the Clerk'), src.indexOf('/* ---------- the screen'));
// the ward matcher the page shares with the ward view and Records lives in ext/cx-live.jsx
const live = fs.readFileSync(path.join(ROOT, 'ext', 'cx-live.jsx'), 'utf8');
const wards = live.slice(live.indexOf('/* ---------- the ward matcher'), live.indexOf('/* ---------- end of the ward matcher'));
const legis = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'legistar-2026.json'), 'utf8')).matters;
const byFile = new Map(legis.map((m) => [m.file, m]));
const ctx = vm.createContext({ cxmPl: (n, a, b) => `${n} ${n === 1 ? a : b}`, cxmMatter: (f) => byFile.get(f) || null, cxHeadline: (t) => `HEAD: ${t}` });
vm.runInContext(wards + '\n' + pure + '\n;this.api = { cxMtgAction, cxMtgKind, cxMtgSplit, cxMtgRanked, cxMtgOutcomes, cxMtgWhere, cxMtgLine, cxMtgStory, cxMtgDayWord, CX_MTG_ACTIONS, cxMtgGroup, cxMtgMix, cxMtgNote, cxMtgNoteParts, cxMtgWeek, cxMtgByKind, cxMtgWatch, cxMtgTally, cxMtgDecided, cxWardsIn, cxWardTie, cxMtgForYou, cxMtgNorm, cxMtgIndex, cxMtgFind };', ctx);
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

// v5.30, the full page. The week as five day tabs: a weekday shows its own week; a weekend shows the coming week once it has a meeting, else the week just ended
const wkMon = A.cxMtgWeek(data, '2026-10-05');
eq(wkMon.days.map((d) => d.iso), ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'], 'a Monday shows Monday to Friday of its week');
eq([wkMon.pick, wkMon.when], ['2026-10-05', 'this'], 'the tab that opens first is today, when anyone meets today');
eq(wkMon.days.reduce((t, d) => t + d.list.length, 0), data.meetings.filter((m) => m.date >= '2026-10-05' && m.date <= '2026-10-09').length, 'every meeting of the week is under its day');
const wkSat = A.cxMtgWeek(data, '2026-10-03');
eq([wkSat.days[0].iso, wkSat.pick, wkSat.when], ['2026-10-05', '2026-10-05', 'next'], 'a Saturday shows the coming week once the Clerk has posted a meeting in it');
const wkLate = A.cxMtgWeek({ meetings: data.meetings.filter((m) => m.date <= '2026-10-09') }, '2026-10-10');   // the record as it stood before the next week was posted
eq([wkLate.days[0].iso, wkLate.pick, wkLate.when], ['2026-10-05', '2026-10-08', 'last'], 'with nothing posted for the coming week, a Saturday shows the week just ended, opened at its last meeting');
eq(A.cxMtgWeek(data, '2026-10-07').pick, '2026-10-07', 'a Wednesday with a meeting opens on Wednesday');
// the agenda by kind: every item once, in the fixed order, ceremonial last, the Clerk's order inside a kind
const kinds = A.cxMtgByKind(s.lead);
eq(kinds.reduce((t, g) => t + g.items.length, 0), s.lead.items.length, 'the agenda by kind keeps every item');
eq(kinds.map((g) => g.label), ['Ordinances', 'Resolutions', 'Everything else', 'Ceremonial resolutions'].filter((l) => kinds.some((g) => g.label === l)), 'the kinds come in order');
if (kinds[kinds.length - 1].g !== 'ceremonial') fail('ceremonial resolutions are not last');
const firstKind = kinds[0].items.map((i) => s.lead.items.indexOf(i));
if (firstKind.some((v, k) => k && v < firstKind[k - 1])) fail('items inside a kind are not in the Clerk\'s order');
// how to watch: only what the Clerk's notice names, and a plain admission when it names nothing
eq(A.cxMtgWatch('TENTATIVE AGENDA Meeting will be live broadcast: YouTube: https://www.youtube.com/user/ClevelandCityCouncil * Cleveland TV Channel 20 (Spectrum Cable TV) * TV 20 Livestream online: http://ClevelandOhio.gov/TV20'), 'Live on YouTube and Cleveland TV Channel 20.', 'the Council notice names YouTube and channel 20');
eq(A.cxMtgWatch('Meeting will be live broadcast: YouTube: https://www.youtube.com/user/ClevelandCityCouncil'), 'Live on YouTube.', 'a notice that names only YouTube');
eq(A.cxMtgWatch('The meeting will be live broadcast. See meeting notice for details.'), 'The meeting will be broadcast live.', 'a notice that only says it is broadcast');
eq(A.cxMtgWatch('See meeting notice for details.'), "The Clerk's notice does not say how to watch.", 'a notice that says nothing about watching');
// Just decided: the last City Council meeting that acted on something, and counts that add up to its whole agenda
const dec = A.cxMtgDecided(data, '2026-10-05');
eq([dec.date, dec.body], ['2026-09-28', 'City Council'], 'just decided is the last Council meeting before today');
eq(A.cxMtgTally(dec).reduce((t, x) => t + x[1], 0), dec.items.length, 'the counts add up to every item, those with no action recorded included');
if (A.cxMtgTally(dec).some(([l]) => /score|rank|percent|%/i.test(l))) fail('a count reads as a grade');
// For you: wards named in the record, priorities by the keyword rules, each with its reason, never a score, in the Clerk's order
eq([...A.cxWardsIn('New License Application, C1. Luxe Eatstation 815 Superior Ave. (Ward 3)')], [3], 'a ward in brackets');
eq([...A.cxWardsIn('from the Neighborhood Equity Fund of Wards 1, 2 and 14')].sort((a, b) => a - b), [1, 2, 14], 'a list of wards');
eq([...A.cxWardsIn('Ward 123 and Ward 16 and Rewards 4')], [], 'a number that is not a ward');
const fakeLook = { fundWards: (f) => (f === '1205-2026' ? [9] : []), addrWards: (f) => (f === '1229-2026' ? [9] : []), match: (t) => (/Good Food/.test(t) ? { growth: 'retail' } : {}) };
const fy = A.cxMtgForYou([s.lead], 9, ['growth'], fakeLook);
eq(fy.map((r) => [r.f, r.why.map((w) => w[1])]), [['1205-2026', ['Ward 9 in the ordinance text']], ['1229-2026', ['Address in Ward 9']], ['1230-2026', ['growth']]], 'For you lists why each item is there, in the Clerk\'s order');
eq(fy[2].why[0][2], 'Retailer', 'a keyword stem shows the title\'s own word');
eq(A.cxMtgForYou([s.lead], null, [], fakeLook), [], 'nothing set, nothing shown');
if (A.cxMtgForYou([s.lead, s.lead], 9, ['growth'], fakeLook).length !== fy.length) fail('an item on two agendas is listed twice');
if (A.cxMtgForYou([s.lead], 9, ['growth'], { ...fakeLook, match: () => ({ growth: 'x' }) }).some((r) => A.cxMtgGroup(r.f) === 'ceremonial')) fail('a ceremonial resolution is in For you');
if (JSON.stringify(fy).match(/score|percent|%/i)) fail('For you carries a score');
// Look it up: file numbers, words, and addresses written either way; nothing found is an empty list, and one character is not a search
eq(A.cxMtgNorm('3870 West 25th Street.'), ['3870', 'w', '25th', 'st'], 'an address is made plain');
const idx = A.cxMtgIndex(data, legis);
eq(A.cxMtgFind(idx, '1232-2026').leg.map((x) => x.file), ['1232-2026'], 'a file number finds its record');
eq(A.cxMtgFind(idx, '1232-26').leg.map((x) => x.file), ['1232-2026'], 'a two-digit year works');
if (!A.cxMtgFind(idx, '1232').leg.some((x) => x.file === '1232-2026')) fail('a bare file number does not find its record');
eq(A.cxMtgFind(idx, 'W. 25th St').leg.map((x) => x.file), A.cxMtgFind(idx, 'West 25th Street').leg.map((x) => x.file), 'an address is found the same way written short or long');
if (!A.cxMtgFind(idx, '3870 W 25th').leg.some((x) => x.file === '1232-2026')) fail('a house number and street do not find the record');
if (!A.cxMtgFind(idx, 'Burke').meet.length) fail('a word in a Clerk\'s notice does not find the meeting');
eq(A.cxMtgFind(idx, 'xyzzy'), { leg: [], meet: [] }, 'nothing found');
eq(A.cxMtgFind(idx, 'a'), null, 'one character is not a search');
if (A.cxMtgFind(idx, '1232-2026').meet.some((m) => !m.items.some((i) => i[0] === '1232-2026'))) fail('a meeting found by file number does not have the file');

console.log(bad ? `${bad} failed` : `ok  city hall meetings (${data.meetings.length} meetings)`);
process.exit(bad ? 1 : 0);
