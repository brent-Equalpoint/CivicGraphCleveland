# Civic Graph Anonymous Insights: Data Policy

Sep 26, 2026 · @Alysha Montgomery

Futureland will learn how Cleveland residents explore civic decisions by counting their answers, never by collecting information about them. This policy sets exactly what the Civic Graph may share, how every data point stays anonymous, and who sees the results. It is written for the board to adopt before the feature launches.

## The policy

The board adopts nine commitments. Each one is a rule the software enforces, and changing any of them takes a board vote and a public changelog entry.

1. **Opt-in only.** Sharing stays off until a resident turns it on. Before they do, the app shows exactly what will be sent.
2. **A fixed menu.** Only the data points listed in this policy can leave a phone. The server rejects everything else.
3. **No identity.** We never collect names, emails, phone numbers, addresses, IP addresses, device IDs, cookies, or anything that links one visit to another.
4. **Counters only.** The server adds to anonymous tallies and discards each message on arrival. No record of any individual response exists.
5. **Built-in doubt.** Opinion answers pass through a coin flip on the phone, so no single response reveals what the person believes.
6. **Small groups stay hidden.** No chart shows a group of fewer than 20 responses.
7. **The practice ballot stays private.** Candidate picks and ballot choices never leave the phone.
8. **Nonpartisan use only.** The data serves civic education. It is never shared with candidates, campaigns, parties, or political committees, and never used to decide whom to contact before an election.
9. **Public receipts.** The dashboard the team sees is published for everyone, labeled with who the numbers represent.

## What leaves the phone

Six kinds of data points can leave a phone, and each is a pick from a fixed list. Nothing a person types is ever sent.

| Data point | What it records | Allowed values | Protection |
| --- | --- | --- | --- |
| Answer to a question | A resident's view on one constellation or story question | Question ID; Yes, No, It depends, or Still learning; ward 1 to 15 or not set; week | Coin flip on the phone; ward only if the resident picked it |
| Learning moment | Whether the resident read the supporters' reasons before answering, and whether their answer changed after | Question ID; yes or no; week | Worked out on the phone; coin flip |
| Priority | Which of the 8 priorities a resident marked, and how strongly | Priority ID; Most important, Important, or Still deciding; ward or not set; week | Coin flip; ward only if picked |
| Topic opened | Which room or section a resident explored | One of 17 room IDs or a section name; ward or not set; day | Tally only |
| Word looked up | Which dictionary term a resident opened | One of 80 term IDs; day | Tally only; a search counts only when it matches a term or room |
| Neighborhood viewed | Which neighborhood page a resident opened | One of 34 neighborhood names; day | Tally only; never joined to answers |

Every row travels as its own tally. No two rows are ever stored together, so the server can never rebuild one person's set of answers.

## What never leaves the phone

These stay on the resident's phone even with sharing turned on:

- Names, emails, phone numbers, and street addresses
- IP addresses, device or advertising IDs, cookies, and browser fingerprints
- Anything typed: search text, letter drafts, notes
- The practice ballot: candidate picks, issue choices, and districts
- Saved questions and the letters residents send officials
- Exact times and the order of a person's actions
- Age, race, gender, income, party, or any other demographic

## How anonymity holds

Five protections stack, so the data stays anonymous even if one of them fails.

1. **No trail.** Each visit is a stranger. With no ID, tallies from one person can never be joined together.
2. **Journeys stay on the phone.** The phone turns a sequence like "opened the reasons, then changed the answer" into one yes-or-no fact. That fact travels alone, and the steps never leave the device.
3. **The coin flip.** Before an opinion leaves the phone, the phone flips a coin. Heads, it sends the real answer. Tails, it sends one of the possible answers at random.
4. **Counters instead of records.** The server adds 1 to a tally such as "556-2026 · Yes · Ward 5 · week of Oct 5" and discards the message. There is no table of responses to leak, subpoena, or sell.
5. **Small groups hidden, time kept coarse.** Any square with fewer than 20 responses shows as "too few to show." Answers are grouped by week, and page views by day.

The coin flip means any single response might be the coin, so it proves nothing about the person. Across many responses the noise cancels out, where k is the number of possible answers:

