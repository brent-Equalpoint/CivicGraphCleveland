/* Named lists of browser checks, in one place. run.js (the checks), pool.js (side by side), changed.js (what a change needs), and through
   them scripts/release.py and the Checks workflow all read these. Every name is a check in run.js; scripts/test_release_plan.js fails if not. */
module.exports = {
  // the look again with light mode on, in Bento and in Original: layout, contrast, and color vision (run.js --light)
  LIGHT: ['axe', 'no-bleed', 'text-overlap', 'story-fit', 'color-vision', 'targets', 'titles-never-cut', 'print'],
  // never skipped by any lane of the release: the security headers, the privacy policy and the storage audit, the address finder, the hosted
  // shell and its offline copy, and the update after a deploy (with the two builds, the unit tests, refresh.py --check, and the committed site)
  ALWAYS: ['security-policy', 'privacy-policy', 'remember-place', 'districts', 'shell', 'offline-shell', 'update-wins'],
  // the layout checks again in Spanish (run.js --spanish)
  SPANISH: ['axe', 'no-bleed', 'targets'],
  // checks that run alone, after the others, with nothing beside them. Empty: every check passed three full runs side by side
  // (4 at a time, Oct 6, 2026). A check that turns out to need the machine to itself goes here, with the reason.
  SERIAL: [],
  // checks that visit the same pages (AXE_PAGES): when two or more run in one pass they share one process, and each page is opened once
  TOGETHER: [['axe', 'text-overlap', 'no-bleed']],
};
