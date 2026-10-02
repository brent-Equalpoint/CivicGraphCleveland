# The Cleveland Civic Graph design system

This is the look the app has today, written down so it stays the same unless someone changes it on purpose. It does not redesign
anything. `docs/design-standards.md` says how to design and build; this file says what the pieces are.

- **Source of truth:** `design/tokens.json`. The tables below are generated from it (`node scripts/design/doc.js`).
- **What guards it:**
  - `scripts/design/audit.js` fails if the CSS uses a color, text size, corner radius, or weight that is not a token or in
    `design/legacy.json`, if the phone palette in `ext/cxm.css` stops matching the tokens, or if a contrast pair falls under 4.5:1.
  - The `design-look` browser check compares how the real screens render (type, color, shape, spacing of 60 or so parts, in both
    styles, phone and desktop) with `design/look.json`.
  - `docs/design-system.md` is checked against the tokens by `scripts/test_design.js`.
- **Where the system is not finished yet:** the CSS still uses many one-off values from before this file existed. They are listed in
  `design/legacy.json` and allowed to stay, but no new one may be added. Today, about 46% of color uses, 75% of text-size uses, 91% of
  corner radii, and all font weights are on the system (`node scripts/design/audit.js --explain` prints the current numbers). The next
  step is to move the CSS onto the tokens as custom properties, area by area, with `design-look` proving each move changed nothing.

## How to change the look on purpose

1. Say why in the change (who is it for, what was wrong). Reuse an existing component first.
2. Edit `design/tokens.json` (add or change a token), then the CSS.
3. Run `node scripts/design/audit.js --explain` and `node scripts/design/doc.js`.
4. Build, look at it (phone 390 px and 320 px, desktop, English and Spanish, both styles).
5. `DESIGN_UPDATE=1 node scripts/checks/run.js --only design-look`, then read the diff of `design/look.json`. Every line in that diff is
   something that looks different now. If a line is a surprise, it is a bug.
6. Run all checks. Write the change in `STATE-OF-BUILD.md`.

## How to add a component

Check `components` in the tokens first. If nothing fits, build it from the tokens, put its CSS beside the nearest existing component, add
it to `components` in `design/tokens.json`, add a probe for it in `LOOK_PAGES` in `scripts/checks/run.js`, and add it to a page the
`axe`, `no-bleed`, and `story-fit` checks open.

## The system

<!-- GENERATED-START (scripts/design/doc.js) -->

### Color: the two styles

Both are required and every screen is checked in both. Names are the CSS custom properties on `.cxm` in `ext/cxm.css`.

| Name | Bento Blue (default) | Original (orange) |
| --- | --- | --- |
| `--bg` | `#0c0c0e` | `#141210` |
| `--tile` | `#17171a` | `#1e1a17` |
| `--tile2` | `#1f1f23` | `#27221e` |
| `--line` | `#2a2a30` | `#3a322b` |
| `--ink` | `#ecebe7` | `#f4eee8` |
| `--mut` | `#b9bcc6` | `#c9bdb2` |
| `--faint` | `#9a9eaa` | `#a89c91` |
| `--acc` | `#2f66f3` | `#c2410c` |
| `--acc2` | `#4c82ff` | `#ff7a38` |
| `--soft` | `#9dbaff` | `#ffb48a` |
| `--soft2` | `#dfe7ff` | `#ffe2d2` |
| `--navy` | `#1c2340` | `#33211a` |
| `--navy2` | `#26305a` | `#452c20` |
| `--on-acc` | `#fff` | `#fff` |

Shared accents: `--amber` `#ffd36b`, `--teal` `#2bb3a3`, `--purple` `#9b7bff`, `--coral` `#ff8a7a`.

### Color: on dark pages, sheets, and stories

| Use | Value |
| --- | --- |
| Text on dark | `#f4f2ee` |
| Softer text on dark | `#e1ded8` |
| Text on the accent | `#fff` |
| Text on the white story button | `#0c1a45` |
| Link on dark | `#ffd1a9` |
| Focus ring | `#f1b083` |
| Notice banner | `#ffd36b` |
| Card tint, light to strong | `#ffffff0d`, `#ffffff14`, `#ffffff1f` |
| Strong hairline | `#ffffff2e` |

### Type

