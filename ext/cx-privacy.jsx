/* The privacy policy (docs/plan-privacy-policy.md): one plain page that says how people are protected, so the controls can stay short.
   Where it opens: on a computer, My pages > You > Privacy policy and the How this is built page; on a phone, Settings and How this is built,
   as a full page; anywhere, ?panel=privacy; on the hosted site, /privacy (vercel.json sends that address to the app, and the first lines
   below turn it into /?panel=privacy before either layout reads the address). The single offline file has it as a screen.
   Rules: every sentence is true of the build it ships with. docs/privacy-claims.md names the check or test behind each claim.
   scripts/test_privacy.py fails if the code saves something in the browser that the list below does not name, or if the list names
   something the code never saves; the privacy-policy browser check runs the app and compares what it really writes.
   The words live between the PRIVACY-TEXT markers as strict JSON. Editing them clears a person's approval: a lawyer reads the page, then a
   person runs  python build.py --mark-privacy-reviewed "Name". Until then the page says, at the top, that it is a draft. */

/* /privacy opens the policy in either layout: the address becomes /?panel=privacy before anything reads it (the desktop app keeps the path
   when it rewrites the address, so /privacy would otherwise stay in every later link) */
(function cxPolicyPath() {
  try {
    const l = globalThis.location;
    if (l && /^https?:$/.test(l.protocol) && /^\/privacy\/?$/.test(l.pathname)) globalThis.history.replaceState(globalThis.history.state, ``, `/?panel=privacy${l.hash || ``}`);
  } catch (e) { /* a browser that refuses keeps the address it has, and the page opens at the start */ }
})();

/* PRIVACY-TEXT-START: everything the policy says, as strict JSON (build.py and scripts/test_privacy.py read it). "changed" is newest first:
   add a line there whenever the words change. {days} and {last} are filled in from the code that keeps a remembered place
   (CX_PLACE_KEEP_DAYS and CX_PLACE_LAST_DAY in ext/cxm-core.jsx), so the page cannot drift from it. Privacy contact: to be added by Brent;
   until then the page offers only the public GitHub issue (do not put an email address here without his say). */
