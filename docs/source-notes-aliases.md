# Source notes: well known names that find a neighborhood

Written Oct 7, 2026 for `ext/cx-aliases-text.jsx` (between the ALIASES-TEXT markers). In the place picker, typing one of these names finds its
neighborhood and says "{name} is part of {neighborhood}." (Kamm's Corners included: Brent chose "is part of" for every row). The list is
interpretive, not official data: until a person reads each row against its page and runs
`python build.py --mark-aliases-reviewed "Name"`, the line says "A person has not reviewed these names." Any later change between the markers
clears the mark.

The one source for every row is the City Planning Commission's **Connecting Cleveland 2020 Citywide Plan** (the 2024 file):
https://www.clevelandohio.gov/sites/clevelandohio/files/planning/Connecting%20Cleveland%202020%20CWP-%20FULL%20DOCUMENT%202024.pdf
Page numbers are PDF page numbers. The file was downloaded and each page read as text on Oct 7, 2026 (`pdftotext` page by page); every quotation
below was found on the page named. The neighborhood names are spelled exactly as in `data/geo-2026.json` (`overlap.wards2026`), and every
one of them is there.

**Address check.** For each row, one public address in the named place was matched by the U.S. Census Bureau's geocoder (the Public_AR_Current
benchmark, Oct 7, 2026) and the point was tested against the neighborhood outlines in `data/geo-2026.json` (`layers.spa`, point in polygon). This
was run once for this list, from a development machine, with public institutional addresses; no resident's address was used and the app does not
do this. All eleven landed in the neighborhood the row names.

## Rows the plan names directly (7)

| Type this | Finds | Page | The plan says | Address check |
| --- | --- | --- | --- | --- |
| Little Italy | University | 479 | University Neighborhood Plan Summary: "The University neighborhood encompasses two of Cleveland's most well known places, University Circle and Little Italy." | 12000 Mayfield Rd: University |
| University Circle | University | 479 | The same sentence. | 1 Wade Oval Dr: University |
| Gordon Square | Detroit Shoreway | 342 | Detroit-Shoreway Neighborhood Plan Summary, Assets: "the West 65th/Detroit retail district anchored by the Gordon Square Arcade and a growing cultural, performing arts and entertainment environment". | 6500 Detroit Ave: Detroit Shoreway |
| Warehouse District | Downtown | 384 | Downtown Neighborhood Plan Summary, Assets: "growing residential neighborhoods in the Warehouse District, Euclid and E. 4th, and around Cleveland State University". | 1001 W 9th St: Downtown |
| Playhouse Square | Downtown | 384 | The same list: "major cultural institutions and districts, including the Rock and Roll Hall of Fame, Great Lakes Science Center and Playhouse Square, the second largest theater complex in North America". | 1501 Euclid Ave: Downtown |
| Larchmere | Buckeye-Shaker Square | 453 | Buckeye-Shaker Neighborhood Plan Summary, Assets: "the Larchmere Boulevard antiques district". | 12500 Larchmere Blvd: Buckeye-Shaker Square |
| Kamm's Corners | Kamm's | 304 | The plan's own section is titled "Kamm's Corners Neighborhood Plan Summary". The current neighborhood layer calls the area "Kamm's", so typing the longer name found nothing without this row. | 16800 Lorain Ave: Kamm's |

The Kamm's Corners row reads "Kamm's Corners is part of Kamm's." because every row uses "is part of". It is the same place under a longer name, so
Brent may prefer "is another name for" for this one row; that is a one-line change in the picker and in the Spanish.

## Rows Brent chose to include that rest on less (4, marked "weak" in the file)

| Type this | Finds | Page | What the plan or the city says, and why it is weak | Address check |
| --- | --- | --- | --- | --- |
| Battery Park | Detroit Shoreway | 342 | Named only as a housing project, in the Detroit-Shoreway Assets: "new housing projects such as Ashbury Tower and Battery Park on former industrial sites". A project, not a neighborhood name in the plan. | 8000 Detroit Ave: Detroit Shoreway (a nearby address, not the site) |
| AsiaTown | Goodrich-Kirtland Pk | 390 | The City's Payne Avenue page says "decorative, AsiaTown crosswalks along the part of the corridor that runs through AsiaTown" (clevelandohio.gov/transportation-mobility/payne), and its Transformative Arts Fund project page lists "Neighborhood: AsiaTown" for the AsiaTown Square Dancing Lot, 3236 Payne Ave (clevelandohio.gov/city-hall/office-mayor/taf/projects, and the news page). The plan's Goodrich-Kirtland Park section says the neighborhood has "the City's largest concentration of Asian-Americans" (p. 390) and the aim to "highlight the city's Asian-American community" on Payne Avenue. No page says which Statistical Planning Area holds AsiaTown, so the pairing rests on the address check, not on one sentence. | 3236 Payne Ave: Goodrich-Kirtland Pk |
| Chinatown | Goodrich-Kirtland Pk | 392 | The plan's Goodrich-Kirtland Park map note for Payne Avenue: "Identify neighborhood as Chinatown with signage and banners". An older name for what the City now calls AsiaTown. | The same Payne Avenue address |
| Waterloo | North Shore Collinwood | 506 | North Collinwood Neighborhood Plan Summary: "create an entertainment district in North Collinwood by investment in the Waterloo District". The plan says "North Collinwood"; the current neighborhood is "North Shore Collinwood". No source read documents that rename. | 15800 Waterloo Rd: North Shore Collinwood |

The existing record matcher already pairs AsiaTown with Goodrich-Kirtland Pk (`CX_PL_ALIAS` in `ext/cx-place.jsx`, a text match on the titles of
records, with no source noted). That is separate from this list, which only finds a neighborhood from typed letters in the picker.

## Names left out on purpose (no source that supports one neighborhood)

- **Midtown.** The plan shows a "Midtown Mixed-Use District" as a zoning idea, not a neighborhood in the city's list.
- **West Park / Westpark.** The plan says residents use it for the area west of W. 117th, across several neighborhoods (Kamm's, Jefferson, and others).
- **The Flats.** It spans Downtown and Cuyahoga Valley. No single answer.
- **Hingetown, Asia Plaza.** No official or planning source found that names a neighborhood.
- **Puritas-Longmead, Lee-Miles, Industrial Valley, Woodland Hills.** Plan-era names. The current list uses other names (Bellaire-Puritas,
  Lee-Harvard and Lee-Seville, Cuyahoga Valley); no document read maps old to new, so none was guessed.

## No row needed (the letters already find it)

Slavic Village (finds Broadway-Slavic Village), Ohio City, Shaker Square (finds Buckeye-Shaker Square), Collinwood (finds both Collinwood-Nottingham and
North Shore Collinwood), Puritas, Kamm, Tremont, Edgewater, Glenville, Hough. A name found by its letters never gets an alias line.

## How the picker uses the list

- Typing is compared with capitals, accents, apostrophes, periods, and hyphens ignored ("kamms" finds Kamm's).
- A neighborhood is shown when its name holds the letters, or when at least three typed letters start an alias or one of its words ("Little" finds Little Italy).
- The alias line ("{name} is part of {neighborhood}.") appears only for a neighborhood the letters do not already find, and the unreviewed notice appears
  once, under the alias lines only, never on a name result or on the empty-search message.
- What is typed stays in the field. It is never sent, saved, or put in a link.
