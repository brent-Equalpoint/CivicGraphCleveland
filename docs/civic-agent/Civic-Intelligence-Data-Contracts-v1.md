# Civic Intelligence Data Contracts v1

These contracts define what the research and public graph must retain. They are implementation targets. The examples are fictitious and must never be imported as Cleveland facts.

## Identifiers and provenance

Use opaque stable IDs such as `src_`, `snap_`, `claim_`, `entity_`, `edge_`, `packet_`, `approval_`, `commit_`, and `corr_`. Never make a person's name or a page URL the primary key. Keep a raw record and parsed record linked by the snapshot ID. Timestamp all observations in UTC, preserve the source's local date and time zone, and distinguish publication date, retrieval time, effective date and validity period. A cryptographic hash proves a stored byte sequence was not changed after capture; it does not prove the content is true.

## Source and snapshot

```json
{
  "source_id": "src_example",
  "owner": "official issuing body",
  "canonical_url": "https://example.invalid/record",
  "jurisdiction_id": "city:cleveland",
  "record_type": "roll_call",
  "access_method": "html|api|pdf|manual",
  "license_status": "review_required",
  "refresh_policy": "daily|weekly|event|manual",
  "last_success_at": null,
  "health": "unknown"
}
```

```json
{
  "snapshot_id": "snap_example",
  "source_id": "src_example",
  "retrieved_at": "2026-09-24T00:00:00Z",
  "published_at": null,
  "content_sha256": "64 lowercase hex characters when bytes were stored",
  "storage_ref": "restricted snapshot location or null",
  "http_status": 200,
  "etag": null,
  "parser_version": "v1",
  "access_notes": []
}
```

`example.invalid` is a reserved demonstration domain. Do not treat the sample as a source. If the source forbids storage, retain an authorized reference and mark the snapshot limit explicitly.

## Entity and claim

```json
{
  "entity_id": "entity_example",
  "kind": "person|office|body|agency|company|facility|contract|ballot_item|law|place|community",
  "display_name": "Example entity",
  "canonical_identifier": null,
  "jurisdiction_id": "city:cleveland",
  "aliases": [],
  "valid_from": null,
  "valid_to": null,
  "resolution_state": "unreviewed|resolved|ambiguous|superseded",
  "resolution_evidence": []
}
```

```json
{
  "claim_id": "claim_example",
  "statement": "Exact, atomic proposition",
  "subject_id": "entity_example",
  "predicate": "authorized",
  "object_id": "entity_other",
  "jurisdiction_id": "city:cleveland",
  "valid_from": null,
  "valid_to": null,
  "observed_at": "2026-09-24T00:00:00Z",
  "evidence_state": "partial",
  "confidence_reason": "What the record supports and does not support",
  "anchors": [{"snapshot_id":"snap_example","locator":"page 4, row 2","url":"https://example.invalid/record"}],
  "counterevidence_ids": [],
  "reviewed_at": null,
  "review_due_at": null,
  "supersedes_claim_id": null
}
```

Evidence states: `verified` means the specific proposition is directly supported by suitable records and has passed review; `partial` means only part is established; `contested` means credible records disagree; `stale` means the fact may have changed; `missing` means the record has not been found; `not_applicable` means the field does not apply. `confidence_reason` is mandatory even if a numeric estimate is stored.

## Typed graph candidate

```json
{
  "candidate_id": "packet_example",
  "version": 1,
  "created_at": "2026-09-24T00:00:00Z",
  "operation": "upsert_edge|upsert_node|supersede|remove_projection",
  "edge": {
    "edge_id": "edge_example",
    "subject_id": "entity_example",
    "relationship_type": "legal_authority",
    "object_id": "entity_other",
    "jurisdiction_id": "city:cleveland",
    "valid_from": null,
    "valid_to": null,
    "claim_ids": ["claim_example"]
  },
  "graph_precondition_version": "current approved graph version",
  "examiner_verdict": null,
  "skeptic_review_id": null,
  "candidate_sha256": "computed from canonical frozen packet bytes",
  "state": "shadow_candidate"
}
```

Relationship types must be typed and directional. `contract` means the parties have an evidenced contract, not that either owns or operates a plant. `funding` means a documented transfer or commitment, not policy control. `influence_claim` and `inference` are labeled interpretations and may require special review. Personal social ties should not be inferred from coappearance in a record.

## Human decision and commit

```json
{
  "approval_id": "approval_example",
  "candidate_id": "packet_example",
  "candidate_version": 1,
  "candidate_sha256": "same frozen candidate hash",
  "scope": ["upsert_edge:edge_example"],
  "decision": "approved|rejected|revision_requested",
  "reviewer_id": "named authorized human",
  "decided_at": "2026-09-24T00:00:00Z",
  "expires_at": "2026-09-25T00:00:00Z",
  "reason": "Recorded explanation"
}
```

Commit only when `decision=approved`, hash/version/scope match, expiry has not passed, graph version precondition matches, all gate records exist, and every operation is in the approved diff. Write mutation and receipt atomically; on failure leave the public graph unchanged. A correction creates a new packet referencing the old claim/commit and preserves history.

## Source-change and correction events

`source_change`: source ID, old/new snapshot IDs, detected timestamp, diff location, parser status, review assignment and classification (`content_change`, `metadata_only`, `unavailable`, `parser_changed`). No public mutation follows directly.

`correction`: public record ID, reporter input, intake timestamp, privacy classification, triage, evidence, reviewer, disposition (`confirmed`, `unconfirmed`, `duplicate`, `out_of_scope`), linked replacement packet and public correction note when applicable. Do not expose a reporter's private contact information.

## Public projection contract

An approved record exported to the HTML/React graph contains `id`, `type`, `label`, `plain_summary`, `jurisdiction`, `geography`, `as_of`, `evidence_state`, `source_anchors`, `validity`, `related_ids`, `next_step`, `revision_id`, and `accessibility_text`. The Simple, Explore, Audit and text views render this same record at different levels of detail. The UI never reads shadow packets or unapproved source snapshots directly.
