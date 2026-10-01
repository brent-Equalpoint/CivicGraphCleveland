# Cleveland Civic Intelligence: Start Here

Created 2026-09-24. This is the operational design pack for the Cleveland Civic Graph agentic layer. It complements the existing Civic Intelligence Bench, the Civic Agent Team Architecture, the visual HTML prototype, and the rebuild plan. These files do not change the site.

## Open in this order

1. **Civic-Intelligence-Agentic-Architecture-v1.md**: how resident questions become source-backed, human-approved graph records; seats, state machine, review gates and public UX.
2. **Civic-Intelligence-Agent-Playbooks-v1.md**: bounded instructions and outputs for each research, review, explanation and publishing seat.
3. **Civic-Intelligence-Data-Contracts-v1.md**: example source, snapshot, entity, claim, graph candidate, approval, correction and public projection shapes.
4. **This file**: delivery sequence, acceptance checks and honest implementation status.

## What is formed now

The team topology, authority boundaries, data shapes, state transitions, failure paths, source-health model, human review, correction flow, and public projection are specified. The existing standalone HTML graph has an accessibility foundation and static example institutions. It is not connected to these agents. Drive stores the architecture documents, not a continuously running service.

## What must be implemented before a live release

| Stage | Deliverable | Acceptance check |
| --- | --- | --- |
| 0. Constitution | Role permissions, ontology, evidence labels and threat model | Agents have no public write capability; sample data cannot enter approved graph |
| 1. Registry | Cleveland source registry with owners, cadences, access rules and health status | Three official sources can be fetched or manually registered with exact document anchors |
| 2. Intake and queue | Resident-question brief, task IDs, routing, retries and source-change queue | Ambiguous geography and unavailable source enter explicit states |
| 3. Evidence store | Raw snapshots where allowed, SHA-256, parsed records, anchors and claim IDs | A claim can be traced to one exact official record location |
| 4. Resolution and graph candidates | Person/office/organization ID rules, typed edges and temporal validity | Same-name collision is quarantined; ownership and contract remain distinct |
| 5. Review console | Examiner, Skeptic, dissent, legal-currentness and accessibility statuses | No proposal reaches human approval with missing mandatory review |
| 6. Human approval | Frozen diff, named reviewer, hash/version/scope/expiry | Changed packet invalidates approval; rejected packet never commits |
| 7. Deterministic publisher | Atomic commit, receipt, graph version, rollback/supersession path | Replay produces same result; failed precondition leaves public graph unchanged |
| 8. Public projection | Versioned API/export for Simple, Explore, Audit and text modes | All views agree on claims, sources, dates and uncertainty |
| 9. Corrections and monitoring | Source-health alerts, resident correction intake, re-review and public history | A confirmed correction preserves the old version and shows the change reason |
| 10. Evaluation | Regression cases for conflicts, stale laws, duplicate names, vote tallies, accessibility | Failed cases block promotion and become repeatable fixtures |

Start with one bounded Cleveland journey: "Who authorized a named city decision, and what was the recorded vote?" Register the official agenda, ordinance, minutes/roll call and any amendment as separate sources. Test a complete packet from intake to a human-approved shadow projection before adding broad feeds. Next try one energy contract and one education levy, preserving the different authority chains.

## Minimum acceptance cases

- A source page changes but the vote record does not: monitor creates a change notice, public graph remains unchanged.
- Two people share a name: resolver quarantines the collision and keeps separate entities.
- A legal page lacks an effective date: analyst marks currentness uncertain and blocks an unqualified present-tense claim.
- An agent claims a power plant is owned by a purchaser because of a power contract: Examiner rejects the edge type.
- A council member has no recorded vote because they were not in office: display `not_applicable` with term dates, never `missing` or `abstained`.
- A candidate states support for an issue but never voted on it: display `statement`, never `vote`.
- A resident practices a ballot choice: keep it local/private and label all projected effects as scenarios.
- An approver signs candidate hash A but the packet changes to B: commit refuses.
- A credible counterrecord appears: preserve contested status and dissent, then route to human review.
- A user navigates without the visual map: text view exposes the same nodes, relationships, source anchors and correction path with keyboard and screen reader.

## Staffing and cadence

Initial human roles can be combined in a small team, but the same person should not serve as both sole researcher and sole Examiner on the same packet. Assign one accountable editor for source registry and ontology, one or more subject researchers, an independent checker, and a named publisher. Weekly source-health review; per-packet evidence and skeptic review; monthly correction and stale-record review. On an election cycle or breaking legal change, shorten review due dates by source risk rather than making every source update equally urgent.

## Guardrails for values alignment

Provide issue-by-issue comparisons grounded in roll calls, authored/sponsored measures, official statements and time period. Show a user's stated priorities and the evidence for each comparison. Never infer an official's beliefs from party alone, use a single vote to declare a whole ideology, or frame a predicted outcome as certain. Offer "not enough evidence" and "not applicable" as first-class results. Explain how a measure could matter, what authority the office has, and where the voter can read the actual record.

## Accessibility release gate

Keep the graph's visual style and right-side drawer. Provide the same information in a searchable text hierarchy, meaningful focus order, visible focus, 44px controls where practical, no required dragging, reduced motion, labels that do not rely on color, and short plain-language explanations. Before a WCAG 2.2 AA claim, run automated and manual contrast/reflow checks, keyboard/voice/switch tests, NVDA/VoiceOver/TalkBack testing and sessions with disabled voters. Record failures with owner and resolution state.

## Links to existing Drive context

- [Cleveland Civic Intelligence Bench](https://docs.google.com/document/d/1zEAd70m9b5maqq3SRNrO8Oh6HZ0ZybwkIHwX8kZNS3g/edit?usp=drivesdk)
- [Civic Agent Team Architecture](https://drive.google.com/file/d/18BUBtntHjtEECaipZ4EW1M0_TENaj96r/view?usp=drivesdk)
- [Cleveland Civic Graph Rebuild Plan](https://drive.google.com/file/d/1CqEbTDHzS8gAHMUj6z7AGwdAkd5KWCb0/view?usp=drivesdk)

Status statement for handoff: architecture is ready for implementation. Source ingestion, running agents, backend storage, review console, API, publishing service and live feeds are not operational merely because these documents exist.