const CX_POLICY = {
 "changed": [
  ["2026-10-06", "First draft, written from what the app does on this date."]
 ],
 "short": [
  "No accounts. No cookies. No analytics.",
  "Your address, place, answers, and priorities never leave your device.",
  "Your place is saved on this device only if you choose Remember this device."
 ],
 "sections": [
  {"id": "collect", "heading": "What we do not collect", "body": [
   "There are no accounts. You never sign in or give us your name or email.",
   "This site sets no cookies. It has no analytics, no ads, and no tracking scripts.",
   "The hosted site tells your browser to let the page talk only to this site."
  ]},
  {"id": "place", "heading": "Your place", "body": [
   "Your ward or neighborhood, and your state and U.S. House district, are used on your device to show who represents you. They are never sent anywhere or put in a link.",
   "If you choose Remember this device, they are saved in this browser and nowhere else, with the day you saved them. They are kept for up to {days} days, and never after {last}, one week after Election Day.",
   "Turn Remember this device off and the saved place is deleted.",
   "In a private window, or a browser that does not allow saving, your place lasts for this visit only."
  ]},
  {"id": "address", "heading": "Addresses", "body": [
   "An address you type in Find my districts is matched against a street list inside the page, on your device.",
   "It is never saved, never sent, and never put in a link. Close the finder and it is gone.",
   "If you choose Use these on my ballot, only the four district numbers go to your practice ballot. The address does not."
  ]},
  {"id": "choices", "heading": "Priorities, answers, and your practice ballot", "body": [
   "Your priorities, your answers to the comparison questions, and your practice ballot stay in this browser. Nothing in them is sent.",
   "They are saved only if you turn saving on: Remember on this device in My priorities, and Save on this browser on your practice ballot. Otherwise they last for this visit.",
   "Clear my choices in My priorities deletes your saved priorities. Clear my practice data on the Ballot tab deletes your saved practice ballot and answers. On a computer, it is called Clear practice ballot and answers.",
   "Export saves a copy as a file on your device. Letters you write are copied for you to send yourself. We never see either one."
  ]},
  {"id": "links", "heading": "Links you share", "body": [
   "A link you share, from Share this screen, Share view, or the address bar, holds only where you are: a room, a record, or a page.",
   "It never holds your place, your answers, or your priorities. A link to an official's profile names that official, never you.",
   "On a computer, words you type in the search box at the top of the map also go into the link. That way the link opens the same view."
  ]},
  {"id": "display", "heading": "Language and display choices", "body": [
   "Your language, light or dark, style, Easy mode, and guide are saved in this browser when you choose them. The page then opens the way you left it.",
   "Larger text is not saved. It goes back to normal the next time you open the page."
  ]},
  {"id": "stored", "heading": "Everything this site saves in your browser", "body": [
   "This is the full list. Each item stays in this browser on this device, and none of it is sent.",
   {"stored": 1},
   "To delete all of it at once, clear this site's data in your browser's settings."
  ]},
  {"id": "host", "heading": "What our host can see", "body": [
   "This site is hosted by Vercel. Like any web host, Vercel receives each request your browser makes for one of our files.",
   "Vercel's privacy notice says it collects information about traffic to the sites it hosts. That includes your IP address, the city and country it points to, and technical details about your system.",
   {"link": "https://vercel.com/legal/privacy-notice", "text": "Vercel privacy notice, last updated June 1, 2026"},
   "We add nothing about you to those requests. Which files your browser asks for can still hint at what you looked at, such as the Spanish words or an official's photo. They never include your address, your answers, or your priorities.",
   "When you open a link to another site, such as a source or the Board of Elections, you leave this site. That site's own rules apply.",
   "There is also a copy of this app saved as one file, for use offline. If you open that file while you are online, it asks Google Fonts for its typefaces, so Google receives your IP address. This website serves its own fonts."
  ]},
  {"id": "report", "heading": "Reporting a mistake or asking a question", "body": [
   "To report a mistake, or to ask a question about privacy, open an issue on GitHub. You need a free GitHub account.",
   "Issues are public. Do not include your name, your address, or anything personal.",
   {"report": "Open an issue on GitHub"}
  ]},
  {"id": "sources", "heading": "Where the records come from", "body": [
   "Records come from official public sources, such as City Council, the City Record, the Board of Elections, and federal agencies. Each record shows the day it was pulled.",
   "Official records update by themselves. News is never added automatically. Text that explains a record in our own words says whether a person has checked it."
  ]},
  {"id": "who", "heading": "Who runs this site", "body": [
   "The Cleveland Civic Graph is an Equalpoint project, built by Futureland with Equalpoint. It is hosted on Equalpoint's Vercel plan."
  ]},
  {"id": "children", "heading": "Children", "body": [
   "The site has no accounts and asks no one, including children, for a name, an age, or contact details."
  ]},
  {"id": "access", "heading": "Accessibility", "body": [
   "This page is built to work with a keyboard and a screen reader. An automated accessibility check runs on it before each release. It has not yet been tested by a person who uses a screen reader.",
   "The Spanish version is a draft until a Spanish speaker has read it."
  ]},
  {"id": "changes", "heading": "Changes to this policy", "body": [
   "When this policy changes, the date at the top changes, and the change is listed here, newest first.",
   {"changes": 1}
  ]}
 ],
 "stored": [
  {"key": "cx-lang", "where": "local", "title": "Language", "text": "English or Spanish.", "note": "Saved when you choose a language."},
  {"key": "cx-mode", "where": "local", "title": "Light or dark", "text": "Light or Dark.", "note": "Saved when you choose one. Choosing System deletes it."},
  {"key": "cx-theme", "where": "local", "title": "Style", "text": "Bento or Original.", "note": "Saved when you choose a style."},
  {"key": "cx-easy", "where": "local", "title": "Easy mode", "text": "On or off.", "note": "Saved when you turn Easy mode on or off."},
  {"key": "cx-guide", "where": "local", "title": "Your guide", "text": "Erie, Terry, or Cuy.", "note": "Saved when you pick a guide."},
  {"key": "cx-us-motion", "where": "local", "title": "Map motion", "text": "Still, Calm, or Live, for the United States map.", "note": "Saved when you pick one."},
  {"key": "cx-jump-recent", "where": "local", "title": "Recent in Jump to", "text": "On a computer, the last five rooms, pages, or records you opened from Jump to. Never the words you typed.", "note": "Saved when you open one. Clear recent deletes it."},
  {"key": "cx-place", "where": "local", "title": "Your place", "text": "Your ward or neighborhood, your state and U.S. House district, and the day you saved them.", "note": "Saved only if you turn on Remember this device. Turning it off deletes it."},
  {"key": "cleveland-civic-values-v2", "where": "local", "title": "My priorities", "text": "Your priorities and your views on the example decisions.", "note": "Saved only if you turn on Remember on this device. Clear my choices deletes it."},
  {"key": "cleveland-practice-ballot-2026-v1", "where": "local", "title": "Practice ballot", "text": "The districts you picked for it, the local issues you added, your practice choices, and your answers to the comparison questions.", "note": "Saved only if you turn on Save on this browser. Clear my practice data deletes it."},
  {"key": "cx-es-note", "where": "session", "title": "Spanish draft notice", "text": "That you closed the notice saying the Spanish is a draft.", "note": "Gone when you close the tab."},
  {"key": "cx-probe", "where": "local", "title": "Saving test", "text": "Nothing. It is saved and deleted at once, to see whether this browser allows saving.", "note": "Deleted right away."},
  {"key": "cleveland-civic-priorities", "where": "old", "title": "Old priorities", "text": "Priorities left by an older version of this site.", "note": "This site no longer saves it. Clear my choices deletes it."},
  {"key": "cx-", "where": "cache", "title": "Saved copy of the site", "text": "This website's own public files, so it opens without a signal: the page, fonts, photos of officials, and record and data files. Nothing about you.", "note": "Saved when you visit the website, named cx- and a build number. A new version replaces it."}
 ]
};
/* PRIVACY-TEXT-END */

