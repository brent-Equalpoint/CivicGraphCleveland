# Plan: a sourced, honest record for every candidate on the Cuyahoga County ballot, and how they sit with each other in each contest

Status: plan only, written Oct 7, 2026, from probes read the same day. No app code, no `data/`, no `site/` was changed. It builds on `docs/plan-alignment.md` (how a resident's answers sit beside a record), `docs/plan-votes-actions-positions.md` (votes, actions, positions for the city, county and courts) and `docs/plan-explain-committees-and-seats.md` (what offices and roles are), and it follows `CLAUDE.md` and `docs/design-standards.md`.

## The request, and the short answer

Brent asked (from the screen that says "No reviewed policy record loaded yet"): load a record universally for the ballot candidates, so people can understand how they sit with everybody on these ballots.

Short answer, measured by the probes below:

- **Every one of the 97 entries can get a real, sourced page now.** What can be said for all 97 is the official filing (party, date filed, status) and an honest "what we checked and did not find" line. That replaces the empty box. It is not a policy record, and the page says so.
- **Only some candidates have anything that can be called a voting or policy record**, because most candidates have never held an office that records votes. Measured: **at least 37 of 97** hold or have held an office we can confirm from an official roster, and **21 of 97** have recorded votes we can fetch (4 in Congress, 11 in the Ohio General Assembly, 6 on County Council). Everyone else has a filing and, at most, their own published words.
- **Side by side on votes is almost empty today, and the plan says so instead of faking it.** In **0 of 48 contests** do two candidates have a recorded vote on the same question (the challengers have not served). A "How these candidates compare" table built only on votes would be one filled column and a row of "No record found". So the table is built on what a resident can actually compare: (1) which kinds of record exist for each candidate, and (2) the same plain question put to every candidate in the contest, answered only from their own published words, with a dated "we looked and found nothing" where that is true.
- **No new interpretive text ships without Brent reading it.** Facts and votes from official sources refresh by themselves. Our coverage sentences, our question wording, and every quoted statement wait for a named person.

## What exists today (read from the code, Oct 7, 2026)

- The ballot is the compiled `Hm`: 48 contests, **97 candidate entries**, ids like `contest-1-candidate-1`, each with name, party, status (`valid`, `write-in`, `removed`, `withdrawn`), the date filed, and the page of the Board of Elections list it came from. Only `valid` and `write-in` can be picked (`Qm`).
- The only records are `Wm` (6 questions: 4 governor "campaign page" statements, 2 House votes) and `Gm` (**8 records on 4 candidates**: Acton 2 and Ramaswamy 2, statements; Shontel Brown 2 and Max Miller 2, votes). Brent's "6" is the question count; the record count is 8. Both House votes agree with `data/us-votes-2026.json` (H.R. 1 roll 190: Miller Y, Brown N; H.J.Res. 25 roll 71: Miller Y, Brown N), so the existing records can be regenerated from the data and checked.
- Each of the four statements is a single candidate's own page, so for that question the other governor candidate has nothing. That is the exact misreading this plan has to prevent ("nothing" read as "no").
- The empty box is in `CxmCand` (`ext/cxm-ballot.jsx`, line ~367) and in the desktop record; the contest card says "No reviewed candidate-specific policy record is loaded. No future position is inferred."
- Alignment (`ext/cx-align.jsx`, `docs/plan-alignment.md`) already has: per-policy-area counts for a member (step 1, shown), 24 reviewed-pending questions mapped to final votes (step 2, built, hidden until `--mark-alignment-reviewed`), and the Constellation's `rh()` that returns `same`, `total`, `missing` and never a rating.
- All 31 sources in `scripts/us_sources.py` are `review_required`: nobody has confirmed any source's terms. That is a gate for every stage below, not a footnote.

## 1. Who the 97 are, and what an honest record can be

Measured from `Hm` (contest and status counts) and from the official rosters probed below (who sits now).

| Type | Contests | Entries | Certified (`valid`) | Write-in | Removed or withdrawn | What an honest record can be |
| --- | --- | --- | --- | --- | --- | --- |
| Governor and Lieutenant Governor (tickets) | 1 | 7 tickets (14 people) | 3 | 4 | 0 | Filing facts per person. Ticket members who sit in a body have recorded votes (Robert McColley is in the Ohio Senate). Candidate's own plan pages as dated statements. Executive office: no votes, so a prior-office fact only. |
| Attorney General, Auditor, Secretary of State, Treasurer | 4 | 9 | 9 | 0 | 0 | Filing facts. Three hold a statewide office now (Faber, LaRose, Sprague): office-held fact from the office's own site, no votes (an executive does not cast roll calls). Allison Russo sits in the Ohio House: votes. Own plan pages as statements. |
| U.S. Senate | 1 | 7 | 4 | 3 | 0 | Husted: 119th Congress roll calls. Sherrod Brown: former senator, roll calls of past Congresses on the Senate's own XML. Others: filing only. |
| U.S. House | 2 | 6 | 4 | 2 | 0 | Max Miller and Shontel Brown: roll calls. Others: filing only. |
| Ohio Senate | 2 | 5 | 4 | 0 | 1 removed | Kent Smith sits (votes). Bride Rose Sweeney sits in the Ohio House and is running for Senate (votes in the House). Others: filing only. |
| Ohio House | 11 | 22 | 20 | 0 | 1 removed, 1 withdrawn | 7 sit now (Rader, Brennan, Glassburn, Dovilla, Synenberg, Brewer, Troy): votes. Others: filing only. |
| County Executive | 1 | 4 | 1 | 1 | 2 removed (one person, listed twice) | Chris Ronayne: office-held fact; executive orders (2 in 2026) are a list of PDFs, with no vote. |
| County Council | 6 | 9 | 9 | 0 | 0 | 5 sit now (Kelly, Sweeney, Gallagher, Conwell, Turner): votes in each adopted resolution's PDF. Others: filing only. (Sunny Simon, the sitting District 11 member, is on the ballot for Domestic Relations judge, not for Council.) |
| Justice of the Supreme Court | 2 | 4 | 4 | 0 | 0 | Brunner and Hawkins sit on the Court: their own opinions and separate writings are court records. The other two: filing only unless they sit on another court. |
| Judge, Court of Appeals (8th District) | 5 | 6 | 6 | 0 | 0 | At least 3 sit on the 8th District (Ryan, Groves, Mays appear on the court's judges page): their opinions. 4 of the 5 contests have one certified candidate. |
| Judge, Court of Common Pleas | 13 | 18 | 18 | 0 | 0 | The court's own roster and bios. At least 7 sit on the General Division roster (rough name match; Domestic Relations and Probate judges are on other pages). Their rulings are case dockets with private parties: out of scope (decision of Oct 6). |
| Total | 48 | 97 | 82 | 10 | 5 | |

Other facts about the list that matter for the design:

- 18 of 48 contests have exactly one certified candidate (Ohio House 20 and 22, County Executive, 3 Council, 4 Appeals, 8 Common Pleas). A comparison there is one column and says "Unopposed on the certified list", which is a fact.
- 10 entries are write-ins; 5 are not on the ballot (3 people: Knoll, Wang, Shabazz twice; and Walker-Brown withdrawn). The app already refuses to let a resident pick those 5.
- 97 entries are about 103 people (14 on the 7 governor tickets, minus the duplicated Shabazz). Records are kept per person, so a ticket page shows two people.
- Name matching is a hazard, not a shortcut. The unitedstates file matched "Martin J. Sweeney" to a congressman who left office in 1943. "Mike Dovilla" did not match "Michael D. Dovilla" in the Ohio House directory. "Yvonne M. Conwell" (County Council) is not "Kevin Conwell" (Cleveland City Council). So every record is tied to a person key that a person confirmed once (name plus office plus district plus an official id such as a bioguide id), never to a name at read time.

### What a record can and cannot be, by kind of candidate

1. **Sitting legislator (Congress, Ohio General Assembly, County Council): votes.** A recorded Yea, Nay, not voting or absent, with the measure, date and the roll call. Sponsorship is not a vote. Absent, not voting and present are not a no.
2. **Sitting executive (Governor ticket members, statewide officers, County Executive): facts, not votes.** The office, the dates, the official's own page. The only acts are orders and signatures, and the county signature dates are not machine-readable (only inside each adopted PDF's signature block).
3. **Sitting judge or justice: their own court record.** The opinions they wrote, with the court's own citation and summary line, and the panel line printed in the PDF. A ruling decides one case on its facts; it is not a position and not a prediction. See the conduct rule below.
4. **Former officeholder: the same as above for the term we can source** (Sherrod Brown, former senator). Older terms are a fact line ("served 2007 to 2025") unless the roll calls are fetchable.
5. **Candidate with no public office record** (most challengers): filing facts, their own published plan pages as dated statements, and the coverage line. Nothing else is invented.
6. **Write-ins, and candidates not on the ballot:** the filing fact and the plain sentence "Filed as a write-in candidate on [date]. We found no other public record." Never a "no".

### Judges and judicial candidates: the conduct rule

Read Oct 7, 2026 from the Ohio Code of Judicial Conduct on supremecourt.ohio.gov (`/docs/LegalResources/Rules/conduct/judcond0309.pdf`, footer "Effective March 1, 2009; as amended February 12, 2026"):

- Rule 4.1(A)(6): a judge or judicial candidate shall not, "in connection with cases, controversies, or issues that are likely to come before the court, make pledges, promises, or commitments that are inconsistent with the impartial performance of the adjudicative duties of judicial office."
- Rule 4.1(A)(5): no statement "that would reasonably be expected to affect the outcome or impair the fairness of a matter known to be pending or impending in any court."
- Comment [10]: pledges "must be contrasted with statements or announcements of personal views on legal, political, or other issues, which are not prohibited"; the test is the totality of the statement. Comment [11]: a candidate may make promises about "judicial organization, administration, and court management" (clearing a backlog, starting sessions on time).

What that means for the page:

- **What the record can show:** the court's own published opinions the judge wrote or joined (a court record, official reports), the judge's roster and bio on the court's site, and campaign statements about how they would run the court.
- **What it cannot and will not show:** a topic-by-topic "position" grid for judges, a "how they would rule" line, or a promise inferred from a speech. Party on the ballot is shown as a filing fact only, and the existing office text already says "A judge's party does not establish how they will rule."
- **Each judicial page says, in plain words:** "Judges and judicial candidates in Ohio are not allowed to promise how they will decide cases. This page shows what the court itself has published and what the candidate says about running the court. A ruling decides one case. It does not say how the judge will decide another."
- Personal-view statements are allowed by the rule but are the riskiest thing to quote. Recommended default: do not collect issue statements from judicial candidates at all (decision 5 below).
- Opinions name private parties. Rule for the data: published opinions only; skip any opinion whose syllabus or caption marks a juvenile, adoption, dependency, or sealed matter (one probe row, State v. Conner, is a juvenile transfer case); a person reviews each judge's list before it shows.

## 2. Sources, and what the probes found

All fetches were made on **Oct 7, 2026** with the project's own user agent (`ClevelandCivicGraph/5.15 (Equalpoint; nightly public-records refresh)`), from `curl` and Node, with no key and no browser disguise. A blocked source is recorded as blocked and is not worked around. "Terms" is what the site itself says; where no terms page was found that is the finding, and a person still has to confirm (every source stays `review_required` until Brent or another named person clears it).

### Evidence table

| Source | Exact address (pattern) | Result on Oct 7 | Terms found | Verdict |
| --- | --- | --- | --- | --- |
| House Clerk roll call XML | `https://clerk.house.gov/evs/{year}/roll{nnn}.xml`, for example `/evs/2025/roll190.xml` | 200, `application/xml`, 93,888 bytes, "H R 1", every member by bioguide id. `/evs/2024/roll001.xml` lists Shontel Brown (`B001313`). Page form `https://clerk.house.gov/Votes/2025190` 200. | No robots.txt (404). `/Terms-Of-Use` 404. No license text found. | Works. Years back to 1990 by the same pattern (2024 read). Terms to confirm. |
| Senate roll call XML | `https://www.senate.gov/legislative/LIS/roll_call_votes/vote{congress}{session}/vote_{congress}_{session}_{nnnnn}.xml`; menu `.../roll_call_lists/vote_menu_{congress}_{session}.xml` | 200 `text/xml`. 119th roll 372 (28,801 bytes). 118th session 2 roll 1 lists "Brown (D-OH)", Yea, `lis_member_id` S307. Menu for 118/2: 157,652 bytes. Current senators: `/legislative/LIS_MEMBER/cvc_member_data.xml` 200 (updated Oct 7, 2026). | `/robots.txt` redirects (302) to a not-found page. Only a privacy page found. | Works, including past Congresses (Sherrod Brown). Terms to confirm. |
| Congress members and past members | `https://unitedstates.github.io/congress-legislators/legislators-current.json` and `legislators-historical.json` | 200, 13,483,039 bytes (historical). Brown (`B000944`) former senator, 10 terms; Husted, Miller, S. Brown current. | States public domain on its page (not re-read today). | Works. Also shows the name-collision hazard (Martin Sweeney, 1941). |
| Congress.gov API, Bioguide, congress.gov pages | `https://api.congress.gov/v3/member/B000944`; `https://bioguide.congress.gov/search/bio/B000944` | API: 403 `API_KEY_MISSING` (a free key would work). Bioguide and congress.gov pages: 403 Cloudflare "Just a moment" challenge. | `bioguide.congress.gov/robots.txt`: `User-agent: * Disallow: /`. congress.gov robots: `Crawl-delay: 2`, search pages disallowed. | Blocked for scripts (pages). Use the Clerk and Senate XML and the unitedstates files instead. |
| FEC (federal candidates only) | `https://api.open.fec.gov/v1/candidates/search/?q=Husted&api_key=...`; totals `/v1/candidate/{id}/totals/?cycle=2026` | 200 with `DEMO_KEY`: Husted `S6OH00304`, Max Miller `H2OH16051`; totals returned (contributions, disbursements, coverage to June 30, 2026). A real key is free. | The FEC prohibits using contributor names and addresses to solicit or for commercial use (the "sale or use" page, read 200). Totals are not contributor information. | Works with a key. Fact only, no ranking. Optional (decision 6). |
| Ohio General Assembly bill votes | `https://www.legislature.ohio.gov/legislation/136/{hb\|sb\|hjr\|sjr}{n}/votes` | `hb96/votes` 200 with `curl`, 165,700 bytes, server-rendered: date, chamber, result ("Passed", "Failed", "Favorable Passage"), then Yeas and Nays lists by member name and party. Parsed on HB 96: Rader, Brennan and Sweeney Nay on the House votes of Apr 9, Jun 11, Jun 25, Jul 21, 2025; K. Smith Nay and McColley Yea on the Senate votes. Bill pages exist to about HB 1000 to 1099 and SB 400 to 499. | robots.txt: `User-agent: * Disallow:` (allows all). No terms page found (`/terms-of-use` fails). | Works, with two problems. (1) The page's certificate chain is incomplete: Node and Python's default store fail with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, while Windows `curl` succeeds. The nightly job on GitHub (Linux) must carry the intermediate certificate, pinned and checked, never `verify=False`. (2) The votes page prints the result but not the motion, so only votes that match a recorded floor action are kept; the rest are held back. Undocumented search API (`search-prod.lis.state.oh.us/solarapi/v1/...`) answers 404; not used. |
| Ohio House and Senate member directories | `https://ohiohouse.gov/members/directory`, `https://ohiosenate.gov/members/directory` | 200 both. House 96 parsed name, district, party; Senate 30. Matches 10 of the 11 sitting legislators on the ballot by name; the 11th (Dovilla) by hand. | Both sites: robots.txt 404. | Works. Rosters for "who sits now". |
| Cuyahoga County Council legislation | List: `POST https://cuyahogacounty.gov/council/resolutions/CouncilResolution_read/` form `sort=&page=1&pageSize=300&group=&filter=&year=2026`; PDF address inside each row | 200 JSON, 232 resolutions. Sampled 15 spread across the year (R2026-0008 to 0263): **15 of 15 have a "Yeas:" line and "Nays: None"**. R2026-0257 PDF 258,400 bytes: "Yeas: Kelly, Sweeney, Casselberry, Gallagher, Schlelper, Conwell, Houser, Simon and Miller". | `/disclaimer`: does not guarantee accuracy or timeliness; records are not the official record of any agency. No reuse license. robots.txt has only development-time rules. | Works but is an internal grid endpoint that can change. Surnames only (and one misspelled), so names are matched to members by a kept list; a vote that does not add up is held back. Split votes show only in minutes prose. |
| Cuyahoga County Council minutes, Executive | `https://cuyahogacounty.gov/council/council-meeting` (PDF minutes, e.g. `/docs/default-source/council/committees/council/2026/20260804-mtg--minutes.pdf` 200, 373,359 bytes); `https://cuyahogacounty.gov/executive/news/executive-orders` 200 | As the earlier probe (`docs/source-notes-votes.md`): split votes in prose; 2 executive orders in 2026. | Same disclaimer. | Works as notes. The county has **no Legistar** (`webapi.legistar.com/v1/cuyahogacounty` answers 500 "not set up"), so the county cannot come from our Legistar fetcher. |
| Cleveland Legistar and City Record | `data/legistar-2026.json`, `data/votes-2026.json`, `data/people-2026.json` | None of the 97 matches any of the 16 city office holders by name (the only last-name overlap, Conwell, is a different person). | Already in `us_sources.py`. | Not relevant to this ballot. Revisit when a Cleveland office is on a ballot or a candidate is a former Council member. |
| Cuyahoga Board of Elections | Candidate list `https://boe.cuyahogacounty.gov/docs/default-source/boe/candidates-page/candidate-list.pdf?sfvrsn=4b1792c0_733` (the source of the 97); finance search `POST https://boe.cuyahogacounty.gov/candidates/campaign-finance-reports/Index` with `TheValue={keyword}` | List: 200 PDF 119,592 bytes. Finance: 200 HTML, "Ronayne ... returned 65 record(s)"; each report is a document fetched by `POST .../GetDocumentByID`. | `robots.txt` allows; a public records policy page exists (200). | List works (already hash-checked). Finance is a keyword search of filed report PDFs: a link, not structured amounts. Which filer files where (state and judicial filers go to the Secretary of State) needs a person to confirm per office. |
| Ohio Secretary of State | `https://www.ohiosos.gov/...`, `https://campaignfinance.ohiosos.gov/`, `https://www6.ohiosos.gov/...` | **403 on every path including `/robots.txt`**, a Cloudflare challenge page (`Cf-Mitigated: challenge`, 1.28 MB). | Not readable. | **Blocked.** Statewide and Supreme Court campaign finance and the official candidate list cannot be fetched by script. Do not work around it. A person can read it by hand; the plan treats it as "needs a person" or leaves it out. |
| Ohio statewide offices' own sites | `https://www.ohioauditor.gov/` 200; `https://ohiotreasurer.gov/` 302 to `tos.ohio.gov`; Attorney General `ohioattorneygeneral.gov/robots.txt` 404 | Office pages answer. | Not read for terms. | Enough for "holds office X since Y" facts for Faber, LaRose (SoS page is blocked, so from another official page), Sprague. A person confirms each. |
| Supreme Court of Ohio opinions | Index `https://www.supremecourt.ohio.gov/rod/docs/?source={0\|8}`; feed `/rss/cases/dailyannouncement.xml` (1,326,980 bytes); PDF `/rod/docs/pdf/{0\|8}/2026/2026-Ohio-{n}.pdf` | 200. Index rows: caption, case number, the Reporter's topics line, author surname, county, decided date, citation. PDFs read: SC `2026-Ohio-3938` (242,233 bytes) prints "X, J., concurs in part and dissents in part" lines naming Brunner, Hawkins and Fischer; 8th District `2026-Ohio-3871` prints "MICHAEL JOHN RYAN, J., and SEAN C. GALLAGHER, J., CONCUR". | robots.txt: `Disallow: /cms/`, `/Content/ODCMB/` (the `/rod/` path is allowed). No terms page found (`/about-us/website-policy/` 404). The Rules for the Reporting of Opinions (earlier probe) make posted opinions permanently public. | Works. The index pages by form postback (only the newest rows come on a plain GET), so history needs the feed, the PDF pattern, or a person. Panel and dissent are in the PDF text and must be parsed with a hold-back, never assumed. |
| 8th District Court of Appeals | `https://appeals.cuyahogacounty.gov/about-us/judges`; weekly list `/opinions-and-docket/weekly-case-decision-list`; `/docs/default-source/weeklycasedecision/2026/oct-01-2026.pdf` | 200 all. Judges page names Ryan, Groves, Mays; Crossman and Kilbane not found there. Weekly PDF 133,025 bytes. | County disclaimer repeated. | Works. Who sits needs a person's confirmation for the two not found. |
| Common Pleas roster | `https://cp.cuyahogacounty.gov/court-resources/judges/` | 200, 51,615 bytes, judges with courtroom and a "View More" bio. 7 of the 18 Common Pleas candidates matched by name. | County disclaimer pattern. | Works for a roster fact. Rulings are case dockets: not planned. |
| Ohio Code of Judicial Conduct | `https://www.supremecourt.ohio.gov/docs/LegalResources/Rules/conduct/judcond0309.pdf` | 200, 741,906 bytes; Rule 4.1 text read (above). | A court rule. | Use as the source for the judicial notice, quoted and linked. |
| Candidate's own plan pages | `https://actonforgovernor.com/issue/education/` (216,287 bytes), `https://vivekforohio.com/the-plan/` (129,784), `https://john4ohioag.com/` (74,418) | All 200. `john4ohioag.com` robots: allow all except `/wp-admin/`. Acton robots: blocks calendar paths only. Vivek's robots: allow all. `sethwalshforohio.com` answers 301 to `teamwalshhq.com`. | Campaign sites state no reuse terms in what was read. A dated quote with a link is the established pattern. | Works for the page that exists. The URL list is a person's job and goes stale (one domain already moved). A page's text is held as a hash so a quote can be checked. |
| Other aggregators | Ballotpedia `https://ballotpedia.org/John_Kulewicz` | 202 with an empty body (bot challenge). Vote Smart: 403 "Your request was blocked." OpenSecrets robots disallow `/api` and `/export_data`. | Not read. | **Blocked or not allowed.** Not used. Not an official source anyway. |
| Party and news sites | `ohiogop.org`, `ohiodcca.org`, news outlets | 200, but they are party or news pages, not the candidate's own words or an official record. | n/a | Not used (rule: never automate news into `data/`; a party page is not the candidate's page). |

