# Plan: permits, property, business, and land development

Status: proposed, nothing built, written 2026-10-06 for Brent and the team. Every source below was read on 2026-10-06, read only; nothing was fetched into `data/`. It sits beside `docs/plan-records-feed.md` (where these rows are listed), `docs/plan-agenda-calendar.md`, and `docs/plan-mobile-restructure.md`.

## Brent's ask

"Permits are interesting. Real estate purchasing is interesting. Don't know if it's here. Business." Then: "Land development like this is also interesting," with a competitor's card about a $75 million parking garage.

## The answer in one paragraph

Permits: yes, and well. The City of Cleveland publishes every building permit since 2015, every demolition, every construction project application since 2025, and active condemnations as free map layers with an open license, updated daily or weekly, already tagged with the 2026 ward and neighborhood. Property sales: yes for prices, dates, deed types, and parcels (a county layer from 2021 on, with no names at all); buyer and seller names exist only on the county's parcel layer, for the last sale of each parcel, and they name private homeowners, so we take only names that are clearly businesses or public bodies. Business: mostly no. Cleveland publishes no list of business licenses, the state's business filings site answered every request with a maintenance page, and the state's liquor permit lookup reset every automated connection. Planning boards publish agendas as PDFs and almost never their decisions. Tax abatements: a county layer lists abatement and TIF parcels by type, with no names; the city publishes no list of abatements it granted. Land development can be first class: one dated, sourced timeline per address or parcel, built from these records and the Council files we already hold.

## Rules that shape everything

From `CLAUDE.md` and the build so far: receipts, not scores; every row has a source, a date, and the day we pulled it; official records update by themselves, while news and anything interpretive wait for a person; nothing personal leaves the browser; private people are never targeted; plain English, no dashes; both styles, both layouts, light and dark, English and Spanish. And one more that this plan adds: **a private person's name never enters `data/` or `site/`.** The repository is public on GitHub, so a name hidden only on screen would still be published. Names are dropped when they are fetched.

## What official data exists

Short names: **City** is the City of Cleveland's ArcGIS service, `https://services3.arcgis.com/dty2kHktVXHrqO8i/arcgis/rest/services` (the same service our ward maps come from). **County** is the Cuyahoga County Fiscal Officer's layers at `https://services7.arcgis.com/GXM8JipKyc0m6HBi/arcgis/rest/services` and `https://gis.cuyahogacounty.gov/server/rest/services`. Every row was read 2026-10-06.

### (a) Building permits (City, Department of Building and Housing)

| Source | What it holds | Form, size, update | Names of people | Use |
|---|---|---|---|---|
| Issued Building Permits, `City/Building_Permits` (Hub item c08ddeaf2d1e41679a03103ff4e9fe17) | Permit number, address, type and subtype, work description, use group, job value, fees, file and issue dates, current task and status, parcel, contractor business and license, a link to the city's Accela page, and fields the city adds: 2026 ward, 2014 ward, neighborhood, tract, longitude and latitude | API (JSON, GeoJSON), 1,000 rows a request. 201,363 rows, issued Jan. 2, 2015 to Oct. 2, 2026. Weekly on Sundays | `CONTRACTOR_NAME` is a person; no owner field | Yes |
| Building Permit Applications, `City/Building_Permit_Application_Tasks` | The same plus application status history | 217,208 rows since 2015. Daily | Contractor names | Later, for "applied" dates |
| Construction Project Applications, `City/Project_Records` | Project id (PRJ26-021871), project type, building use, number of units, job value, approved and approval date, status history, associated records, and applicant name, business, and address | 7,224 rows, 2025 on. Daily | `APPLICANT_NAME` and `APPLICANT_ADDRESS` are people | Yes, business only |
| Demolition Permits, `City/Demolition_Permits` | Permit, address, parcel, file, issue, and close dates, contractor business, job value, ward fields. Covers city, land bank, and private demolitions | 11,090 rows, 2015 to Sept. 23, 2026. Weekly | No | Yes |
| Active Condemnations, `City/Current_Condemnations` | Parcel, address, condemnation date | 2,592 rows (still active only, no history). Weekly. "Condemnation does not automatically result in demolition." | No | Yes, with that sentence |
| Issued Building Violations, `City/Complaint_Violation_Notices` | Violation id, dates, status, address, parcel, violation type, citations, a free text field | 60,875 rows. Weekly | Free text could hold anything | Not now |
| Accela Citizen Access, aca-prod.accela.com/COC | The city's own permit pages, searchable without an account | HTML only; each layer row links to its page | Contact names | Link only |

