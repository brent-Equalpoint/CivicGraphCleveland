# Plan: light mode

Written Oct 2, 2026; built the same day (see "As built" below). It follows `docs/design-standards.md` and `docs/design-system.md`: the look is written down
in `design/tokens.json`, and every change to it goes through the tokens, the audit, and the `design-look` check.

The goal: a resident can read the app in daylight, or with a dark screen they cannot use, in the mode they prefer, without losing anything:
the same layouts, both styles, both languages, the same contrast and color-vision rules. Dark stays the default look until a person
chooses otherwise or their phone says so.

## Decisions (made Oct 2, 2026)

| Question | Decision |
| --- | --- |
| How is the mode chosen? | **System, Light, Dark**, default **System**. In Settings on the phone (Light or dark), and a Mode button in the desktop header next to the style switch. Kept in this browser only (`cx-mode`). |
| Do both styles get a light mode? | **Yes.** Bento Blue light and Original light: four looks. |
| What stays the same in light? | The stories, the number pad, and the accent cards keep the accent and white text. The notice banner stays amber. |
| Maps and graphs | **Stay as they are for now:** the desktop map and graph panels and the desktop story reader stay dark inside a light page. Making them light is a later job. |
| Print | Already light; unchanged. |
| Contrast target | The same as dark: 4.5:1 for text, 3:1 for large text and marks, every pair in the tokens. |

## Where we stand (measured)

- **Dark only.** There is no `color-scheme`, no `prefers-color-scheme`, no light palette. Two styles exist: `data-cx-theme` `bento` or `original` on `html`, chosen with the style switch and kept in `cx-theme`.
- **The phone app is half on variables.** `ext/cxm.css` has 14 palette variables on `.cxm` for each style (`--bg`, `--tile`, `--ink`, `--acc`...), and they would flip cleanly. But 128 distinct colors are written directly in that file (the palette variables are among them), and the desktop file `ext/cx.css` has 170. Today 46% of color uses are on the tokens.
- **Pages with fixed dark colors by design:** the profile pages (`.sp`), the levies guide (`.lv`), story overlays, the number pad, sheets' dark panels. They were written as "fixed colors on a dark page", so they do not flip on their own.
- **The desktop app is the compiled Sep 23 release.** Its two stylesheets carry about 566 distinct colors. The Bento look is made by `bento.py`, which re-emits every color rule under `html[data-cx-theme="bento"]` with mapped colors. The compiled JavaScript also sets some SVG fills inline (map and graph colors).
- **What already helps:** the tokens file and audit, the `design-look` snapshot (47 parts, both styles), `axe` in both styles, `CHECK_LANG`-style switches for running checks, the print stylesheet as a reference for a light palette, and `color-vision` for the marks.

## Approach

Light is a **second palette over the same structure**, not a second set of screens.

1. **Get the colors onto tokens first (Phase 0).** Light mode is cheap only if a color is a variable. The audit already ratchets new one-offs out; this phase retires the old ones in the areas that matter.
2. **Describe light in the tokens (Phase 1).** `design/tokens.json` gets `modes.light` for both styles, its own contrast pairs and color-vision groups. The audit checks them like the dark ones.
3. **One switch (Phase 2).** `data-cx-mode="light"|"dark"` on `html`, set by a few lines in the page head before first paint so nothing flashes, plus `color-scheme` so browser controls match.
4. **Phone (Phase 3), then desktop (Phase 4).** The desktop gets a generated light layer from a new `light.py`, in the same way `bento.py` made Bento: re-emit every color rule under `html[data-cx-mode="light"]` with lightness mapped, then hand-fix what mapping cannot know.
5. **Every check runs in all four looks (Phase 5)** before anything ships.

## Phases

| # | Phase | Done when | Size |
| --- | --- | --- | --- |
| 0 | (not needed: the generator replaced it) Move the phone app's and the shared pages' colors onto CSS variables (palette, overlays, text-on-dark, focus ring, link, chip colors), dark unchanged | `design-look` reports no change in either style; the audit's legacy color list is at least 60% shorter; dark screenshots match | 1 to 2 sessions |
| 1 | Light palettes in `tokens.json` (Bento and Original), with contrast pairs and color-vision groups; doc regenerated | `audit.js` and `cvd.js` pass for light; every text pair 4.5:1; the focus ring, links, and status dots have light values | 1 session |
| 2 | The switch: System, Light, Dark; stored in `cx-mode`; applied before paint; `color-scheme`; `theme-color` follows; works in the offline file and the hosted site | Changing the phone's setting changes the app live; no flash of the wrong mode on load; the choice survives a reload | 1 session |
| 3 | The phone app in light | Every tab, sheet, story, Easy mode, and the number pad read well in both styles; stories stay on the accent; `no-bleed`, `story-fit`, `targets`, `axe`, `color-vision` pass in light | 2 sessions |
| 4 | The desktop app in light: `light.py` layer, then hand fixes (map and graph fills, drawer, header, charts, profile pages, levies, stories reader) | Every desktop page passes the same checks in light, in both styles | 2 to 3 sessions |
| 5 | The checks and the docs | `CHECK_MODE=light` runs every check; `design/look.json` holds four looks; `STATE-OF-BUILD.md` and the standards updated; screenshots of each look kept for review | 1 session |
| 6 | People | A Spanish pass (no new text expected, only the mode names); residents try it outdoors and with large text; low-vision and color-vision review | with people's time |

