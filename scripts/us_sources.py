#!/usr/bin/env python3
"""United States graph, phase U1: the federal source registry and a one-shot probe.

  python scripts/us_sources.py            test each source once and print a table (writes nothing)
  python scripts/us_sources.py --list     print the registry without touching the network

Every source the US graph may use is listed here first, with its owner, what it gives, how often it
changes, how it is reached, and what is still unchecked (docs/plan-us-graph.md). This is the Bench
"source registry" for the federal scope. Nothing is stored and no data/ file is written: the probe
only confirms each source answers and shows the real shape of what it returns.

The Congress.gov key is read from the CONGRESS_API_KEY environment variable, or from a local .env
file (ignored by git). It is sent as a request header, never in a URL, and is never printed.
"""
import json, os, sys, time, urllib.error, urllib.request

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
UA = "CivicGraphCleveland/1.0 (civic education; contact via the project owner)"
CONGRESS, SESSION = 119, 2  # 2026 falls in the second session of the 119th Congress

# license_status "review_required" means a person has not yet read the source's terms. Nothing here
# is claimed as cleared. Fix it in this file when someone has read them and write who and when.
SOURCES = [
    {"id": "us_members", "owner": "The unitedstates project (public domain data on GitHub)", "gives": "535 members: offices, terms, party as dated field, committee seats, official IDs",
     "url": "https://unitedstates.github.io/congress-legislators/legislators-current.json", "access": "json", "key": None, "cadence": "daily",
     "license_status": "review_required", "terms_note": "Project states the data is public domain; confirm on its README before relying on it"},
    {"id": "us_committees", "owner": "The unitedstates project", "gives": "Committees, subcommittees, and their members",
     "url": "https://unitedstates.github.io/congress-legislators/committees-current.json", "access": "json", "key": None, "cadence": "weekly",
     "license_status": "review_required", "terms_note": "Same project and same check as us_members"},
    {"id": "us_bills", "owner": "Library of Congress (Congress.gov API)", "gives": "Bills, sponsors, actions, and the Congressional Research Service policy area (the official category)",
     "url": f"https://api.congress.gov/v3/bill/{CONGRESS}?format=json&limit=1", "access": "api", "key": "CONGRESS_API_KEY", "cadence": "daily",
     "license_status": "review_required", "terms_note": "Read the terms on the signup form and the Library of Congress policy; 5,000 requests per hour per the README"},
    {"id": "us_house_votes", "owner": "Library of Congress (Congress.gov API), from the House Clerk", "gives": "House roll call votes and how each member voted",
     "url": f"https://api.congress.gov/v3/house-vote/{CONGRESS}/{SESSION}?format=json&limit=1", "access": "api", "key": "CONGRESS_API_KEY", "cadence": "daily",
     "license_status": "review_required", "terms_note": "Newer endpoint; confirm it covers the full session. The House Clerk's own XML is the fallback"},
    {"id": "us_house_clerk", "owner": "Clerk of the U.S. House of Representatives", "gives": "House roll call vote, XML, member by member",
     "url": f"https://clerk.house.gov/evs/2026/roll001.xml", "access": "xml", "key": None, "cadence": "per vote",
     "license_status": "review_required", "terms_note": "Official primary record; confirm terms on clerk.house.gov"},
    {"id": "us_senate_votes", "owner": "Secretary of the Senate", "gives": "Senate roll call vote, XML, senator by senator",
     "url": f"https://www.senate.gov/legislative/LIS/roll_call_votes/vote{CONGRESS}{SESSION}/vote_{CONGRESS}_{SESSION}_00001.xml", "access": "xml", "key": None, "cadence": "per vote",
     "license_status": "review_required", "terms_note": "Official primary record; confirm terms on senate.gov"},
    {"id": "us_executive", "owner": "The unitedstates project (public domain data on GitHub)", "gives": "The President and Vice President, and every President's terms",
     "url": "https://unitedstates.github.io/congress-legislators/executive.json", "access": "json", "key": None, "cadence": "after each election",
     "license_status": "review_required", "terms_note": "Same project and same check as us_members. Cabinet members are not in this file"},
    {"id": "us_cabinet", "owner": "The White House", "gives": "The cabinet: each member's name and title (21 on Oct 3, 2026)",
     "url": "https://www.whitehouse.gov/administration/cabinet/", "access": "html", "key": None, "cadence": "when the cabinet changes",
     "license_status": "review_required", "terms_note": "A web page with no data file, read by script and checked hard (scripts/fetch_us.py). Names and titles are facts, and a federal work is not copyrighted (17 U.S.C. 105), but whitehouse.gov states no reuse terms on the pages checked; a person should confirm"},
    {"id": "us_judges", "owner": "Federal Judicial Center", "gives": "Every Article III federal judge since 1789: courts, service dates, senior status, and the appointing President",
     "url": "https://www.fjc.gov/sites/default/files/history/judges.csv", "access": "csv", "key": None, "cadence": "as appointments change",
     "license_status": "review_required", "terms_note": "Official federal research agency; confirm the reuse terms on fjc.gov before relying on it. Sitting means the latest service has no end date"},
    {"id": "us_circuits", "owner": "Office of the Law Revision Counsel, U.S. House of Representatives (the United States Code)", "gives": "Which circuit each federal judicial district is in (28 U.S.C. 41), so a district court's appeals go to that circuit's court of appeals. Appeals from every court of appeals can go to the Supreme Court (28 U.S.C. 1254)",
     "url": "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title28-section41&num=0&edition=prelim", "access": "manual", "key": None, "cadence": "when Congress changes the statute",
     "license_status": "review_required", "terms_note": "Written out by hand as a table in scripts/fetch_us.py; a person should compare that table with the statute. The United States Code is a federal work and not copyrighted (17 U.S.C. 105). The United States graph cites it on every district court's appeals line"},
    {"id": "us_portraits", "owner": "U.S. Government Publishing Office (Member Guide), republished by the unitedstates project", "gives": "Official photographs of members of Congress, by Bioguide ID (the archive first, then the Congress directory at bioguide.congress.gov for a member the archive lacks)",
     "url": "https://unitedstates.github.io/images/congress/225x275/V000137.jpg", "access": "image", "key": None, "cadence": "as members change",
     "license_status": "review_required", "terms_note": "The project says the GPO assured it all photos are public domain, and dedicates the repository under CC0 1.0; confirm on the repository README. The directory is the Member Guide itself, a federal source; confirm its reuse terms the same way. Presidents who never served in Congress, justices, and judges have no photo here"},
    {"id": "us_agencies", "owner": "Office of the Federal Register", "gives": "Every federal agency and sub-agency, parent links, and a short description",
     "url": "https://www.federalregister.gov/api/v1/agencies.json", "access": "json", "key": None, "cadence": "weekly",
     "license_status": "review_required", "terms_note": "Public API; confirm terms on federalregister.gov/developers"},
    {"id": "us_gov_manual", "owner": "U.S. Government Publishing Office (GovInfo)", "gives": "The United States Government Manual: the official description of what each agency does",
     "url": "https://www.govinfo.gov/app/collection/govman", "access": "manual", "key": None, "cadence": "yearly",
     "license_status": "review_required", "terms_note": "Registered by hand; a person reads and approves each description (interpretive text)"},
    {"id": "us_plum_book", "owner": "U.S. Office of Personnel Management and the Government Publishing Office", "gives": "Appointed positions in the executive branch",
     "url": "https://www.govinfo.gov/app/collection/plumbook", "access": "manual", "key": None, "cadence": "every four years",
     "license_status": "review_required", "terms_note": "Registered by hand; slow-moving, used for who leads"},
    # What each committee handles, and what the committee roles mean (docs/plan-explain-committees-and-seats.md; read Oct 5, 2026: docs/source-notes-committees.md).
    # scripts/fetch_explainers.py reads them into data/us-explainers-2026.json; scripts/us_explainer_config.py says which passage of which page.
    {"id": "us_house_rules", "owner": "U.S. House of Representatives (Parliamentarian), published by the Government Publishing Office", "gives": "House Rule X, clause 1 (each standing committee's subjects) and clause 11 (Intelligence); Rule XI (vice chairs, quorum to report, Ethics); Rule XIII (reports), 119th Congress",
     "url": "https://www.govinfo.gov/content/pkg/CDOC-118hdoc187/html/CDOC-118hdoc187.htm", "access": "html", "key": None, "cadence": "each new Congress (January)",
     "license_status": "review_required", "terms_note": "The House Rules and Manual for the 119th Congress (H. Doc. 118-187), rules as adopted Jan 3, 2025. govinfo.gov's Public Domain & Copyright Notice: under 17 U.S.C. 105 public documents can generally be reprinted without legal restriction. rules.house.gov/copyright: its content is a work of the Federal government (17 U.S.C. 105 and 403); its updated rules are a PDF the fetcher cannot read"},
    {"id": "us_senate_rules", "owner": "U.S. Senate Committee on Rules and Administration", "gives": "Senate Rule XXV (each standing committee's subjects; ex officio seats on subcommittees), as posted by the Rules Committee",
     "url": "https://www.rules.senate.gov/rules-of-the-senate", "access": "html", "key": None, "cadence": "when the Senate amends its rules",
     "license_status": "review_required", "terms_note": "No reuse terms on rules.senate.gov (its privacy policy covers visitor data only). The text is the Senate Manual (S. Doc. 117-9), a federal work under 17 U.S.C. 105. Rule XXV still names Homeland Security and Governmental Affairs the Committee on Governmental Affairs (its note 13, S. Res. 445 of 2004)"},
    {"id": "us_house_resolutions", "owner": "U.S. House of Representatives, published by the Government Publishing Office", "gives": "The resolutions that set up the two House select panels: H. Res. 11 (118th Congress, applied to the 119th by H. Res. 5) and H. Res. 605 (119th Congress)",
     "url": "https://www.govinfo.gov/content/pkg/BILLS-119hres5eh/html/BILLS-119hres5eh.htm", "access": "html", "key": None, "cadence": "when the House sets up or ends a select panel",
     "license_status": "review_required", "terms_note": "govinfo.gov Public Domain & Copyright Notice (17 U.S.C. 105)"},
    {"id": "us_code", "owner": "Office of the Law Revision Counsel, U.S. House, published by the Government Publishing Office", "gives": "15 U.S.C. 1024 (the Joint Economic Committee) and 26 U.S.C. 8022 (the Joint Committee on Taxation), 2023 edition",
     "url": "https://www.govinfo.gov/app/collection/uscode", "access": "html", "key": None, "cadence": "yearly edition",
     "license_status": "review_required", "terms_note": "govinfo.gov Public Domain & Copyright Notice (17 U.S.C. 105). uscode.house.gov answered with a maintenance page on Oct 5, 2026, so the govinfo edition is used"},
    {"id": "us_committee_pages", "owner": "Each committee of the House, the Senate, or both", "gives": "What each subcommittee handles (171 of 181 read), and what the select, special, and joint committees handle, from each committee's own site or its rules as printed on govinfo.gov",
     "url": "https://www.house.gov/committees", "access": "html", "key": None, "cadence": "weekly check; changes with each Congress",
     "license_status": "review_required", "terms_note": "Varies by site; each site's own words are in data/us-explainers-2026.json (site_terms). Several House committee sites call their content a work of the Federal government (17 U.S.C. 105 and 403); most Senate committee sites state no reuse terms"},
    {"id": "us_house_history", "owner": "U.S. House of Representatives, Office of the Historian and Office of the Clerk", "gives": "Glossary definitions of Chairman/Chairwoman and Ranking Member",
     "url": "https://history.house.gov/Education/Lesson-Plans/Glossary/", "access": "html", "key": None, "cadence": "rarely",
     "license_status": "review_required", "terms_note": "No reuse terms on history.house.gov's privacy page; house.gov's terms of use say government-produced materials on that site are not copyright protected. Confirm they cover history.house.gov"},
    {"id": "us_senate_history", "owner": "U.S. Senate Historical Office", "gives": "About the Committee System: what committees do (referral, hearings, markups) and how members are assigned",
     "url": "https://www.senate.gov/about/origins-foundations/committee-system.htm", "access": "html", "key": None, "cadence": "rarely",
     "license_status": "review_required", "terms_note": "No public reuse terms: senate.gov's Usage Policy governs Senate offices, and Content Responsibility names the Secretary of the Senate. A federal work (17 U.S.C. 105)"},
    {"id": "us_house_process", "owner": "U.S. House of Representatives", "gives": "The Legislative Process: a bill goes to a committee, then to a calendar, then a vote",
     "url": "https://www.house.gov/the-house-explained/the-legislative-process", "access": "html", "key": None, "cadence": "rarely",
     "license_status": "review_required", "terms_note": "house.gov terms of use: government-produced materials on the site are not copyright protected"},
    {"id": "us_congress_gov_committees", "owner": "Library of Congress (Congress.gov committee pages)", "gives": "Not used: committee pages on congress.gov",
     "url": "https://www.congress.gov/committees", "access": "manual", "key": None, "cadence": "-",
     "license_status": "blocked", "terms_note": "Answered every script request with HTTP 403 on Oct 5, 2026 (congress.gov and crsreports.congress.gov), so neither committee pages nor CRS reports are read; the chamber rules and the committees' own sites are used instead"},
]