Terms: the portal's Terms of Use (data.clevelandohio.gov/pages/terms-of-use) say the data is "provided as a public service, on an 'as is' basis", with no warranty, and that the portal "is designated under Open Data Commons Open Database License (ODbL)". Every Building and Housing item says ODbL. ODbL asks for attribution and asks that a public adapted database be offered under ODbL too, so our derived permit file would carry an ODbL notice (decision 6). No rate limits are stated. Risks: field names are misspelled and differ between layers (`CONTRATOR_` in issued permits, `CONTRACTOR_` in applications, `Contrator_` in demolitions); the ward and neighborhood fields are added by the city's analytics office, so we check them against our own ward map.

Not published: no forward list of planned demolitions (the Demolition Bureau page, https://www.clevelandohio.gov/city-hall/departments/building-housing/divisions/demolition-bureau, gives a phone number), and no public list of the vacant building registry (Chapter 3106, February 2024; https://www.clevelandohio.gov/residents/codes-ordinances/residents-first/vacant-properties).

### (b) Real estate transfers and sales (County)

| Source | What it holds | Form, size, update | Names of people | Use |
|---|---|---|---|---|
| Cuyahoga Parcel Sales 2021 to Present, `County/CuyahogaSalesData` | Parcel, sale amount, sale date, deed type (45 codes), address, city, land use, building facts, tax values | API and CSV export. 138,445 rows countywide, 45,017 in Cleveland, Jan. 4, 2021 to Aug. 31, 2026. "Updated Monthly" | **None.** No buyer or seller field | Yes |
| Combined Parcels, Cleveland only, `County/Open_Data_Parcels/MapServer/0` | One row per parcel: owner, grantee, grantor, last transfer date and amount, mailing name and address, land use, zoning, tax abatement codes and abated values | API. 163,096 Cleveland parcels. Last transfer dated up to March 5, 2026 (about seven months behind) | **Yes**, homeowners and their mailing addresses | Business names only |
| MyPlace (myplace.cuyahogacounty.gov) | Search by owner, parcel, or address; a Transfers tab "updated daily" | HTML only | Yes | Link only |
| Recorder's official records (cuyahoga.oh.publicsearch.us) | Deeds back to about 1810, by grantor or grantee | HTML only; copies $2.00 a page | Yes | No. This is the true official record; we link to it |
| City Land Bank Owned Parcels, `City/City_Landbank` | 16,449 parcels the city's land bank holds | API, weekly, ODbL | No | Yes |
| Cuyahoga Land Bank available properties (https://cuyahogalandbank.org/all-available-properties/) | About 135 listings with ward and status | HTML table, no terms found | No | Later |

Terms: the county says its data is a "free public service on an 'as is' basis" and "is not intended to, nor does it, constitute an official public record of Cuyahoga County", and its portal says "This system is for authorized use only" (citing Ohio Revised Code 2913.04). Before a nightly job pulls from it, we ask the county's GIS office in writing that automated reading is welcome (decision 5). The old county open data site says it goes offline in the third quarter of 2026; the sales layer is listed on the new hub.

What we measured (counts only, no names read out): **4,817 Cleveland sales in 2026** through Aug. 31 in the sales layer; 2,703 were one family lots, 1,220 two family, 91 three family (83% one to three family homes). Deed type codes: WAR 2,779, WD 1,085, SUR 390, SV 162, FID 121, LIM 113, and 39 others. Many deed types are not market sales, so a price is never shown without its deed type, and no code gets a plain word until we have read the county's own list of codes. On the parcel layer, 2,739 Cleveland parcels have a last transfer in 2026; by a rough word list (LLC, Inc., Corporation, bank, church, city, land bank, and so on) the buyer is a business or public body on about 1,617 of them (59%), and both sides look like private people on about 835 (30%). The list is rough and is a measurement, not a rule we would ship as is.

Countywide: the sales layer covers all 59 communities (14,553 sales in 2026 through Aug. 31, including North Olmsted 384, Olmsted Falls 252, and Olmsted Township 171).

Ohio law lets a "designated public service worker" have their name replaced with initials on the county's internet records (Ohio Revised Code 319.28). A copy we kept would undo that. Another reason we never keep names.

Not official, for context only: Case Western Reserve's NEO CANDO has transfers back to 1975 and is free, with an account for some parts. We do not use it.

### (c) Businesses

| Source | Status on 2026-10-06 | Names of people | Use |
|---|---|---|---|
| Ohio Secretary of State business filings (ohiosos.gov, businesssearch.ohiosos.gov, publicfiles.ohiosos.gov) | Every page, including the free monthly report files, answered HTTP 403 with a "Website Maintenance" page (also on Oct 5). From search snippets only: free monthly "New Business Filings" text reports with charter number, name, statutory agent, filer, incorporator, and date; bulk data by a purchase form with a fee that "varies" | Statutory agents and incorporators are often private people at home addresses | Not now |
| Ohio Division of Liquor Control permit lookup (apps2.com.ohio.gov/liqr/PermitLookup) | Reset every automated connection. From snippets: search by name, class, status, dates, address, county, with a CSV or Excel export, refreshed daily at 4 a.m. OPAL (opal.ohio.gov) loaded and offers reports on permit holders and ownership | Ownership disclosures name people | Later, if it answers |
| City business licenses, Division of Assessments and Licenses (https://www.clevelandohio.gov/city-hall/departments/finance/divisions/assessments-licenses/licenses-permits) | "Over 140 types of licenses and permits", and no public list or dataset | | No source |
| Active Contractor Registrations, `City/Active_Contractor_Registrations` | Weekly, ODbL | Business names | Later |
| City economic development grants | Press releases only (for example Sept. 2, 2026); no dataset | | No source |
| County Economic Development active loan list (https://cuyahogacounty.gov/home/economic-development-active-loan-list) | A PDF "as of 11/30/2025", about 170 loans, borrower, purpose, source, amount, approval date; no address | Some borrowers are sole proprietors | Not now |

How a liquor permit ties to Council: under Ohio Revised Code 4303.26 (https://codes.ohio.gov/ohio-revised-code/section-4303.26), the Division may not issue a new class C or D permit, or a transfer, until it notifies the city's legislative authority and offers a hearing; Council asks for one within 30 days. Cleveland does this by resolution ("Objecting to a New C1 Liquor Permit at 4025 East 131st Street", 23-2026). In the resolution we read (738-2023), the text names the Division's permit numbers, so a permit number can join a Council file to the state's permit record. 53 Council files in 2026 are about liquor permits, and 37 of our 58 geocoded addresses come only from them. The WHEREAS clauses are standard text used for every objection; they are not findings about a business, and the page will say so.

### (d) Near this theme

| Source | What exists | Use |
|---|---|---|
| Board of Zoning Appeals (https://www.clevelandohio.gov/city-hall/boards-commissions/planning/zoning-appeals) | PDF agendas for 16 meetings, May 18 to Oct. 5, 2026, each item with a calendar number, address, ward, council member, the owner or appellant by name (including tenants), code sections, and the request. **No decisions posted**; the resolution "will be mailed to you" | Agenda rows, names removed |
| City Planning Commission (https://www.clevelandohio.gov/city-hall/boards-commissions/planning/meetings) | PDF agendas marked "DRAFT" and slide decks; items carry the Accela project id (PRJ26-011433), address, ward, council member, neighborhood, type, representatives by name, and stage. **No minutes or outcomes posted** | Agenda rows, joined to projects by id |
| Landmarks Commission (https://www.clevelandohio.gov/city-hall/boards-commissions/planning/landmarks/agenda) | 2026 PDF agendas; outcomes only when a later agenda mentions them ("Tabled April 23rd, 2026"); old minutes being digitized by the library | Agenda rows |
| Design Review (https://www.clevelandohio.gov/city-hall/boards-commissions/planning/design-review); Board of Building Standards and Building Appeals (https://www.clevelandohio.gov/city-hall/boards-commissions/planning/building-standards-appeals/agendas) | A calendar PDF; agendas only, no decisions | Not now |
| Zoning map, `City/Zoning_Authoritative/FeatureServer/5` | 2,535 zoning polygons with the ordinance number that set each one (`ORD_NO_1`); last edited Nov. 20, 2025 | Later, for rezoning ordinances |
| County abatements and TIFs, `County/Abatements_and_TIFs` (https://fiscalhub.gis.cuyahogacounty.gov/pages/abatements) | Parcel, year, type (CRA 3,596, TIF 1,383, URDC 59, EPA 48, and a few others), TIF market value; 5,120 rows, 3,062 in Cleveland; "updated on a quarterly basis", last edited March 9, 2026. No names | Yes |
| City residential abatement program (https://www.clevelandohio.gov/city-hall/departments/community-development/programs-services/tax-abatement) | Program rules and maps of where each level applies; **no list of abatements granted** | Boundaries only |
| Ohio Department of Development CRA list (https://development.ohio.gov/business/state-incentives/ohio-community-reinvestment-area) | The law (Ohio Revised Code 3735.672) says the state publishes a CRA list yearly; its pages answered 404, and the data portal's set was last refreshed Feb. 9, 2023 with no columns | No source |
| Tax Incentive Review Council (https://cuyahogacounty.gov/boards-and-commissions/board-details/government-operations-and-oversight/tax-incentive-review-council) | Cleveland's 2026 meeting "TBD"; no Cleveland reports found | No source |

Old links on planning.clevelandohio.gov now redirect, and some deep links to agenda PDFs answer 404. Any PDF source needs the City Record treatment: keep the last good copy, hold back what does not parse.

## Privacy policy we recommend for these records

1. **Drop names at the door.** Each fetcher keeps only the fields we show. A name is kept only if it is clearly a business or a public body, by a written rule in one shared function with tests. Anything the rule is unsure of is treated as a person and dropped. Trusts and estates named for a person ("John Smith Trust", "Estate of") count as people.
2. **Businesses and public bodies by name.** LLCs, corporations, partnerships, banks, nonprofits, churches, universities, hospitals, land banks, the city, the county, and the state appear as recorded.
3. **Home sales between private people are not listed one by one.** On one to three family homes where neither side is a business or public body, we show only counts by ward and month (in this shape, numbers made up: "Ward 7, September: 41 home sales between private owners"), never on a map, never ranked or compared, or not at all (decision 3).
4. **House numbers on homes.** A permit, sale, or condemnation on a one to three family home shows the hundred block ("2400 block of" the street), not the house number, unless a business or public body is on the record, or it is a demolition or new construction. Commercial buildings, apartments of four or more units, and public property show the full address. The land use comes from the county's parcel record, joined at fetch time.
5. **Free text on homes is not shown.** A permit's work description can name people or describe a home inside; for one to three family homes we show the permit type and job value only. Elsewhere the city's own words are shown, marked as the city's.
6. **Contractors and applicants as businesses only.** `CONTRACTOR_NAME`, `APPLICANT_NAME`, and `APPLICANT_ADDRESS` are never kept. A business name that reads as a person's name falls under rule 1. An applicant is labeled "Applicant (business)", never "owner" or "developer": on PRJ26-021871 the applicant business is an architecture firm.
7. **No lookups of people.** No search by a person's name anywhere. A search by address returns only what these rules allow.
8. **Planning board agendas.** The address of a public hearing is shown (the hearing exists so neighbors can come), with the ward and the request; owners', appellants', and tenants' names are not.
9. **Downloads follow the same rules,** because the CSV is made from what is on screen.
10. **Asking us to hide something.** A person may ask, through the privacy contact Brent names (decision 4), to hide a record about their home; we hide it and say on the page that a record was hidden on request.

## What residents would do with it

- **"What is being built near me?"** Construction projects, permits over a set kind (new building, addition, change of use, demolition), and condemnations in my ward or neighborhood, newest first.
- **"Permits in my ward this month."** The Records feed with Type: Permits, Ward: 7, Last 30 days; counts per type.
- **"Who is buying on my street?"** At business level only, in this shape (a made-up illustration, not a record): "Bought by Example Holdings LLC, March 5, 2026, $185,000, deed type WAR, 2400 block of Example Avenue". Private sales appear only as counts (rule 3).
- **"What did Council decide about this place?"** On a Council file with an address or parcel, a fold "Records at this address": the permits, projects, sales, abatements, and demolitions there, each with its date and source. Linked receipts, never a verdict ("the TIF led to"), never a guess.
- **"Is a liquor permit near me being objected to?"** The Council objection, the state permit record (when the state's lookup answers), and the hearing dates, joined by permit number.

## Land development as a first class thing

A **development** is not a story we write. It is a parcel or an address that has at least one development record, with every official record about it on one dated timeline.

**What makes a development.** A Council file of a development kind (in 2026 titles, counted by their words: 11 TIF agreements, 7 abatement or exemption items, 34 sales, conveyances, or acquisitions, 11 leases, 7 economic development loans or grants, 5 Advanced Energy District additions, 6 rezonings, 9 landmark designations, 9 street vacations, 6 encroachments, 3 brownfield items), a construction project application, a demolition, or a planning board agenda item. A single roof or furnace permit is not a development; it appears on the timeline of a place that already is one.

**How records are joined.** By the county parcel number first (the city's permit layers and the county's layers share the same eight digit number), then by the address as normalized by the rules At City Hall's Look it up already uses (West 25th Street equals W 25TH ST), including printed ranges ("2164-2214 West 25th Street" covers the numbers between). Each joined row says how it was joined ("Same parcel", "Same address as the ordinance's title"). A link by topic or name only (a citywide ordinance and a project of that kind; an entity's name in a title with no address) is never made by code; a person may add it to a reviewed list, marked "Added by a reviewer" (decision 8).

**The card, in our terms.**

| Part | Example |
|---|---|
| Kind, in words | Development |
| Date | The latest dated record: Sept. 15, 2026 |
| Place | 10681 Carnegie Avenue · Ward 6 · University (ward and neighborhood chips, from our ward map) |
| Headline, templated from fields | "Construction project approved: S-2 public parking garage (open), job value $75,000,000, 10681 Carnegie Avenue, Ward 6" |
| Who, if a business | Applicant (business): Perspectus Architecture |
| Source | City of Cleveland, Construction Project Applications, PRJ26-021871, pulled Oct. 6 |
| Then | The timeline, oldest first, each row dated and sourced |

The headline uses only the record's own fields (status, building use, job value as printed, address, ward) and a short list of template words, tested the way `scripts/test_headline.js` tests ours: a word that is not in the record or the template list fails the build. No adjectives, no "major", no "boost", no "controversial". Nothing predicts, praises, or criticizes a project.

**No photos.** We show no photos of projects; a card is plain.

**A note on the competitor's card.** It reads "Cleveland Clinic Files for $75M, 1,500-Space Parking Garage on Euclid Avenue" at 8911 Euclid Avenue, June 9. The official project record we found for a $75,000,000, roughly 1,500 space public garage is PRJ26-021871 at 10681 Carnegie Avenue, filed June 1, 2026, approved Sept. 15, Ward 6, with an architecture firm as the applicant business; the owner is not in the record. We could not confirm the two are the same project. A card built from fields says only what the record says.

### Timelines we can build today from real records

**2060 East 9th Street, Ward 5, Downtown.** Shows how a place's records line up.

| Date | What the record says | Source |
|---|---|---|
| Dec. 24, 2024 | Sale recorded, $10,956,667, deed type LIM; land use "ELEVATOR OFFCE >2 ST" as the county prints it (the parties are not in this layer) | County sales layer, parcel 10127012 |
| Apr. 28, 2025 | Building permit B25011826 issued, $18,000, rooftop banner "as per Landmarks approved plan"; contractor business Diamond Signs and Graphics | City permits |
| Mar. 26, 2026 | Construction project PRJ26-010735 filed: hotel, apartments, retail, 277 units; applicant business Vocon | City project applications |
| May 28, 2026 | Council file 686-2026 introduced: acquire and re-convey property owned by East9th Scarlet, LLC | Legistar |
| May 29, 2026 | Council file 693-2026 introduced: Tax Increment Financing Agreement with East9th Scarlet, LLC | Legistar |
| June 10, 2026 | Five elevator permits issued (decommissioning); contractor business TK Elevator Corporation | City permits |
| July 10, 2026 | PRJ26-010735 approved | City project applications |
| July 15, 2026 | 686-2026 passed, 13 Yea, 2 Nay | City Record |
| Aug. 19, 2026 | 693-2026 passed as amended, 11 Yea, 2 Nay, 2 Absent | City Record |

**629 Euclid Avenue, Ward 5, Downtown.** Building permit B25019589 filed June 13, 2025 and issued Jan. 14, 2026, $12,100,000, interior alterations to a 17 story masonry building, use group R-1 (transient housing); electrical permit BCE26-004411, Feb. 18, 2026, $1,500,000, whose own words name "the Holiday Inn Express conversion"; Council file 594-2026 (Advanced Energy District) introduced May 7 and passed June 1, 2026; the county's 2026 abatement layer lists TIF on parcel 10127331 and CRA and TIF on parcel 10127043.

**1200 West 58th Street, Ward 7, Detroit Shoreway.** Council files 98-2026 (TIF agreement with Westinghouse-Breakwater Properties, LLC; passed March 23, 2026, 9 Yea, 5 Nay, 1 Absent) and 104-2026 (Advanced Energy District; passed the same day, 14 Yea, 1 Absent). The city's permit layer's latest permits there are from 2022 and 2019. The timeline shows that as it is and draws no conclusion.

**10022 Madison Avenue, Ward 12, Cudell.** 368-2026 (purchase for Fire Station No. 23; Municipal Services and Properties recommended denial May 11, the Committee of the Whole recommended approval June 1, passed 15 Yea), 457-2026 (intent to appropriate, adopted July 15, 15 Yea), 928-2026 (appropriation, on the Aug. 19 agenda), and one project application at the address.

What we will not link by code: a data center project application (PRJ26-017258, 3560 East 55th Street, filed May 5, 2026, "In Process") and the citywide moratorium on data center permits (556-2026, passed July 15, 2026). Whether one applies to the other is a legal question; code does not decide it.

### How many of our addresses match today

Of the 58 addresses already geocoded from 2026 Council titles (`data/place-2026.json`), 57 have a matched street address. Matched by exact address against the city's layers on 2026-10-06:

| | Addresses | With any city permit layer record | With a building permit issued since Jan. 1, 2025 |
|---|---|---|---|
| Liquor permit files only | 37 | 21 | 11 |
| Land, money, leases, and other files | 20 | 9 | 6 |
| All | 57 | 30 | 17 |

By layer: issued building permits at 29 addresses, project applications at 11, demolitions at 2, active condemnations at none. Matching by parcel and by printed ranges (2164 to 2214 West 25th Street, 1301 to 1325 Chester Avenue) should add more. The 43 ward money items in `data/place-2026.json` name wards, not addresses, so they join to a place only through a ward.

### Suburbs

Cleveland's permit layers cover Cleveland only. The county's sales and abatement layers cover all 59 communities, so North Olmsted, Olmsted Township, and the rest have sales and abatements from day one. Each suburb runs its own building department and planning or zoning board (an Ohio township that has adopted zoning has its own township zoning commission and board of zoning appeals; we did not read Olmsted Township's or North Olmsted's pages); we found no countywide permit dataset in the county's open data and did not survey the 58 other communities one by one. Recommended scope: Cleveland only first; then countywide sales and abatements (no new sources); then a suburb's permits and zoning only where it publishes an official machine readable source, one community at a time (decision 2). Outside Cleveland the place chips are the community and its county council district (`data/districts-2026.json`), not wards.

## Data model and fetchers

| File | Written by | One row | Size |
|---|---|---|---|
| `data/permits-2026.json` | `scripts/fetch_permits.py` | Permit or project id, kind (permit, project, demolition, condemnation), subtype, status, file, issue, approval, and close dates, job value as printed, address or hundred block (rule 4), parcel, ward, neighborhood, land use class, contractor or applicant business if allowed, the city's words if allowed, Accela link, pulled at | 2025 and 2026 only: about 35,000 permits plus projects and demolitions |
| `data/property-2026.json` | `scripts/fetch_property.py` | Parcel, sale date, amount, deed type and its plain word, land use class, address or hundred block, ward, neighborhood, buyer and seller business names if allowed, pulled at | 2026: about 4,800 Cleveland sales |
| `data/abatements-2026.json` | `scripts/fetch_property.py` | Parcel, year, type and its plain word, TIF market value | 3,062 Cleveland rows |
| `data/boards-2026.json` (later) | `scripts/fetch_boards.py` | Board, meeting date, item number, address, ward, request, project id, agenda link | PDFs, a few hundred rows |
| `site/development/development-2026.json` | `scripts/development.py`, a pure function of `data/` | One entry per parcel or address with its joined rows | Loaded only when needed |

The site files are split by ward (`site/permits/ward-07.json`) so a ward page loads one small file.

**Fetchers run by `scripts/refresh.py`, with the City Record's safeguards:**

- Read the layers page by page (1,000 or 2,000 rows a request), recent rows nightly and the whole window again each Sunday after the city's weekly reload.
- Keep a SHA-256 of each response and of each written file in the log, as the build does.
- Hold back the whole snapshot (keep the old file, print why, fail `refresh.py --check`) if: a required field is missing (field names matched loosely, because the city's spelling varies); the row count for the same window drops by more than 5%; a date is outside the window; a job value or sale amount does not parse; more than 2% of rows disagree between the city's ward field and our own point in polygon test on `data/geo-2026.json` (single disagreements are listed, never fixed by hand); or the name rule meets a field it has not been tested on.
- A test (`scripts/test_property_privacy.py`) runs every kept name through the business rule and fails if any looks like a person, and fails if any dropped field (`CONTRACTOR_NAME`, `APPLICANT_NAME`, `APPLICANT_ADDRESS`, owner, grantee and grantor of private people, mailing address) appears anywhere in `data/` or `site/`.
- Each source is registered in `scripts/us_sources.py` with `license_status: review_required` until Brent confirms the terms.

**Ward and neighborhood.** From the layer's own longitude and latitude, or the county parcel's position, tested against the 2026 ward map and the neighborhood map in `data/geo-2026.json` (with shapely, as `refresh.py --districts` already uses). The Census geocoder (`scripts/fetch_place.py`) is the fallback for an address with no position.

## Where it appears

- **Records** (`docs/plan-records-feed.md`): new types Permit, Project, Demolition, Sale, Abatement, and Development, with the same card, filters, map, and download.
- **A "Building and land" view** of Records, with the Development timelines as their own list.
- **A Council file's record page:** "Records at this address" (a fold under "Where to read it").
- **The ward view:** "Built and sold in Ward 7": counts by type for the last 30 days, then the list. Counts, never compared with other wards.
- **The map:** points for permits and projects, with the hundred block rule for homes. No shading by count.
- **At City Hall:** an agenda item with an address gets "Records at this address".

## What we will not do

No scores, grades, or "hot neighborhoods". No rankings of investors, buyers, contractors, or developers, and no "top buyers". No lookups of individual owners. No predictions, price trends, or market charts. No "Spotlight" or "Things to watch". No news. No guessing an owner from an applicant. No link by code that implies a legal effect. No summary written by a machine.

## Phases (each ends with the full gate and screenshots)

Each phase can be handed to a build agent as written.

0. **Decisions and terms (Brent).** Below. Write to the county about automated reading. Agree the ODbL notice.
1. **First slice: projects, demolitions, and "Records at this address" (backend then frontend agent, about 2.5 days).** Files: new `scripts/fetch_permits.py` (Construction Project Applications and Demolition Permits only, 2025 on; business names through one shared rule in new `scripts/names.py`; rule 5 for free text on homes), `scripts/refresh.py`, `scripts/us_sources.py` (`city_project_records`, `city_demolitions`, `review_required`), new `scripts/test_property_privacy.py`, new `scripts/development.py` (joins by parcel, address, and printed range), `ext/cx-record.jsx` (a "Records at this address" fold), `build.py` (log the match count). Done when: no person's name or address is in `data/` or `site/` (the privacy test fails on a planted one); the ward check passes; every joined row says how it was joined; the build log reports how many of the 57 legislation addresses have a record; `refresh.py --check` and the new browser check `permits` pass in dark, light, and Spanish.
2. **All city permits in Records (backend then frontend agent, about 2 days).** Add Issued Building Permits and Active Condemnations to the fetcher with rules 4 and 5 (hundred block and no free text on one to three family homes, using the county parcel's land use), per ward files under `site/permits/`, and the Permit, Project, Demolition types in Records. Done when: `permits` checks the hundred block rule on a planted home, `perf-budget` passes (nothing loads before Records or a ward page asks), and the counts per type add up.
3. **Development timelines (backend agent for the script, frontend agent for the screens, about 3 days).** Files: `scripts/development.py` (one entry per place), new `ext/cx-dev.jsx` (the card and the timeline), new `scripts/test_dev_headline.js` (every headline word is in the record or the template list). Done when: the four example timelines in this plan render from data (their county rows once phase 4 is in), the headline test fails on a planted adjective, and no code made link exists without a parcel or address join.
4. **County sales and abatements (backend then frontend agent, about 3 days, after the county answers).** Files: new `scripts/fetch_property.py`, `data/property-2026.json`, `data/abatements-2026.json`. Done when: every price shows its deed type, business names come only from a parcel whose last transfer matches the sale's date, private home sales appear only as decision 3 allows, and the privacy test passes.
5. **Planning boards (backend agent, about 3 days).** New `scripts/fetch_boards.py` for City Planning Commission, Board of Zoning Appeals, and Landmarks agenda PDFs, names removed, joined to projects by PRJ id and to addresses; rows say "On the agenda" only. Done when: a PDF that does not parse is held back with its reason and the last good file stays.
6. **Liquor permits (backend agent, about 2 days, blocked)** until the state's lookup answers a script; joined by permit number from the resolution text.
7. **Suburbs (backend agent, about 1 day)** for countywide sales and abatements with community and county council district chips; permits and zoning per community after a probe.

Total about 17 days after the decisions. **First slice that ships value fastest: phase 1,** about 2.5 days: every Council file at the 20 addresses that are not liquor permits gets its "Records at this address", and the liquor ones too.

## Risks

- **The record is not the owner.** Applicants are often architects or contractors. The card says "Applicant (business)" and nothing more.
- **Prices mislead.** A sheriff's deed, a gift, or a transfer between related companies is not a market price. The deed type is always beside the amount.
- **Rough business rule.** A rule that misses a person's name publishes it. The rule errs toward dropping, and the privacy test runs on every pull.
- **County terms.** "Not an official public record" and "authorized use only". We ask first and link the official record (the Recorder and MyPlace) on every row.
- **Lag.** The parcel layer's last transfer is about seven months behind; the sales layer is monthly; permits are weekly. Every row shows its pulled date.
- **Size.** Permits are large; load by ward, never at first paint; `perf-budget` holds it.
- **Looks like a "where the money goes" map.** No shading, no totals by ward, no ranking.
- **ODbL share alike.** A public derived file must be offered under ODbL.

## Decisions needed

1. **Order.** Recommended: city permits and "Records at this address" first, then development timelines, then county sales, then planning boards; business filings and liquor permits wait until their sources answer.
2. **Scope.** Cleveland only first (recommended), then countywide sales and abatements, then suburbs one by one.
3. **Private home sales.** Counts by ward and month only (recommended), or not at all.
4. **Privacy contact** for a request to hide a record about a home (the privacy policy draft still says "to be added").
5. **County terms.** Brent (or the team) writes to the county GIS office before the nightly job reads its layers.
6. **ODbL.** Agree that derived permit files carry an ODbL notice and attribution to the City of Cleveland.
7. **Hundred block rule** for one to three family homes (recommended), or full addresses for every permit.
8. **Reviewed links.** Whether a person may add a "related" link between records that code cannot join (a citywide ordinance and a project), marked as added by a reviewer and run through a review command like `--mark-levies-reviewed`.
9. **Reviewer:** Brent reads the template word list, the business name rule, and the deed type plain words before release, and runs the review command himself.
