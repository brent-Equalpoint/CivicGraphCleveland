# Design standards: logic, UX, and UI

Drafted Oct 2, 2026 from what the app already does and from mistakes we have already made. It is a starting point for the owner
to edit, not a finished system. Every rule says how it is checked; a rule with no check is marked **(no check yet)** and is the
next thing to build. When a bug is found, the fix is a new check and, if it shows a gap, a new rule here.

Tools the owner will add later (design tokens, a component kit, review tools) go in section 9. Read `CLAUDE.md` first: its rules
(receipts not scores, sponsorship is not a vote, a missing record is not a no, nothing personal leaves the browser, plain English,
no em dashes, no left accent stripes, both styles, both layouts) outrank everything below.

## 1. Before building anything

1. **Reuse before inventing.** Find the closest thing that already works (a story, the number pad, a sheet, a Read more drop-down) and
   use it as it is. A new look, color, or control needs a reason written in the change. (Lesson: the levies were first built as a text
   page and lost the story format residents liked; they were rebuilt on the story engine and the existing blue.)
2. **Say who it is for and what they do with it.** One sentence. If a phone user cannot do it with one thumb in a few taps, redesign it.
3. **Look at it before it ships.** A screenshot of every new screen, on a phone width (390 px) and a small one (320 px), in English and
   Spanish, and on the desktop. Not just a passing check.
4. **Every rule has a check.** If you break a rule once, add a check so it cannot happen again.

## 2. Logic standards (what the app may say)

