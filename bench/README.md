# Civic Intelligence Bench: what runs today

The Bench turns official records into source-backed, human-approved records. The design is in
[docs/civic-agent/](../docs/civic-agent/). This folder is the running part. Approved records reach the
app through `site/bench/public-2026.json`, and profiles show them with a Reviewed mark.

## One journey, end to end

"Who authorized a named city decision, and what was the recorded vote?" For every 2026 ordinance and
resolution in Council's Legistar record, the Bench goes from the nightly snapshot to a published record,
with a gate at each step.

| Step | Who or what | Writes | Rule |
| --- | --- | --- | --- |
| 1. Research | `scripts/packets.py`, every night | `shadow/` (rebuilt, not in git) and `status-2026.json` | Reads `data/` only. Cannot approve. |
| 2. Examine | rule-based Examiner, inside packets.py | each packet's verdict: MERGE, HUMAN_REQUIRED, QUARANTINE, BLOCK | A claim needs a source anchor; a vote needs a roll call source |
| 3. Challenge | rule-based Skeptic, inside packets.py | each packet's dissent notes and any veto | A veto stops approval unless a publisher overrides it in writing |
| 4. Decide | a person, in the **Approve Bench packets** workflow | `shadow/approvals.jsonl` (append only) | The account that starts the run is the reviewer. It must be in `reviewers.json`, and only a publisher may approve. The decision is signed. |
| 5. Publish | `scripts/commit.py`, every night and after each approval | `approved/graph-2026.json`, `approved/public-2026.json`, `approved/evidence/`, `approved/receipts.jsonl` | Applies only signed decisions that still match the packet's hash |
| 6. Show | the app | nothing | Reads `site/bench/public-2026.json` and shows a Reviewed mark |
| 7. Correct | the **Record a correction** workflow | `corrections.jsonl`, `approved/corrections-2026.json` | A report never edits the graph; a confirmed one starts a new packet |

The scripts never share a write path: research cannot approve, approval cannot publish, and the
publisher interprets nothing.

## How approving works

1. Run **Approve Bench packets** from the Actions tab. Choose approve, reject, or revise; list packet IDs
   or write `all-merge`; give a reason; tick "no dissent" or write the counterevidence.
2. The workflow rebuilds the packets, records your decision, signs it, publishes it, rebuilds the site,
   and commits. Look at a packet first with `python scripts/packets.py` then
   `python scripts/approve.py --show packet_xxxx`, or read it in the shadow files.
3. To approve a packet the Skeptic vetoed, fill in "override veto" with the reason. Only a publisher can.

**What the signature proves, and what it does not.** `BENCH_APPROVAL_KEY` is a GitHub secret. Only
workflows can use it, and only an account in `reviewers.json` gets a decision signed. A decision typed
into `approvals.jsonl` by hand has no valid signature, and `commit.py` refuses it. This is not
unbreakable: someone with write access to the repository could change a workflow to use the key, so keep
branch protection on `main`, require a pull request for changes to `.github/` and `bench/reviewers.json`,
and keep the number of people with write access small. If the key is ever replaced, every earlier decision
stops verifying and must be made again.

## What a packet holds

One packet per file: the entities it names, atomic claims with an exact source anchor each (snapshot ID,
record locator, URL), typed edges, the operations a commit would perform, and a SHA-256 of the frozen
content. The claims a packet can make, and only these: introduced on a date; a named sponsor sponsored it
(a `sponsorship` edge, never a vote); a body took a recorded action on a date; Council passed it on a
date; and the roll call.

**The roll call comes from the City Record, not Legistar.** Legistar publishes no member-by-member votes: its
roll call fields, its vote endpoint, and its event minutes files for Council meetings are all empty (checked Oct 1, 2026).
The City Record, which the Clerk publishes weekly, prints them, and `scripts/fetch_cityrecord.py` reads them into
`data/votes-2026.json`. A file with no printed vote has a `missing` roll call. A member outside their term shows
`not_applicable` with the term dates. Nothing is ever shown as an abstention or a no.

**People are resolved by Legistar's person ID** (kept for every sponsor by `scripts/fetch_legistar.py`),
checked against the office records in `data/people-2026.json`, with office, ward and term as before. An ID
that belongs to someone other than the name on the sponsor line is an ambiguity and the packet is
quarantined. Without an ID, only a roster name and a term can resolve a person.

## Plugging in a roll call source

The City Record's votes are in `data/votes-2026.json`, written by `scripts/fetch_cityrecord.py` (nothing else writes it),
and the Bench uses them. Format:

```json
{
  "source": "Name of the record and who published it",
  "retrieved_at": "2026-10-01T12:00:00+00:00",
  "votes": {
    "27-2026": {
      "date": "2026-03-23",
      "question": "Passage",
      "members": { "Joseph T. Jones": "yea", "Kevin L. Bishop": "nay" },
      "anchor": { "url": "https://...", "locator": "page 2, roll call on file 27-2026" }
    }
  }
}
```

Values: `yea`, `nay`, `abstain`, `absent`, `recused`. A member in office who is not listed is `missing`
(the roll call becomes `partial`), never a no. A member's vote is accepted only when it rests on this
source; a vote anchored to the action history is blocked. Register the source's owner and terms in
`docs/civic-agent/votes-source-research.md` first. The file also carries `other` (votes to lay a file on the table),
`issues` (each City Record issue read, with its size and SHA-256), and `skipped` (anything it could not read).

## What is kept

- `approved/evidence/`: for every approved packet, the exact source records the reviewer saw, with
  their hashes, so the evidence survives even if the official record later changes.
- `approved/receipts.jsonl`: every publish and every refusal (a repeated refusal is logged once).
- `status-2026.json`: counts of approved, stale (approved before the source changed), waiting, held back.

## Still a design

Agents that read documents and judge them (the Examiner and Skeptic here are rules a script can state,
not readers), raw HTTP snapshot storage (the registry hashes the normalized record in `data/`, and says
so), a roll call source for committee votes (only Council's votes are read), automatic correction of the graph, and a review console beyond the GitHub
workflow form. See `docs/ROADMAP.md`.

## Ontology note

The Data Contracts list fifteen relationship families. The Bench adds `sponsorship`, because putting a
file forward is a formal legislative act that is neither a `statement` nor a `vote`. The examiner refuses
any other type.