### What worked, what is blocked, what needs a person

- **Works and can be fetched under our rules, subject to terms review:** House Clerk XML, Senate XML (including past Congresses), unitedstates member files, FEC API (with a free key), legislature.ohio.gov votes (with the certificate fix), Ohio House and Senate directories, the County Council grid and PDFs, Board of Elections list and finance search, Supreme Court of Ohio opinions and feed, 8th District and Common Pleas pages, a candidate's own pages at a person-supplied address.
- **Blocked for scripts:** Ohio Secretary of State (Cloudflare challenge on every path), Congress.gov pages and Bioguide pages (403 challenge; the API needs a key), Ballotpedia, Vote Smart. Not worked around.
- **Unclear terms:** every source. No site read today states a reuse license; several state only that they do not guarantee accuracy (the county, the 8th District). `us_sources.py` keeps them `review_required`.
- **Needs a person (cannot be automated honestly):** confirming a candidate's identity key once; finding each candidate's own site and picking the page; prior offices held (a mayor of Maple Heights, a Cincinnati council member) from the candidate's or the city's own bio; the wording of our coverage lines and questions; which county filer files where; anything about a judge's opinions that involves a juvenile or sealed matter.

## 3. The data shape

Principles: official facts and votes come from fetchers run by `scripts/refresh.py` and nowhere else; our words and quotes are interpretive and live in `ext/` between markers with a review command, like the Levies text and Alignment questions; nothing in `data/` is hand-edited.

