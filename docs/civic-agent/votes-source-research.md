# Where do member-by-member votes come from? (research note, Oct 1, 2026)

The profile page says "How each member voted isn't public yet" because the source we use does not
publish it. This note records what was checked, so the next person does not repeat it, and what is still
open. Nothing here is a parser: a source must be chosen and read by a person first.

## What was checked in Legistar (the Council record the app already uses)

Checked through the public Legistar API for Cleveland on Oct 1, 2026:

- A matter's action history has a roll call flag. It was `0` for every history row examined, including a
  file that passed.
- The votes endpoint for a Council event item returned an empty list.
- Council events have no minutes file (`EventMinutesFile` was empty for the six latest meetings).
- The Council agenda files exist, but an agenda lists what was scheduled, not how members voted.

So Legistar, as Cleveland uses it, records that Council approved a file and who sponsored it. It does not
record each member's vote.

## Candidate sources, not yet checked

These are places a roll call might be published. Each needs a person to confirm it exists, read its
terms, and decide whether it is machine-readable before anything is built on it.

| Candidate | What to confirm |
| --- | --- |
| The City Record (the city's official publication of Council proceedings) | Where it is published, whether it is a PDF or text, whether roll calls appear with each member's name, and the terms of reuse |
| Council meeting video | Whether a roll call is shown on screen and written anywhere. Video is not a record we can quote without a transcript |
| The Clerk of Council | Whether a roll call record is available on request, in what form, and whether the answer can be published |

## Decision needed

Which of these (or another) is the official roll call record for the app? When one is chosen and its
terms are read, put its votes in `data/votes-2026.json` (format in `bench/README.md`) and the Bench will
show them. Until then every roll call stays `missing`, and the app says so.
