# Plan: a privacy policy that states how people are protected

Status: decided 2026-10-05. **Built 2026-10-06 as a draft** (on a branch, not released): a lawyer has not read it and no person has approved it, so the page says so at the top. Brent asked for this so the app does not explain privacy at every control. Controls say the minimum ("Remember this device"); this page says the rest, once.

## What was built (Oct 6, 2026)

- **The page.** `ext/cx-privacy.jsx`: the words as strict JSON between the PRIVACY-TEXT markers (`CX_POLICY`), one component for both layouts (`CX_PrivacyPolicy`, on the profile page's type), and the phone's full page (`CxmPrivacyPage`, like At City Hall). Order: the draft line, the heading, the date, "In short" (three lines: no accounts, no cookies, no analytics; your address, place, answers, and priorities never leave your device; your place is saved only if you choose Remember this device), then each part from the list below, then "Everything this site saves in your browser" (13 names and the site's saved copy, each with what it holds and how it is removed) and the changes, newest first.
- **Where it opens.** `/privacy` on the hosted site (a rewrite in `vercel.json`; the page turns the address into `/?panel=privacy` before either layout reads it), `?panel=privacy` on a phone, a computer, and the single offline file. Linked from Settings and How this is built on the phone, and from How this is built and My pages > You on a computer. There is no separate share-link page (a shared link opens the app itself), so there is no footer link. If Brent wants one, the phone footer (`cxm-foot`) and the desktop footer stamp are the two places; it adds two words to every screen's text budget.
- **Review.** `python build.py --mark-privacy-reviewed "Name"` (after a lawyer has read it) writes `data/privacy-reviewed.json` and replaces the draft line with "Approved by Name on date"; any later change to the words, or to the two place limits it reads from `ext/cxm-core.jsx`, brings the draft line back.
- **What backs each sentence:** `docs/privacy-claims.md` (a table: claim, where in the code, check or test). **Privacy contact: to be added** by Brent; until then the page offers only the public GitHub issue.
- **Checks.** `scripts/test_privacy.py` reads every storage call in the code (ours, the scripts `build.py` writes, and the compiled app) and fails if a saved name is not on the page, or the page names something nothing saves; and for dashes, legal promise words, a typed-in place limit, an email address, the `/privacy` rewrite, and a claims row that names a check that does not exist. The `privacy-policy` browser check opens the page at both addresses on a phone, a computer, 320 px, and in Easy mode, follows every link to it, runs the app through its flows with every storage write recorded and compares them with the page's list, and checks cookies, requests, fonts, the report link, Spanish, and light mode in both styles.
- **Corrections to the plan's list, from the code:** "Clear my choices" clears only the priorities; the practice ballot and its answers are cleared by "Clear my practice data" (phone) or "Clear practice ballot and answers" (computer). Larger text is not saved. Words typed in the desktop map's search box do go into the link (`q=`), so the page says so. Turning a place's remembering off deletes it, but clearing practice data does not (the remember-place plan expected it would).

## Why a policy, not more text on screens

Every reassurance repeated beside a switch or a box is a sentence people have to skip. One plain policy, linked from Settings and "How this is built", can say it fully and be checked against what the app really does.

## What the policy must state (each is true today, and a check backs it where noted)

- **What we do not collect.** No accounts, no cookies, no analytics, no ads, no tracking scripts. (`security-policy` check: the page talks only to its own site.)
- **Place.** Your ward or neighborhood and your federal state and district are used on your device. If you choose "Remember this device", they are saved in your browser only, for up to 120 days or the week after Election Day. You can turn it off, and that forgets them. (`remember-place` check.)
- **Addresses.** An address you type to find your districts is matched on your device and is never saved, sent, or put in a link. (`districts` check.)
- **Priorities, answers, practice ballot.** Stay in your browser. Saved only if you choose to remember them. Cleared by "Clear my choices".
- **Links you share.** Do not contain your place, answers, or priorities.
- **Language and display choices.** Saved in your browser so the page opens the way you left it.
- **What the host can see.** Our host (Vercel) receives ordinary web requests and may log things like your IP address and the page asked for, as any web host does. We do not add anything about you to those requests. (To confirm with the host's own policy before publishing.)
- **Reporting a mistake.** Reports go through a public GitHub issue, so they are public; do not include anything personal. A free GitHub account is needed. (From the existing wording on profiles.)
- **Sources.** Official public records, with dates pulled; news and interpretation wait for a person.
- **Who runs it.** "This is an Equalpoint project." and nothing more (Brent, Oct 6).
- **Children, accessibility, contact.** To be decided: a contact for privacy questions.
- **Changes.** The date the policy last changed, and a plain note of what changed.

## Rules for writing it

- Plain English, short sentences, no dashes, no legal fog. A person with ten seconds should get the main point in the first lines.
- Say what we do, not only what we do not. Every sentence must be true of the build it ships with, and a check or a test should back each claim that can be checked.
- A lawyer reviews it before it is published, and a person (not a script) approves the final text. We do not give legal advice in the app.
- Spanish version, marked as a draft until a Spanish speaker reads it.
- Linked from Settings, "How this is built", and the footer of the share link page. Not shown as a pop-up.

## When

Brent asked on Oct 6, 2026; the draft is built (see the top). Left before it is final: a lawyer reads it, Brent supplies a privacy contact (or confirms the GitHub issue is the only one), Brent and the lawyer confirm the "Who runs this site" wording, a person approves it with `--mark-privacy-reviewed`, and a Spanish speaker reads the Spanish.