```latex
\text{true share} = 2 \times \text{observed share} - \frac{1}{k}
```

A question has four answers, so k is 4. If 40% of reported answers say Yes, the true share is 2 × 40% − 25% = 55%. The cost is precision: the coin needs about four times as many responses for the same margin of error.

## How it is built

&#91;embedded content: data flow · phone to dashboard, 6 stages\]

Each hand-off drops something that could identify a person, so nothing traceable reaches a dashboard. The public key can do one thing in Supabase: call the add-1 function. Vercel's own runtime logs roll off after one day on the Pro plan, and the function writes none of the sender's details into them.

## What the dashboard shows

The dashboard answers one question: where are residents learning, and where are they getting stuck?

- **Interest by ward and topic:** which rooms and neighborhoods residents explore most
- **Education gaps:** the share answering "Still learning" on each question
- **Language barriers:** the dictionary words residents look up most
- **Whether explanations teach:** how often reading the supporters' reasons changes an answer
- **What matters most:** priority choices by ward
- **Timing:** activity by day, with Oct 5 (registration deadline), Oct 6 (early voting opens), and Nov 3 (Election Day) marked

Every chart carries its margin of error and this label: "People who used the Civic Graph and chose to share. This is not a poll."

## Guardrails and governance

Futureland is a 501(c)(3), so this data serves civic education and nothing else.

| Area | Rule |
| --- | --- |
| Use | Civic education and improving the Civic Graph only |
| Sharing | Never with candidates, campaigns, parties, or political committees; published figures are open to everyone equally |
| Outreach | Never used to choose whom to contact, remind, or target before an election |
| Access | Named staff accounts for the team dashboard; no export finer than what the dashboard shows |
| Retention | Tallies are kept for the life of the project; individual responses are never stored, so there is nothing individual to keep or delete |
| Changes | A new data point needs board approval, an updated privacy notice, and a public changelog entry before it ships |
| Incidents | If any data point turns out to identify people, collection stops that day, the tally is deleted, and the board and the public are told within 7 days |
| Steward | One named staff member owns this policy and reviews it every 12 months |

## Privacy notice for residents

Residents see this plain-English notice next to the sharing switch.

> **Share anonymously?** When this is on, the Civic Graph adds your answers to anonymous counts that show how Cleveland is learning. We never collect your name, email, phone number, address, or IP address. Nothing links your answers to each other or back to you.
>
> **What we count:** your answers to questions, the topics and words you open, your priorities, and your ward if you choose to share it.
>
> **What stays on your phone:** your practice ballot, anything you type, your letters, and the order of what you do.
>
> **Built-in doubt:** before an answer leaves your phone, your phone flips a coin and sometimes sends a random answer instead. That way no single answer says anything about you.
>
> **Turn it off anytime.** Counts already added can't be removed one by one, because we never know which ones were yours. Every count we publish is on the public dashboard.

## Before launch

The board makes five decisions, then the team clears seven checks before sharing goes live.

| Decision | Recommendation |
| --- | --- |
| Smallest group a chart may show | 20 responses |
| Coin-flip strength | Real answer half the time |
| Collect ward | Yes, only when the resident picks it |
| Publish the dashboard | Yes, the same figures the team sees |
| Policy steward | Name one staff member |

- [ ] Counsel reviews this policy for privacy law and 501(c)(3) rules; this draft is not legal advice
- [ ] The board adopts the policy
- [ ] Build the opt-in switch, the fixed menu, the coin flip, and the tallies
- [ ] Test that the server rejects anything off the menu
- [ ] Confirm the function never logs IP addresses or request headers
- [ ] Publish the privacy notice, the public dashboard, and the changelog
- [ ] Label every chart as self-selected, with its margin of error

## Sources

- [Vercel Hobby Plan](https://vercel.com/docs/plans/hobby): runtime log retention by plan
- [Vercel Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines): Hobby is limited to non-commercial personal use
- [501(c)(3) Electioneering Rules: Voter Guides and Candidate Questionnaires](https://nonprofitlawblog.com/501c3-electioneering-rules-voter-guides-candidate-questionnaires/): the IRS factors for nonpartisan voter education
