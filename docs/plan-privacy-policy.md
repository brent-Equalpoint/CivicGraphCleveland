# Plan: a privacy policy that states how people are protected

Status: decided 2026-10-05, not written yet. Brent asked for this so the app does not explain privacy at every control. Controls say the minimum ("Remember this device"); this page says the rest, once.

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
- **Who runs it.** Built by Futureland with Equalpoint; hosting by Equalpoint's Vercel plan.
- **Children, accessibility, contact.** To be decided: a contact for privacy questions.
- **Changes.** The date the policy last changed, and a plain note of what changed.

## Rules for writing it

- Plain English, short sentences, no dashes, no legal fog. A person with ten seconds should get the main point in the first lines.
- Say what we do, not only what we do not. Every sentence must be true of the build it ships with, and a check or a test should back each claim that can be checked.
- A lawyer reviews it before it is published, and a person (not a script) approves the final text. We do not give legal advice in the app.
- Spanish version, marked as a draft until a Spanish speaker reads it.
- Linked from Settings, "How this is built", and the footer of the share link page. Not shown as a pop-up.

## When

Not now. When Brent asks, write it from the list above, add a browser check that every claim names its backing check or test, and publish it at its own address with the date.