### Where each thing lives and who writes it

| Piece | File | Written by | Reviewed by |
| --- | --- | --- | --- |
| Roster of people, ids, identity keys (confirmed once), what offices they sit in | `scripts/candidate_sources.py` (a registry, like `us_sources.py`); the roster itself is the compiled `Hm`, hash-checked against the BOE list | A person edits the registry in a reviewed change; nobody edits `data/` | The change review. Brent confirms identity keys. |
| `facts`, `votes`, `coverage` | `data/candidates-2026.json` (index, small) and `site/candidates/{person_key}.json` (one file per person, loaded only when that page opens, like `site/council/record-2026.json`) | `scripts/fetch_candidates.py`, run by `scripts/refresh.py` (and `--candidates`). Never by hand. | Official records update by themselves after the safety checks. |
| Snapshot of each cited page, to check quotes | `data/candidate-pages-2026.json` (URL, date read, SHA-256, plain text of the page) | the same fetcher | none (a record of what was read) |
| `statements` (quote, date, URL, topic) | `ext/cx-cand-statements.jsx`, between `CAND-STATEMENTS` markers | A person | **`python build.py --mark-candidate-statements-reviewed "Name"`**, run by Brent, never by me. Until then each statement says a person has not reviewed it. |
| Our coverage sentences, office notices, the judicial notice, question wording | `ext/cx-cand-text.jsx`, between `CAND-TEXT` markers | A person | **`python build.py --mark-candidate-text-reviewed "Name"`** |
| The review fingerprints | `data/candidate-text-reviewed.json`, `data/candidate-statements-reviewed.json` | `build.py` (as for `alignment-reviewed.json`) | n/a |

