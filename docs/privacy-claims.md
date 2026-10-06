# Privacy policy: what backs each claim

Source notes for the privacy policy page (`ext/cx-privacy.jsx`). Not shown to residents. Written Oct 6, 2026 with the first draft of the
policy. Every sentence on the page must be true of the build it ships with; this table says where in the code each claim lives and which
check or test fails if it stops being true. A claim no machine can check says "reading": a person confirms it by reading the code or
the source named.

`scripts/test_privacy.py` fails if a part of the policy has no row here, or if a row names a check or test that does not exist.

**Privacy contact: to be added.** Brent has not supplied a contact for privacy questions. Until he does, the page offers only the public
GitHub issue (the same route as "Report a mistake" on profiles), and no email address may be added to the page or to `CX_CORRECTION.email`
in `ext/cx-seat.jsx` without his say.

**Review status.** A draft. A lawyer has not read it and no person has approved it. When both have, the person runs
`python build.py --mark-privacy-reviewed "Name"`, which writes `data/privacy-reviewed.json` (who and when, and a fingerprint of the words
and of the two place limits in `ext/cxm-core.jsx`) and replaces the draft line with "Approved by Name on date". Any later edit to the words
brings the draft line back until someone approves again.

## The host's own words (read for the "What our host can see" part)

- Vercel Privacy Notice, https://vercel.com/legal/privacy-notice (https://vercel.com/legal/privacy-policy redirects there), "Last Updated
  June 1, 2026", read Oct 6, 2026. Under "Information We Collect from Customers", "Website Information": "We collect information about
  traffic to and from Customers' websites, such as End User IP address, location information derived from IP address, and system
  configuration information." Under "Location Information": "We collect Customers' and End Users' city and country based on IP address.
  We do not identify precise location." It also says Vercel acts "as a data processor on behalf of our Customers" for customer data.
- The live site, https://clecivic.vercel.app/, answered a request on Oct 6, 2026 with no `Set-Cookie` header (headers: Cache-Control,
  Permissions-Policy, Referrer-Policy strict-origin-when-cross-origin, Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options,
  Server: Vercel). One request on one day; what Vercel keeps in its own logs, and for how long, is not visible from outside and was not
  checked. On that day `/privacy` on the live site was still the page-not-found page: the rewrite in `vercel.json` takes effect when this
  branch is deployed, and the check server copies it (`serve()` in `scripts/checks/run.js`), so it has been tried only locally.

## Claims