## What will be hard

- **Yellow, amber, and peach on white.** The notice banner, the amber status dot, the focus ring (`#f1b083`), and links (`#ffd1a9`) are chosen for dark pages and fail on white. Light needs darker versions of each, and every one is a token with a contrast pair.
- **Tints.** Cards made with white at 5 to 12% opacity (`#ffffff0d`) become black at the same strength. These need a variable, not a search and replace.
- **Shadows.** Dark mode barely uses them; light mode needs them to separate cards.
- **The compiled desktop app.** Inline SVG fills in the JavaScript cannot be reached by a stylesheet layer. Options: patch them to variables with an exact-match patch in `build.py` (the project's rule for the compiled app), or leave maps dark inside a light page, which is a decision for the owner.
- **Photos and portraits** are fine; official PDFs open in a new tab and are unaffected.
- **The story blues.** White text on the Bento blue is 4.77:1 and on the Original orange 5.2:1; they stay as they are in light, so the stories look the same in both modes.
- **Size.** A generated layer adds to the single offline file; today's added files were about 500 KB (Spanish) so a budget is needed.

## As built (Oct 2, 2026)

- **No separate "move colors onto variables" phase was needed.** The light look is generated: `light.py` reads the dark rules and re-emits every color rule under `html[data-cx-mode="light"]` with the color turned into its light counterpart (lightness inverted for surfaces and text, a bright mark kept in its hue but deepened, white washes turned into black washes, links and focus rings pointed at one variable that is blue in Bento and burnt orange in Original). Rules for parts on the accent are left alone, and so are the dark islands. It runs on the phone and shared pages (`ext/cxm.css`), on the saved desktop stylesheets, and on the Bento layer. `@media print` is skipped. Dark is never touched.
- **Hand-written parts:** the palette variables in `ext/cxm.css` (checked against `design/tokens.json` by the audit), and `ext/cx-light.css` (appended last): the desktop palette, the dark islands, and fixes for parts the generator cannot know (tiles on the accent, the ledger chips, notes dimmed with opacity).
- **The switch:** `data-cx-mode` is set by a few lines in the page head before first paint (so nothing flashes), follows the browser live while on System, and is changed from `CX_ModeChoice` (phone Settings) and `CX_ModeButton` (desktop header).
- **Proof dark did not change:** `design/look.json` holds four looks now; its 18 dark screens are identical to the ones recorded before light mode existed.
- **Checks:** `mode-switch` (System follows the browser live, Light and Dark override and are remembered, set before parse, the header button cycles). `CHECK_MODE=light` (and `CHECK_THEME=original`) runs any check in light; `axe`, `no-bleed`, `story-fit`, `color-vision`, `targets`, `titles-never-cut`, and `print` pass in light in both styles, and `scripts/release.py` and CI run them. The checks run in dark by default (the headless browser's own setting is light).
- **Color vision in light:** the meaning groups have light values (`colorsLight`), and any mark color on a light screen must be registered.

## Left to do

1. **Phase 6, with people:** residents using it outdoors and with large text; low-vision and color-vision review; a Spanish speaker's look at "Claro u oscuro".
2. **The maps and graphs** (desktop map panel, constellation, the U.S. graph, the phone map previews) and the desktop story reader in light. They stay dark for now by decision.
3. **Spot polish:** the generated colors pass contrast everywhere checked but were not chosen by a designer; a person should walk every screen in both styles and mark what looks off.
4. **`theme-color`** for the phone browser bar to follow the mode, and a `prefers-contrast` look for light.
5. **Size:** the generated light layers add about 130 KB to the single offline file.

## How it will be checked

- `audit.js`: light tokens, no new one-off colors, contrast pairs for light.
- `cvd.js`: the same meaning groups with their light values.
- `design-look`: 47 parts on 9 screens, in four looks.
- `axe`, `no-bleed`, `story-fit`, `targets`, `titles-never-cut`, `color-vision`, `print`: all in light, both styles, both layouts, English and Spanish.
- A new `mode-switch` check: System follows the emulated setting, Light and Dark override it, the choice is remembered, and there is no flash on load.

## Rules that apply

Everything in `CLAUDE.md` and `docs/design-standards.md`: both styles, both layouts, no left accent stripes, plain English, no em dashes, a clean rebuild with the hash recorded, and `STATE-OF-BUILD.md` updated. Dark must look exactly as it does today after every phase (`design-look`).

## Not in this plan

A third style, automatic switching by time of day, per-screen modes, or a high-contrast mode (the app already follows the system's contrast and forced-colors settings; a dedicated high-contrast look is a separate plan).