Why statements are not inside `candidates-2026.json` as the request sketched: the rule is that only `refresh.py` writes `data/`, and a quote is chosen by a person. So the statements sit in `ext/` and are merged at build time. A test requires every quote to appear word for word in the stored page snapshot for its URL; if the page changes, the statement is flagged "the page changed since a person read it" and the review mark clears for that entry.

### Record shape (one person)

```json
{
  "person_key": "oh-house-13-rader-tristan",
  "candidate_ids": ["contest-13-candidate-1"],
  "role": "candidate",                       // or "ticket_principal" | "ticket_running_mate"
  "ids": { "ohio_house_slug": "tristan-rader" },   // confirmed once by a person
  "facts": [
    { "kind": "office_held", "office": "Ohio House of Representatives, District 13",
      "from": "2025-01-06", "to": null,
      "source": "https://ohiohouse.gov/members/directory", "read": "2026-10-07" },
    { "kind": "filing", "party": "Democratic", "status": "valid", "filed": "2026-02-04",
      "source": "Cuyahoga Board of Elections candidate list, page 5", "read": "2026-09-17" }
  ],
  "votes": [
    { "measure": "House Bill 96", "title": "...", "chamber": "House", "date": "2025-06-25",
      "question": "Passed", "cast": "Nay", "tally": "59 Yea, 38 Nay",
      "area": null,                           // CRS policy area for Congress only
      "source": "https://www.legislature.ohio.gov/legislation/136/hb96/votes", "read": "2026-10-07" }
  ],
  "coverage": {
    "checked": [
      { "what": "Ohio General Assembly votes, 136th GA", "on": "2026-10-07", "found": 212, "url": "..." },
      { "what": "Candidate's own website", "on": "2026-10-07", "found": 0 }
    ],
    "not_found": ["court opinions: has not served as a judge", "County Council votes: has not served on Council"]
  }
}
```