| Part | Claim | Where in the code | Backed by |
| --- | --- | --- | --- |
| `short` | No accounts, no cookies, no analytics. | No sign-in anywhere. No `document.cookie`, IndexedDB, or cookie store in `ext/`, `build.py`, or the compiled app. The page's only scripts are its own, each allowed by hash (`with_csp()` in `build.py`). | `scripts/test_privacy.py`, `privacy-policy`, `security-policy` |
| `short` | Your address, place, answers, and priorities never leave your device. | Every `fetch` in `ext/` asks a fixed path on this site; the hosted page allows only its own site (`connect-src 'self'`). | `privacy-policy` (no request carries the address, the ward, or a priority during the flows), `districts`, `remember-place`, `security-policy` |
| `short` | Your place is saved only if you choose Remember this device. | `cxPlacePersist()` saves only when the entry already exists; `CxmRememberPlace` creates it. | `remember-place`, `privacy-policy` |
| `collect` | There are no accounts; you never give a name or email. | No form asks for either. | reading |
| `collect` | The site sets no cookies. | Same as the first row; `vercel.json` sets no cookie header. | `scripts/test_privacy.py`, `privacy-policy` |
| `collect` | No analytics, no ads, no tracking scripts. | Every inline script hashed in the policy; no script file from another site. | `security-policy`, `privacy-policy` (no request leaves the site) |
| `collect` | The hosted site tells your browser to let the page talk only to this site. | `with_csp()` in `build.py` (`connect-src 'self'`, `default-src 'self'`). | `security-policy` (tries to break it), `privacy-policy` (reads it) |
| `place` | Ward or neighborhood and state and district are used on the device and never sent or put in a link. | `CX_PLACE`, `CX_US_PLACE`, `cxmToUrl()` in `ext/cxm-core.jsx` (the address holds a screen, never the place). | `remember-place`, `people-tabs`, `privacy-policy` |
| `place` | Remember this device saves them in this browser only, with the day saved. | `cxPlaceSave()`: one entry, `cx-place`, fields v, saved, place, hood, state, district. | `remember-place` |
| `place` | Kept up to {days} days and never after {last}. | `cxPlaceLoad()` drops an entry older than `CX_PLACE_KEEP_DAYS` or after `CX_PLACE_LAST_DAY`; the page reads both constants. | `remember-place` (an expired entry is thrown away), `privacy-policy` (the page shows the code's numbers), `scripts/test_privacy.py` (not typed by hand) |
| `place` | Turning it off deletes it. | `cxPlaceForget()`. | `remember-place` |
| `place` | In a private window the place lasts for this visit only. | `cxPlaceSave()` returns false and says so. | `remember-place` (blocked storage) |
| `address` | Matched against a street list in the page, on the device. | `cxDistFind()` in `ext/cx-districts.jsx`; the list is a fixed file or inside the single file. | `districts` |
| `address` | Never saved, sent, or put in a link; gone when the finder closes. | The typed text is component state only. | `districts`, `privacy-policy` |
| `address` | Use these on my ballot passes only the four district numbers. | `onUse(rows)` in `ext/cxm-ballot.jsx` sets the practice ballot's districts. | `districts` |
| `choices` | Priorities, answers, and the practice ballot stay in this browser; nothing in them is sent. | `useCxmPrio()` and the compiled app's `lh()`; no request carries them. | `privacy-policy`, `security-policy` |
| `choices` | Saved only if saving is turned on (Remember on this device; Save on this browser). | The compiled app writes `cleveland-civic-values-v2` and `cleveland-practice-ballot-2026-v1` only after the switch. | `privacy-policy` (the names appear only after the switch) |
| `choices` | Clear my choices and Clear my practice data (Clear practice ballot and answers on a computer) delete them. | `clear` in `useCxmPrio()`; the compiled app's `y()` and `lh().clear`. | `privacy-policy` (presses both and finds the names gone) |
| `choices` | Export saves a file on the device; letters are copied for the person to send. We never see either. | `cxmExportChoices()`, the compiled app's export, `navigator.clipboard` in `ext/cx-leaders.jsx` and `ext/cxm-people.jsx`. | reading |
| `links` | A shared link holds only where you are, never the place, answers, or priorities. | `cxmToUrl()` (phone) and the compiled app's `Yh()` (computer). | `privacy-policy`, `remember-place`, `nav-desktop` |
| `links` | A profile link names the official, never you. | `who=` is a record's id, checked by pattern in `cxmToUrl()`. | `us-profile`, reading |
| `links` | On a computer, words typed in the search box at the top of the map go into the link. | The compiled app's `Yh()` writes `q=`. | `privacy-policy` (types a word and finds it in the address, so the page stays true) |
| `display` | Language, light or dark, style, Easy mode, and guide are saved when chosen. | `cxSetLang()`, `cxSetMode()` in `ext/cx-ui.jsx`, `setTheme`, `setEasy`, `setGuide` in `ext/cxm-core.jsx`. | `privacy-policy`, `mode-switch`, `spanish-switch` |
| `display` | Larger text is not saved. | `large` and `cxLarge` are state only. | `privacy-policy` (turning it on writes nothing) |
| `stored` | The list is everything the site saves in the browser. | Every storage call in `ext/`, `build.py`, and the compiled app. | `scripts/test_privacy.py` (reads the code), `privacy-policy` (runs the app and compares) |
| `stored` | Clearing the site's data in the browser deletes all of it. | How browsers work. | reading |
| `host` | Vercel receives each request; its notice says it collects IP address, city and country, and system details. | Vercel Privacy Notice, last updated June 1, 2026 (see above). | reading |
| `host` | We add nothing about you to those requests; which files are asked for can hint at what was looked at. | Fixed paths only; the Spanish words, the street list, and photos are files fetched when needed. | `privacy-policy`, `perf-budget` (what Today asks for), reading |
| `host` | A link to another site leaves this site. | Plain links, `rel="noreferrer"` on ours. | reading |
| `host` | The single offline file asks Google Fonts when online; the website serves its own fonts. | `page(True, google_fonts)` and `with_csp(page(False, self_fonts))` in `build.py`. | `privacy-policy` (the single file has the Google Fonts link, the hosted page has none and allows fonts only from itself) |
| `report` | Report a mistake or ask about privacy by a public GitHub issue; an account is needed; leave out anything personal. | `cxReportLink()` in `ext/cx-seat.jsx`, `.github/ISSUE_TEMPLATE/mistake.yml`. | `privacy-policy` (the link opens the repository's new issue form in a new tab), reading (GitHub's own rules) |
| `sources` | Records come from official public sources and show the day pulled. | `scripts/refresh.py` and the fetchers; dates on every record. | `scripts/refresh.py`, reading |
| `sources` | Official records update by themselves; news is never added automatically; our own words say whether a person checked them. | The nightly workflow runs only `scripts/refresh.py`; review flags in `build.py`. | `levies`, `us-explain`, reading |
| `who` | This is an Equalpoint project. | From `docs/plan-privacy-policy.md` and the owner's notes. | reading (Brent and a lawyer to confirm the wording) |
| `children` | No accounts; the site asks no one, including children, for a name, an age, or contact details. | No such field anywhere. | reading |
| `access` | Built for a keyboard and a screen reader; an automated accessibility check runs before each release; not yet tested by a person who uses a screen reader. | `scripts/release.py` runs the browser checks. | `axe`, `targets`, `privacy-policy` |
| `access` | The Spanish is a draft until a Spanish speaker reads it. | `i18n/review-notes.md`. | `spanish-switch`, `scripts/test_i18n.py` |
| `changes` | The page is dated and lists its changes, newest first. | `CX_POLICY.changed`. | `scripts/test_privacy.py`, `privacy-policy` (the date shows) |
