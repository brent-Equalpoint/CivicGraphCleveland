# Source terms: what to read before any of these is called cleared

Written Oct 3, 2026 for the person who will sign them off. Nothing here marks a source as reviewed. Each row says what the source's own page says (quoted from the page on Oct 3, 2026), what is still unclear, and has a blank for who read it and when. When someone has read it, they change `license_status` in `scripts/us_sources.py` and fill in the last two columns here.

Why it matters: the Sky, the Index, and the profiles all say "the terms of those sources have not yet been read by a person". That sentence stays on the page until the rows below are signed.

## The federal record

| Source | What its page says | Still unclear | Read by, on |
| --- | --- | --- | --- |
| **congress-legislators** (members, committees, executive.json) at github.com/unitedstates/congress-legislators | "The project is in the public domain within the United States, and copyright and related rights in the work worldwide are waived through the CC0 1.0 Universal public domain dedication." | Whether every underlying field (for example committee rosters) is the project's own work or copied from a government site. Government works in the United States are not copyrighted (17 U.S.C. 105), so the risk is low | |
| **Photos of members of Congress** at github.com/unitedstates/images | Photos come from the Government Publishing Office's Member Guide. "The GPO has assured us that all photos are public domain." The repository is dedicated under CC0 1.0 Universal | The assurance is the project's report of what the GPO said, not a statement from the GPO we can link to. A person could ask the GPO, or find the GPO's own statement, if it matters more than the project's word. A few photos may come from other official sources the project accepted | |
| **Federal Judicial Center, Biographical Directory of Article III Federal Judges** (the export we read, `judges.csv`) at fjc.gov/history/judges | The page offers the export for download ("Download an export of all data in the Biographical Directory of Article III Federal Judges") and says only "This website is produced and published at U.S. taxpayer expense." It states **no** license, no terms of use, and no citation rule | This is the one with the least written down. The Center is a federal agency, so its own work is likely a government work in the public domain, but it does not say so. A person should look for a terms or copyright page on fjc.gov, or ask the Center, and record the answer here. We credit the Center on the page either way | |
| **White House cabinet page** (name and title of each cabinet member), read by script from whitehouse.gov/administration/cabinet | The page has no data file. The privacy page and the cabinet page state no reuse terms (checked Oct 3, 2026) | Names and titles are facts, and a federal work is not copyrighted (17 U.S.C. 105), but the site states no terms. The page is read by structure (a name heading, then a title heading), so a redesign would stop the read; the last good list is then kept and a warning printed | |
| **Federal Register agency list** (api/v1/agencies) | Registered in `scripts/us_sources.py` as "Public API; confirm terms on federalregister.gov/developers" | Not re-read in this pass | |
| **Congress.gov votes and bills** | Registered as "review_required"; the Library of Congress API terms were not re-read | Not re-read in this pass | |

## Two lines of the circuit table for a person to confirm

`scripts/fetch_us.py` lists which states each court of appeals covers. It was compared by script with the text of 28 U.S.C. 41 on Oct 3, 2026 and matches except for two lines: the statute's "District of the Canal Zone" (Fifth Circuit; no longer a court, so left out) and the Northern Mariana Islands (added to the Ninth Circuit because 48 U.S.C. 1821 has the Ninth Circuit's chief judge assign judges there; the text read does not say outright that its appeals go to the Ninth). A person should confirm those two.

## What the sign-off should record

For each row: the exact page read, the date, the person's name, and one of "clear to use as is", "clear with this credit", or "ask the owner first". If the answer is "ask the owner first", say so on the page and keep the sentence that tells residents the terms are unconfirmed.

## What we already do either way

- Every picture and every judge and court record is credited to its source on the page.
- Nothing is presented as official advice, and the page says the record is a working view.
- If a source asks us to stop using it, the photos are one folder (`data/portraits-us/`) and the judges are one step in `scripts/fetch_us.py`; each can be turned off without touching anything else.
