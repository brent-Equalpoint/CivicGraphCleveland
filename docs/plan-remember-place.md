# Plan: remember a person's place, on their own device

Status: decided 2026-10-05, being built. Written for Brent and the team.

## The rule this works inside

Nothing personal leaves the browser. Place, answers and priorities never go into links or requests. So the memory is the browser's own local storage. No cookies (a cookie is sent to the server with every request), no account, no server copy. The hosted page also carries a Content-Security-Policy that lets it talk only to its own site, and the `security-policy` check fails if that stops being true.

## What it does

- A small switch, labeled just "Remember this device" (the explanation belongs in the privacy policy, `docs/plan-privacy-policy.md`), appears right after someone picks a ward or neighborhood, and in Settings. It is off until they turn it on.
- When it is on, the page saves one entry, `cx-place`, with a version number and the date saved. It holds only:
  - the Cleveland ward (or neighborhood name),
  - the federal state and district they chose.
- It never holds the typed address, and never the districts the address finder works out.
- On the next visit the saved place is read back before the first screen, so My place, People, and the federal profiles open on it.
- Settings has "Forget my place", which removes the entry and turns the switch off. Clearing practice data also clears it. (As built, Oct 6, 2026: turning the switch off forgets the place; "Clear my practice data" does not. The privacy policy says what the build does.)
- A saved place expires after 120 days, or the week after Election Day, whichever is first. Old or broken data is ignored, never a crash.
- If the browser blocks storage (a private window), the app says "This browser could not save your place" and carries on for the visit.

## Install support

iPhone Safari clears a site's saved data after about seven days without a visit unless the site is on the Home Screen. So the build adds a web app manifest and, after someone saves their place, one quiet line: "Add to Home Screen to keep this through the election." Never a pop-up.

## Checks

- Pick a ward, turn the switch on, reload: the ward is still there.
- Switch off, or Forget my place: nothing is stored.
- No address text appears in storage, in the link, or in any request.
- Expired and malformed entries are ignored.
- Blocked storage shows the message and the app still works.
- English, Spanish, light mode, both styles; the `districts` and `security-policy` checks still pass.
