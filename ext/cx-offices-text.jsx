/* What five offices can do, for the candidate record and the contest page on the phone and the computer (docs/source-notes-offices.md).
   The compiled app's qm() has words for Governor, Congress, judges, the General Assembly, and County Council; build.py makes qm() ask
   cxOfficeInfo() first, so these five offices (and no other) use the words below. Anything else gets exactly the words it had before. */

/* OFFICES-TEXT-START
   Interpretive text: everything from here to OFFICES-TEXT-END. Each line says what the office does and what it cannot do alone, from the
   Ohio Constitution and the Ohio Revised Code (codes.ohio.gov) or the Cuyahoga County Charter (cuyahogacounty.gov), read on Oct 7, 2026; the
   sections and the words relied on are in docs/source-notes-offices.md. A person reads each line against its source and then runs:
       python build.py --mark-offices-reviewed "Your Name"
   Until then, and again after any change here, every place these words show says a person has not reviewed them. Rules: no one is better,
   no vote advice, no party, no prediction; a term length only where the source states it; no dashes. Keys are the contest names in the
   county list, in lower case. */
const CX_OFFICES = {
  "attorney general": {
    can: `The attorney general is the chief law officer for the state and its departments. The office appears for the state in Ohio Supreme Court cases where the state has an interest, and the term is four years.`,
    limits: `The attorney general does not make state law; the General Assembly does. Some of the work follows a request, such as legal advice to a state officer or board that asks, or a prosecution of an indicted person that the governor requests in writing.`,
    url: `https://codes.ohio.gov/ohio-revised-code/chapter-109`,
  },
  "auditor of state": {
    can: `The auditor of state audits public offices, generally at least once every two fiscal years, checking their accounts and whether they followed the laws that apply to them. The term is four years.`,
    limits: `An audit reports what it finds; it does not bring charges. Going to court to recover public money is up to the public office or the attorney general, and criminal charges come from the county prosecutor.`,
    url: `https://codes.ohio.gov/ohio-revised-code/chapter-117`,
  },
  "secretary of state": {
    can: `The secretary of state is Ohio’s chief election officer. The office sends rules and instructions to the county boards of elections, certifies the ballot forms and the candidates for state offices, and determines whether petitions for state ballot questions are sufficient.`,
    limits: `County boards of elections run each county’s elections, such as polling places and ballot printing. The secretary of state works within the powers Ohio’s election laws give the office.`,
    url: `https://codes.ohio.gov/ohio-revised-code/section-3501.05`,
  },
  "treasurer of state": {
    can: `The treasurer of state keeps the state treasury and the funds the law puts in the treasurer’s custody, and pays the valid warrants drawn on the state treasury. The term is four years.`,
    limits: `Money leaves the state treasury only when the director of budget and management orders it. For funds held in custody, the treasurer of state is not responsible for the owner’s investment decisions.`,
    url: `https://codes.ohio.gov/ohio-revised-code/chapter-113`,
  },
  "county executive": {
    can: `The County Executive is the chief executive officer of Cuyahoga County. The Executive appoints and removes county staff, signs or vetoes Council legislation, and proposes the county budget, in a four-year term.`,
    limits: `County Council holds the county’s lawmaking power, adopts the budget, and confirms many of the Executive’s appointments. At least eight Council members can pass a measure the Executive vetoed.`,
    url: `https://cuyahogacounty.gov/council/legislation/cuyahoga-county-charter`,
  },
};
/* OFFICES-TEXT-END */

/* ---------- pure: which words a contest uses, and what the notice says ---------- */
/* the words for a contest, in the shape qm() returns ({can, limits, url}), or null for every other office */
function cxOfficeInfo(c) {
  const k = c && typeof c.name === `string` ? c.name.toLowerCase() : ``;
  return Object.prototype.hasOwnProperty.call(CX_OFFICES, k) ? CX_OFFICES[k] : null;
}
function cxOfficeReview() {
  const r = typeof CX_OFFICES_REVIEW !== `undefined` ? CX_OFFICES_REVIEW : { ok: !1 };
  return r.ok ? `Our plain words for what this office can do were read against Ohio law and the county charter by ${r.by} on ${cxLongDate(r.checked)}.` : `Our plain words for what this office can do. A person has not reviewed them yet.`;
}

/* ---------- the notice under the words, where they show ---------- */
function CxOfficeNote({ contest }) {
  return cxOfficeInfo(contest) ? <p className="cxm-fine">{cxOfficeReview()}</p> : null;
}