/* a sentence with the remembered place's limits filled in from the code (one piece of text, so the Spanish can turn the number and date) */
function cxPolicyFill(s) {
  return String(s).replace(`{days}`, String(CX_PLACE_KEEP_DAYS)).replace(`{last}`, cxLongDate(CX_PLACE_LAST_DAY));
}
/* The page itself, the same on a computer and a phone. Fixed colors, like the profile page (.sp) it reuses, so it reads the same in both. */
function CX_PrivacyPolicy() {
  const rev = CX_PRIVACY_REVIEW;
  const last = CX_POLICY.changed[0][0];
  const part = (b, i) => {
    if (typeof b === `string`) return <p key={i}>{cxPolicyFill(b)}</p>;
    if (b.link) return <p key={i}><a className="pv-go" href={b.link} target="_blank" rel="noreferrer">{b.text}<span className="sp-ext"> (opens in a new tab)</span></a></p>;
    if (b.report) return <p key={i}><a className="pv-go" href={cxReportLink(`Privacy policy`)} target="_blank" rel="noreferrer">{b.report}<span className="sp-ext"> (opens in a new tab)</span></a></p>;
    if (b.stored) {
      return (
        <ul key={i} className="pv-items">
          {CX_POLICY.stored.map((x) => (
            <li key={x.key} data-where={x.where}>
              <p className="pv-item-h"><strong>{x.title}</strong> <code>{x.key}</code></p>
              <p>{x.text}</p>
              <p className="pv-when">{x.note}</p>
            </li>
          ))}
        </ul>
      );
    }
    if (b.changes) return <ul key={i} className="sp-list pv-changes">{CX_POLICY.changed.map(([d, t]) => <li key={d}><strong>{cxLongDate(d)}</strong><span>{t}</span></li>)}</ul>;
    return null;
  };
  return (
    <article className="sp pv" aria-labelledby="pv-h" data-changed={last}>
      {rev.ok
        ? <p className="sp-asof pv-ok">{`Approved by ${rev.by} on ${cxLongDate(rev.checked)}.`}</p>
        : <p className="pv-draft">This policy is a draft. A person has not yet approved it.</p>}
      <h1 id="pv-h">Privacy policy</h1>
      <p className="sp-asof pv-date">{`Last changed ${cxLongDate(last)}.`}</p>
      <section className="pv-short" aria-labelledby="pv-short-h">
        <h2 id="pv-short-h">In short</h2>
        {CX_POLICY.short.map((t) => <p key={t}>{t}</p>)}
      </section>
      {CX_POLICY.sections.map((s) => (
        <section key={s.id} id={`pv-${s.id}`} aria-labelledby={`pv-${s.id}-h`}>
          <h2 id={`pv-${s.id}-h`}>{s.heading}</h2>
          {s.body.map(part)}
        </section>
      ))}
    </article>
  );
}
/* The phone: a full page over the tabs, like At City Hall. Back returns to the sheet it was opened from (Settings, How this is built). */
function CxmPrivacyPage() {
  const { closePrivacy } = useCxm();
  const backRef = u.useRef(null);
  u.useEffect(() => { if (backRef.current) backRef.current.focus({ preventScroll: !0 }); }, []);
  return (
    <div className="cxm-full pv-page" role="dialog" aria-modal="true" aria-labelledby="pv-h">
      <div className="cxm-full-bar">
        <button type="button" ref={backRef} className="cxm-full-back" onClick={closePrivacy}><CXI.Back size={18} /><span>Back</span></button>
        <div className="cxm-top-actions"><CX_LangButton cls="cxm-lang" short /></div>
      </div>
      <div className="cxm-full-body"><CX_PrivacyPolicy /></div>
    </div>
  );
}
