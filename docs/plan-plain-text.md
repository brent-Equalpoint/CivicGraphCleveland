# Plan: say less, lose nothing that matters

Status: proposed, nothing built. Written 2026-10-04 for Brent and the team.

## The problem in one line

The app tells the truth carefully, and says so on almost every screen. The care is right. Saying it everywhere makes people stop reading, and a person who stops reading misses the one line that mattered.

## What we measured (phone, 390 px wide, dark, English, nothing expanded)

| Screen | Words showing | Where it comes from |
|---|---|---|
| Ballot | 891 | Mostly our own wording plus official ballot text |
| At City Hall | 722 | Our wording plus the Clerk's records |
| Explore | 492 | Our wording |
| Today | 479 | Our wording |
| Levies and taxes | 377 | Hand-written between the LEVY-TEXT markers |
| My place | 371 | Our wording |
| Federal profiles | 264 | Our wording |
| Profiles (Cleveland) | 213 | Our wording |
| Constellation | 204 | Already cut to two sentences (Oct 4) |
| Settings | 94 | Fine |

Across the whole app there are 4,333 pieces of text and about 41,700 words. About 18,700 of those words are the compiled Sep 23 desktop app, which changes only through exact-match patches in `build.py`. Our own text is 2,705 pieces and about 21,800 words. 81 of our pieces run 30 words or more, and together they hold about 3,100 words. Another 179 run 20 to 29 words.

The longest pieces in the whole inventory (140 to 250 words each) are the official ballot wording. Those stay exactly as written.

## Where the repetition is

These are counts in our source (`ext/`), so they are lower bounds for what a person meets while scrolling.

- "A missing record is not a no": 17 places.
- "Sponsorship is not a vote": 9 places.
- "Receipts, not scores" and "not a score": 6 places.
- "Not a judgment" and "a sourced field": 5 places.
- "Official record" and "Everything comes from...": 34 places.
- A footer on most screens that repeats where the data came from and when it was pulled.
- Three or four sentences of method before the content on a few screens (for example the four-sentence intro the Constellation used to have).

## Rule of the plan

Each important idea is said once where it can be misread, and findable everywhere else. We never remove a source link, a date, or a warning that prevents a wrong reading. We move it, shorten it, or fold it.

### What must not be cut

1. Official wording of ballot issues, charters, and levies. It stays verbatim and stays English.
2. Every source link, and the "retrieved on" date for each record.
3. "A missing record is not a no" and "sponsorship is not a vote" at the exact spot where a gap or a sponsor could be misread as a position (a person's row, a map dot, a vote tally). Once per spot, in one short sentence.
4. Both sides of a levy, with names and dates, and the line saying when a side has no quoted voice.
5. Party and term dates shown as dated, sourced fields.
6. The statement that nothing personal leaves the browser, on the screens that take an address or answers.
7. The note that a person has not yet reviewed interpretive text, until one has.

### What can shrink

- Method paragraphs ahead of content. Move to a fold.
- A rule restated on every card of a list. Say it once at the top of the list.
- Sentences that describe the screen the person is looking at ("This shows..."). Cut them; the screen shows it.
- Footers that repeat the sources of the screen above. Replace with one line and a link to "How this is built".
- Two ways of saying the same thing next to each other (a sub-heading and the first sentence under it).

## The three layers (every screen follows this)

1. Headline. A noun phrase or one short sentence. Already in place on stories.
2. Lead. Two sentences at most, in a tinted tile, the way the Constellation now opens. It says what this is and the one thing not to misread.
3. Fold. Everything else (method, long caveats, source detail) in one closed section called "How to read this" or "Where this comes from". Never more than one fold per screen.

Limits we would enforce:

- Lead: 2 sentences, 35 words or fewer in total.
- Any other sentence: 22 words or fewer where possible. Ask for a reason above 28.
- Words showing before any fold opens: 250 on a list screen, 350 on a detail screen. The Ballot is a special case (see below).
- Reading level: grade 8 or lower, checked with a simple formula in the audit.

## The one place the rules live

Create a short "Our rules" sheet: receipts not scores, sponsorship is not a vote, a missing record is not a no, official records update by themselves while news and interpretation wait for a person, nothing personal leaves your browser. Five lines, each with a plain example. Link to it from the "?" on the top bar and from the one-line footer. Screens then carry the one short reminder where it matters, not the whole explanation.

## The four-question test (use it on every block of text)

1. Does it describe what the eye can already see? Cut it.
2. Does it explain a symbol? Make it a small key, shown only when the symbol appears.
3. Does it stop a wrong reading? Keep it, once, in the shortest sentence.
4. Does it explain the method? Put it in the fold.

### Worked example: the note under the Constellation map

Before, always showing, 49 words in seven sentences: "White rings: who is on the record for this question. Nearer means more agreement on the answered records of this type. Direction has no meaning. A dotted halo marks your practice choice. Party and ballot selection do not affect distance. Tap a person to open them."

After:

- On the map, a one-line key that appears only when it applies: "White ring: on the record for this question. Dotted halo: your practice pick."
- Cut "Tap a person to open them". The faces look tappable and are announced as buttons.
- "Nearer means more agreement" is already in the two-sentence lead.
- In the fold, one sentence: "Only distance matters, not direction, and party and ballot choice never change it."
- On the question card, the missing-record rule stays and gets shorter: "Skipped answers and missing records never count against anyone."

## Order of work

Phase 0 (a day): add a text-budget check. It counts words showing on each phone screen and fails if a screen grows past its recorded number. This is the ratchet: it stops things getting worse while we cut. Record today's numbers first.

Phase 1 (the front door, about three days): Today, Explore, My place, People intros, and At City Hall. Cut to the lead plus fold pattern. Targets: Today 479 to about 300, Explore 492 to about 300, My place 371 to about 250, At City Hall 722 to about 400.

Phase 2 (the Ballot, about three days): the Ballot is long because it carries official text. Keep that text, but put it behind "Read the official wording" on each issue, and show a two-sentence plain summary first. Target: 891 down to about 500 before anything is opened.

Phase 3 (the reviewed texts): Levies, profile office text, and "Why supporters backed it" summaries. These are interpretive and need a person's review. Shortening them resets that review (`--mark-levies-reviewed`, `--mark-office-reviewed`, `--mark-reviewed`). Do these last, in one batch, so a person reads them once.

Phase 4 (desktop): the compiled desktop text is about 18,700 words, changed only through exact-match patches. Do the phone first, then port the same leads and folds to the desktop pages we already own in `ext/` (federal, levies, meetings) and decide separately whether to patch the rest.

## Costs and risks

- Spanish. Every changed string needs Spanish. Shortening means fewer strings overall, so the dictionary shrinks, but each rewrite still costs a translate and merge (`inventory.js`, then `merge.js`). Spanish stays a draft until a Spanish speaker reads it.
- Human review. Phase 3 text resets sign-off. Batch it.
- Over-cutting. The risk is a shorter line that says something false or leaves a gap readable as a position. Every cut is checked against the "must not be cut" list, and a person reads the final text of Phase 3.
- Layout. Shorter text moves things. The design-look snapshots and the axe, targets, and no-bleed checks will need a pass on each phase.

## Decisions we need from you

1. Are the "must not be cut" items right, or is anything missing? (For example, the "Updated" strip.)
2. Should "Our rules" be a sheet from the "?" on the top bar, or a card at the end of Today?
3. Is a 250-word ceiling per screen the right feel, or do you want it tighter?
4. Ballot: is hiding official wording behind one tap acceptable, given the wording is what a voter will see on the day?
5. Start with Phase 0 and Phase 1 now, or review the exact new wording for Today first?
