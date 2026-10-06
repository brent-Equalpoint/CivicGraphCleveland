/* Votes, actions, and positions on a city record: the plain words (docs/plan-votes-actions-positions.md, phases 2 and 3).
   The record component (ext/cx-record.jsx) reads only these words for what happened; every date, name, number, and source comes from the data. */

/* VOTES-TEXT-START
   Interpretive text: everything from here to VOTES-TEXT-END. These are our plain words for what the official record says happened (the Clerk's
   action words, a referral, an effective date), why a passed file shows no names, what a record's own text says it is for, and the notes beside a
   person's list. A person reads them against the record (Council's Legistar record and the City Record, linked on every row) and then runs:
       python build.py --mark-votes-text-reviewed "Your Name"
   Until then, and again after any change here, every place these words show says a person has not reviewed them. Rules: no score, rank, or
   percentage; sponsorship is not a vote; absent, recused, and not voting are not a no; a missing record is not a no; no dashes.
   CX_STATED holds positions stated outside the record (a quote, a letter, a testimony). It stays empty until a named person adds an entry with
   who said it, when, the words or a marked paraphrase, the link, and who added it, and reviews it; the fold is hidden while it is empty. */
const CX_VT = {
  action: {
    introduced: `Introduced`,
    referred: `Read for the first time and sent to committee`,
    "recommended for approval": `The committee recommended passing it`,
    "recommended for denial": `The committee recommended against it`,
    withdrawn: `Withdrawn`,
    approved: `Council passed it`,
    "approved as amended": `Council passed it with changes`,
    adopted: `Council adopted it`,
    "adopted as amended": `Council adopted it with changes`,
    "passed on second reading": `Council passed it on second reading`,
    tabled: `Council laid it on the table`,
    "received and filed": `Council received it and filed it`,
    "read into the record": `Read into the record at a Council meeting`,
    "read and referred to administrative review": `Read and sent to administrative review`,
    agendaPast: `On the agenda, with no action recorded`,
    agendaNext: `On the agenda for this meeting`,
    effective: `Took effect`,
    vote: `Recorded vote`,
  },
  question: { Passage: `The vote on passing it`, Adoption: `The vote on adopting it`, "Laid on the table": `The vote on laying it on the table` },
  word: { yea: `Yea`, nay: `Nay`, absent: `Absent`, recused: `Recusal`, abstain: `Abstain` },
  noNames: {
    issue_not_out: `No member-by-member vote is in the record yet. It passed after the meeting the newest City Record issue reports. A missing record is not a no.`,
    legistar_held: `No member-by-member vote is shown. The City Record prints none for this file, and the votes in Council's Legistar record do not add up, so they are held back. A missing record is not a no.`,
    not_printed: `No member-by-member vote is shown. The City Record prints none for this file, and Council's Legistar record has none. A missing record is not a no.`,
    notPassed: `It has not passed, so there is no final vote to show. A missing record is not a no.`,
  },
  notANo: `Absent and Recusal are not a no.`,
  absentNotANo: `Absent is not a no.`,
  differs: `Council's Legistar record lists this vote differently for {*}. The City Record's printed vote is shown.`,
  fromLegistar: `The City Record prints this vote as a sentence, not as lists, so the names come from Council's Legistar record.`,
  effectiveNote: `The City Record prints this date. It does not say who signed it.`,
  ceremonial: `A ceremonial resolution (congratulations, condolences, recognition) gets one line, not a full record.`,
  positionsLead: `What the record itself says about this file. Statements made outside the record are not shown here.`,
  sponsors: `Sponsored by {*}. Sponsorship is not a vote.`,
  purpose: `What it says it does, in its own title:`,
  reports: `Reports printed before the final vote`,
  reportsNone: `The City Record prints no committee report for this file yet.`,
  outside: `Stated outside the record`,
  personLead: `Every sponsorship and recorded vote in Council's 2026 record, newest first. A sponsorship is not a vote.`,
  personMayor: `What the Mayor's administration sent to Council in 2026, newest first. Sending a request is not a vote; Council decides each one.`,
  mayorActions: `The record does not print the Mayor's signature or veto dates, so none are listed. The City Record prints the date each law took effect, on each record.`,
  noAreas: `Council's record does not sort legislation into policy areas, so this list is filtered by kind of record, type of legislation, and year.`,
  wardLead: `What your ward's council member sponsored and how they voted, and the city records that name your ward.`,
  wardNone: `Choose your ward to see its record. Your choice stays on this device and is never sent.`,
  wardRecordsLead: `City records whose title names the ward, whose ordinance text ties money to it, or whose address is in it. Each row shows what matched.`,
  wardRecordsNone: `No city record this year names this ward, ties money to it in its text, or has an address in it.`,
};
const CX_STATED = [];
/* VOTES-TEXT-END */
