# Cleveland practice ballot release

Implemented September 22, 2026 for the November 3 general election.

## Working flow

- **My ballot** opens a practice worksheet. **My constellation** opens its alignment step with the same policy answers and ballot state.
- Four steps: practice ballot, alignment, possible effects, review.
- Each office is a separate contest. Judicial seats retain division and term. Governor and lieutenant governor are one joint choice.
- The county catalogue has 48 contests, 97 filing entries, of which 92 are valid or valid write-ins. Removed and withdrawn filings cannot be selected.
- State and countywide items are initially shown for a Cuyahoga voter. No congressional, state legislative or county council district is assumed. Selecting a district narrows the worksheet and clears inapplicable choices.
- All 105 county-published issue entries (3–107) are available. Only the six countywide issues are automatically included. Local issues require explicit selection from the official ballot. Cleveland precinct liquor questions are not citywide.
- A single race or issue appears at a time. People can leave it blank, stay undecided, go back or jump to an item.
- Choosing a person does not answer policy questions or assign beliefs to the voter.
- Clicking a record opens a right-side accessible dialog with sources, office authority, evidence gaps and conditional scenarios.
- Review includes a local text download. There is no real-vote submission.

## Evidence and alignment

The initial reviewed evidence is intentionally limited:

| Kind | Coverage | Source |
| --- | --- | --- |
| Recorded votes | Shontel M. Brown and Max Miller on House 2025 roll calls 190 and 71 | House Clerk |
| Stated plans | Amy Acton: universal public-school meals and expanded energy assistance/weatherization | Campaign education and energy pages |
| Stated plans | Vivek Ramaswamy: state-income-tax phaseout and natural-gas development/permitting | Campaign plan |

Each record links to the primary source and has a date or review date. Campaign claims are attributed and never relabeled as recorded accomplishments. No party label is used in a comparison. Other candidates stay visible as not compared; evidence coverage does not imply merit.

D3 supplies zoom/pan and a stable radial/collision layout. Radial distance is `90 + (1 - same/comparable) * 160`. Direction has no political meaning. Only binary answers to exact matching records enter the denominator. Missing evidence, undecided answers and “it depends” are excluded. Separate views compare campaign statements or past votes. Counts and an accessible table expose the limited sample. There is no overall ideology score, candidate ranking or voting recommendation.

“What could change?” uses explicitly labeled scenario analysis. It separates the candidate’s sourced record from possible implementation, dependencies and tradeoffs. It never estimates a winner, guarantees a promise or predicts a judge’s case rulings.

## Privacy and persistence

- Default: in React memory for this visit, shared between the ballot and constellation.
- Opt-in: localStorage `cleveland-practice-ballot-2026-v1` on this browser only, with schema and eligibility validation.
- No ballot answers, policy answers, precise address or district preferences enter shared URLs. No backend submission, analytics or tracking calls are added by these features.
- The address lookup happens on the county website. The application does not collect an address.
- A clear action removes the current state and saved copy. Storage errors are reported.
- Download is explicit and warns that the resulting worksheet contains political choices.
- A new election needs a new storage namespace and migration policy. Do not reuse snapshot-position candidate IDs across refreshed catalogues without stable identity migration.

## Source snapshots

The original candidate and issue PDFs are in `public/records`. `manifest.json` records SHA-256 digests. Extraction scripts are in `scripts/research`. The issue extractor preserves English question text with a page-level PDF link; the PDF remains authoritative. The candidate parser is tied to the dated PDF layout. Refreshes require a count reconciliation and human review, not blind re-parsing.

## Validation

- TypeScript check passed.
- Eight model tests passed: source counts and IDs; unknown district behavior; eligibility cleanup; missing-data exclusion; statement/vote separation; local-issue scope; invalid saved state; candidate choice independence.
- Browser checks covered choosing a candidate, opening a sourced drawer, opening a missing-evidence drawer, the alignment result/table, zoom, yes/no issue selection, outcome cards, opt-in save and reload, and clearing saved choices.
- Desktop visual checks caught and corrected nested-tab orientation and dialog translation conflicts.
- Responsive styles and reduced-motion behavior are included; a separate mobile-device and assistive-technology audit remains future work.

## Remaining data work, clearly disclosed in the UI

1. Reconcile exact precinct sample ballots when published. Until then, retain the manual/unverified label. Do not claim a complete personal ballot.
2. Add verified roll calls, public statements, sponsorship, enacted outcomes and office-specific authority sources for the remaining candidates. Keep those evidence types distinct.
3. Expand the federal vote sample beyond the two selected examples before offering broad descriptions of alignment.
4. Add reviewed plain-language impact summaries for local issues beyond the six statewide/countywide questions and six Cleveland precinct liquor questions. Keep renewal, replacement, increase and additional taxes distinct.
5. Add source-change detection, dated corrections, candidate identity resolution and review history before automated election refreshes.
6. Add Spanish-reviewed plain-language UX and test with older adults, first-time voters, screen readers and mobile devices.

No exact precinct matching, complete policy audit or causal election forecast is claimed by this release.
