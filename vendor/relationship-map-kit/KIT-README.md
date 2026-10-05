# Relationship map kit

The working files behind the VC Fest 26 network guide (vcfest.app), built by Futureland and powered by Equalpoint, Sept 29 and 30, 2026. Use it to build the same guide for another event or app: two groups of people or organizations, matched with plain-English reasons, shown as a map, a matches list, a people directory and an agenda.

Start a new build from these files. Rebuilding from scratch loses a lot of tested detail (phone gestures, accessibility, the code screen).

## What's inside

| File | What it does |
| --- | --- |
| `src/flx-vcfest.template.html` | The whole app in one page: map, Matches, People, Agenda, profiles, menus. Data is poured in at build time. |
| `src/flx_vcfest_match.py` | Match engine. Reads the two lists, groups people into organizations, scores every pair, writes the reasons. |
| `src/flx_build_vcfest.py` | Build. Pours the data into the template. `--site DIR` makes a web page for any host; `--lock` adds the code screen. |
| `src/flx-gate.template.html` | The code screen. The guide is scrambled with a key made from the code, so the code is never stored in the page. |
| `src/flx_vcfest_export.py` | Spreadsheet of every match with reasons, for the organizers. |
| `src/flx_vcfest_photos.py` | Speaker photos from the event's agenda web page (optional; adapt the address and page markup). |
| `src/vcfest_dictionary.json` | Plain-English word list (venture terms). Replace for a different subject. |
| `src/test_*.py` | Phone and computer checks run in a real browser (see Tests). |
| `src/d3.min.js`, `src/axe.min.js` | The drawing library (put inline in the web page) and the accessibility checker used by tests. |
| `intake/event-*.xlsx` | Blank sheets with the exact columns the match engine reads. Pouring the VC Fest lists into them gives identical results (247 startups, 77 investors, 7,916 fits). |
| `intake/candidates-and-organizations.xlsx` | Blank sheets for the candidate version, with the rules on the Read me sheet. |
| `samples/agenda.sample.json` | The shape of the agenda file, with placeholder values. |
| `home/` | Optional 3D front page (three.js, code adapted from Dioramas by Blendi, MIT license). |

Left out on purpose: the VC Fest attendee lists (they contain emails), the matched data, and the speaker photos (owned by JumpStart, VC Fest and the speakers).

## Build steps

Python 3 with `openpyxl`, `scikit-learn`, `Pillow` and `cryptography`; tests need Playwright with Chromium.

```
# 1. match: two lists in, data out (also writes vcfest-data.all.json for the spreadsheet)
python3 flx_vcfest_match.py founders.xlsx investors.xlsx vcfest-data.json

# 2. agenda: write vcfest_agenda.json by hand from the event's agenda page (see samples/)
#    photos are optional: without vcfest_speaker_photos.json the build simply shows no faces

# 3. build: the private preview page, plus a web page folder for Vercel
python3 flx_build_vcfest.py flx-vcfest.template.html vcfest-data.json OUT.html --site site/
FLX_SITE_CODE='THECODE' python3 flx_build_vcfest.py flx-vcfest.template.html vcfest-data.json OUT.html --site site/ --lock

# 4. the organizers' spreadsheet
python3 flx_vcfest_export.py vcfest-data.json vcfest-data.all.json matches.xlsx

# 5. deploy: zip site/index.html flat (index.html at the top of the zip) and drop it into Vercel
```

The build prints a short fingerprint (sha) for every file it writes. Quote it whenever you hand a file over, so everyone knows which version they have.

## What the page reads

The page is built around three slots. Rename what they mean, keep the slots:

- `companies`: side A (VC Fest: startups; candidate version: candidates)
- `funds`: side B (VC Fest: investors; candidate version: organizations)
- `industries`: the groups on the map (VC Fest: industries; candidate version: issue areas)

Links between them:

- `fits`: side B to side A, as `[bId, aId, strength 0 to 2, [reason numbers]]`; reasons live once in `whyTable`
- `peers`: side A to side A, as `{a, b, kind, s, why}`
- `coinvest`: side B to side B, as `{a, b, score, why}`
- `meta.bands`: where Strong and Some start; `meta.review`: possible duplicates, listed and never merged

Strength words come from the spread of scores: Strong is roughly the top fifth, Some the next third, Light the rest. The page never shows a number score.

## Changing it for something new

Search the template for these and rewrite each one in plain words:

| Search for | Times in the template | What it is |
| --- | --- | --- |
| `VC Fest` | 56 | Event name in labels, About, calendar entries |
| `vcfest` | 25 | The event color mode's internal name (rename the label; the internal name can stay) |
| `JumpStart` | 5 | Who owns the event; the "Who owns what" section |
| `Atrium`, `Huntington`, `Cleveland` | 13, 2, 2 | Venue and city |
| `ohiovcfest` | 1 | Link to the official agenda |
| `startup`, `investor`, `founder`, `fund` | many | Side names |
| `fit`, `Strong`, `Some`, `Light` | many | Link words and strength words |
| `Draft intro` | a few | The intro email drafts; remove for anything political |

The venue map (`VPLAN` in the template) is the Huntington Convention Center, traced from the venue's own brochure. Replace it with the new venue or turn the Map layout off.

The match rules live in `flx_vcfest_match.py`: the must-haves (shared industry, matching stage, the investor invests where the startup is), the score parts, the strength cut points, and the founder-to-founder text similarity.

## Tests

Run against the preview page (`OUT.html`) or the site folder, as each file's first lines say:

- `test_exits.py`: every sliding screen has Done, closes on tap outside, swipes down, and the phone's back gesture closes it
- `test_menu_tools.py`: phone top menu; tool rows line up at standard and largest text with large tap targets
- `test_narrow.py`: 320 and 260 wide screens (iPhone Display Zoom and Safari text zoom); the phone's Larger Text, Reduce Motion and Increase Contrast are followed
- `test_sheet_pull.py`: the details panel pulls up to a quarter from the top of the screen, glides, and the map moves with it
- `test_phone_sky.py`, `test_momentum.py`: tap, hold, swipe, and the glide on the map
- `test_gate.py`: the code screen (reads the code from `FLX_SITE_CODE`)
- `test_people_agenda.py`, `test_people_chunks.py`, `test_vcfest_mode.py`, `test_index_click.py`, `test_dict.py`: tabs, color modes, accessibility checks

## House rules

- Emails and phone numbers never go on the page; the match engine never reads them, and the build stops if an email address shows up.
- Possible duplicate organizations are listed for a person to check, never merged. Names are never changed on a guess.
- Nothing about a person's identity is guessed.
- The page carries "noindex" so search engines skip it, and names who owns what.
- Plain words, no em dashes, no dots next to labels, no colored stripes down the side of cards, section labels in thin beige capitals.