| Rule | Checked by |
| --- | --- |
| Every number comes from a record in the app (`data/`, the official ballot wording), read by code. No number is typed into text by hand. A derived number says how it is derived. | `levies` (figures against the ballot wording, fails if one is changed), `council-votes` |
| Sponsorship is not a vote. A missing record is not a no. Say so where the difference matters. | `test_i18n.py` (the Spanish keeps both), reading |
| No scores, rankings, percentages of agreement, or ideology labels. No advice on how to vote or what is "good" or "bad". | `levies` (no "vote yes", "we recommend", "good deal"; for Issues 3 and 12 to 14 also no "should", "best", or "worst" in our own words, outside a person's quotation), reading |
| Both sides, by name, with a date and a link. If a side has no named voice, say that, and say it is not the same as nobody disagreeing. | `levies` |
| Every claim has a source link. Interpretive text carries a review flag and says a person has not reviewed it until one has. | `levies`, `build.py --mark-*-reviewed` |
| Official records update by themselves; anything interpretive (news, reasons, office text, levy write-ups) needs a named person. | `refresh.py --check`, review flags |
| Official wording (ballot questions, ordinance text) is shown as printed. Our summary is labeled as ours. | reading **(no check yet)** |
| Personal input (place, answers, priorities, a home value) stays in the page. It never goes into a link or a request. | `shell`, reading **(no network check for new inputs yet)** |
| A source that disagrees with the official record is not used, and the difference is noted. | reading |

## 3. UX standards (how it behaves)

- **One idea a screen, the number first.** A story frame has a small label, one big line (or one big figure), and one small line of
  support. Longer explanation goes behind **Read more**, a drop-down, never on the frame.
- **The same pattern everywhere.** Stories advance by tapping the right side, go back with the left, and show progress bars. A frame
  with its own controls (a number pad, Read more, answers) switches the tap zones off and has a visible Next button. Sheets close by
  pulling down. Drop-downs are plus and minus rows. (`stories-phone`, `sheet-pull`)
- **Targets are at least 44 by 44 px**, with space between. (`targets`)
- **Nothing needs hover, drag, or a long press.** Everything a pointer does, the keyboard does: Tab order is the reading order, arrows
  move through a story, Escape closes. (`axe`, `shell`)
- **A row of tabs is one Tab stop; the arrows move along it and stop at its ends; Enter opens.** An arrow never opens a room or adds a
  history entry. Exactly one thing in a navigation bar looks and announces itself as chosen. The chosen item is always in view, and a row
  that does not fit says how much more there is and can be reached with a mouse alone (a plain wheel, an "n more" button). A keyboard
  shortcut never fires while someone is typing in a field. (`nav-desktop`)
- **Every screen has a way out and a way back**, and returning lands where you left. (`stories-deeper`)
- **Empty, blocked, and bad-link states say what happened, why, and one next step.** (`screen-states`)
- **Easy mode keeps the plain version of everything**, without maps, filters, or controls that need explaining. (`easy-phone`, `easy-desktop`)
- **Language is a one-tap choice from outside Settings** (the ES/EN button in every header). (`spanish-switch`)
- **Motion is calm and optional.** Respect reduced motion. Nothing flashes. **(no check yet)**

## 4. UI standards (how it looks)

**Color.** Use the tokens, never a one-off. The full system is in `docs/design-system.md` (generated from `design/tokens.json`) and is guarded by `audit.js` and the `design-look` check. Phone tokens live on `.cxm` in `ext/cxm.css`: surface `--bg #0c0c0e`, card `--tile #17171a`,
text `--ink #ecebe7`, muted `--mut #b9bcc6`, accent `--acc #2f66f3` (blue, Bento) or `#c2410c` (Original). Story screens that are about
money or the ballot sit on the accent. Cards use tinted backgrounds. **Never a left accent stripe.** A status (Committed, Talking stage, and the like) is written in words, with no colored status dot beside it; a dot stays only where it is the key to a chart or the data itself (a legend, a vote). Both styles must work.
(`axe` for contrast; the Original run covers the other palette)

**Contrast.** Body text 4.5:1 or better, large text 3:1. On the blue, secondary text is white, not a pale tint. (`axe`)

**Light and dark.** Every screen works in both modes (System, Light, Dark) and both styles. Dark is the source; light is generated from it, so a new color rule in `ext/cxm.css` or `ext/cx.css` is turned into its light counterpart automatically. A part that sits on the accent or on a dark island must be named in `light.py` so it is left alone. The mode is separate from the style. (`mode-switch`; the layout, contrast, and color-vision checks run in light by `CHECK_MODE=light`, and `release.py` runs them)

**Color is never the only signal.** Every colored dot, bar, tint, or ring state also has a word beside it, a shape, or a lightness difference that survives losing color. Colors that mean different things are registered as a "meaning" group in `design/tokens.json` with what carries the meaning besides color; a group carried by color alone must stay 20 or more apart (CIEDE2000) under protanopia, deuteranopia, tritanopia, and achromatopsia. (`scripts/design/cvd.js`, run by `test_design.js`; `color-vision` finds marks with no word beside them and any color that is not registered)

**Type.** Schibsted Grotesk for text, IBM Plex Mono for small labels. Sentence case; no all-caps labels. Story headline 34 px (25 px for
a quotation), big figure 44 to 64 px, supporting line 16.5 px, body 15 px (17 px with larger text), fine print no smaller than 14 px.

**Layout.**
- Text never runs past the screen or out of its box, and a box never hides text. Long words wrap. Do not glue words together with
  non-breaking spaces unless the pair is short (the "developmental disabilities" bug). (`no-bleed`, `story-fit`, `titles-never-cut`)
- A record title is never cut short; a headline is a short rule-written line with the full title one tap away. (`titles-never-cut`)
- 18 px gutters on a phone; nothing needs sideways scrolling except the story ring row and the map.
- Everything works at 320 px wide and at larger text. **(320 px is checked in `no-bleed` only for some screens)**

**Components to reuse:** story (ring, frames, `fig`, quote, per-frame source), number pad (`cxm-keys`), Read more (`lv-more-story`),
sheet, card (`cxm-card`), chip, notice banner, drop-down row (`CxmDrop`). New components go in the same files and the same CSS.

## 5. Content standards

- Plain English, about an eighth-grade reading level. Short sentences. "You" and "your".
- **No em dashes or en dashes anywhere**, in either language. Use a period, comma, or colon. (`test_i18n.py`, reading)
- Say what changes for a resident. Receipts: the record, the date, the link.
- Name the people who spoke, with their role and the date. Quote exactly; if a quote came from a summary, mark it for checking.
- Do not guess a person's gender or pronouns from a name; write titles without gender in Spanish. (`i18n/review-notes.md`)
- Commit messages say what changed for a resident, in one line.

## 6. Language standards (Spanish and any later language)

- Write whole sentences as one string. Do not build a sentence from pieces around a number or a name; use one template so the
  translation can reorder it (`${a} a year for each ${b}`, not `{a} <span>a year</span>`).
- Anything the app inserts (a number, a date, a name) is a placeholder: `{n}`, `{$}`, `{d}`, `{t}`, `{f}`, `{*}`.
- New text gets Spanish before it ships: `node scripts/i18n/inventory.js`, translate the new strings, `merge.js`, then `test_i18n.py`
  and `crawl.js`. Official wording and proper names stay in English and are marked as such.
- Spanish stays labeled a draft until a Spanish-speaking person has read it. (`spanish-switch`, `test_i18n.py`)
- Every layout check also runs in Spanish: `CHECK_LANG=es node scripts/checks/run.js --only <name>`.

## 7. The checks that enforce this

`node scripts/design/audit.js` (the CSS is on the tokens) and `node scripts/checks/run.js` run all of them; `python scripts/release.py` runs them before anything ships.
`color-vision` (no color-only marks, every mark color registered; the math is `scripts/design/cvd.js`), `design-look` (how the built screens look, both styles, against `design/look.json`), `no-bleed` (text out of its box, on every screen), `story-fit` (every frame of every story, phone and desktop), `titles-never-cut`,
`targets` (44 px, the phone and the desktop strip), `nav-desktop` (the desktop strip: chosen item in view, one thing chosen, Tab and arrow keys,
reachable with a mouse alone, Jump to and My pages), `axe` (accessibility and contrast, Bento and Original), `print`, `sheet-pull`, `stories-*`, `easy-*`,
`spanish-switch`, `levies`, `profiles`, `council-votes`, `us-graph`, `screen-states`, `shell`, `offline-shell`, `update-wins`, `us-explain` (every committee,
subcommittee, and role has our two short lines or the official words or "No description on file"; no ranking word, no dash, the word limits; the sheet, profile,
hover card, and Index say the same first line; the review notice and the official words with their source and date; a role note closes four ways).

## 8. Gaps to close next

1. ~~A check that no one-off color or font size is used outside the tokens.~~ Done: `scripts/design/audit.js` (see `docs/design-system.md`). Still to do: move the legacy values onto tokens.
2. A check that no new input sends its value anywhere (network log while typing). **(no check yet)**
3. Reduced-motion and larger-text runs of the story and sheet checks.
4. A 320 px run of `story-fit` and `no-bleed` on every screen. (Started Oct 5, 2026: `story-fit` opens every ballot-question story, Issues 3 and 10 to 14, again at 320 px.)
5. Screenshot review by a person for each release, kept with the build record.
6. Device testing with VoiceOver, TalkBack, NVDA, switch, and voice control; five residents, one task each (Phase 6 of `plan-guided-stories.md`).

## 9. Tools and standards the owner will add

Put them here as they arrive, with what each one governs and how it is checked: design tokens or a Figma library (what it replaces
in section 4), a component kit (it must not break the single offline file with its exact build hash, both styles, the accessibility checks, or the
Spanish pipeline), writing or reading-level tools, accessibility audit tools, and any review checklist.
