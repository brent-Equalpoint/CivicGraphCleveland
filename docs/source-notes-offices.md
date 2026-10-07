# Source notes: what five offices can do

Written Oct 7, 2026 for `ext/cx-offices-text.jsx` (between the OFFICES-TEXT markers). Every page below was read on Oct 7, 2026, from the
official site, read only. The text it supports is shown on the candidate record and the contest page, on the phone and on the computer, for the
five offices that had no words of their own in the compiled app. A person reads each line against its source and then runs
`python build.py --mark-offices-reviewed "Name"`; until then the screen says a person has not reviewed the words.

## Which offices fall through

The compiled app's `qm()` (the function that returns what an office can do) has its own words for Governor (the contest "Governor and
Lieutenant Governor", contest-1), Congress and United States Senator, judges and justices, State Senator and State Representative, and County
Council. Every other contest got one generic line ("A detailed authority summary has not yet been reviewed for this office."). Run on the
official county list (48 contests, 97 candidates), exactly five contests fall through (13 candidates in all):

| Office | Contest | Candidates on the list |
| --- | --- | --- |
| Attorney General | contest-2 | 2 |
| Auditor of State | contest-3 | 2 |
| Secretary of State | contest-4 | 3 |
| Treasurer of State | contest-5 | 2 |
| County Executive | contest-22 | 4 (2 can be chosen or opened; the list marks 2 removed) |

No other office falls through. The Lieutenant Governor runs on one joint ticket with the Governor (Ohio Constitution Article III, Section 1a,
"one vote shall be cast jointly"), so that contest uses the Governor's words, which say only what the governor does. Judges of the Court of
Common Pleas and of the Court of Appeals match "judge", and the Supreme Court contests match "justice"; they keep their words.

`build.py` makes `qm()` ask `cxOfficeInfo()` first (one exact-match patch, "office words: qm asks the new words first"). It matches the
contest name exactly, in lower case, against the five keys, so every other office reads exactly what it read before.

## Attorney General

- Link shown: https://codes.ohio.gov/ohio-revised-code/chapter-109 (Chapter 109, Attorney General)
- **Ohio Revised Code 109.02**, "Duties as chief law officer" (effective Sept. 30, 2025): "The attorney general is the chief law officer for the
  state and all its departments"; "The attorney general shall appear for the state in the trial and argument of all civil and criminal causes in
  the supreme court in which the state is directly or indirectly interested"; "Upon the written request of the governor, the attorney general
  shall prosecute any person indicted for a crime."
- **Ohio Revised Code 109.12**, "Legal advice to state officers and boards" (effective Oct. 6, 1994): "The attorney general, when so requested,
  shall give legal advice to a state officer, board, commission ..."
- **Ohio Revised Code 109.01**, "Election - term" (effective Jan. 9, 1961): "shall hold his office for a term of four years."
- **Ohio Constitution Article II, Section 1**: "The legislative power of the state shall be vested in a general assembly consisting of a senate and
  house of representatives." Article III, Section 2 also sets four years for the attorney general.
- Our words: can = chief law officer, appears for the state in Ohio Supreme Court cases where the state has an interest, four years. Limits =
  does not make state law (Article II, Section 1); some work follows a request (advice when asked, 109.12; prosecution of an indicted person at
  the governor's written request, 109.02). We did not say the office cannot act without a request, because other sections give it more duties.

## Auditor of State

- Link shown: https://codes.ohio.gov/ohio-revised-code/chapter-117 (Chapter 117, Auditor of State)
- **Ohio Revised Code 117.10**, "Auditor of state - duties - federal audits" (the page shows effective Oct. 6, 2026, Senate Bill 315, 136th
  General Assembly): "The auditor of state shall audit all public offices as provided in this chapter."; "Upon request of the auditor of state,
  the attorney general shall bring an action in a court of competent jurisdiction to enforce compliance with any subpoena".
- **Ohio Revised Code 117.11**, "Annual, biennial, and early audits" (effective Sept. 30, 2025): "the auditor of state shall audit each public
  office at least once every two fiscal years" (it begins "Except as otherwise provided in this division and in section 117.112", so we say
  "generally"); "inquiry shall be made into the methods, accuracy, and legality of the accounts, financial reports, records, files, and reports of
  the office, whether the laws, rules, ordinances, and orders pertaining to the office have been observed".
- **Ohio Revised Code 117.02** (effective July 1, 1985): "shall hold his office for a term of four years."
- **Ohio Revised Code 117.28**, "Report of audit and actions thereon" (effective July 1, 1985): the officer receiving the report "may, within one
  hundred twenty days after receiving the report, institute civil action in the proper court in the name of the public office"; "The attorney
  general may bring the action in any case where the officer fails to do so within one hundred twenty days after the audit report has been filed."
- **Ohio Revised Code 117.29** (effective July 1, 1985): where a report sets forth malfeasance or gross neglect, "a certified copy of the report
  shall be filed with the prosecuting attorney of the county in which the offense is committed, and the prosecuting attorney shall, within one
  hundred twenty days, institute criminal proceedings against the public official."
- Our words: can = audits public offices, generally at least every two fiscal years, checking accounts and whether laws were followed, four
  years. Limits = an audit reports what it finds and does not bring charges; recovering money in court is for the public office or the attorney
  general (117.28); criminal charges come from the county prosecutor (117.29).

## Secretary of State

