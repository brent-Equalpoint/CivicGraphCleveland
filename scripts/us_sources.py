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
    {"id": "us_portraits", "owner": "U.S. Government Publishing Office (Member Guide), republished by the unitedstates project", "gives": "Official photographs of members of Congress, by Bioguide ID",
     "url": "https://unitedstates.github.io/images/congress/225x275/V000137.jpg", "access": "image", "key": None, "cadence": "as members change",
     "license_status": "review_required", "terms_note": "The project says the GPO assured it all photos are public domain, and dedicates the repository under CC0 1.0; confirm on the repository README. Presidents who never served in Congress, justices, and judges have no photo here"},
    {"id": "us_agencies", "owner": "Office of the Federal Register", "gives": "Every federal agency and sub-agency, parent links, and a short description",
     "url": "https://www.federalregister.gov/api/v1/agencies.json", "access": "json", "key": None, "cadence": "weekly",
     "license_status": "review_required", "terms_note": "Public API; confirm terms on federalregister.gov/developers"},
    {"id": "us_gov_manual", "owner": "U.S. Government Publishing Office (GovInfo)", "gives": "The United States Government Manual: the official description of what each agency does",
     "url": "https://www.govinfo.gov/app/collection/govman", "access": "manual", "key": None, "cadence": "yearly",
     "license_status": "review_required", "terms_note": "Registered by hand; a person reads and approves each description (interpretive text)"},
    {"id": "us_plum_book", "owner": "U.S. Office of Personnel Management and the Government Publishing Office", "gives": "Appointed positions in the executive branch",
     "url": "https://www.govinfo.gov/app/collection/plumbook", "access": "manual", "key": None, "cadence": "every four years",
     "license_status": "review_required", "terms_note": "Registered by hand; slow-moving, used for who leads"},
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
