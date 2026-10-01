# Civic Intelligence Bench: what runs today

The Bench turns official records into source-backed, human-approved graph records. The design is in
[docs/civic-agent/](../docs/civic-agent/) (read the Implementation file first). This folder holds the
running part. Nothing in it reaches the app yet.

## One journey, end to end

"Who authorized a named city decision, and what was the recorded vote?" For every 2026 ordinance and
resolution in Council's Legistar record (510 files on Oct 1, 2026), the Bench can now go from the
nightly snapshot to an approved projection record, with a gate at each step:

| Step | Script | Writes | Who acts |
| --- | --- | --- | --- |
| Research and examine | `python scripts/packets.py` | `shadow/registry-2026.json`, `shadow/entities-2026.json`, `shadow/packets-2026.json` | A script, from `data/` only |
| Decide | `python scripts/approve.py --reviewer "Your Name" --approve ... --reason "..." --no-dissent` | `shadow/approvals.jsonl` (append only) | A named person |
| Publish | `python scripts/commit.py` | `approved/graph-2026.json`, `approved/receipts.jsonl` (append only) | A deterministic service |
| Check | `python scripts/test_bench.py` | nothing | Anyone, any time |

The three shadow files rebuild from `data/` on demand and are not in git; the packet hashes are the
same on every machine, and each approval records the hash it was given. `approvals.jsonl` and
`approved/` are the record and are kept.

The three scripts never share a write path. The research script has no way to approve; the approval
script has no way to publish; the publisher has no way to interpret. That is the whole point.

## What a packet holds

One packet per file, as in the Data Contracts: the entities it names, atomic claims with an exact
source anchor each (snapshot ID, record locator, URL), typed edges, the operations a commit would
perform, and a SHA-256 of the frozen content. A deterministic examiner then records a claim verdict
and a structural verdict (`MERGE`, `BLOCK`, `QUARANTINE`, `HUMAN_REQUIRED`) with its reasons.

Claims a packet can make, and only these:

- The file was introduced to Council on a date (index record).
- A named sponsor sponsored it (sponsor list). This becomes a `sponsorship` edge, never a `vote`.
- A committee or Council took a recorded action on a date (action history). A decision becomes a
  `vote` edge from the body.
- Council passed it on the record's passed date: `verified` when a matching Council action exists,
  `partial` when it does not.
- The roll call: `missing`. Legistar records that Council approved a file and does not publish each
  member's vote. That record is in the City Record, which is not registered as a source yet. A
  member outside their term shows `not_applicable` with the term dates. Nothing is ever shown as
  an abstention or a no.

People are resolved by office, ward and term from the oath record (file 1-2026), never by name
alone. Two members with the same name would both be quarantined. A sponsor who is not on the
roster stays `unreviewed`, and the packet needs a person (file 683-2026, sponsored by the Mayor,
is the one such case today).

## What is still a design

- The Skeptic seat. Today the approving person records dissent or an explicit no-dissent review.
- Source polling and change detection beyond the nightly refresh; raw HTTP snapshots (the
  registry hashes the normalized record in `data/`, and says so).
- A roll call source (the City Record minutes) and Legistar's stable sponsor IDs in the snapshot.
- Stage 8: the app reading `approved/graph-2026.json`. The Explore and Audit views still use
  `data/` directly.
- Geography on records (ward and neighborhood from addresses) and the correction intake.

## Ontology note

The Data Contracts list fifteen relationship families. The Bench adds `sponsorship`, because
putting a file forward is a formal legislative act that is neither a `statement` nor a `vote`.
This is a proposed stage 0 addition; the examiner refuses any other type.