def load_env():
    """CONGRESS_API_KEY from the environment, else from a local .env. Returns the key or None. Never prints it."""
    k = os.environ.get("CONGRESS_API_KEY")
    if k:
        return k.strip()
    p = os.path.join(ROOT, ".env")
    if os.path.exists(p):
        for line in open(p, encoding="utf-8"):
            line = line.strip()
            if line.startswith("CONGRESS_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'") or None
    return None


def shape(body, ctype):
    """A one-line description of what came back, with no content copied."""
    try:
        if "json" in ctype:
            d = json.loads(body)
            if isinstance(d, list):
                return f"list of {len(d)}; first item keys: {sorted(d[0].keys())[:8] if d and isinstance(d[0], dict) else '-'}"
            return "object keys: " + ", ".join(sorted(d.keys())[:8]) + (f" | pagination: {d['pagination']}" if "pagination" in d else "")
        if "xml" in ctype or body.lstrip()[:5] == b"<?xml":
            import re
            tags = re.findall(rb"<([A-Za-z_][\w-]*)", body)
            return "xml, root <" + (tags[0].decode() if tags else "?") + ">, " + str(len(set(tags))) + " distinct tags"
    except Exception as e:
        return f"unreadable ({type(e).__name__})"
    return f"{len(body)} bytes"


