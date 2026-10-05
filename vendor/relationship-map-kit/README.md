# Relationship map kit (vendored copy, map pieces only)

This folder is a copy of part of the relationship-map kit, kept so the origin of the United States graph is on record.
The copy is not edited in place. Our own code that follows it lives in `ext/cx-us-map.jsx` (the map, the sheet, Solo)
and `ext/cx-d3.js` (the d3 parts the map uses).

| | |
| --- | --- |
| Kit | relationship-map-kit, first version, the working files behind the VC Fest 26 network guide (vcfest.app), Sept 29 and 30, 2026 |
| Fingerprint | `e58ee28385f7` (SHA-256 of `relationship-map-kit.zip`: `e58ee28385f79a6903870cf766393fbf0ae84fcd9898aaad8333bf011f2b237d`) |
| Owner | Futureland. The kit and everything in this folder belong to Futureland. |
| Builder | Equalpoint is credited as the builder ("built by Futureland and powered by Equalpoint", in the kit's own README). |
| Copied | October 5, 2026, from the unpacked kit, after checking every file in it against the zip byte for byte |
| Template | `src/flx-vcfest.template.html`, SHA-256 `14d9dbafbe6c0affb3fbb056056bb09997a60442103e7cef3da6ad49c9236e59` |

## What is here

Each file is an exact copy of the lines named. Nothing was changed, so the hash still matches the kit.

| File | From the kit | What it is | SHA-256 |
| --- | --- | --- | --- |
| `map/sky.js` | `src/flx-vcfest.template.html`, lines 1511 to 1875 | The map: force simulation (`skyBuild`), fit and zoom, momentum, drawing, priority labels with box collision, hit testing, tap, hold and drag, keyboard, the Show panel, Solo | `588de07bdadb53cc3054eae7d1f62c2ebf18a037fbc9284017a8922d80b9c056` |
| `map/sheet.js` | same file, lines 1952 to 2020 | The details drawer on a computer and the sheet on a phone: detents, pull, glide, the map riding with the sheet | `485c778d46dff5458575115f9a13f613804c834dc73423b8fdfc71c33d4177fa` |
| `map/exits.js` | same file, lines 2940 to 2988 | Easy ways out: Done, tap outside, swipe down, and the back gesture (history layers) | `3ef3fdc0ed1c48ee6e66098cfd9fdc404a6e8ad5090e9e7fbeda8b6ae2e73683` |
| `tests/test_phone_sky.py` | `src/test_phone_sky.py` | Tap, hold, swipe down, tap the map | `029a5c64b8c205cff466f7da48fa97b445f0070e0d0573193bf8be7b66bed581` |
| `tests/test_momentum.py` | `src/test_momentum.py` | The glide after a flick, no glide after a rest, a flicked sheet | `7c63c9647842e879cd2e2b85fdd86ee9043898b36ffa554b84b8ec781e78020c` |
| `tests/test_sheet_pull.py` | `src/test_sheet_pull.py` | The sheet opens part way, pulls up, follows the finger, glides | `2585a5e381a43339600dbaddc41f255fbd390fceba79c56b58423bc4d5474a49` |
| `tests/test_exits.py` | `src/test_exits.py` | Every sliding screen has Done, closes on tap outside, swipe down, and back | `6a716b94b02cbb0af9254f5345907cdd045bc249360dd19d03a3784e7805b911` |
| `tests/test_narrow.py` | `src/test_narrow.py` | 320 and 260 wide screens, Larger Text, Reduce Motion | `8535e0516bf6484806b4e1743adf9673a345df258eddacda494a7617085fc131` |
| `KIT-README.md` | `KIT-README.md` | The kit's own notes | `a7c15c7474b4be57e4dd125461700eb201e5ffb62ab8bacbcba3e9e79e5c2dc8` |
| `relationship-map-template.md` | `relationship-map-template.md`, kept beside the kit | How the kit is meant to be reused | `373371e0b2729f3b10ee3fdfc63c8f8a0843005a42399b27c031298c11efd47e` |

The kit's tests are Python and Playwright and run against the VC Fest page. They are kept here as the record of what the
map must do. What they assert is ported to our own browser checks in `scripts/checks/run.js` (Node and puppeteer), under
the names `us-map`, `us-map-touch`, `us-map-sheet`, and `us-map-narrow`.

## Left out on purpose

- The match engine (`flx_vcfest_match.py`), its strength words, and every part of the page that ranks or scores. The
  United States graph shows recorded ties only. "Strong", "Some", and "Light" are not used, and no distance on the map
  means "more like you".
- The code screen (`flx-gate.template.html`, `test_gate.py`), the intro email drafts, the agenda, the venue map, the
  people directory, the 3D front page (`home/`), the intake sheets, the dictionary, the export, and the speaker photos.
- `d3.min.js` (all of d3). We use only the parts the map needs, from npm at the same versions d3 7.9.0 bundles:
  `d3-force` 3.0.0 and `d3-zoom` 3.0.0 (with `d3-selection` 3.0.0 and the small modules they bring). They are pinned in
  `package.json` and `package-lock.json`, and `build.py` bundles `ext/cx-d3.js` with esbuild into the page, so no script
  is loaded from another site and the page's Content-Security-Policy hashes still cover every script. d3 is by Mike
  Bostock, ISC license; the notice travels with the bundle (`CXD3.notice`).
- `axe.min.js`. The repository already pins `axe-core` for its accessibility checks.
- The kit's stylesheet. The map is styled with this app's design tokens (`design/tokens.json`), in both styles.

## How the kit's three slots are filled

The kit's page reads three slots: side A, side B, and the groups on the map. `cxUsMapModel` in `ext/cx-us-map.jsx`
fills them from the federal record (`data/us-landscape-2026.json`):

| Kit slot | VC Fest 26 | United States graph |
| --- | --- | --- |
| groups on the map (`industries`) | industries | hubs: the Senate, the House, the executive branch, the federal courts, and every full committee (not policy areas) |
| side A (`companies`) | startups | people: members of Congress, the President and Vice President, Presidents who appointed sitting judges, the cabinet, and sitting judges |
| side B (`funds`) | investors | agencies and courts, each as its own kind |
| links (`fits`) | investor fit, with a strength | a recorded relationship, with no strength: Sits on, Heads or leads, Appointed by, Funds or oversees, and the structural Part of. Every link names the record it comes from |

The map's physics follows the kit: hubs push each other apart (charge -480), members are pulled to the hubs they belong
to, nothing overlaps, a gentle pull to the middle keeps the whole map together, the simulation runs ahead before the
first drawing with a fixed random seed (26, as in the kit) so the same record always opens the same way, and the map then
fits itself to the screen.