- `votes[].cast` is the source's own word (Yea, Nay, Present, Not voting, Absent, Recusal). The page never turns "Not voting" or "Absent" into a no.
- `coverage.not_found` is machine text from a fixed list; the sentence a resident reads is our template between `CAND-TEXT` markers (reviewed).
- Keyed by `person_key`, mapped to `contest-N-candidate-M` by a test, so a renumbered BOE list cannot attach a record to the wrong person. A test fails if any of the 97 entries has no `person_key`, if a `person_key` is unmatched, or if a vote has no source and date.
- Size: Husted alone has 907 votes in this Congress, and 11 Ohio legislators have hundreds each, so votes are per-person files loaded when a page opens. The first paint reads only the small index.

### How it keeps the existing 8 records

- Nothing changes in Stages 0 to 2: `Wm` and `Gm` stay compiled and the Constellation's `rh()` keeps reading them.
- Stage 3 moves them. The two House votes are regenerated from the data (a test asserts the regenerated answers equal today's `Gm` for Miller and Brown). The four governor statements become `statements` entries with their existing dates and URLs ("Campaign page reviewed September 22, 2026"), a person re-reads them against the stored page snapshots, and a build shim keeps handing `rh()` the same `Wm`/`Gm` shape so the Constellation does not change. The question wording (`Wm.question`) stays exactly as it is until a person edits it.

## 4. What a resident sees

All text is plain English, no dashes, no left stripes, both styles, both layouts, light and dark, English and Spanish (names, quotes and official wording stay English and say so). Ordering is **alphabetical by last name, said on screen** ("Alphabetical by last name. This is not the ballot order."). The Board of Elections list is grouped by party, so "ballot order" would be a party order, which the rules rule out.

### (a) A candidate's page

Order: **Facts, then Votes, then Statements, then "What we checked"**, each with its source and date. In words:

- Top: name, party as filed, contest, status in words ("Certified on the ballot", "Registered write-in", "Removed from the ballot", "Withdrew"), date filed. The office notice that already exists stays.
- **Facts.** "Offices held": one row per fact with dates and its source ("Ohio House, District 13, since January 2025. Source: the Ohio House member directory, read Oct. 7, 2026."). If none are sourced: "No office held found in the official lists we checked."
- **Votes** (only when there are any). "Votes in the Ohio House, 136th General Assembly." Counts per kind of vote, a filter by topic where the source has one (Congress has a policy area; Ohio and the county do not, so those list by measure), each row the measure, date, the record's word, the tally, and "The official record" link. "Sponsorship is not a vote." and "Not voting and absent are not a no." appear where the difference matters. No total across anything, no ordering by a count, newest first.
- **Statements** (only when there are any). Quote, date, link, "Said by the candidate's own campaign", and "A person has not reviewed this" until reviewed. Judicial candidates: court administration only, with the conduct notice.
- **What we checked and did not find**, replacing the empty box. Example: "We checked: the Board of Elections list (filed Feb. 4, 2026); the Ohio General Assembly's vote pages; the Congress roll calls; the candidate's own website (read Oct. 7). We found: the filing and one office. We did not find: any vote (this candidate has not served in a body that records votes, as far as these lists show) or any statement on the candidate's site. No record found is not a no, and it does not mean this person has no views."
- A write-in: "Filed as a write-in candidate on Aug. 24, 2026. We found no other public record. That is not a no." A candidate not on the ballot: "No longer on the ballot (removed / withdrew). Shown so the official list is complete."

### (b) "How these candidates compare", on each contest

A drop-down on the contest card (desktop contest page, phone contest sheet), closed by default, under the office's "What this office can do". Rows only where a comparison is real. Three parts, in this order:

1. **What the record holds.** Rows are kinds of record, columns are the candidates (alphabetical). Cells say what exists: "Office held: Ohio House since 2025", "Votes: 212 in this term", "Statements: 2", "Court opinions: 48 in 2026", or "No record found". Counts are per kind, never added across kinds, never sorted. Footer: "No record found is not a no. It means we looked in the places listed on each candidate's page and found nothing." This part is shown for all 48 contests, including unopposed ones ("Unopposed on the certified list").
2. **Questions asked of every candidate** (from statements). Row = one plain question a person wrote from the official context (for example the four governor topics that exist now). Cells = the candidate's own published position, quoted with date and link, or "No statement found on [site], read Oct. 7". A row appears only if every candidate in the contest was checked on that question and at least one has a statement, so a blank means "we looked", never "we did not ask". Cells use words (Yes, No, Depends on what they wrote), never a color alone.
3. **Votes both candidates cast.** A row appears only when **two or more candidates in the contest have a recorded vote on the same measure** (same bill, same chamber). Measured today: no contest qualifies, so this part is hidden and not shown empty. It will appear on its own if a challenger has served (for example a former legislator). Each row says "Yea", "Nay", "Present", "Not voting", "Absent", with the roll call.

Rules shown or tested: no total, no "most", no ordering by count, no party order, no match percent, no "closest". On a phone each row is a card listing the candidates stacked with their cell, never sideways scroll; on a computer it is a table. "Alphabetical by last name" is said under the heading. Tickets show the principal's name with the running mate beneath.

### (c) How it connects to Alignment

- The resident's own yes or no answers (kept in the page only, as today) appear **beside** a documented record, only where one exists and only in the part-2 and part-3 rows. A row reads "You: Yes. Max Miller: Yea (roll 190, July 3, 2025)." A candidate with no record in that row reads "You: Yes. Shontel Brown: No record found."
- It reuses the Constellation's counting (`same`, `total`, `missing`) and Alignment's rules: "It depends" and "Still learning" are left out, missing is shown beside agreement and never counted as disagreement, a count lives per row or per area, never across areas or contests, nothing reorders by agreement.
- For the 4 federal candidates, the 24 Alignment questions (3 each in 8 areas) already map to final votes, so no new interpretive text is needed there. Coverage from the data: Husted cast a Yea or Nay on 14 of the 14 Senate-voted questions, Max Miller on 23 of 24, Shontel Brown on 24 of 24. Sherrod Brown has none in the 119th Congress (he left the Senate Jan. 3, 2025), so his cells read "No record found. Left the Senate before these votes." This depends on Brent having reviewed and turned on Alignment step 2 (`--mark-alignment-reviewed`); until then the federal rows show the vote beside the bill with no resident answer, as step 1 does.
- Nothing about the resident leaves the browser: no answer, place, or priority in a link or request; the privacy checks that cover Alignment cover this.

## 5. Stages

Each stage ships alone, behind the full gate (`python scripts/release.py`; the fast lane is allowed only for stage 0's copy and CSS, not for any fetcher or `refresh.py` change), and ends with a review step only a named person can do. Counts say how many of the 97 get something beyond the filing at that stage, from the probes. "At least" marks a rough name match.

### Stage 0: the honest page for all 97 (no new fetcher)

- **Scope:** replace the empty box on every candidate page, phone and desktop. Facts (filing: party, date, status, office, term, ticket), the "What we checked and did not find" line, the write-in and not-on-the-ballot sentences, the judicial notice, a pointer from the contest card. Candidates keep the 8 records they have.
- **Candidates covered:** 97 of 97 with filing facts and a truthful coverage line; 4 still have a record.
- **Work:** `data/candidates-2026.json` index with a `person_key` and filing facts for every entry (written by `refresh.py` from the hash-checked BOE list), `ext/cx-candidates.jsx` (one shared model, desktop and phone), `ext/cx-cand-text.jsx` (the sentences), exact-match patches in `build.py` for the desktop record and the contest card line, Spanish.
- **Brent's review:** reads the coverage templates, the write-in and not-on-the-ballot sentences, and the judicial notice (quoted from Rule 4.1) against their sources, then runs `--mark-candidate-text-reviewed "Name"`.
- **Checks:** a browser check `candidate-records` (every one of the 97 shows facts, a coverage line and no empty box; a write-in and a removed candidate say so; no ranking, score or "no" word for a missing record; no dash; the same words on phone and desktop; Spanish; light in both styles; nothing in any request) and `scripts/test_candidates.py` (97 of 97 have a `person_key`; ids map one to one; every fact has a source and a date; the coverage line never claims a source that was not read).
- **Risks:** a coverage line can read as a verdict ("nothing found" taken as "nothing exists"). Mitigation: the fixed sentence "No record found is not a no" and Brent's review. Low risk otherwise.

### Stage 1: offices held, from official rosters

- **Scope:** an "Offices held" fact for everyone an official roster confirms, with dates.
- **Candidates covered:** **at least 37 of 97**: 4 in Congress (Husted, Miller, S. Brown, plus Sherrod Brown as a former senator, from the unitedstates files), 11 in the Ohio General Assembly (McColley, Russo, K. Smith, Sweeney, Rader, Brennan, Glassburn, Dovilla, Synenberg, Brewer, Troy, from the two directories), 3 statewide officers (Faber, LaRose, Sprague), 2 Supreme Court justices (Brunner, Hawkins), 7 on the County side (Ronayne; Kelly, Sweeney, Gallagher, Conwell, Turner; Simon, a sitting Council member who is on the ballot for judge), at least 3 Appeals judges (Ryan, Groves, Mays) and at least 7 Common Pleas judges. Prior offices (for example a mayor or a city council member) are a later person-reviewed addition and are not counted.
- **Work:** `scripts/fetch_candidates.py` (rosters), the registry of identity keys, the certificate fix for legislature.ohio.gov if later stages use it, tests that a roster match is by id and not name only.
- **Brent's review:** confirms the identity key for each sitting-officeholder match (about 37 lines, one glance each) and the terms of the rosters.
- **Checks:** unit test "no fact from a name-only match", "a roster that returns fewer people than yesterday holds back"; browser check extends `candidate-records` (facts show with source and date; a person with no sourced office says so).
- **Risks:** name collisions (shown above); stale rosters (dated, nightly); judges' rosters partly incomplete (two Appeals candidates not found on the court page), so those say "not confirmed" until a person checks.

### Stage 2: recorded votes for sitting legislators, in three parts that ship separately

- **2a Congress (4 candidates).** Sources: Clerk and Senate XML already in `data/us-votes-2026.json` for Husted, Miller, S. Brown (Husted 907 recorded votes in this Congress, Max Miller and Shontel Brown 676 each, counting every kind of vote; final-passage votes are marked); Sherrod Brown from the Senate XML of the 118th Congress (about 700 roll calls, one-time). Reuses the existing roll-call model and policy-area counts. Needs no new interpretive text. Brent reviews: the terms, and that Sherrod Brown's older terms are shown as a fact line if he declines the 118th crawl. Work is small; all the data is in hand for three of the four.
- **2b County Council (6 candidates: Kelly, Sweeney, Gallagher, Conwell, Turner, and Simon).** Source: the 232 resolution PDFs. In the 15 sampled, every vote was unanimous, so most of a council member's list is "Yea, Nays: None" on contracts; the page says so and does not present unanimous consent as a stance. Split votes come from minutes prose, held back when they do not add up. Brent reviews: the county's terms and the surname-to-member list (including the PDF's misspelling "Schlelper"). Risk: it is an undocumented endpoint; a change must hold the data back, not break the page.
- **2c Ohio General Assembly (11 candidates).** Source: `legislature.ohio.gov/legislation/136/{bill}/votes`. About 1,500 bill pages on the first run (HB to ~1000+, SB to ~400+, plus joint resolutions), then only bills whose last action changed. Floor votes only; a vote whose motion is not stated is held back. Needs the certificate fix and a polite request rate. Brent reviews: terms, and a sample of 10 votes against the official page. Risk: the largest and the most fragile fetch of the plan; ship last of the three.
- **Candidates covered by stage 2:** **21 of 97** (4 + 6 + 11), concentrated in 20 of 48 contests. 76 candidates still have no vote record and the page says why.
- **Checks:** unit tests (a vote adds up to its printed tally; every vote has a source and a read date; Not voting, Absent and Present are never a no; the vote list for a person ends where their service ends), browser check `candidate-votes` (a vote row, the "not a no" notes, no overall number, no ordering by count, a long list pages 20 at a time, lazy load, Spanish, light, nothing sent).

### Stage 3: "How these candidates compare" (part 1 for all contests, parts 2 and 3 where they exist)

- **Scope:** the contest drop-down in (b) above; moving the 8 existing records into the new shape.
- **Candidates covered:** all 48 contests get part 1. Part 3 (shared votes) is measured at 0 contests today and stays hidden. Part 2 (statements) is real in 1 contest today (Governor), where each of the four existing questions has a statement from one candidate only, so every row's other cell reads "No statement found on [site], read [date]" until stage 4 checks the other campaign on the same question.
- **Work:** the shared compare model in `ext/cx-candidates.jsx`, the phone card and desktop table, alphabetical ordering, the Alignment row (resident answer beside record), migration of `Wm`/`Gm` with the equality test.
- **Brent's review:** the "What the record holds" labels and the footer sentence, and he decides the open question about which kinds of record appear as rows (decision 3).
- **Checks:** `candidate-compare` browser check (the table equals the data; no total, no ordering by count or party; alphabetical; the "not a no" footer; one column for an unopposed contest; a phone card and a computer table; no sideways scroll at 320 px; Spanish; light; the resident's answers in no request or link) and `scripts/test_candidate_compare.js` (the model returns a row only when its rule holds; no composite across rows exists; a shared-vote row needs two recorded votes).
- **Risks:** the table can look like a scorecard if cells hold numbers. Mitigation: counts per kind only, words in cells, no sorting, a test that scans for score words.

### Stage 4: statements from the candidate's own pages

- **Scope:** dated quotes from each candidate's own published plan pages, the same pattern as the governor topics, but now asked of every candidate in the contest for the same question.
- **Candidates covered:** today 2 (Acton, Ramaswamy). A pilot of 4 statewide candidates found a campaign site for all 4 (3 fetched, one had moved to a new domain), so the realistic target is the 20 certified candidates in the governor, statewide office, Senate and U.S. House contests first (3 + 9 + 4 + 4), then the rest as a person finds sites. I do not have a measured count beyond that; a person finds the sites in the first week and the count is reported then.
- **Work:** a registry of source URLs in `scripts/candidate_sources.py` (a person adds one per candidate, reviewed), the page snapshot fetcher, `ext/cx-cand-statements.jsx`, the "quote must appear in the snapshot" test, a "page changed" flag, the question list per contest.
- **Brent's review:** reads each quote against the stored page, the question wording, and runs `--mark-candidate-statements-reviewed "Name"`. Estimated 5 minutes a candidate, so about 2 hours for the first 20.
- **Checks:** unit test (every quote is verbatim in the snapshot for its URL; every statement has a date and a link; a question row exists only when every candidate in the contest was checked); browser check extends `candidate-compare` (statements show "A person has not reviewed this" until reviewed; judicial pages show none that are about issues; no quote is paraphrased).
- **Risks:** selecting a quote is interpretive and can favor a candidate; each candidate gets the same question and the same effort, and a reviewer records who chose. Campaign sites move or change. A candidate with no site is shown as "No website found", not as silence on the issue.

### Stage 5: judges' own rulings (court records)

- **Scope:** for sitting justices and appellate judges, the opinions they wrote, with the court's own citation and summary, and the panel line; a roster fact and bio for Common Pleas judges. No topic grid, no ruling prediction, the judicial notice on every judicial page.
- **Candidates covered:** at least 5 of 28 judicial entries get opinions (Brunner, Hawkins, Ryan, Groves, Mays); possibly 7 if two more Appeals candidates sit; Common Pleas judges get roster facts (stage 1), not rulings.
- **Work:** the opinion index and PDF fetcher (author from the Reporter's index, panel and dissent lines parsed from PDF text with a hold-back when it does not parse), the exclusion rule for juvenile and sealed matters, a list per judge opened on demand.
- **Brent's review:** terms of the court sources, then each judge's list for private-party and juvenile risk before it shows; reads the one-sentence plain description if any is added (none is planned in this stage).
- **Checks:** unit tests (panel and dissent lines match the PDF; an opinion with a juvenile or sealed marker is dropped; no "won" or "lost" word), browser check `candidate-judges` (the notice, no issue statements, no ruling forecast, the list pages).
- **Risks:** the highest. Private parties in captions, partial parses, and a resident reading a ruling as a promise. This stage can be skipped without harming the others.

### Stage 6 (optional): campaign finance as a fact

- **Scope:** "Reports filed" with a link, and for federal candidates the FEC's own totals and coverage dates as plain facts, never ranked or beside each other as "who has more".
- **Candidates covered:** federal candidates registered with the FEC (Husted and Max Miller found in the probe; the rest to be matched), county filers through the Board of Elections search (65 reports for the County Executive's name). **The Ohio Secretary of State is blocked**, so statewide, Supreme Court and many legislature filings cannot be fetched.
- **Brent's review:** whether to show money at all (decision 6), and the FEC key and the "no solicitation or commercial use" term.
- **Risk:** money invites a ranking; uneven coverage (federal and county yes, state no) makes some candidates look absent. Recommended: leave this out of the first release.

### Suggested order and the honest count at each step

| After stage | Candidates with something beyond the filing | Contests with a real comparison |
| --- | --- | --- |
| 0 | 4 of 97 have a record; 97 of 97 have facts and a truthful coverage line | 0 |
| 1 | at least 39 (37 with an office held, plus Acton and Ramaswamy's statements) | 0 |
| 2a | adds 4 with votes (3 already had an office fact) | 3 contests have a voting column (Senate, 2 House) but still one voter each |
| 2b, 2c | 21 with votes | 20 contests have at least one voting column; none has two voters |
| 3 | same | 48 contests show "What the record holds"; Governor shows questions |
| 4 | up to about 45 if sites are found for the 20 first-priority candidates and more | questions rows in the contests whose candidates were all checked |
| 5 | adds 5 judges with opinions | judicial contests show roster and opinion counts, no issue rows |

Order recommended: **0, then 1, then 2a, then 3 (with the existing records migrated), then 2b, then 4, then 2c, then 5; 6 only if Brent decides yes.** Reasons: stages 0 and 1 are all-official and fix the empty box for everyone; 2a is nearly free and reuses reviewed machinery; 3 only makes sense once there is something to show; 2c is the largest fetch and the most fragile; 4 and 5 need the most of Brent's time.

## 6. Decisions Brent must make

1. **Terms.** No source states a license. Who reads and clears the terms of the sources a stage uses, before that stage ships? (House Clerk, Senate, unitedstates files, Ohio legislature, County Council, BOE, Supreme Court of Ohio, 8th District.) Recommendation: one named person, one source at a time, in the order of the stages, recorded in `us_sources.py`.
2. **The blocked source.** The Ohio Secretary of State is a Cloudflare challenge on every path. Do we accept that statewide and judicial campaign finance and the official candidate list cannot be fetched, or does someone ask the office for a data feed? Recommendation: accept it, say so in the coverage line, and leave finance out of release one.
3. **What the comparison shows.** A vote row only when two candidates in the contest voted on the same measure (so it is empty today), and a question row only when every candidate was checked. Or also show a one-voter row with "No record found" beside the others? Recommendation: the stricter rule, because a one-filled row reads as a verdict on the challenger.
4. **Ordering.** Alphabetical by last name, said on screen, because the Board of Elections order is grouped by party. Confirm.
5. **Judicial candidates.** Show only court records, roster facts and court-administration statements, and collect no issue statements, even though the rule allows personal views. And Sunny Simon: show her Council votes on her judicial candidate page, with the notice, or only her roster facts? Recommendation: court records and administration statements only; her Council votes appear on her page as a legislative record with the judicial notice above them.
6. **Money.** Show campaign finance at all? Recommendation: not in the first release. If yes later: a link to the filings for everyone, FEC totals for federal candidates as facts, no ranking.
7. **Who finds candidate websites and picks quotes?** Statements need a person for sites, quotes and sign off. Name that person and the date, or stage 4 waits. Recommendation: Brent signs off; a helper finds sites; the first 20 candidates are the statewide, Senate and U.S. House contests.
8. **Prior offices.** Candidates' earlier offices (a mayor, a city council member) come from their own or the city's bios, which is interpretive. Accept a person-reviewed "Earlier offices" fact line (not in stage 1's count), or leave it out? Recommendation: accept, one source link each, reviewed.
9. **Not on the ballot.** Show the 5 removed or withdrawn entries as facts only (recommended), or hide them?
10. **Identity keys.** Brent confirms the person key for each sitting officeholder match once (about 37 lines) and again if a name changes. Confirm this is acceptable work.

## Rules this plan keeps

Receipts, not scores (no match percentage, no ranking, no ideology label, no total across kinds or contests, no order by a count or by party); sponsorship is not a vote; a missing record is not a no, and every empty cell says what was checked and when; official records refresh by themselves after the safety checks while anything interpretive waits for a named person; news is never automated into `data/`; nothing about the resident leaves the browser; plain English, no dashes, no left stripes; Bento and Original, phone and desktop, light and dark, English and Spanish (official names, quotes and ballot wording stay English).

## What I did not do

No app code, no `data/`, no `site/`, no `build.py`, no release gate, and no `--mark-*-reviewed` command was run or changed. The probes wrote only to a scratch folder outside the repository. The 5 and 21 and 37 counts are lower bounds from name matches against rosters read Oct 7, 2026; each is confirmed by a person in Stage 1 before it is shown.