Font: Schibsted Grotesk (fallback Inter, ui-sans-serif, system-ui, sans-serif); labels in IBM Plex Mono. Sentence case; no all-caps labels. Smallest readable size: 12 px.

| Step | Size |
| --- | --- |
| caption | 12 px |
| small | 13 px |
| fine | 14 px |
| body | 15 px |
| body-large | 16 px |
| lead | 17 px |
| lead-large | 18 px |
| title | 22 px |
| title-large | 24 px |
| display | 32 px |
| headline | 34 px |
| figure-small | 44 px |
| figure | 58 px |
| figure-large | 64 px |

Weights: regular 400, medium 500, semibold 600, bold 700, heavy 800. Line height: body 1.45, tight 1.1, headline 1.06. Tracking: headline -0.035em, figure -0.045em, label 0.08em.

### Shape, space, targets, motion

Corner radius: small 8 px, control 10 px, medium 12 px, card 14 px, large 16 px, tile 18 px, sheet 20 px, pill 999 px, round 50%.

Spacing steps (px): 2, 4, 6, 8, 10, 12, 14, 16, 18, 22, 28. Phone gutter 18 px. Smallest control: 44 by 44 px. Motion: quick 200ms, base 250ms, slow 350ms; with reduced motion: no movement, no slide, no flash.

### Contrast pairs that must stay at 4.5:1 or better

| Text | Background | What |
| --- | --- | --- |
| `#ffffff` | `#2f66f3` | white on the Bento blue |
| `#ffffff` | `#c2410c` | white on the Original orange |
| `#ecebe7` | `#0c0c0e` | text on the Bento page |
| `#f4eee8` | `#141210` | text on the Original page |
| `#b9bcc6` | `#17171a` | muted text on a Bento card |
| `#c9bdb2` | `#1e1a17` | muted text on an Original card |
| `#ffd1a9` | `#0c0c0e` | links on a dark page |
| `#141210` | `#ffd36b` | text on the amber banner |
| `#0c1a45` | `#ffffff` | text on the white story button |

### Components that exist

| Component | CSS | Code |
| --- | --- | --- |
| story | `.cxm-story, .cx-story-reader` | ext/cx-story.jsx, ext/cxm-today.jsx. ring, progress bars, label, big line, figure, quote, support line, source; background is the accent |
| ring | `.cxm-ring, .cx-stories-ring` | ext/cxm-today.jsx |
| number-pad | `.cxm-keys, .cxm-kdisp` | ext/cxm-ballot.jsx, ext/cx-levies.jsx |
| read-more | `.lv-more-story, .cxm-drop` | ext/cx-levies.jsx, ext/cxm-core.jsx |
| card | `.cxm-card, .cxm-tile` | ext/cxm-*.jsx |
| accent-card | `.cxm-keycard, .lv-tile` | ext/cxm-ballot.jsx, ext/cx-levies.jsx |
| sheet | `.cxm-sheet` | ext/cxm-core.jsx. pulls down to close |
| button | `.cxm-btn, .cxm-btn2, .cx-story-btn` | ext/cxm-core.jsx |
| notice | `.cx-notice, .cxm-notice` | ext/cx-i18n.jsx, ext/cxm-core.jsx |
| chip | `.lv-chip, .sp-chip` | ext/cx-levies.jsx, ext/cx-seat.jsx |
| header-action | `.cxm-top-actions button, .atlas-header-actions button` | ext/cxm-core.jsx, build.py |
| profile-page | `.sp` | ext/cx-seat.jsx |

<!-- GENERATED-END -->

## Patterns (how the pieces go together)

- **A story frame:** progress bars, the ring and name, a small label, one big line or one big figure, one support line, an optional
  source. Blue (the accent) for money and the ballot. Frames with their own controls (number pad, Read more, answers) turn the tap
  zones off and show a Next button.
- **A cost figure:** the number first, large; what it is per, smaller, under it; "not your tax bill" always near it.
- **Read more:** a white pill that opens a dark panel on the same screen. Sections in the same order every time: what it pays for, what
  changes, what happens if it fails, what people have said, questions to ask yourself, the official wording.
- **A card that opens something:** accent background, big figure, one line of what it is, "See the story" with an arrow.
- **A notice:** one short line and one button, at the top under the header, never taller than three lines.
- **A record page (profile):** header, then the same sections in the same order every time.