- Link shown: https://codes.ohio.gov/ohio-revised-code/section-3501.05
- **Ohio Revised Code 3501.04**, "Secretary of state is chief election officer" (effective Oct. 1, 1953): "The secretary of state is the chief
  election officer of the state, with such powers and duties relating to the registration of voters and the conduct of elections as are prescribed
  in Title XXXV of the Revised Code."
- **Ohio Revised Code 3501.05**, "Election duties of secretary of state" (effective Sept. 30, 2025): "(B) Issue instructions by directives and
  advisories ... to members of the boards as to the proper methods of conducting elections; (C) Prepare rules and instructions for the conduct of
  elections"; "(I) ... certify to the several boards the forms of ballots and names of candidates for state offices, and the form and wording of
  state referendum questions and issues, as they shall appear on the ballot"; "(K) Receive all initiative and referendum petitions on state
  questions and issues and determine and certify to the sufficiency of those petitions".
- **Ohio Revised Code 3501.11**, "Board duties" (effective April 7, 2023): each board of elections shall "(B) Fix and provide the places for
  registration and for holding primaries and elections" and "(F) Advertise and contract for the printing of all ballots and other supplies used in
  registrations and elections"; its rules must be "not inconsistent with law or the rules, directives, or advisories issued by the secretary of state".
- **Ohio Revised Code 111.01** (effective Jan. 9, 1961) and Ohio Constitution Article III, Section 2 give the secretary of state four years. The
  linked page (3501.05) does not state a term, so our words leave it out.
- Our words: can = chief election officer; sends rules and instructions to county boards of elections; certifies the ballot forms and the
  candidates for state offices; determines whether petitions for state ballot questions are sufficient. Limits = county boards run each county's
  elections (polling places, ballot printing); the secretary works within the powers the election laws give.

## Treasurer of State

- Link shown: https://codes.ohio.gov/ohio-revised-code/chapter-113 (Chapter 113, Treasurer of State)
- **Ohio Revised Code 113.01** (effective Jan. 9, 1961): "shall hold his office for a term of four years."
- **Ohio Revised Code 113.05**, "The state treasury - custodial funds - commingling of assets" (effective Sept. 30, 2025): "The state treasury
  consists of the moneys, claims, bonds, notes, other obligations, stocks, and other securities ... of the state that are required by law to be
  deposited in the state treasury"; "All assets of the state treasury shall be kept in the rooms assigned the treasurer of state".
- **Ohio Revised Code 113.051**, "Duties of treasurer" (effective March 7, 1997): "The treasurer of state ... is the custodian of the funds required
  by law to be kept in the custody of the treasurer of state."; "The treasurer of state is not responsible for the investment decisions of an
  owner or agent".
- **Ohio Revised Code 113.11**, "Payments from state treasury or custodial fund" (effective Oct. 3, 2023): "No money shall be paid out of the
  state treasury or transferred elsewhere except as ordered by the director of budget and management."
- **Ohio Revised Code 113.12**, "Warrants paid on presentation" (effective Oct. 3, 2023): "The treasurer of state, on presentation, shall pay all
  valid warrants drawn on the state treasury by the director of budget and management."
- Our words: can = keeps the state treasury and the funds the law puts in the treasurer's custody; pays valid warrants drawn on the state
  treasury; four years. Limits = money leaves the treasury only as the director of budget and management orders; for funds held in custody the
  treasurer is not responsible for the owner's investment decisions.

## County Executive

- Link shown: https://cuyahogacounty.gov/council/legislation/cuyahoga-county-charter (the Charter of Cuyahoga County, which links each article as
  a PDF; Article II, Elected County Executive, and Article III, The Council, were read from those PDFs)
- **Charter Section 2.01**: "The County Executive shall be the chief executive officer of the County."; "shall hold office for a term of four years
  commencing on the first day of January 2011".
- **Charter Section 2.03**, Powers and Duties: "(1) To appoint, suspend, discipline and remove all County personnel, including those appointive
  officers provided for in Article V hereof and except those who, as provided by general law, are under the jurisdiction of officers, boards,
  agencies, commissions and authorities of the County ..."; "(2) To appoint, subject to the confirmation by the Council, and remove County
  directors and officers and members of boards, agencies, commissions and authorities"; "(4) To approve or veto any ordinance or resolution as
  provided in Section 3.10 of this Charter."; "(9) To submit to the Council prior to the beginning of each biennium, a proposed operating budget".
- **Charter Section 3.09**, Powers and Duties of the Council: "The legislative power of the County ... is vested in the Council."; "(5) To adopt
  and amend the County's annual tax budget, biennial operating budget and biennial capital improvements program and to make appropriations for the
  County."
- **Charter Section 3.10(7)**, Reconsideration: "If, upon reconsideration, the measure is approved by at least eight members of Council, it shall
  then take effect as if it had received the approval of the County Executive."
- Our words: can = chief executive officer of the county; appoints and removes county staff, signs or vetoes Council legislation, proposes the
  county budget, four years. Limits = Council holds the lawmaking power, adopts the budget, and confirms many of the Executive's appointments;
  at least eight Council members can pass a measure the Executive vetoed. The charter does not say when the office was last on the ballot, so our
  words do not.

## What these words do not say

No line says who is better, how to vote, or what any candidate will do. No line names a party. A term length appears only where the linked
source states it (the Secretary of State line has none, because the linked page has none). The Spanish drafts are in `i18n/manual.json` and
stay English where the source is official wording (the links and the section names).
