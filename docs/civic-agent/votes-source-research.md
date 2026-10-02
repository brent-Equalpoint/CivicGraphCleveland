# Where do member-by-member votes come from? (research note, Oct 1, 2026)

The app shows how each council member voted. Council's database does not publish that, so the app reads it from
the City Record. This note records what was checked, what was chosen, and what a person still has to do.

## Legistar does not have it

Checked through the public Legistar API for Cleveland on Oct 1, 2026:

- A matter's action history has a roll call flag. It was `0` for every history row examined, including a
  file that passed.
- The votes endpoint for a Council event item returned an empty list.
- Council events have no minutes file (`EventMinutesFile` was empty for the six latest meetings).
- The Council agenda files exist, but an agenda lists what was scheduled, not how members voted.

So Legistar, as Cleveland uses it, records that Council approved a file and who sponsored it. It does not
record each member's vote.

## The City Record does (chosen source)

**Source.** The City Record, "Official Publication of the Council of the City of Cleveland", published weekly
by the City Clerk, Clerk of Council (Patricia J. Britt as of 2026). Issues are listed, by year, at
https://www.clevelandcitycouncil.gov/legislation-laws/city-record, one PDF a week (about 1 to 7 MB). The Clerk
sometimes reissues a week as REVISED; the page lists one file per week.

**What it prints.** In "Official Proceedings, City Council", each ordinance or resolution has its text and then
the motions and results. For a vote to pass an ordinance, adopt a resolution, or lay a file on the table it
prints the tally ("Read third time in full. Passed. Yeas 14. Nays 1.") followed by three lists of surnames:
"Voting Yea", "Voting Nay", and "Absent". A vote to suspend the rules prints only a tally, no names. Each issue
also names the members present at the meeting.

**Coverage, read on Oct 1, 2026.** All 39 issues for 2026 (Jan. 2 to Sept. 25), covering 20 council meetings: 445
votes that print names (434 on passage or adoption, 11 to lay a file on the table). Every one of those added up
(names equal the tally, all 15 members accounted for, nobody on two lists). A second, simpler count straight
from the PDF text agreed for one member (15 nay lines and 46 absent lines naming them, the same as the stored counts),
and the passage date of every 2026 file matched Council's record.

**What is not in it.** Committee votes. A vote to suspend the rules. Why anyone voted as they did. The City Record
is dated the Friday after a Monday or Wednesday meeting, so the newest vote is days old.

**Known quirks, handled in `scripts/fetch_cityrecord.py`.**
- A heading sometimes has a blank line before the "By Council Member" line, or "By:" with a colon, or "AS AMENDED".
- Lists wrap across lines and across page breaks, where a running page header is printed in the middle.
- One list prints "Bishop Conwell" with no comma. A space also splits names; the tally check catches a bad split.
- Three headings print a 2025 file number (655, 660, 667) for 2026 files. They are corrected only when the issue's own
  page headers print the 2026 number and Council's record says that file passed on the meeting date. See the script.
- Seventeen passage or adoption votes (and nine of the eleven votes to lay a file on the table) are on files numbered
  2023 to 2025, carried into the new term. They are not in the 2026 Legistar snapshot, so they have no title in the app.

## What still needs a person

1. **Terms of reuse.** The City Record page states none. A person should read the Clerk's site terms and, if they are
   silent, ask the Clerk whether republishing the vote lists with attribution is fine. Until then the Bench registry
   says `review_required` and each profile says a person has not read the terms. This is the same state as the
   Congress sources in `scripts/us_sources.py`.
2. **Whether to show absences.** The record prints who was absent from each vote, and a member can be listed as absent
   for a long run of votes (leave, illness). The app shows the count with "Absent is not a no and not an abstention."
   A person should decide whether that is right for a public page.
3. **A reissued week.** If the Clerk replaces an issue after the app has stored it, the file size or modified date
   changes and the issue is read again. If the new text disagrees with the old on a vote, the snapshot is refused and
   a person looks. Nothing in the pipeline decides which version is right.

## Other candidates, not needed now

| Candidate | Status |
| --- | --- |
| Council meeting video | Not a record we can quote without a transcript |
| The Clerk of Council | Could confirm terms and whether a machine-readable roll call exists |
