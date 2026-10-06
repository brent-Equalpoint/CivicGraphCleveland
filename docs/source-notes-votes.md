# Source notes: votes, actions, and positions

Written Oct 6, 2026 for phase 1 of `docs/plan-votes-actions-positions.md`. Every source below was read on Oct 6, 2026, by script and by eye, read only.
Nothing here marks a source as cleared: each is registered in `scripts/us_sources.py` with `license_status: "review_required"` (the city's own
two Council sources are also in the Bench's registry in `scripts/packets.py`), and stays that way until Brent reads its terms. Raw captures of the
county and court probes were kept outside the repository; the quotes below are copied from them.

## The city record, measured before any change (data as committed on Oct 6, 2026)

- **1,393 matters** in `data/legistar-2026.json` (Council's Legistar record, pulled Oct 5, 2026): Ceremonial Resolution 465, Emergency Ordinance 411,
  Communication 240, Item 168, Emergency Resolution 101, Ordinance 8.
- **451 are marked Passed. 417 had member-by-member names** (in `data/votes-2026.json`, from 39 City Record issues, retrieved Oct 2, 2026, 01:50 UTC).
- **34 Passed files had no names:** 27 emergency ordinances, 3 ordinances, 3 emergency resolutions, 1 communication.
- **17 files with names are not marked Passed:** all 17 are files numbered 2023 to 2025 (for example 1507-2025 and 1198-2024) voted on at 2026 meetings.
  They are not in the 2026 Legistar record (it lists files introduced in 2026), so they have no title or status in the app. None of them is a
  2026 file with a different status.

### Why the 34 had no names

1. **33 passed at the City Council meeting of Sept. 28, 2026.** Their roll calls are printed in the City Record of Oct. 2, 2026
   (https://www.clevelandcitycouncil.gov/sites/default/files/2026-10/City%20Record%2010-2-26.pdf), which came out after the stored snapshot was
   read. Every nightly run since then (Oct 3, 4, and 5) read that issue and refused it, by design: file 1044-2026 prints
   "Read third time in full. Passed. Yeas 13. Nays 0. Recusal 1." and then "Recusal: Griffin." The parser knew only Voting Yea, Voting Nay, and
   Absent, so the lists named 13 of 15 members, the vote did not add up, and the whole snapshot was held back. The Oct 5 nightly log says:
   `RuntimeError: votes: not stored, Record - Oct. 2, 2026: 1044-2026 on 2026-09-28 (Passed 13-0): the lists name 13 of 15 members`.
   The hold-back worked as designed; the gap was the word "Recusal".
2. **4-2026, the Rules of Order (a Communication).** The City Record of Jan. 9, 2026 prints its vote as a sentence in the MOTION section, not as
   lists: "The Rules of Order Governing the Council of the City of Cleveland for 2026-2029 were approved with 14 votes. Those who voted to approve
   the Rules: Council Members Bishop, Conwell, Davis, Gray, Griffin, Harsh, Howse-Jones, Hudson, Jones, Kazy, Polensek, Santana, Shah, Slife.
   Council Member Starr voted against the rules." The parser reads only the Voting Yea and Voting Nay lists, so it did not store this vote.
   Council's Legistar record has the same vote by name (below).

### What Legistar's own endpoints return (probed Oct 6, 2026)

Base: `https://webapi.legistar.com/v1/cityofcleveland`. Its help page (https://webapi.legistar.com/Help) lists `EventItems/{id}/Votes`,
`EventItems/{id}/RollCalls`, and `Persons/{id}/Votes`, and states no terms of use.

- `/matters/37251/histories` (906-2026): 3 rows (Safety Committee, Sept. 23, "recommended for approval"; Finance, Diversity, Equity and Inclusion
  Committee, Sept. 28, "recommended for approval"; City Council, Sept. 28, "approved as amended"). Each row has
  `"MatterHistoryRollCallFlag": 0, "MatterHistoryTally": null, "MatterHistoryPassedFlag": null`, and no mover or seconder.
- `/events/3918/eventitems` (City Council, Sept. 28): 95 items, all with `EventItemRollCallFlag` 0 and `EventItemTally` null.
- `/eventitems/100582/votes` and `/eventitems/100582/rollcalls` (906-2026 at that meeting): both `[]`.
- `/votes`, `/rollcalls`, and `/matters/37251/votes`: HTTP 404.
- **Across the whole year:** 141 meetings, 2,641 agenda items, 1,281 with an action and a file number. `/eventitems/{id}/votes` returned names
  for **164 items, all at City Council meetings, on 11 meeting days: Jan. 5 and 12, Feb. 2 and 9, March 2, 9, 23, and 30, April 6, May 11 and 18.**
  Nothing after May 18. Each has 15 rows. Words: Yea 2,246, Absent 153, Nay 2, and 14 blank (all on one item, 104-2026 on March 23, where only
  one member has a word). `/rollcalls` was `[]` for every item tried. No committee item (396 committee actions) has a vote.
- An example row, for 4-2026 at the Jan. 5 meeting (event item 97172, mover Jasmin Santana, seconder Kris Harsh):
  `{"VoteId": 90969, "VotePersonId": 265, "VotePersonName": "Austin Davis", "VoteValueId": 16, "VoteValueName": "Yea", "VoteResult": 1, "VoteEventItemId": 97172}`.
  Its 15 rows read 14 Yea and 1 Nay (Richard A. Starr), the same as the City Record's sentence above.
- **Agreement with the City Record.** Of the 164: 156 match the City Record's vote on the same file, meeting, and question exactly; 5 do not (all at
  the May 18 meeting, files 652, 655, 660, 663, and 667-2026: Legistar has Joseph T. Jones as Yea, the City Record prints him Absent, with a
  printed tally of 14 yeas); 1 is incomplete (104-2026); 2 have no City Record vote on that date (4-2026, above; and 676-2026, where Legistar
  records a vote on May 18 but Council's record and the City Record say it passed on June 1, so it is not used).
- The Legistar web page for a file (LegislationDetail.aspx) answered a script with a 19-byte page, so its "Action details" pop-ups and the labels
  of the API's unnamed fields (`MatterDate2`, `MatterEXText1` to `MatterEXText11`) could not be read. Those fields are not used.

The earlier note (`docs/civic-agent/votes-source-research.md`, Oct 1) said the votes endpoint returned an empty list. It does for recent meetings;
the Clerk entered votes in Legistar only for the 11 meetings above.

### Committee votes

None by name in any source read. Legistar holds no vote for any committee item; it has minutes for 10 meetings, all of City Council; committee
meetings have agendas only. The City Record prints each committee's report as one line before the final vote ("Approved by the Directors of
Finance; and Law; Committee on Finance, Diversity, Equity and Inclusion."), with no names.

### Committee actions that are in the record

- **Referred:** the City Record prints, at a first reading, "Referred to the Directors of Public Safety; Finance; and Law; Committees on Safety; and
  Finance, Diversity, Equity and Inclusion." with the meeting date. A file passed at its first reading under a suspension of the rules has none.
- **Heard (on the agenda):** Legistar events and their agenda items (`data/meetings-2026.json`), with the agenda, the meeting page, and minutes when posted.
- **Reported:** Legistar's committee actions, "recommended for approval" (394 in 2026), "recommended for denial" (2), "withdrawn" (1).

### The Mayor's actions

- Legistar has no action by the Mayor in any 2026 history or agenda item.
- The City Record prints no signature date, "approved by the Mayor", or veto for any 2026 file. Where it prints a law's full text (the "Adopted
  Resolutions and Passed Ordinances" section) it ends with "Passed September 21, 2026." and "Effective September 23, 2026." The ordinance's own
  text says an emergency measure takes effect "immediately upon its passage and approval by the Mayor", but the record does not say who signed or
  when, so the app shows the printed effective date and names no one.
- The word "veto" appears in the 2026 issues only in the Rules of Order text in the Jan. 9 issue ("Action on Mayor's Veto. When the Mayor refuses to
  sign an ordinance ..."). No veto of a 2026 file is printed.

## Every source

| Source | Address | Read | Machine-readable | By name? | Terms found | Completeness | Risks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| City Record (roll calls) | https://www.clevelandcitycouncil.gov/legislation-laws/city-record | Oct 6, 2026 | Weekly PDFs with a text layer, read with pdftotext | Yes: Voting Yea, Voting Nay, Absent, Recusal lists, with a printed tally | The page states no terms of reuse | 40 issues, Jan. 2 to Oct. 2, 2026 | The Clerk reissues some weeks as REVISED; a new printed word (Recusal) stops the whole snapshot until the parser learns it |
| City Record (actions) | the same issues | Oct 6, 2026 | The same PDFs | Committees by name, members not | As above | Referrals for 300 of 520 ordinances and resolutions (of the other 220, 190 passed at their first Council meeting, 16 were never on a Council agenda, 10 first came up after the newest issue, 4 other); approvals for 243 of 450 passed ordinances and resolutions; effective dates for 412 of them | Page breaks inside a sentence; a line outside any entry is held, never guessed |
| Legistar matters, sponsors, histories | https://webapi.legistar.com/v1/cityofcleveland/matters | Oct 6, 2026 | JSON API | Sponsors by name (sponsorship is not a vote) | None on the API help page | 1,393 matters introduced in 2026 | Unlabeled fields; the web pages answer scripts with 19 bytes |
| Legistar events and agenda items | `/events`, `/events/{id}/eventitems` | Oct 6, 2026 | JSON API | No | As above | 141 meetings, 1,838 agenda items with a file | No testimony or public comment |
| Legistar votes | `/eventitems/{id}/votes` | Oct 6, 2026 | JSON API | Yes, for 164 Council items, Jan. 5 to May 18 | As above | 11 of 22 Council meetings; none since May 18 | Disagrees with the City Record on 5 votes; one item incomplete |
| County Council legislation | https://cuyahogacounty.gov/council/resolutions (list by POST `/council/resolutions/CouncilResolution_read/`, form body `sort=&page=1&pageSize=300&group=&filter=&year=2026`) | Oct 6, 2026 | An undocumented grid endpoint returning JSON (`{"Data":[...],"Total":232}`): title, year, description, PDF address; status, sponsor, dates, and votes are only in each PDF | Yes, in each adopted PDF: "Yeas: Kelly, Sweeney, Casselberry, Gallagher, Schlelper, Conwell, Houser, Simon and Miller / Nays: None" (R2026-0257; the PDF spells Schleper as "Schlelper") | https://cuyahogacounty.gov/disclaimer: "Cuyahoga County does not guarantee the accuracy or timeliness of this information" and "The information and records contained on this site do not constitute the official record of any agency or entity." No reuse license | 232 resolutions (R2026-0001 to R2026-0263, some numbers missing), 7 ordinances, 5 pending, 2026; years 2011 to 2026; "As of September 26, 2023 legislation is electronically signed and searchable" | The endpoint is internal and can change; names in PDFs need matching to members; contract and appointment resolutions name private companies and people. council.cuyahogacounty.gov no longer resolves. The county has no Legistar: the Web API answers 500, "LegistarConnectionString setting is not set up in InSite for client: cuyahogacounty" |
| County Council minutes | https://cuyahogacounty.gov/council/council-meeting (for example https://cuyahogacounty.gov/docs/default-source/council/committees/council/2026/20260804-mtg--minutes.pdf) | Oct 6, 2026 | HTML list of PDF agendas and minutes; no feed | Split votes in prose: "The motion failed by a roll-call vote of 6 yeas and 5 nays, with Councilmembers Houser, Kelly, Sweeney, Casselberry, Gallagher and Schleper voting in the affirmative and Councilmembers Turner, Simon, Conwell, Jones and Miller casting dissenting votes." A unanimous vote names no one | The county disclaimer, as above | 2026 minutes posted for every meeting Jan. 13 to Sept. 8; Sept. 22 has an agenda only | Irregular file names; names of residents who spoke at public comment; inferring names from attendance would break the hold-back rule, so the adopted PDF's Yeas and Nays come first |
| County Executive actions | https://cuyahogacounty.gov/executive/news/executive-orders | Oct 6, 2026 | No: a hand-kept list of order PDFs ("EO2026-0002, August 21, 2026, Implementation of Posting Reduction of Rockside Road Culvert 0889 in the City of Bedford, Ohio.") | Not applicable | The county disclaimer | 2 orders in 2026, 3 in 2025, none listed for 2024; no list of signed or vetoed legislation; the 232 descriptions for 2026 contain no "veto" or "disapprov"; 52 are appointments the Council confirms | Signature dates are only in each adopted PDF's DocuSign block, which pdftotext lays out so the dates cannot be matched to signers with confidence; executive.cuyahogacounty.gov no longer resolves; the executive's news pages are news |
| Eighth District Court of Appeals | https://appeals.cuyahogacounty.gov/opinions-and-docket/weekly-case-decision-list (for example `/docs/default-source/weeklycasedecision/2026/oct-01-2026.pdf`) and https://www.supremecourt.ohio.gov/rod/docs/?source=8 | Oct 6, 2026 | The Reporter of Decisions table (caption, case number, author surname, citation, decided and posted dates, PDF); paging needs form postbacks. The weekly list is a PDF per week | Yes, in PDFs: "Lisa B. Forbes, P.J., Michael John Ryan, J., and Sean C. Gallagher, J., concur." | https://appeals.cuyahogacounty.gov/disclaimer repeats the county's; footer: "The Eighth District Court of Appeals shall not be liable for damages of any kind for use of this information, which is subject to change without notice." The Rules for the Reporting of Opinions make the Supreme Court website the Ohio Official Reports for courts of appeals | 566 rows for 2026, newest decided Oct. 1 | Panel and disposition are in PDFs only; opinions name private parties, including criminal defendants and family-law parties |
| Supreme Court of Ohio | https://www.supremecourt.ohio.gov/rod/docs/ and https://www.supremecourt.ohio.gov/rss/cases/dailyannouncement.xml | Oct 6, 2026 | The same table; an RSS 2.0 feed of daily case announcements (2,415 items, Jan. 19, 2019 to Oct. 6, 2026) | Yes, in PDFs: "KENNEDY, C.J., authored the opinion of the court, which DEWINE, DETERS, HAWKINS, and SHANAHAN, JJ., joined. FISCHER, J., concurred, with an opinion. BRUNNER, J., dissented, with an opinion." | No terms page found on the site. The Rules for the Reporting of Opinions: posted opinions "shall be permanently available to the public without charge"; the bound volumes control as to accuracy | 552 rows for 2026 | `/rod/` and `/rss/` answer 403.14 (a folder listing is refused; not script blocking); the feeds are about 1 MB each; Court News Ohio's feed is news and is not used |
| U.S. District Court, Northern District of Ohio | https://www.govinfo.gov/rss/uscourts-ohnd.xml (the court's own Opinions link goes to govinfo) | Oct 6, 2026 | RSS (latest 100), yearly sitemaps (2005 to 2026), and MODS records (case number, office, parties, date issued) with no key; the govinfo API answers 401 without a key | No structured judge field; the judge is in the opinion PDF only | https://www.govinfo.gov/about/policies: "public documents can generally be reprinted without legal restriction". The court's own privacy page still reads "This is a sample privacy policy" | Latest 100, Sept. 25 to Oct. 3, 2026 | The court's CM/ECF RSS is about one day of docket entries, not opinions, and its documents are behind PACER; heavy naming of private parties |
| U.S. Court of Appeals for the Sixth Circuit | https://www.opn.ca6.uscourts.gov/opinions/opinions.php and https://www.govinfo.gov/rss/uscourts-ca6.xml | Oct 6, 2026 | An HTML table of the last 10 days (opinion number, case, date, district, panel initials, for example "26a0276p.06", 25-3300, "William Fambrough v. City of E. Cleveland, Ohio - Northern District of Ohio at Cleveland", "RMK, JKB, JBN"); govinfo RSS and MODS | Panel by initials; author and dissents in the PDF only ("Before: KETHLEDGE, Chief Judge; BUSH and NALBANDIAN, Circuit Judges.") | None on the court's site; govinfo's notice for its copies | 12 opinions in the last 10 days; govinfo runs behind | No opinions RSS (`/rss/` answers 404); initials need a kept list of judges; private parties named |
| Congress.gov | https://www.congress.gov/ | Oct 6, 2026 | Blocked | Not applicable | Not applicable | Not applicable | Answered a script with HTTP 403 and a "Just a moment..." challenge page (5,534 bytes), as on Oct 5; registered as `blocked` (`us_congress_gov_committees`); official alternatives are govinfo.gov and the chamber clerks |

## What phase 2 does with the city record (built Oct 6, 2026; numbers in the plan's Status section)

- The City Record parser reads "Recusal" (stored as `recused`, never a no, its printed count checked), so the Oct. 2 issue is read and the 33 files
  from Sept. 28 get their names.
- 4-2026 gets its names from Legistar, shown with Legistar as the source; the 5 votes where the two records differ show the City Record's vote and
  a sentence naming the difference.
- Referrals, committee approvals, and effective dates from the City Record, and Legistar's agenda items and actions, become dated rows on each record,
  each with its source.
- A passed file with no named vote in either record gets a reason in the data (`no_names`), never an empty value.

## Not verified

- Whether the Clerk will keep entering votes in Legistar (none since May 18), and which record is right for the 5 votes on May 18.
- The terms of every source above: a person reads them and records the decision in `scripts/us_sources.py`.
- The county and court sources were probed only. Nothing fetches them yet (phases 4 and 6 of the plan).