def probe(s, key):
    if s["access"] == "manual":
        return ("manual", "-", "not fetched; registered for a person to read")
    if s["key"] and not key:
        return ("no key", "-", f"{s['key']} is not set")
    req = urllib.request.Request(s["url"], headers={"User-Agent": UA, "Accept": "application/json, application/xml, */*"})
    if s["key"]:
        req.add_header("X-Api-Key", key)
    t = time.time()
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            body = r.read()
            return (str(r.status), f"{len(body):,} B, {time.time() - t:.1f}s", shape(body, r.headers.get("content-type", "")))
    except urllib.error.HTTPError as e:
        return (str(e.code), "-", "rejected" + (" (key not accepted)" if e.code in (401, 403) else ""))
    except Exception as e:
        return ("error", "-", type(e).__name__ + ": " + str(e)[:80])


def main():
    if "--list" in sys.argv:
        for s in SOURCES:
            print(f"{s['id']:16s} {s['access']:7s} {s['cadence']:16s} {s['license_status']:16s} {s['owner']}")
        return
    key = load_env()
    print("Congress.gov key:", "found" if key else "NOT found (set CONGRESS_API_KEY or fill in .env)")
    for s in SOURCES:
        status, size, note = probe(s, key)
        print(f"{s['id']:16s} {status:7s} {size:18s} {note}")
        time.sleep(0.4)  # one request each, politely spaced


if __name__ == "__main__":
    main()
