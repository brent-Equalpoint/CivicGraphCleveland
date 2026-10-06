#!/usr/bin/env python3
"""Cleveland Civic Graph v5: reproducible standalone build.

Run from a clean checkout:  python3 build.py
Inputs (inputs/):
  Cleveland-Civic-Graph-Agentic-Bench-Source.tar.gz   compiled Sep 23 app (dist/)
  CivicAtlas.BP15NF1x.css, index.BXQ1IHcf.css          saved Sep 24 ("32") stylesheets
Extension sources (ext/): cx-data.jsx, cx-ui.jsx, cx.css
Output: dist/Cleveland-Civic-Graph-v5.html (single self-contained file, works offline)
        site/ (the same app for hosting: index.html plus portraits, records and fonts as files)
Data (data/): legistar, reasons, geo, place snapshots (scripts/refresh.py) and changes-2026.json
        (What's new); reasons-reviewed.json holds the fingerprint each summary was checked against.
  python3 build.py --mark-reviewed 931-2026 ...   record that summaries were re-checked today

Every patch is an exact string replacement that must match the expected number
of times, so a changed input fails loudly instead of silently producing a
different app. Tools: node_modules/.bin/{prettier,esbuild} (versions pinned in
package.json).
"""
import base64, hashlib, json, os, re, shutil, subprocess, sys, tarfile, datetime, urllib.parse

ROOT = os.path.dirname(os.path.abspath(__file__))
INP = os.path.join(ROOT, "inputs")
EXT = os.path.join(ROOT, "ext")
BUILD = os.path.join(ROOT, "build")
DIST = os.path.join(ROOT, "dist")
BIN = os.path.join(ROOT, "node_modules", ".bin")
SITE = os.path.join(ROOT, "site")
LOG = []


def tool(name):
    """node_modules/.bin tools are .cmd files on Windows."""
    return os.path.join(BIN, name + (".cmd" if os.name == "nt" else ""))


def write(path, text):
    """UTF-8 with LF line endings on every platform, so hashes match across machines."""
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def log(msg):
    print(msg)
    LOG.append(msg)


DATA_BLOCK = {}


def js_data(key, obj):
    """A large dataset for the page script. Instead of an object literal in the code, it travels in one <script type="application/json"
    id="cx-data"> block that never runs (so the Content-Security-Policy needs no new hash), and the script reads it with JSON.parse when it
    starts: a browser reads JSON text much faster than the same data written as code, and the block is removed once read, so its text is
    not kept in memory beside the data. The values are identical. Returns the expression the script uses in place of the literal."""
    DATA_BLOCK[key] = obj
    return f"cxDataBlock(`{key}`)"


# the reader for the data block: hoisted (a function declaration), so code anywhere in the shared scope can use the data at load time
DATA_READER = ("\n/* ---- the data block (build.py js_data): read once, then removed so its text can be freed ---- */\n"
               "function cxDataBlock(k) {\n  if (!cxDataBlock.d) {\n    const el = document.getElementById(`cx-data`);\n"
               "    cxDataBlock.d = JSON.parse(el.textContent);\n    el.remove();\n  }\n  return cxDataBlock.d[k];\n}\n")


def data_tag():
    """The data block itself. Every "<" is written as \\u003c, so nothing in the records can end the element early or confuse the HTML parser."""
    body = json.dumps(DATA_BLOCK, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    return '<script type="application/json" id="cx-data">' + body + "</script>\n"


def sha(path_or_bytes):
    b = path_or_bytes if isinstance(path_or_bytes, bytes) else open(path_or_bytes, "rb").read()
    return hashlib.sha256(b).hexdigest()


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", **kw)
    if r.returncode != 0:
        print(r.stdout, r.stderr)
        sys.exit(f"command failed: {' '.join(cmd)}")
    return r.stdout


def patch(src, old, new, count=1, label=""):
    if label in os.environ.get("CX_SKIP", "").split("|"):
        log(f"  patch SKIPPED: {label}")
        return src
    n = src.count(old)
    if n != count:
        sys.exit(f"PATCH FAILED [{label}]: expected {count} match(es), found {n}")
    log(f"  patch ok: {label} ({n})")
    return src.replace(old, new)


def reason_fp(r):
    """Fingerprint of the official source behind one hand-written summary: its WHEREAS clauses,
    its legislative summary text, and which documents they came from."""
    blob = json.dumps([r.get("whereas"), r.get("summary"), r.get("text_url"), r.get("summary_url")], ensure_ascii=False)
    return hashlib.sha256(blob.encode()).hexdigest()[:16]


def mark_reviewed(files):
    """Record that the summaries for these files were re-read against today's source."""
    rs = json.load(open(os.path.join(ROOT, "data", "reasons-2026.json"), encoding="utf-8"))
    path = os.path.join(ROOT, "data", "reasons-reviewed.json")
    rv = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
    today = datetime.date.today().isoformat()
    for f in files:
        if f not in rs["items"]:
            sys.exit(f"{f} is not in data/reasons-2026.json")
        rv[f] = {"fp": reason_fp(rs["items"][f]), "checked": today}
        print(f"marked {f} reviewed {today}")
    write(path, json.dumps(dict(sorted(rv.items(), key=lambda kv: int(kv[0].split("-")[0]))), indent=1) + "\n")


def office_fp():
    """Fingerprint of the profile office text and leadership roles: everything between the OFFICE-TEXT markers in ext/cx-seat.jsx."""
    src = open(os.path.join(EXT, "cx-seat.jsx"), encoding="utf-8").read()
    m = re.search(r"/\* OFFICE-TEXT-START.*?OFFICE-TEXT-END \*/", src, re.S)
    if not m:
        sys.exit("build: the OFFICE-TEXT markers are missing from ext/cx-seat.jsx")
    return hashlib.sha256(m.group(0).encode()).hexdigest()[:16]


def mark_office_reviewed(who):
    """Record that a person read the profile office text against its sources, today."""
    if not who:
        sys.exit('usage: python build.py --mark-office-reviewed "Your Name"')
    path = os.path.join(ROOT, "data", "office-reviewed.json")
    write(path, json.dumps({"fp": office_fp(), "checked": datetime.date.today().isoformat(), "by": who}, indent=1) + "\n")
    print(f"marked the profile office text reviewed by {who} on {datetime.date.today().isoformat()}")


def levy_fp():
    """Fingerprint of the hand-written levy text: everything between the LEVY-TEXT markers in ext/cx-levies.jsx."""
    src = open(os.path.join(EXT, "cx-levies.jsx"), encoding="utf-8").read()
    m = re.search(r"/\* LEVY-TEXT-START \*/.*?/\* LEVY-TEXT-END \*/", src, re.S)
    if not m:
        sys.exit("build: the LEVY-TEXT markers are missing from ext/cx-levies.jsx")
    return hashlib.sha256(m.group(0).encode()).hexdigest()[:16]


def mark_levies_reviewed(who):
    """Record that a person read the levy write-ups against their sources, today."""
    if not who:
        sys.exit('usage: python build.py --mark-levies-reviewed "Your Name"')
    path = os.path.join(ROOT, "data", "levies-reviewed.json")
    write(path, json.dumps({"fp": levy_fp(), "checked": datetime.date.today().isoformat(), "by": who}, indent=1) + "\n")
    print(f"marked the levy write-ups reviewed by {who} on {datetime.date.today().isoformat()}")


def us_text_block():
    """The plain lines about committees, subcommittees, and committee roles: everything between the US-TEXT markers in ext/cx-us-text.jsx."""
    src = open(os.path.join(EXT, "cx-us-text.jsx"), encoding="utf-8").read()
    m = re.search(r"/\* US-TEXT-START.*?US-TEXT-END \*/", src, re.S)
    if not m:
        sys.exit("build: the US-TEXT markers are missing from ext/cx-us-text.jsx")
    return src, m


def us_text_fp():
    """Fingerprint of the plain lines between the US-TEXT markers (the role notes, the story, and every committee's two lines)."""
    return hashlib.sha256(us_text_block()[1].group(0).encode()).hexdigest()[:16]


def us_text_lines(src):
    """The committee and subcommittee lines (the US-LINES table, strict JSON) and the source with the table taken out: the page loads them
    with the official words from /us/explainers-2026.json when a committee first opens, so the page itself does not carry them."""
    m = re.search(r"const CX_US_LINES = (\{.*?\n\});\n", src, re.S)
    if not m:
        sys.exit("build: the US-LINES table (const CX_US_LINES = {...};) is missing from ext/cx-us-text.jsx")
    try:
        lines = json.loads(m.group(1))
    except ValueError as e:
        sys.exit(f"build: the US-LINES table in ext/cx-us-text.jsx is not strict JSON: {e}")
    return lines, src[:m.start()] + "const CX_US_LINES = null;\n" + src[m.end():]


def mark_us_text_reviewed(who):
    """Record that a person read the committee, subcommittee, and role lines against their official words, today."""
    if not who:
        sys.exit('usage: python build.py --mark-us-text-reviewed "Your Name"')
    path = os.path.join(ROOT, "data", "us-text-reviewed.json")
    write(path, json.dumps({"fp": us_text_fp(), "checked": datetime.date.today().isoformat(), "by": who}, indent=1) + "\n")
    print(f"marked the committee lines reviewed by {who} on {datetime.date.today().isoformat()}")


def votes_text_fp():
    """Fingerprint of the plain words for votes, actions, and positions: everything between the VOTES-TEXT markers in ext/cx-votes-text.jsx."""
    src = open(os.path.join(EXT, "cx-votes-text.jsx"), encoding="utf-8").read()
    m = re.search(r"/\* VOTES-TEXT-START.*?VOTES-TEXT-END \*/", src, re.S)
    if not m:
        sys.exit("build: the VOTES-TEXT markers are missing from ext/cx-votes-text.jsx")
    if re.search("[–—]", m.group(0)):
        sys.exit("build: the votes text in ext/cx-votes-text.jsx has an em or en dash")
    return hashlib.sha256(m.group(0).encode()).hexdigest()[:16]


def mark_votes_text_reviewed(who):
    """Record that a person read the plain words for votes, actions, and positions against the record, today."""
    if not who:
        sys.exit('usage: python build.py --mark-votes-text-reviewed "Your Name"')
    path = os.path.join(ROOT, "data", "votes-text-reviewed.json")
    write(path, json.dumps({"fp": votes_text_fp(), "checked": datetime.date.today().isoformat(), "by": who}, indent=1) + "\n")
    print(f"marked the votes and actions text reviewed by {who} on {datetime.date.today().isoformat()}")


def align_block():
    """The sample questions for "how you line up" (docs/plan-alignment.md, step 2): everything between the ALIGN-TEXT markers in ext/cx-align-text.jsx."""
    src = open(os.path.join(EXT, "cx-align-text.jsx"), encoding="utf-8").read()
    m = re.search(r"/\* ALIGN-TEXT-START \*/.*?/\* ALIGN-TEXT-END \*/", src, re.S)
    if not m:
        sys.exit("build: the ALIGN-TEXT markers are missing from ext/cx-align-text.jsx")
    return src, m


def align_fp():
    """Fingerprint of the question set between the ALIGN-TEXT markers (the questions, what each bill does and does not do, the sources, the skips)."""
    return hashlib.sha256(align_block()[1].group(0).encode()).hexdigest()[:16]


def align_table(src, votes):
    """The question table (strict JSON), checked against the recorded votes, and the source with the table taken out: the page fetches it from
    /us/align-2026.json only when step 2 is on and opens, so the page itself does not carry it. A question may only point at a vote that is in
    data/us-votes-2026.json, decided something (final), is in the chamber it is filed under, is on the question's own bill, and is that bill's
    only deciding vote in that chamber; and the policy area must be the bill's own."""
    m = re.search(r"const CX_ALIGN_Q = (\{.*?\n\});\n", src, re.S)
    if not m:
        sys.exit("build: the question table (const CX_ALIGN_Q = {...};) is missing from ext/cx-align-text.jsx")
    try:
        table = json.loads(m.group(1))
    except ValueError as e:
        sys.exit(f"build: the question table in ext/cx-align-text.jsx is not strict JSON: {e}")
    by_id = {v["id"]: v for v in votes["votes"]}
    seen = set()
    for q in table["questions"]:
        where = f"ALIGN CHECK FAILED [{q.get('id')}]"
        if q["id"] in seen:
            sys.exit(f"{where}: the id is used twice")
        seen.add(q["id"])
        bill = votes["bills"].get(q["bill"])
        if not bill:
            sys.exit(f"{where}: bill {q['bill']} is not in data/us-votes-2026.json")
        if bill.get("policy_area") != q["area"]:
            sys.exit(f"{where}: the bill's policy area is {bill.get('policy_area')!r}, not {q['area']!r}")
        if not q["votes"]:
            sys.exit(f"{where}: no vote is named")
        for ch, vid in q["votes"].items():
            v = by_id.get(vid)
            if not v:
                sys.exit(f"{where}: vote {vid} is not in data/us-votes-2026.json")
            if v["chamber"] != ch or not v.get("final") or v.get("bill") != q["bill"]:
                sys.exit(f"{where}: vote {vid} is not a deciding {ch} vote on {q['bill']}")
        deciding = {}
        for v in votes["votes"]:
            if v.get("bill") == q["bill"] and v.get("final"):
                deciding.setdefault(v["chamber"], []).append(v["id"])
        if {ch: [vid] for ch, vid in q["votes"].items()} != deciding:
            sys.exit(f"{where}: the bill's deciding votes are {deciding}, not {q['votes']}")
    return table, src[:m.start()] + "const CX_ALIGN_Q = null;\n" + src[m.end():]


def mark_alignment_reviewed(who):
    """Record that a person read every sample question against its sources, today. Until this runs (and again if the text changes), step 2 of
    "how you line up" stays hidden in the app."""
    if not who:
        sys.exit('usage: python build.py --mark-alignment-reviewed "Your Name"')
    path = os.path.join(ROOT, "data", "alignment-reviewed.json")
    write(path, json.dumps({"fp": align_fp(), "checked": datetime.date.today().isoformat(), "by": who}, indent=1) + "\n")
    print(f"marked the alignment question set reviewed by {who} on {datetime.date.today().isoformat()}")
def privacy_block():
    """The privacy policy's words (ext/cx-privacy.jsx, between the PRIVACY-TEXT markers) and the policy itself, read as strict JSON."""
    src = open(os.path.join(EXT, "cx-privacy.jsx"), encoding="utf-8").read()
    m = re.search(r"/\* PRIVACY-TEXT-START.*?PRIVACY-TEXT-END \*/", src, re.S)
    if not m:
        sys.exit("build: the PRIVACY-TEXT markers are missing from ext/cx-privacy.jsx")
    j = re.search(r"const CX_POLICY = (\{.*?\n\});\n", m.group(0), re.S)
    if not j:
        sys.exit("build: the policy (const CX_POLICY = {...};) is missing from ext/cx-privacy.jsx")
    try:
        policy = json.loads(j.group(1))
    except ValueError as e:
        sys.exit(f"build: the privacy policy in ext/cx-privacy.jsx is not strict JSON: {e}")
    return m.group(0), policy


def privacy_fp():
    """Fingerprint of what the privacy policy says: its words, and the two numbers it reads from the code that keeps a remembered place
    (ext/cxm-core.jsx), so a change to either one clears a person's approval."""
    core = open(os.path.join(EXT, "cxm-core.jsx"), encoding="utf-8").read()
    limits = re.findall(r"const CX_PLACE_(?:KEEP_DAYS|LAST_DAY) = [^;]+;", core)
    if len(limits) != 2:
        sys.exit("build: CX_PLACE_KEEP_DAYS and CX_PLACE_LAST_DAY are missing from ext/cxm-core.jsx (the privacy policy reads them)")
    return hashlib.sha256((privacy_block()[0] + "\n".join(limits)).encode()).hexdigest()[:16]


def mark_privacy_reviewed(who):
    """Record that a person approved the privacy policy as it reads today (after a lawyer has read it). The page then names them in place of the draft line."""
    if not who:
        sys.exit('usage: python build.py --mark-privacy-reviewed "Your Name"')
    path = os.path.join(ROOT, "data", "privacy-reviewed.json")
    write(path, json.dumps({"fp": privacy_fp(), "checked": datetime.date.today().isoformat(), "by": who}, indent=1) + "\n")
    print(f"marked the privacy policy approved by {who} on {datetime.date.today().isoformat()}")


def geo_svg(geo):
    """Project the ward and neighborhood layers to SVG paths (simple equirectangular at Cleveland's latitude)."""
    import math
    k, kx = 2400, 2400 * math.cos(math.radians(41.49))
    rings = [r for f in geo["layers"]["wards2026"]["features"] for poly in (f["geometry"]["coordinates"] if f["geometry"]["type"] == "MultiPolygon" else [f["geometry"]["coordinates"]]) for r in poly]
    xs = [p[0] for r in rings for p in r]; ys = [p[1] for r in rings for p in r]
    x0, y1 = min(xs), max(ys)
    W, H = round((max(xs) - x0) * kx) + 20, round((y1 - min(ys)) * k) + 20
    def pt(p):
        return round((p[0] - x0) * kx + 10, 1), round((y1 - p[1]) * k + 10, 1)
    def feat(f):
        g = f["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        d, best = [], (0, 0, 0)
        for poly in polys:
            for i, r in enumerate(poly):
                ps = [pt(p) for p in r]
                d.append("M" + "L".join(f"{x},{y}" for x, y in ps) + "Z")
                if i == 0:  # outer ring: area-weighted centroid for the label
                    a = cx = cy = 0.0
                    for (xa, ya), (xb, yb) in zip(ps, ps[1:] + ps[:1]):
                        c = xa * yb - xb * ya; a += c; cx += (xa + xb) * c; cy += (ya + yb) * c
                    if a and abs(a) > best[0]:
                        best = (abs(a), cx / (3 * a), cy / (3 * a))
        return {"id": f["id"], "name": f["name"], "member": f["member"], "d": "".join(d), "cx": round(best[1], 1), "cy": round(best[2], 1)}
    return {"viewBox": f"0 0 {W} {H}", "retrieved": geo["retrieved_at"],
            "src": {k2: v["url"] for k2, v in geo["layers"].items()},
            "wards2014": [feat(f) for f in geo["layers"]["wards2014"]["features"]],
            "wards2026": [feat(f) for f in geo["layers"]["wards2026"]["features"]],
            "spa": [feat(f) for f in geo["layers"]["spa"]["features"]],
            "overlap": geo["overlap"], "downtown": geo["downtown"]}


# v5.16: a small network mark as the tab icon (SVG; the single file carries it inline, the site serves it as a file)
FAVICON_SVG = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#141210"/>'
               '<path d="M18 42 L32 20 L46 42 Z" fill="none" stroke="#ffd36b" stroke-width="4" stroke-linejoin="round"/>'
               '<g fill="#c2410c"><circle cx="32" cy="20" r="8"/><circle cx="18" cy="42" r="8"/><circle cx="46" cy="42" r="8"/></g></svg>')

SERVICE_WORKER = """/* Cleveland Civic Graph service worker, build __ID__.
   Purpose: the hosted site opens with no signal, using the copy this browser last loaded.
   Rules that keep it safe:
     - A page load and the /bench/ data files go to the NETWORK FIRST. Online, a visitor always gets the newest
       version. The saved copy is used only when the network fails, or after 8 seconds with no answer.
     - Fonts, portraits, and record PDFs are saved the first time and reused (they change rarely).
     - Nothing else is touched, and nothing from another site.
     - Each build has its own cache name. When a new build installs, every older cache is deleted, so no one is
       left on an old version. */
const V = "cx-__ID__";
const SLOW = 8000;
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(["/", "/favicon.svg"])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("cx-") && k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
function networkFirst(req, key) {
  return new Promise((resolve) => {
    let done = false;
    const fromCache = () => caches.match(key).then((hit) => hit || null);
    const timer = setTimeout(() => fromCache().then((hit) => { if (hit && !done) { done = true; resolve(hit); } }), SLOW);
    fetch(req).then((r) => {
      clearTimeout(timer);
      if (r.ok) { const copy = r.clone(); caches.open(V).then((c) => c.put(key, copy)); }
      if (!done) { done = true; resolve(r); }
    }).catch(() => {
      clearTimeout(timer);
      fromCache().then((hit) => { if (!done) { done = true; resolve(hit || new Response("You are offline, and this page has not been saved on this device yet.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } })); } });
    });
  });
}
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") { e.respondWith(networkFirst(req, "/")); return; }
  if (url.pathname.startsWith("/bench/") || url.pathname.startsWith("/us/") || url.pathname.startsWith("/meetings/") || url.pathname.startsWith("/i18n/") || url.pathname.startsWith("/districts/") || url.pathname.startsWith("/council/")) { e.respondWith(networkFirst(req, req)); return; }
  if (/^\\/(fonts|portraits|records)\\//.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(V).then((c) => c.put(req, copy)); } return r; })));
  }
});
"""

# v5.16: hosted site only. The single file is built to work offline, so it never shows this.
OFFLINE_NOTICE = ('<div id="cx-offline" role="status" hidden>You appear to be offline. You can keep reading what is already open. '
                  'New records will show up when you reconnect.</div>\n'
                  '<style>#cx-offline{position:fixed;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));z-index:99999;max-width:560px;margin:0 auto;'
                  'padding:14px 16px;border-radius:14px;background:#ffd36b;color:#141210;font:600 16px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;'
                  'box-shadow:0 6px 24px #0008}#cx-offline[hidden]{display:none}</style>\n'
                  '<script>(function(){var n=document.getElementById("cx-offline");function u(){n.hidden=navigator.onLine!==false;}'
                  'addEventListener("offline",u);addEventListener("online",u);u();})();</script>\n'
                  '<script>if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost"))addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){});});</script>\n')

# Hosted site only, in the head: start the downloads this visit is known to need while the page itself is still arriving, instead of after
# the app has drawn. The same files the app asks for anyway, from this site only: the federal record and the map's settled places when the
# link opens the United States page (the map file only where the map shows: a computer, or the phone's Graph, the same rule as cxmWantPhone),
# and the Spanish dictionary when this browser chose Spanish. Nothing personal is in any of these requests.
EARLY_FETCH = ("(function(){try{var q=new URLSearchParams(location.search),h=location.hash,"
               "ph=/(^|[#&])phone\\b/.test(h)||(!/(^|[#&])desktop\\b/.test(h)&&(matchMedia('(max-width: 760px)').matches||"
               "(matchMedia('(pointer: coarse)').matches&&!!screen&&Math.min(screen.width,screen.height)<=500))),"
               "L=function(u){var l=document.createElement('link');l.rel='preload';l.as='fetch';l.crossOrigin='anonymous';l.href=u;document.head.appendChild(l);},g;"
               "if(q.get('panel')==='us'){L('/us/landscape-2026.json');if(!ph||q.get('view')==='graph')L('/us/map-2026.json');}"
               "try{g=localStorage.getItem('cx-lang');}catch(e){}if(g==='es')L('/i18n/es.json');}catch(e){}})();")

# v5.16: if the app has not drawn after 12 seconds (old browser, blocked script, very slow connection) say so in plain words
BOOT_TIMEOUT = ("setTimeout(function(){var b=document.getElementById('cx-boot');if(!b)return;"
                "b.innerHTML='This is taking longer than usual.<small>Your connection may be slow, or your browser may be out of date. "
                "Try again, or open this page in a newer browser.</small>"
                "<button type=\"button\" style=\"margin-top:10px;min-height:48px;padding:0 22px;border:0;border-radius:12px;"
                "background:#c2410c;color:#fff;font:600 17px system-ui,sans-serif;cursor:pointer\">Try again</button>';"
                "var t=b.querySelector('button');if(t)t.addEventListener('click',function(){location.reload();});},12000);")

def with_csp(html):
    """Content-Security-Policy for the hosted page, as a <meta> placed before any script. Every inline script is allowed by its SHA-256 hash (so nothing injected can run),
    and the page may ask only its own site for anything: connect-src 'self' is what makes "nothing personal leaves the browser" something the browser enforces.
    Styles may be inline (React sets style attributes). The offline single file is not given this, because it has no site to call back to."""
    hashes = []
    for m in re.finditer(r"<script(?P<attrs>[^>]*)>(?P<body>.*?)</script>", html, re.S):
        attrs = m.group("attrs")
        if "src=" in attrs or re.search(r'type="(?!text/javascript|module)', attrs):
            continue   # a script file is covered by 'self'; a data block (type="application/json") never runs
        hashes.append("'sha256-" + base64.b64encode(hashlib.sha256(m.group("body").encode("utf-8")).digest()).decode() + "'")
    policy = "; ".join([
        "default-src 'self'",
        "script-src 'self' " + " ".join(sorted(set(hashes))),
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self'",
        "worker-src 'self'",
        "manifest-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
    ])
    assert "<meta charset=\"utf-8\">" in html
    return html.replace("<meta charset=\"utf-8\">", "<meta charset=\"utf-8\">\n<meta http-equiv=\"Content-Security-Policy\" content=\"" + policy + "\">", 1)


# v5.16: the page shown for an address that does not exist (Vercel serves site/404.html automatically)
NOT_FOUND = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<title>Page not found | Cleveland Civic Graph</title>
<style>
html,body{margin:0;background:#141210;color:#f4eee8}
body{font:18px/1.5 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
main{max-width:560px;margin:0 auto;padding:48px 20px}
h1{font-size:34px;line-height:1.15;margin:0 0 12px}
p{margin:0 0 16px;color:#e7ded6}
ul{list-style:none;margin:20px 0 0;padding:0;display:grid;gap:10px}
a{color:#ffd1a9}
a.go{display:flex;align-items:center;min-height:56px;padding:0 18px;border-radius:14px;background:#1e1a17;border:1px solid #ffffff2e;color:#f4eee8;font-weight:600;text-decoration:none}
a.go:focus-visible,a:focus-visible{outline:3px solid #f1b083;outline-offset:2px}
a.main{background:#c2410c;border-color:#c2410c;color:#fff}
</style>
</head>
<body>
<main>
<h1>We could not find that page.</h1>
<p>The link may be old or mistyped. Nothing is wrong with your device. Here are good places to start.</p>
<ul>
<li><a class="go main" href="/">Go to the start</a></li>
<li><a class="go" href="/?panel=place">Who decides where I live?</a></li>
<li><a class="go" href="/?panel=ballot">What is on my ballot?</a></li>
<li><a class="go" href="/?room=council">What is City Council doing?</a></li>
</ul>
<p style="margin-top:24px">Every record in the Cleveland Civic Graph links to a public source.</p>
</main>
</body>
</html>
"""


def main():
    # 0. clean
    for d in (BUILD, DIST):
        shutil.rmtree(d, ignore_errors=True)
        os.makedirs(d)
    log(f"Build started {datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')}")
    tarball = os.path.join(INP, "Cleveland-Civic-Graph-Agentic-Bench-Source.tar.gz")
    css_a = os.path.join(INP, "index.BXQ1IHcf.css")
    css_b = os.path.join(INP, "CivicAtlas.BP15NF1x.css")
    for p in (tarball, css_a, css_b):
        log(f"input  {sha(p)}  {os.path.basename(p)}")
    for p in sorted(os.listdir(EXT)):
        log(f"ext    {sha(os.path.join(EXT, p))}  {p}")

    # 1. extract compiled app
    with tarfile.open(tarball) as t:
        t.extractall(BUILD, filter="data")
    client = os.path.join(BUILD, "dist", "client")
    chunks = os.path.join(client, "_next", "static", "chunks")
    atlas = os.path.join(chunks, "CivicAtlas-ramPAjr5.js")
    framework = os.path.join(chunks, "framework-D_rUT4EX.js")
    runtime = os.path.join(chunks, "rolldown-runtime-C60lm6uB.js")
    for p in (atlas, framework, runtime):
        log(f"bundle {sha(p)}  {os.path.basename(p)}")

    # 2. prettify the app chunk so patches are readable and exact
    work = os.path.join(BUILD, "work")
    os.makedirs(work)
    pretty = os.path.join(work, "CivicAtlas.pretty.js")
    # read from stdin: Prettier 3 skips files listed in .gitignore (build/ is), even when named directly
    src = run([tool("prettier"), "--parser", "babel"], input=open(atlas, encoding="utf-8").read())
    write(pretty, src)
    log(f"prettified CivicAtlas: {src.count(chr(10))} lines, {sha(src.encode())}")

    # 3. compile extension JSX in module scope (u = React, W = jsx runtime)
    leg_path = os.path.join(ROOT, "data", "legistar-2026.json")
    leg = json.load(open(leg_path, encoding="utf-8"))
    log(f"data   {sha(leg_path)}  legistar-2026.json  ({leg['count']} items, retrieved {leg['retrieved_at']})")
    DATA_BLOCK.clear()
    ext_js = DATA_READER + "\n/* ---- data/legistar-2026.json ---- */\nconst CX_LEG = " + js_data("leg",
        {k: leg[k] for k in ("source", "retrieved_at", "count")} | {"matters": [
            {k: m[k] for k in ("id", "file", "type", "status", "title", "intro", "passed", "url", "sponsors")} for m in leg["matters"]]}) + ";\n"
    rs_path = os.path.join(ROOT, "data", "reasons-2026.json")
    rs = json.load(open(rs_path, encoding="utf-8"))
    log(f"data   {sha(rs_path)}  reasons-2026.json  ({len(rs['items'])} proposals, retrieved {rs['retrieved_at']})")
    ext_js += "\n/* ---- data/reasons-2026.json (document links: text, summary, council page) ---- */\nconst CX_RSRC = " + json.dumps(
        {f: [r["text_url"] or "", r["summary_url"] or "", r["legistar"]] for f, r in rs["items"].items()}, separators=(",", ":")) + ";\n"
    # every summary in cx-reasons.jsx must point at a proposal in the evidence snapshot, with the cited document present
    reasons_src = open(os.path.join(EXT, "cx-reasons.jsx"), encoding="utf-8").read()
    for f, kinds in re.findall(r'file: `([0-9]+-2026)`, src: \[([^\]]*)\]', reasons_src):
        r = rs["items"].get(f)
        if not r:
            sys.exit(f"REASONS CHECK FAILED: {f} not in reasons-2026.json")
        for k in re.findall(r"`(\w+)`", kinds):
            if not r.get(k + "_url"):
                sys.exit(f"REASONS CHECK FAILED: {f} cites {k} but no {k} document was captured")
    log(f"reasons check: {len(re.findall(r'file: `', reasons_src))} summaries cite captured documents")
    # v5.15 summary drift: each summary was checked against a fingerprint of its source; a nightly
    # refresh that changes the source flags the summary (in the app and in dist/review-needed.json)
    rv_path = os.path.join(ROOT, "data", "reasons-reviewed.json")
    reviewed = json.load(open(rv_path, encoding="utf-8")) if os.path.exists(rv_path) else {}
    files = sorted(set(re.findall(r'file: `([0-9]+-2026)`', reasons_src)), key=lambda f: int(f.split("-")[0]))
    drift = {f: (reviewed.get(f) or {}).get("checked") for f in files if (reviewed.get(f) or {}).get("fp") != reason_fp(rs["items"][f])}
    log(f"summary drift check: {len(files) - len(drift)} of {len(files)} summaries match the source they were checked against"
        + (f"; REVIEW NEEDED: {', '.join(drift)}" if drift else ""))
    ext_js += "/* ---- summaries whose official source changed after they were checked ---- */\nconst CX_DRIFT = " + json.dumps(drift) + ";\n"
    # v5.15 What's new: differences between snapshots (scripts/changes.py)
    ch_path = os.path.join(ROOT, "data", "changes-2026.json")
    ch = json.load(open(ch_path, encoding="utf-8")) if os.path.exists(ch_path) else {"updates": []}
    ups = sorted(ch["updates"], key=lambda u: u["at"], reverse=True)
    if ups and ups[0]["at"] != leg["retrieved_at"]:
        log(f"  note: newest change log entry ({ups[0]['at']}) is older than the Legistar snapshot; run scripts/refresh.py")
    log(f"data   {sha(ch_path) if os.path.exists(ch_path) else '-' * 64}  changes-2026.json  ({len(ups)} checks"
        + (f", newest {ups[0]['at']}: {len(ups[0]['changes'])} items changed since {ups[0]['from']})" if ups else ")"))
    ext_js += "/* ---- data/changes-2026.json (What's new) ---- */\nconst CX_UPDATES = " + js_data("updates", {"updated": leg["retrieved_at"], "log": ups}) + ";\n"
    # v5.13 "Who decides here?": ward maps as SVG paths + decision paths/addresses/ward money
    geo_path, pl_path = os.path.join(ROOT, "data", "geo-2026.json"), os.path.join(ROOT, "data", "place-2026.json")
    geo, pl = json.load(open(geo_path, encoding="utf-8")), json.load(open(pl_path, encoding="utf-8"))
    log(f"data   {sha(geo_path)}  geo-2026.json  (retrieved {geo['retrieved_at']})")
    log(f"data   {sha(pl_path)}  place-2026.json  ({len(pl['histories'])} histories, {len(pl['addresses'])} addresses, {len(pl['funds'])} ward-money items, retrieved {pl['retrieved_at']})")
    ext_js += "\n/* ---- data/geo-2026.json (as SVG) ---- */\nconst CX_GEO = " + js_data("geo", geo_svg(geo)) + ";\n"
    ext_js += "/* ---- data/place-2026.json ---- */\nconst CX_PL = " + js_data("place",
        {"retrieved": pl["retrieved_at"], "histories": pl["histories"], "addresses": pl["addresses"],
         "funds": {f: {k: r.get(k) for k in ("file", "text_url", "amounts", "limit", "wards")} for f, r in pl["funds"].items()}}) + ";\n"
    # v5.16 profile office text: reviewed by a person only while its fingerprint still matches what they read
    of_path = os.path.join(ROOT, "data", "office-reviewed.json")
    of = json.load(open(of_path, encoding="utf-8")) if os.path.exists(of_path) else {}
    of_ok = of.get("fp") == office_fp()
    log(f"office text: {'reviewed by ' + of['by'] + ' on ' + of['checked'] if of_ok else 'NOT reviewed by a person (' + ('text changed since review' if of else 'never reviewed') + ')'}")
    ext_js += "/* ---- data/office-reviewed.json ---- */\nconst CX_OFFICE_REVIEW = " + json.dumps({"ok": of_ok, "by": of.get("by") if of_ok else None, "checked": of.get("checked") if of_ok else None}) + ";\n"
    # v5.17 levy write-ups: reviewed by a person only while their fingerprint still matches what that person read
    lv_path = os.path.join(ROOT, "data", "levies-reviewed.json")
    lv = json.load(open(lv_path, encoding="utf-8")) if os.path.exists(lv_path) else {}
    lv_ok = lv.get("fp") == levy_fp()
    log(f"levy text: {'reviewed by ' + lv['by'] + ' on ' + lv['checked'] if lv_ok else 'NOT reviewed by a person (' + ('text changed since review' if lv else 'never reviewed') + ')'}")
    ext_js += "/* ---- data/levies-reviewed.json ---- */\nconst CX_LEVY_REVIEW = " + json.dumps({"ok": lv_ok, "by": lv.get("by") if lv_ok else None, "checked": lv.get("checked") if lv_ok else None}) + ";\n"
    # the plain lines about committees and committee roles (ext/cx-us-text.jsx): reviewed by a person only while their fingerprint still matches what that person read
    ut_path = os.path.join(ROOT, "data", "us-text-reviewed.json")
    ut = json.load(open(ut_path, encoding="utf-8")) if os.path.exists(ut_path) else {}
    ut_ok = ut.get("fp") == us_text_fp()
    log(f"committee lines: {'reviewed by ' + ut['by'] + ' on ' + ut['checked'] if ut_ok else 'NOT reviewed by a person (' + ('text changed since review' if ut else 'never reviewed') + ')'}")
    ext_js += "/* ---- data/us-text-reviewed.json ---- */\nconst CX_US_TEXT_REVIEW = " + json.dumps({"ok": ut_ok, "by": ut.get("by") if ut_ok else None, "checked": ut.get("checked") if ut_ok else None}) + ";\n"
    # the plain words for votes, actions, and positions (ext/cx-votes-text.jsx): reviewed by a person only while their fingerprint still matches what that person read
    vx_path = os.path.join(ROOT, "data", "votes-text-reviewed.json")
    vx = json.load(open(vx_path, encoding="utf-8")) if os.path.exists(vx_path) else {}
    vx_ok = vx.get("fp") == votes_text_fp()
    log(f"votes and actions text: {'reviewed by ' + vx['by'] + ' on ' + vx['checked'] if vx_ok else 'NOT reviewed by a person (' + ('text changed since review' if vx else 'never reviewed') + ')'}")
    ext_js += "/* ---- data/votes-text-reviewed.json ---- */\nconst CX_VOTES_TEXT_REVIEW = " + json.dumps({"ok": vx_ok, "by": vx.get("by") if vx_ok else None, "checked": vx.get("checked") if vx_ok else None}) + ";\n"
    # the privacy policy (ext/cx-privacy.jsx): approved by a person only while its fingerprint still matches what they approved; no dash in its words
    _, policy = privacy_block()
    if re.search("[\u2013\u2014]", json.dumps(policy, ensure_ascii=False)):
        sys.exit("build: the privacy policy in ext/cx-privacy.jsx has an em or en dash")
    pv_path = os.path.join(ROOT, "data", "privacy-reviewed.json")
    pv = json.load(open(pv_path, encoding="utf-8")) if os.path.exists(pv_path) else {}
    pv_ok = pv.get("fp") == privacy_fp()
    log(f"privacy policy: last changed {policy['changed'][0][0]}, {len(policy['stored'])} items saved in the browser listed; "
        + ("approved by " + pv["by"] + " on " + pv["checked"] if pv_ok else "a DRAFT, not approved by a person (" + ("text changed since approval" if pv else "never approved") + ")"))
    ext_js += "/* ---- data/privacy-reviewed.json ---- */\nconst CX_PRIVACY_REVIEW = " + json.dumps({"ok": pv_ok, "by": pv.get("by") if pv_ok else None, "checked": pv.get("checked") if pv_ok else None}) + ";\n"
    us_src, _ = us_text_block()
    us_lines, us_src_page = us_text_lines(us_src)
    ex_path = os.path.join(ROOT, "data", "us-explainers-2026.json")
    ex = json.load(open(ex_path, encoding="utf-8"))
    for k, v in us_lines.items():   # a line must rest on official words this record holds; no line for a committee with none on file
        row = ex["committees"].get(k)
        if not row:
            sys.exit(f"build: ext/cx-us-text.jsx has lines for {k}, which is not in data/us-explainers-2026.json")
        if not row.get("text"):
            sys.exit(f"build: ext/cx-us-text.jsx has lines for {k}, but no official text is on file for it to rest on")
        if not (isinstance(v, list) and len(v) == 2 and all(isinstance(x, str) and x.strip() for x in v)):
            sys.exit(f"build: the lines for {k} are not two sentences")
    log(f"data   {sha(ex_path)}  us-explainers-2026.json  ({ex['counts']['with_text']} committees and subcommittees with official text, {ex['counts']['none_on_file']} none on file; {len(us_lines)} with our lines)")
    # "how you line up", step 2 (ext/cx-align-text.jsx): the sample questions, checked against the recorded votes; step 2 is shown only
    # while a person's review (data/alignment-reviewed.json, from --mark-alignment-reviewed) still matches the text they read
    al_path = os.path.join(ROOT, "data", "alignment-reviewed.json")
    al = json.load(open(al_path, encoding="utf-8")) if os.path.exists(al_path) else {}
    al_ok = al.get("fp") == align_fp()
    log(f"alignment questions: {'reviewed by ' + al['by'] + ' on ' + al['checked'] + ', step 2 shown' if al_ok else 'NOT reviewed by a person (' + ('text changed since review' if al else 'never reviewed') + '), step 2 hidden'}")
    ext_js += "/* ---- data/alignment-reviewed.json ---- */\nconst CX_ALIGN_REVIEW = " + json.dumps({"ok": al_ok, "by": al.get("by") if al_ok else None, "checked": al.get("checked") if al_ok else None}) + ";\n"
    al_src, _ = align_block()
    align_q, al_src_page = align_table(al_src, json.load(open(os.path.join(ROOT, "data", "us-votes-2026.json"), encoding="utf-8")))
    log(f"alignment questions: {len(align_q['questions'])} in {len({q['area'] for q in align_q['questions']})} policy areas, each on a deciding vote in data/us-votes-2026.json")
    # v5.16 weekly link check (scripts/check_links.py): only links that failed twice running are shown to residents
    lk_path = os.path.join(ROOT, "data", "links-2026.json")
    lk = json.load(open(lk_path, encoding="utf-8")) if os.path.exists(lk_path) else {"checked_at": None, "broken": []}
    lk_shown = {b["url"]: {"since": b["since"], "status": b["status"]} for b in lk["broken"] if b["consecutive"] >= 2}
    log(f"data   {sha(lk_path) if os.path.exists(lk_path) else '-' * 64}  links-2026.json  (checked {lk['checked_at']}; {len(lk['broken'])} failing, {len(lk_shown)} shown to residents)")
    ext_js += "/* ---- data/links-2026.json (links broken on two checks in a row) ---- */\nconst CX_LINKS = " + json.dumps({"checked": lk["checked_at"], "broken": lk_shown}, separators=(",", ":")) + ";\n"
    # v5.16 profiles: who holds each seat and the term, from Legistar's office records (scripts/fetch_people.py)
    pe_path = os.path.join(ROOT, "data", "people-2026.json")
    pe = json.load(open(pe_path, encoding="utf-8"))
    log(f"data   {sha(pe_path)}  people-2026.json  ({pe['count']} people, retrieved {pe['retrieved_at']})")
    ext_js += "/* ---- data/people-2026.json ---- */\nconst CX_PEOPLE = " + json.dumps(pe, ensure_ascii=False, separators=(",", ":")) + ";\n"
    # Council roll calls: how each member voted where the City Record prints names (scripts/fetch_cityrecord.py), embedded compactly
    vt_path = os.path.join(ROOT, "data", "votes-2026.json")
    vt = json.load(open(vt_path, encoding="utf-8"))
    log(f"data   {sha(vt_path)}  votes-2026.json  ({vt['counts']['files']} files with a roll call, {vt['counts']['other']} other votes, {vt['counts']['issues']} City Record issues, retrieved {vt['retrieved_at']})")
    if vt["skipped"]:
        raise SystemExit(f"data/votes-2026.json has {len(vt['skipped'])} vote(s) that were not stored; fix the cause before building: {vt['skipped'][:3]}")
    vt_members = sorted(p["name"] for p in pe["people"] if p["title"] == "Council Member")
    # issues: the City Record issues, then one entry per roll call read from Council's Legistar record (kind "lg"), each with its own address
    vt_lg = vt.get("legistar_votes", {})
    vt_issues = sorted((i["url"], i["label"], "cr") for i in vt["issues"]) + [(v["anchor"]["url"], f"Council's Legistar record, file {f}", "lg") for f, v in sorted(vt_lg.items())]
    vt_issue_ix = {(u, k): n for n, (u, _, k) in enumerate(vt_issues)}
    vt_q = {"Passage": 0, "Adoption": 1, "Laid on the table": 2}
    vt_code = {"yea": "y", "nay": "n", "absent": "a", "recused": "r", "abstain": "b"}
    def vt_codes(v):
        if set(v["members"]) != set(vt_members):
            raise SystemExit("a stored vote does not name every sitting council member")
        return "".join(vt_code[v["members"][m]] for m in vt_members)
    def vt_row(v, kind="cr"):
        r = [v["date"], vt_q[v["question"]], vt_issue_ix[(v["anchor"]["url"], kind)], vt_codes(v)]
        return r + [v["misprint"]] if v.get("misprint") else r
    vt_rows = {f: vt_row(v) for f, v in vt["votes"].items()}
    vt_rows.update({f: vt_row(v, "lg") for f, v in vt_lg.items()})
    vt_unnamed = sum(1 for m in leg["matters"] if m["status"] == "Passed" and m["file"] not in vt_rows)
    log(f"council votes: {sum(1 for m in leg['matters'] if m['status'] == 'Passed' and m['file'] in vt_rows)} of {sum(1 for m in leg['matters'] if m['status'] == 'Passed')} passed files have names "
        f"({len(vt_lg)} from Council's Legistar record); {vt_unnamed} without, each with a reason ({len(vt.get('no_names', {}))}); {len(vt.get('differs', []))} votes where the two records differ")
    vt_why = [m["file"] for m in leg["matters"] if m["status"] == "Passed" and m["file"] not in vt_rows and m["file"] not in vt.get("no_names", {})]
    if vt_why and "no_names" in vt:
        raise SystemExit(f"data/votes-2026.json: passed files with no named vote and no reason in no_names ({vt_why[:3]}); run python scripts/refresh.py --votes")
    ext_js += "/* ---- data/votes-2026.json (Council roll calls: the City Record, and Council's Legistar record where the City Record prints no names) ---- */\nconst CX_VOTES = " + js_data("votes",
        {"source": vt["source"], "retrieved_at": vt["retrieved_at"], "legistar_read": (vt.get("legistar") or {}).get("read_at"), "members": vt_members,
         "issues": [[l, u, k] for u, l, k in vt_issues], "f": vt_rows, "o": [[o["file"]] + vt_row(o) for o in vt["other"]],
         "x": vt.get("no_names", {}), "d": {d["file"]: [[n, w["city_record"], w["legistar"]] for n, w in d["members"].items()] for d in vt.get("differs", [])}}) + ";\n"
    # United States graph: only the d3 parts the map uses (force and zoom, ext/cx-d3.js), bundled from the pinned npm packages into the page as CXD3
    d3_js = run([tool("esbuild"), os.path.join(EXT, "cx-d3.js"), "--bundle", "--format=iife", "--global-name=CXD3", "--target=es2020", "--legal-comments=none"])
    d3_ver = ", ".join(f"{p} {json.load(open(os.path.join(ROOT, 'node_modules', p, 'package.json'), encoding='utf-8'))['version']}" for p in ("d3-force", "d3-zoom", "d3-selection", "d3-transition", "d3-quadtree", "d3-timer"))
    log(f"d3 parts: {len(d3_js)} bytes, {sha(d3_js.encode())} ({d3_ver})")
    ext_js += "\n/* ---- cx-d3.js (d3 force and zoom, ISC license, Mike Bostock) ---- */\n" + d3_js
    # v5.14 phone app: cxm-*.jsx reuse the same data and helpers as the desktop app
    for name in ("cx-data.jsx", "cx-ui.jsx", "cx-leaders.jsx", "cx-headline.jsx", "cx-i18n.jsx", "cx-reasons.jsx", "cx-place.jsx", "cx-live.jsx", "cx-votes.jsx", "cx-story.jsx", "cx-seat.jsx", "cx-us.jsx", "cx-us-model.jsx", "cx-us-text.jsx", "cx-us-map.jsx", "cx-us-index.jsx", "cx-us-tree.jsx", "cx-align-text.jsx", "cx-align.jsx", "cx-meetings.jsx", "cx-votes-text.jsx", "cx-record.jsx", "cx-levies.jsx", "cx-districts.jsx", "cx-nav.jsx", "cx-privacy.jsx",
                 "cxm-core.jsx", "cxm-banner.jsx", "cxm-easy.jsx", "cxm-today.jsx", "cxm-explore.jsx", "cxm-place.jsx", "cxm-people.jsx", "cxm-federal.jsx", "cxm-ballot.jsx", "cxm-more.jsx", "cxm-live.jsx"):
        jsx_path = os.path.join(EXT, name)
        if name == "cx-us-text.jsx":   # the committee lines travel in /us/explainers-2026.json, not in the page (us_text_lines)
            jsx_path = os.path.join(work, name)
            write(jsx_path, us_src_page)
        if name == "cx-align-text.jsx":   # the sample questions travel in /us/align-2026.json, fetched only when step 2 opens (align_table)
            jsx_path = os.path.join(work, name)
            write(jsx_path, al_src_page)
        out = run([tool("esbuild"), jsx_path, "--loader:.jsx=jsx",
                   "--jsx-factory=u.createElement", "--jsx-fragment=u.Fragment", "--target=es2020"])
        ext_js += f"\n/* ---- {name} ---- */\n" + out
    log(f"extension compiled: {len(ext_js)} bytes")

    # 4. patches
    log("Applying patches:")
    src = patch(src, "export { Qh as default };", "export { CX_Root as default };", label="phone app: root switch")
    # v5.27 desktop: the rooms are folder tabs above the graph (ext/cx.css), so the arrow keys that move between them are left and right, not up and down.
    # The arrows only move the focus; Enter or Space opens the room (an arrow press used to open every room it passed, add a history entry, and redraw the map).
    src = patch(src, "        onValueChange: Me,\n        orientation: `vertical`,\n        className: `atlas-workspace`,",
                "        onValueChange: Me,\n        orientation: `horizontal`,\n        activationMode: `manual`,\n        className: `atlas-workspace`,", label="desktop: room tabs keys")
    # The strip above the graph (ext/cx-nav.jsx): a plain block, not an unlabeled aside; CX_DeskStrip keeps the chosen room and page in view.
    src = patch(src, "          (0, W.jsxs)(`aside`, {\n            className: `atlas-sidebar`,\n            children: [\n",
                "          (0, W.jsxs)(`div`, {\n            className: `atlas-sidebar`,\n            children: [\n"
                "              (0, W.jsx)(CX_DeskStrip, { room: e.room, panel: F, prio: h }),\n", label="desktop strip: mount")
    # While a personal page is open, no room tab looks or announces itself as chosen (only the open page does), so the screen shows one thing chosen.
    # The room tabs also come after the personal pages in the page, the order they are seen in, so Tab goes the way the eye does.
    tabs_old = ("              (0, W.jsx)(ms, {\n                className: `atlas-room-tabs`,\n                \"aria-label\": `Parts of the civic system`,\n"
                "                children: Uh.map((t) => {\n                  let n = hm[t.icon] ?? ce;\n                  return (0, W.jsxs)(\n                    hs,\n                    {\n"
                "                      value: t.id,\n                      \"aria-label\": t.label,\n                      className: `atlas-room-tab`,\n")
    tabs_end = ("                        t.id === e.room && !h && (0, W.jsx)(w, { size: 14 }),\n                      ],\n                    },\n"
                "                    t.id,\n                  );\n                }),\n              }),\n")
    if src.count(tabs_old) != 1 or src.count(tabs_end) != 1:
        sys.exit("PATCH FAILED [desktop strip: rooms after my pages]: markers not found exactly once")
    i0 = src.index(tabs_old); i1 = src.index(tabs_end, i0) + len(tabs_end)
    tabs_block = src[i0:i1].replace("                      className: `atlas-room-tab`,\n",
                                    "                      className: `atlas-room-tab`,\n"
                                    "                      \"aria-selected\": t.id === e.room && !h && !F,\n"
                                    "                      \"data-state\": t.id === e.room && !h && !F ? `active` : `inactive`,\n"
                                    "                      \"data-cx-off\": cxNavFolderOf(t.id) !== cxNavFolderOf(e.room) || void 0,\n", 1)
    # only the chosen place's room tabs show (data-cx-off hides the rest, ext/cx.css); the row stops at its ends; the thumb of the segmented control sits behind the tabs
    tabs_block = tabs_block.replace("                \"aria-label\": `Parts of the civic system`,\n                children: Uh.map((t) => {\n",
                                    "                \"aria-label\": `Parts of the civic system`,\n                loop: !1,\n"
                                    "                children: [(0, W.jsx)(CX_RoomThumb, { room: e.room, page: !!(h || F) }, `cx-thumb`), ...Uh.map((t) => {\n", 1)
    if not tabs_block.endswith("                }),\n              }),\n") or "CX_RoomThumb" not in tabs_block or "data-cx-off" not in tabs_block:
        sys.exit("PATCH FAILED [desktop strip: rooms segmented]: the room tabs block changed")
    tabs_block = tabs_block[:-len("                }),\n              }),\n")] + "                })],\n              }),\n"
    src = src[:i0] + src[i1:]
    # each row sits in a .cx-row wrapper with CX_RowMore after it: where a row still scrolls sideways it fades at the side with more, a mouse wheel moves it,
    # and an "n more" button at each end reaches what is hidden (ext/cx-nav.jsx)
    tools_end = "                    children: `Cleveland first · Research preview`,\n                  }),\n                ],\n              }),\n"
    # On a computer (ext/cx-nav.jsx): row one is one row of folder tabs (CX_DeskFolders): the places (the phone's zoom levels), then, set apart, the
    # three main tabs United States, My ballot, and Voter education; row two has the chosen place's rooms as a segmented control, "Jump to" (CX_DeskJump:
    # a room, a page, or a record, found on the device; Ctrl+K, Cmd+K, or "/"), and the "My pages" menu in place of the other page buttons
    # (CX_DeskPages). The row of page buttons stays for a narrow window.
    src = patch(src, tools_end, tools_end + "              (0, W.jsx)(CX_RowMore, { unit: `pages` }),\n                ],\n              }),\n"
                "              (0, W.jsxs)(`div`, {\n                className: `cx-strip-top`,\n                children: [\n"
                "              (0, W.jsx)(CX_DeskFolders, { room: e.room, panel: F, prio: h, onRoom: Me }),\n                ],\n              }),\n"
                "              (0, W.jsxs)(`div`, {\n                className: `cx-strip-bottom`,\n                children: [\n"
                "              (0, W.jsxs)(`div`, {\n                className: `cx-row cx-row-rooms`,\n                id: `cx-rooms-row`,\n                children: [\n" + tabs_block
                + "              (0, W.jsx)(CX_RowMore, { unit: `rooms` }),\n              (0, W.jsx)(CX_FolderLine, { room: e.room }),\n                ],\n              }),\n"
                "              (0, W.jsx)(CX_DeskJump, { panel: F, onRoom: Me }),\n"
                "              (0, W.jsx)(CX_DeskPages, { panel: F, prio: h }),\n                ],\n              }),\n", label="desktop strip: places and main tabs, rooms, jump, my pages")
    # the personal pages are a navigation region named "My pages", and the open one says so (aria-current)
    src = patch(src, "              (0, W.jsxs)(`div`, {\n                className: `atlas-sidebar-bottom`,\n",
                "              (0, W.jsxs)(`div`, {\n                className: `cx-row cx-row-pages`,\n                children: [\n"
                "              (0, W.jsxs)(`nav`, {\n                \"aria-label\": `My pages`,\n                className: `atlas-sidebar-bottom`,\n", label="desktop strip: my pages nav")
    # v5.15 dates know what day it is (passed / today / next); the text must match the compiled guide
    d0 = ("                    [\n                      [`Oct 5`, `Registration deadline`],\n                      [`Oct 6`, `Early voting begins`],\n"
          "                      [`Oct 27`, `Mail ballot application due by 8:30 p.m.`],\n                      [`Nov 1`, `Early in-person voting ends at 5 p.m.`],\n"
          "                      [`Nov 3`, `Election Day`],\n                    ].map(([e, t]) =>\n                      (0, W.jsxs)(\n                        `div`,\n"
          "                        {\n                          className: `civic-date`,\n                          children: [\n"
          "                            (0, W.jsx)(`strong`, { children: e }),\n                            (0, W.jsx)(`span`, { children: t }),\n"
          "                          ],\n                        },\n                        e,\n                      ),\n                    ),\n")
    core = open(os.path.join(EXT, "cxm-core.jsx"), encoding="utf-8").read()
    core = core[core.index("const CX_DATES = ["):]
    core = core[:core.index("];")]
    if [p[:2] for p in re.findall(r"\[`([^`]*)`, `([^`]*)`, `([^`]*)`\]", core)] != re.findall(r"\[`([^`]*)`, `([^`]*)`\]", d0):
        sys.exit("PATCH FAILED [voter guide: dates]: CX_DATES text differs from the compiled guide")
    src = patch(src, d0, "                    (0, W.jsx)(CX_DateList, {}),\n", label="voter guide: date-aware dates")
    # "Who does what?" moves to CX_WHO_DOES (ext/cxm-core.jsx) so desktop and phone read one list
    w0 = "                [\n                  [\n                    `Mayor and city departments`,"
    w1 = "                ].map(([e, t]) =>\n                  (0, W.jsxs)(\n                    `details`,"
    if src.count(w0) != 1 or src.count(w1) != 1:
        sys.exit("PATCH FAILED [voter guide: who does what]: markers not found exactly once")
    i0 = src.index(w0); i1 = src.index(w1, i0)
    old_pairs = re.findall(r"`([^`]*)`", src[i0:i1])
    shared = open(os.path.join(EXT, "cxm-core.jsx"), encoding="utf-8").read()
    shared = shared[shared.index("const CX_WHO_DOES = ["):]
    shared = shared[:shared.index("];")]
    if re.findall(r"`([^`]*)`", shared) != old_pairs:
        sys.exit("PATCH FAILED [voter guide: who does what]: CX_WHO_DOES text differs from the compiled guide")
    src = src[:i0] + "                CX_WHO_DOES.map(([e, t]) =>\n                  (0, W.jsxs)(\n                    `details`," + src[i1 + len(w1):]
    log(f"  patch ok: voter guide: who does what ({len(old_pairs) // 2} entries shared)")
    src = patch(src, "Rh.push(...Vh);\nfunction Hh(e) {",
                "Rh.push(...Vh);\n" + ext_js + "\nfunction Hh(e) {", label="insert extension module")
    src = patch(src, "    }),\n    Hh({\n      id: `voting`,",
                "    }),\n    cxExtraRooms(`municipalities`),\n    cxExtraRooms(`local-decisions`),\n    Hh({\n      id: `voting`,",
                label="rooms: municipalities + local decisions")
    src = patch(src, "        { label: `Children and Youth Cabinet`, node: `eo-2025-01` },\n      ],\n    }),\n  ],\n  Wh = [",
                "        { label: `Children and Youth Cabinet`, node: `eo-2025-01` },\n      ],\n    }),\n    cxExtraRooms(`ecosystem`),\n  ],\n  Wh = [",
                label="rooms: civic ecosystem")
    src = patch(src, "  ],\n  Gh = [", "    ...CX_DICT_EXTRA,\n  ],\n  Gh = [", label="dictionary: extra terms")
    src = patch(src, "    history: L,\n  };", "    history: L,\n    pin: P,\n    layers: N,\n    file: O,\n  };", label="room icons")
    src = patch(src, "    V = (0, u.useRef)(null);\n  function Se() {",
                "    V = (0, u.useRef)(null),\n    [cxRc, cxSetRc] = (0, u.useState)(!1),\n    [cxCat, cxSetCat] = (0, u.useState)(`all`),\n    [cxLarge, cxSetLarge] = (0, u.useState)(!1);\n  function Se() {",
                label="state hooks")
    src = patch(src, "  function Fe(e) {\n    (f(e), l(!0));\n  }",
                "  function Fe(e) {\n    (f(e), cxSetCat(`all`), l(!0));\n  }\n"
                "  function cxPanel(p0) {\n    (I(p0), y(!1), L(!1));\n  }\n"
                "  function cxGo(r0, n0) {\n    let r1 = Uh.find((x0) => x0.id === r0);\n    if (!r1) return;\n    M.current.push(e);\n"
                "    let has = r1.nodes.some((x0) => x0.id === n0),\n      i1 = { ...qh, room: r0, selected: has ? n0 : r1.nodes[0].id, mode: e.mode, view: e.view };\n"
                "    (t(i1), y(!1), I(``), L(!!has), (be.current = []), window.history.pushState({}, ``, Yh(i1)), S(``));\n  }",
                label="helpers: cxPanel, cxGo")
    src = patch(src, "[`ballot`, `learn`, `constellation`]", "[`ballot`, `learn`, `constellation`, `context`, `ledger`, `bench`]",
                count=2, label="url panels")
    src = patch(src, "${ve ? `canvas-expanded` : ``}`,", "${ve ? `canvas-expanded` : ``} ${cxLarge ? `atlas-large-type` : ``}`,",
                label="large type class")
    src = patch(src,
                "                  (0, W.jsx)(`span`, { children: `Dictionary` }),\n                ],\n              }),\n",
                "                  (0, W.jsx)(`span`, { children: `Dictionary` }),\n                ],\n              }),\n"
                "              (0, W.jsxs)(`button`, {\n                onClick: () => cxSetRc(!0),\n                children: [\n"
                "                  (0, W.jsx)(CXI.Check, { size: 17 }),\n                  (0, W.jsx)(`span`, { children: `Resident check` }),\n                ],\n              }),\n",
                label="header: resident check")
    src = patch(src,
                "                      (0, W.jsx)(`span`, { children: `Voter education` }),\n                    ],\n                  }),\n",
                "                      (0, W.jsx)(`span`, { children: `Voter education` }),\n                    ],\n                  }),\n"
                "                  (0, W.jsxs)(`button`, {\n                    \"aria-label\": `My local context`,\n                    className: F === `context` ? `active` : ``,\n"
                "                    onClick: () => cxPanel(`context`),\n                    children: [(0, W.jsx)(CXI.Pin, { size: 18 }), (0, W.jsx)(`span`, { children: `My local context` })],\n                  }),\n"
                "                  (0, W.jsxs)(`button`, {\n                    \"aria-label\": `What's new`,\n                    className: F === `news` ? `active` : ``,\n"
                "                    onClick: () => cxPanel(`news`),\n                    children: [(0, W.jsx)(CXI.Sparkles, { size: 18 }), (0, W.jsx)(`span`, { children: `What's new` })],\n                  }),\n"
                "                  (0, W.jsxs)(`button`, {\n                    \"aria-label\": `Decision ledger`,\n                    className: F === `ledger` ? `active` : ``,\n"
                "                    onClick: () => cxPanel(`ledger`),\n                    children: [(0, W.jsx)(CXI.File, { size: 18 }), (0, W.jsx)(`span`, { children: `Decision ledger` })],\n                  }),\n"
                "                  (0, W.jsxs)(`button`, {\n                    \"aria-label\": `How this is built`,\n                    className: F === `bench` ? `active` : ``,\n"
                "                    onClick: () => cxPanel(`bench`),\n                    children: [(0, W.jsx)(CXI.Sparkles, { size: 18 }), (0, W.jsx)(`span`, { children: `How this is built` })],\n                  }),\n"
                "                  (0, W.jsxs)(`button`, {\n                    \"aria-label\": `Who decides here?`,\n                    className: F === `place` ? `active` : ``,\n"
                "                    onClick: () => cxPanel(`place`),\n                    children: [(0, W.jsx)(CXI.Pin, { size: 18 }), (0, W.jsx)(`span`, { children: `Who decides here?` })],\n                  }),\n",
                label="sidebar: local context, ledger, bench")
    src = patch(src,
                "                  (0, W.jsxs)(`details`, {\n                    className: `room-guide`,\n                    children: [",
                "                  (0, W.jsxs)(\n                    `details`,\n                    {\n                    className: `room-guide`,\n                    open: H.id === `overview` && e.mode === `simple`,\n                    children: [",
                label="room guide open on home")
    src = patch(src,
                "                        ],\n                      }),\n                    ],\n                  }),\n                  (0, W.jsxs)(`div`, {\n                    className: `atlas-body ${ne ? `drawer-open` : ``}`,",
                "                        ],\n                      }),\n                    ],\n                  },\n                  `${H.id}-${e.mode}`,\n                  ),\n                  (0, W.jsxs)(`div`, {\n                    className: `atlas-body ${ne ? `drawer-open` : ``}`,",
                label="room guide key")
    src = patch(src,
                "                              className: `atlas-simple-card`,\n                              children: [\n",
                "                              className: `atlas-simple-card`,\n                              children: [\n"
                "                                (0, W.jsx)(CX_SimpleGuide, { room: H, onSelect: Ne, onTerm: Fe, onRegistry: () => m(!0) }, H.id),\n",
                label="simple guide")
    src = patch(src, "(0, W.jsx)(`p`, { children: H.answer }),",
                "(0, W.jsx)(`p`, { children: (0, W.jsx)(CX_Definable, { text: H.answer, onTerm: Fe }) }),",
                label="inline definitions")
    src = patch(src,
                "                                  ],\n                                }),\n                              ],\n                            }),\n                          e.mode === `explore` &&",
                "                                  ],\n                                }),\n"
                "                                H.id === `overview` && (0, W.jsx)(CX_DomainGrid, { onRoom: Me, onPanel: cxPanel }),\n"
                "                              ],\n                            }),\n                          e.mode === `explore` &&",
                label="home doorways")
    src = patch(src,
                "                                  children: `A source link does not mean every claim has been independently audited. Relationship records without their own citation are labeled below.`,\n                                }),\n",
                "                                  children: `A source link does not mean every claim has been independently audited. Relationship records without their own citation are labeled below.`,\n                                }),\n"
                "                                (0, W.jsx)(CX_ReleaseCard, { onBench: () => cxPanel(`bench`) }),\n",
                label="audit release card")
    src = patch(src,
                "                                      children: `No matching records. Clear your search or turn on more layers.`,\n                                    }),\n",
                "                                      children: `No matching records. Clear your search or turn on more layers.`,\n                                    }),\n"
                "                                  (0, W.jsx)(CX_TextConnections, { room: H, visibleIds: new Set(De.map((x0) => x0.id)), onSelect: Ne }),\n",
                label="text view connections")
    src = patch(src,
                "                                    o ? `(device setting)` : ``,\n                                  ],\n                                }),\n",
                "                                    o ? `(device setting)` : ``,\n                                  ],\n                                }),\n"
                "                                (0, W.jsxs)(`label`, {\n                                  className: `atlas-switch-row`,\n                                  children: [\n"
                "                                    (0, W.jsx)(ws, { checked: cxLarge, onCheckedChange: cxSetLarge, \"aria-label\": `Larger text` }),\n"
                "                                    ` Larger text`,\n                                  ],\n                                }),\n",
                label="map options: larger text")
    src = patch(src,
                "              children: (0, W.jsx)(zm, { education: !0 }),\n            }),\n",
                "              children: (0, W.jsx)(zm, { education: !0 }),\n            }),\n"
                "          F === `context` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `My local context`, resetKey: F, children: (0, W.jsx)(CX_LocalContext, { onGo: cxGo, onPanel: cxPanel }) }) }),\n"
                "          F === `ledger` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `The decision ledger`, resetKey: F, children: (0, W.jsx)(CX_Ledger, { onGo: cxGo }) }) }),\n"
                "          F === `bench` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `How this is built`, resetKey: F, children: (0, W.jsx)(CX_Bench, {}) }) }),\n",
                label="aux pages")

    # ---- v5.1: priorities guides + My leaders ----
    src = patch(src, "    p = (0, u.useMemo)(() => wm.filter((t) => e[t.id]), [e]);\n",
                "    p = (0, u.useMemo)(() => wm.filter((t) => e[t.id]), [e]);\n  (0, u.useEffect)(() => cxPrioritySet(e), [e]);\n",
                label="priorities: share with leaders page")
    src = patch(src, "                        (0, W.jsx)(`small`, { children: t.example }),\n",
                "                        (0, W.jsx)(`small`, { children: t.example }),\n                        (0, W.jsx)(CX_PriorityGuide, { id: t.id, level: e[t.id] }),\n",
                label="priorities: plain-English Cleveland guide")
    src = patch(src, "(t(i1), y(!1), I(``), L(!!has), (be.current = []), window.history.pushState({}, ``, Yh(i1)), S(``));\n  }",
                "(t(i1), y(!1), I(``), L(!!has), (be.current = []), window.history.pushState({}, ``, Yh(i1)), S(``));\n  }\n"
                "  ((CX_NAV.panel = cxPanel), (CX_NAV.go = cxGo), (CX_NAV.priorities = () => (y(!0), I(``), L(!1))));",
                label="nav registration")
    src = patch(src, "`context`, `ledger`, `bench`]", "`context`, `ledger`, `bench`, `leaders`, `place`, `news`]", count=2, label="url panels: leaders, place, news")
    src = patch(src,
                "                      (0, W.jsx)(`span`, { children: `My constellation` }),\n                    ],\n                  }),\n",
                "                      (0, W.jsx)(`span`, { children: `My constellation` }),\n                    ],\n                  }),\n"
                "                  (0, W.jsxs)(`button`, {\n                    \"aria-label\": `My leaders`,\n                    className: F === `leaders` ? `active` : ``,\n"
                "                    onClick: () => cxPanel(`leaders`),\n                    children: [(0, W.jsx)(CXI.Users, { size: 18 }), (0, W.jsx)(`span`, { children: `My leaders` })],\n                  }),\n",
                label="sidebar: my leaders")
    src = patch(src,
                "          F === `bench` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `How this is built`, resetKey: F, children: (0, W.jsx)(CX_Bench, {}) }) }),\n",
                "          F === `bench` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `How this is built`, resetKey: F, children: (0, W.jsx)(CX_Bench, {}) }) }),\n"
                "          F === `leaders` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `My leaders`, resetKey: F, children: (0, W.jsx)(CX_Leaders, { onGo: cxGo, onPanel: cxPanel }) }) }),\n"
                "          F === `place` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `Who decides here?`, resetKey: F, children: (0, W.jsx)(CX_Place, { onGo: cxGo }) }) }),\n"
                "          F === `news` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `What's new`, resetKey: F, children: (0, W.jsx)(CX_News, {}) }) }),\n",
                label="aux page: my leaders")
    # v5.16 Stories (shared story engine, ext/cx-story.jsx): sidebar entry, address panel, page
    src = patch(src, "`context`, `ledger`, `bench`, `leaders`, `place`, `news`]", "`context`, `ledger`, `bench`, `leaders`, `place`, `news`, `stories`]", count=2, label="url panels: stories")
    src = patch(src,
                "(0, W.jsx)(`span`, { children: `My leaders` })],\n                  }),\n",
                "(0, W.jsx)(`span`, { children: `My leaders` })],\n                  }),\n"
                "                  (0, W.jsxs)(`button`, {\n                    \"aria-label\": `Stories`,\n                    className: F === `stories` ? `active` : ``,\n"
                "                    onClick: () => cxPanel(`stories`),\n                    children: [(0, W.jsx)(CXI.Sparkles, { size: 18 }), (0, W.jsx)(`span`, { children: `Stories` })],\n                  }),\n",
                label="sidebar: stories")
    src = patch(src,
                "          F === `place` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `Who decides here?`, resetKey: F, children: (0, W.jsx)(CX_Place, { onGo: cxGo }) }) }),\n",
                "          F === `place` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `Who decides here?`, resetKey: F, children: (0, W.jsx)(CX_Place, { onGo: cxGo }) }) }),\n"
                "          F === `stories` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `Stories`, resetKey: F, children: (0, W.jsx)(CX_Stories, {}) }) }),\n",
                label="aux page: stories")
    # v5.16 Profiles: sidebar entry, address panel, page
    src = patch(src, "`news`, `stories`]", "`news`, `stories`, `profiles`]", count=2, label="url panels: profiles")
    src = patch(src,
                "(0, W.jsx)(`span`, { children: `Stories` })],\n                  }),\n",
                "(0, W.jsx)(`span`, { children: `Stories` })],\n                  }),\n"
                "                  (0, W.jsxs)(`button`, {\n                    \"aria-label\": `Profiles`,\n                    className: F === `profiles` ? `active` : ``,\n"
                "                    onClick: () => cxPanel(`profiles`),\n                    children: [(0, W.jsx)(CXI.Users, { size: 18 }), (0, W.jsx)(`span`, { children: `Profiles` })],\n                  }),\n",
                label="sidebar: profiles")
    src = patch(src,
                "          F === `stories` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `Stories`, resetKey: F, children: (0, W.jsx)(CX_Stories, {}) }) }),\n",
                "          F === `stories` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `Stories`, resetKey: F, children: (0, W.jsx)(CX_Stories, {}) }) }),\n"
                "          F === `profiles` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `Profiles`, resetKey: F, children: (0, W.jsx)(CX_Profiles, {}) }) }),\n",
                label="aux page: profiles")
    # v5.16 United States graph: sidebar entry, address panel, page
    src = patch(src, "`news`, `stories`, `profiles`]", "`news`, `stories`, `profiles`, `us`]", count=2, label="url panels: us")
    src = patch(src,
                "(0, W.jsx)(`span`, { children: `Profiles` })],\n                  }),\n",
                "(0, W.jsx)(`span`, { children: `Profiles` })],\n                  }),\n"
                "                  (0, W.jsxs)(`button`, {\n                    \"aria-label\": `United States`,\n                    className: F === `us` ? `active` : ``,\n"
                "                    onClick: () => cxPanel(`us`),\n                    children: [(0, W.jsx)(CXI.Layers, { size: 18 }), (0, W.jsx)(`span`, { children: `United States` })],\n                  }),\n",
                label="sidebar: united states")
    src = patch(src,
                "          F === `profiles` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `Profiles`, resetKey: F, children: (0, W.jsx)(CX_Profiles, {}) }) }),\n",
                "          F === `profiles` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `Profiles`, resetKey: F, children: (0, W.jsx)(CX_Profiles, {}) }) }),\n"
                "          F === `us` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `United States`, resetKey: F, children: (0, W.jsx)(CX_UsMap, {}) }) }),\n",
                label="aux page: united states")
    # v5.17 Levies and taxes: sidebar entry (under Voter education), address panel, page
    src = patch(src, "`news`, `stories`, `profiles`, `us`]", "`news`, `stories`, `profiles`, `us`, `levies`]", count=2, label="url panels: levies")
    src = patch(src,
                "                      (0, W.jsx)(`span`, { children: `Voter education` }),\n                    ],\n                  }),\n",
                "                      (0, W.jsx)(`span`, { children: `Voter education` }),\n                    ],\n                  }),\n"
                "                  (0, W.jsxs)(`button`, {\n                    \"aria-label\": `Levies and taxes`,\n                    className: F === `levies` ? `active` : ``,\n"
                "                    onClick: () => cxPanel(`levies`),\n                    children: [(0, W.jsx)(CXI.Wallet, { size: 18 }), (0, W.jsx)(`span`, { children: `Levies and taxes` })],\n                  }),\n",
                label="sidebar: levies")
    src = patch(src,
                "          F === `us` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `United States`, resetKey: F, children: (0, W.jsx)(CX_UsMap, {}) }) }),\n",
                "          F === `us` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `United States`, resetKey: F, children: (0, W.jsx)(CX_UsMap, {}) }) }),\n"
                "          F === `levies` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `Levies and taxes`, resetKey: F, children: (0, W.jsx)(CX_Levies, {}) }) }),\n",
                label="aux page: levies")
    # v5.17 Find my districts (the address is matched in the page and never saved or sent): sidebar entry under Levies and taxes, address panel, page
    src = patch(src, "`news`, `stories`, `profiles`, `us`, `levies`]", "`news`, `stories`, `profiles`, `us`, `levies`, `districts`]", count=2, label="url panels: districts")
    src = patch(src,
                "                    onClick: () => cxPanel(`levies`),\n                    children: [(0, W.jsx)(CXI.Wallet, { size: 18 }), (0, W.jsx)(`span`, { children: `Levies and taxes` })],\n                  }),\n",
                "                    onClick: () => cxPanel(`levies`),\n                    children: [(0, W.jsx)(CXI.Wallet, { size: 18 }), (0, W.jsx)(`span`, { children: `Levies and taxes` })],\n                  }),\n"
                "                  (0, W.jsxs)(`button`, {\n                    \"aria-label\": `Find my districts`,\n                    className: F === `districts` ? `active` : ``,\n"
                "                    onClick: () => cxPanel(`districts`),\n                    children: [(0, W.jsx)(CXI.Pin, { size: 18 }), (0, W.jsx)(`span`, { children: `Find my districts` })],\n                  }),\n",
                label="sidebar: districts")
    src = patch(src,
                "          F === `levies` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `Levies and taxes`, resetKey: F, children: (0, W.jsx)(CX_Levies, {}) }) }),\n",
                "          F === `levies` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `Levies and taxes`, resetKey: F, children: (0, W.jsx)(CX_Levies, {}) }) }),\n"
                "          F === `districts` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `Find my districts`, resetKey: F, children: (0, W.jsx)(CX_DistrictsPage, {}) }) }),\n",
                label="aux page: districts")
    # the privacy policy (ext/cx-privacy.jsx): an address panel and a page, opened from My pages and How this is built (no button in the old row of 15)
    src = patch(src, "`levies`, `districts`]", "`levies`, `districts`, `privacy`]", count=2, label="url panels: privacy")
    src = patch(src,
                "          F === `districts` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `Find my districts`, resetKey: F, children: (0, W.jsx)(CX_DistrictsPage, {}) }) }),\n",
                "          F === `districts` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `Find my districts`, resetKey: F, children: (0, W.jsx)(CX_DistrictsPage, {}) }) }),\n"
                "          F === `privacy` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `Privacy policy`, resetKey: F, children: (0, W.jsx)(CX_PrivacyPolicy, {}) }) }),\n",
                label="aux page: privacy")
    # a city record's page (ext/cx-record.jsx, ?panel=leg&file=906-2026): what it is, Votes & actions, Positions, and where to read it. The address names
    # the file (written by the URL writer below), never the viewer. Opened from Jump to (a file number), a person's list, the ward view, and the map drawer.
    src = patch(src, "`levies`, `districts`, `privacy`]", "`levies`, `districts`, `privacy`, `leg`]", count=2, label="url panels: leg")
    src = patch(src,
                "          F === `privacy` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `Privacy policy`, resetKey: F, children: (0, W.jsx)(CX_PrivacyPolicy, {}) }) }),\n",
                "          F === `privacy` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `Privacy policy`, resetKey: F, children: (0, W.jsx)(CX_PrivacyPolicy, {}) }) }),\n"
                "          F === `leg` && (0, W.jsx)(`div`, { className: `auxiliary-page`, children: (0, W.jsx)(CxBoundary, { label: `A city record`, resetKey: F, children: (0, W.jsx)(CX_LegPage, {}) }) }),\n",
                label="aux page: city record")
    src = patch(src, "    t ? i.set(`panel`, `priorities`) : n && i.set(`panel`, n),\n",
                "    t ? i.set(`panel`, `priorities`) : n && i.set(`panel`, n),\n    !t && n === `leg` && CX_LEG_SEL.v && i.set(`file`, CX_LEG_SEL.v),\n",
                label="url: a city record names its file")
    # the map's record drawer: the few records that are city files show the shared Votes & actions and Positions, not the empty notes
    src = patch(src, "                                (0, W.jsx)(Zh, { node: U }),\n",
                "                                (0, W.jsx)(CX_DrawerRecord, { node: U, tab: R }),\n                                (0, W.jsx)(Zh, { node: U }),\n",
                label="drawer: city record votes and actions")
    src = patch(src, "                                R === `actions` &&\n                                  !U.activity &&\n",
                "                                R === `actions` &&\n                                  !U.activity &&\n                                  !/^leg-/.test(U.id) &&\n",
                label="drawer: no empty vote note on a city record")
    src = patch(src, "                                R === `positions` &&\n                                  (0, W.jsx)(`p`, {\n",
                "                                R === `positions` &&\n                                  !/^leg-/.test(U.id) &&\n                                  (0, W.jsx)(`p`, {\n",
                label="drawer: no empty positions note on a city record")
    # the open personal page says so to a screen reader (aria-current="page"), on every one of the 15 page buttons
    n_cur = 0
    def cur(m):
        nonlocal n_cur
        n_cur += 1
        return m.group(0) + f"\n{m.group(1)}\"aria-current\": {m.group(2)} ? `page` : void 0,"
    src = re.sub(r"( +)className: (F === `\w+`|h) \? `active` : ``,", cur, src)
    if n_cur != 15:
        sys.exit(f"PATCH FAILED [desktop strip: open page is current]: expected 15, found {n_cur}")
    log(f"  patch ok: desktop strip: open page is current ({n_cur})")
    # v5.16 drawer: a way from a council member's or the Mayor's map record to their formal profile
    src = patch(src,
                "                                (0, W.jsx)(`h2`, {\n                                  id: `record-title`,\n                                  children: U.name,\n                                }),\n",
                "                                (0, W.jsx)(`h2`, {\n                                  id: `record-title`,\n                                  children: U.name,\n                                }),\n"
                "                                (0, W.jsx)(CX_DrawerProfile, { node: U }),\n",
                label="drawer: formal profile button")
    # v5.16 desktop Easy mode: a header button next to Resident check
    src = patch(src,
                "                  (0, W.jsx)(`span`, { children: `Resident check` }),\n                ],\n              }),\n",
                "                  (0, W.jsx)(`span`, { children: `Resident check` }),\n                ],\n              }),\n"
                "              (0, W.jsxs)(`button`, {\n                onClick: () => cxEasyOn(),\n                children: [\n"
                "                  (0, W.jsx)(CXI.Help, { size: 17 }),\n                  (0, W.jsx)(`span`, { children: `Easy mode` }),\n                ],\n              }),\n"
                "              (0, W.jsx)(CX_LangButton, {}),\n",
                label="header: easy mode")
    # v5.16 accessibility: an accessible name must contain the words a person can see, so voice control can say them
    src = patch(src,
                "                      \"aria-label\": `${i.name}, ${i.region}. ${i.evidence === `missing` ? `Record needed.` : ``}`,\n",
                "                      \"aria-label\": `${i.name.toLowerCase().includes(String(i.label).toLowerCase()) ? `` : `${i.label}, `}${i.name}, ${i.region}. ${i.evidence === `missing` ? `Record needed.` : ``}`,\n",
                label="a11y: map node names include the visible label")
    src = patch(src, "\"aria-label\": `Read evidence for ${e.name}`,", "\"aria-label\": `Record & role, read evidence for ${e.name}`,", label="a11y: evidence button name")
    src = patch(src, "            \"aria-label\": `Cleveland Civic Graph home`,\n", "", label="a11y: brand takes its name from the words on it")
    src = patch(src, "\"aria-label\": ge ? `Expand navigation` : `Collapse navigation`,", "\"aria-label\": ge ? `Explore your city, expand navigation` : `Explore your city, collapse navigation`,", label="a11y: rail toggle name")

    src = patch(src,
                "            className: `atlas-header-actions`,\n            children: [\n",
                "            className: `atlas-header-actions`,\n            children: [\n              (0, W.jsx)(CX_FreshChip, {}),\n              (0, W.jsx)(CX_ThemeSwitch, {}),\n              (0, W.jsx)(CX_ModeButton, {}),\n",
                label="header: design style switch")
    # v5.7 ballot audit fixes: plain place labels, issue titles, district hint
    src = patch(src, "        children: [e.party, ` · `, t.name, ` · `, t.area],",
                "        children: [e.party, ` · `, t.name, ` · `, cxArea(t.area, t.name)],",
                label="ballot: drawer place label")
    src = patch(src, "                                children: [`Issue `, e.number, ` · `, e.area],",
                "                                children: [`Issue `, e.number, ` · `, cxArea(e.area)],",
                label="ballot: local issue place label")
    src = patch(src, "                                    ? `${e.contest.name} · ${e.contest.area} ${e.contest.term}`",
                "                                    ? `${e.contest.name} · ${cxArea(e.contest.area, e.contest.name)} ${e.contest.term}`",
                label="ballot: race picker place label")
    src = patch(src, "                            j.contest?.area || j.issue.area,",
                "                            j.contest ? cxArea(j.contest.area, j.contest.name) : cxArea(j.issue.area, Xm(j.issue).title),",
                label="ballot: card place label")
    src = patch(src, "                                e.contest?.name || `Issue ${e.issue.number}`,",
                "                                e.contest?.name || `Issue ${e.issue.number}: ${Xm(e.issue).title}`,",
                label="ballot: review issue title")
    src = patch(src, "                                ? `${e.contest.area} ${e.contest.term}`\n                                : e.issue.area,",
                "                                ? `${cxArea(e.contest.area, e.contest.name)} ${e.contest.term}`\n                                : cxArea(e.issue.area, Xm(e.issue).title),",
                label="ballot: review place label")
    src = patch(src, "                    : `Choose your congressional district in My practice ballot to see candidates for that race.`,",
                "                    : `Pick your U.S. House district with “Set my districts” at the top of this page to see the candidates for that race.`,",
                label="ballot: district hint")
    # v5.9 City Council in the constellation (proposals they backed)
    src = patch(src, "function ih({ practice: e, onInspect: t, reduced: n = !1 }) {\n",
                "function ih({ practice: e, onInspect: cxT0, reduced: n = !1 }) {\n  let t = (id) => (/^(council-ward-|mayor-)/.test(id) ? cxOpenLeader(id) : cxT0(id));\n",
                label="council align: inspect")
    src = patch(src, "    _ = a === `house` ? `vote` : `statement`,",
                "    _ = a === `house` ? `vote` : a === `council` ? `sponsor` : a === `mayor` ? `mayor` : `statement`,",
                label="council align: record kind")
    src = patch(src, "    b = th(r).flatMap((e) =>\n",
                "    b = a === `council` ? CX_COUNCIL_PEOPLE : a === `mayor` ? CX_MAYOR_PEOPLE : th(r).flatMap((e) =>\n",
                label="council align: people")
    src = patch(src, "                  (0, W.jsx)(`option`, {\n                    value: `house`,\n                    children: `U.S. House · past votes`,\n                  }),\n",
                "                  (0, W.jsx)(`option`, {\n                    value: `house`,\n                    children: `U.S. House · past votes`,\n                  }),\n"
                "                  (0, W.jsx)(`option`, {\n                    value: `council`,\n                    children: `Cleveland City Council · proposals they backed`,\n                  }),\n"
                "                  (0, W.jsx)(`option`, {\n                    value: `mayor`,\n                    children: `Mayor Bibb · proposals his administration sent`,\n                  }),\n",
                label="council align: office option")
    src = patch(src, "        children: `Your practice candidate choice never fills in these answers. This small evidence sample is not a political identity test or a recommendation.`,",
                "        children: a === `mayor`\n          ? `The mayor is not on the November ballot. This compares your answers with proposals Mayor Bibb's administration sent to City Council in 2026, either in his name or as a city department request. Sending a proposal shows the administration backs it. Council still decides.`\n          : a === `council`\n          ? `Council is not on the November ballot. This shows how your answers line up with the 2026 proposals your council members chose to sponsor. Sponsoring shows support; it is not a floor vote. A member who did not sponsor has no record here, never a no.`\n          : `Your practice candidate choice never fills in these answers. This small evidence sample is not a political identity test or a recommendation.`,",
                label="council align: intro")
    src = patch(src, "                  _ === `vote` ? `RECORDED VOTE` : `CAMPAIGN STATEMENT`,",
                "                  _ === `mayor` ? `ADMINISTRATION PROPOSAL` : _ === `sponsor` ? `COUNCIL PROPOSAL` : _ === `vote` ? `RECORDED VOTE` : `CAMPAIGN STATEMENT`,",
                label="council align: question label")
    src = patch(src, "                  _ === `vote` ? `roll call` : `campaign source`,",
                "                  _ === `sponsor` || _ === `mayor` ? `official record` : _ === `vote` ? `roll call` : `campaign source`,",
                label="council align: source link")
    src = patch(src, "                      _ === `vote`\n                        ? `PAST VOTE AGREEMENT`\n                        : `STATED PLAN AGREEMENT`,",
                "                      _ === `mayor`\n                        ? `PROPOSALS HIS ADMINISTRATION SENT`\n                        : _ === `sponsor`\n                        ? `PROPOSALS THEY BACKED`\n                        : _ === `vote`\n                        ? `PAST VOTE AGREEMENT`\n                        : `STATED PLAN AGREEMENT`,",
                label="council align: chart label")
    src = patch(src, "          .force(`collision`, vp(50))",
                "          .force(`collision`, vp(a === `council` ? 56 : 50))",
                label="council align: spacing")
    src = patch(src, "                                      y: `48`,\n                                      fontSize: `15`,\n                                      children: e.name.split(` & `)[0],",
                "                                      y: a === `council` ? `44` : `48`,\n                                      fontSize: a === `council` ? `13` : `15`,\n                                      children: a === `council` ? e.name.split(` `).slice(-1)[0] : e.name.split(` & `)[0],",
                label="council align: short name")
    src = patch(src, "                                      y: `68`,\n                                      fontSize: `13`,\n                                      children: [\n                                        e.same,\n                                        `/`,\n                                        e.total,\n                                        ` same · `,\n                                        e.missing,\n                                        ` missing`,\n                                      ],",
                "                                      y: a === `council` ? `59` : `68`,\n                                      fontSize: a === `council` ? `11` : `13`,\n                                      children: a === `council` ? [e.same, ` of `, e.total, ` same`] : [\n                                        e.same,\n                                        `/`,\n                                        e.total,\n                                        ` same · `,\n                                        e.missing,\n                                        ` missing`,\n                                      ],",
                label="council align: short stats")
    src = patch(src, "              (0, W.jsx)(`p`, { className: `practice-meta`, children: y.date }),",
                "              r.answers[y.id] && (0, W.jsx)(CX_Why, { q: y }),\n              (0, W.jsx)(`p`, { className: `practice-meta`, children: y.date }),",
                label="constellation: why supporters backed it")
    # dictionary dialog body -> enhanced dictionary
    start = "            (0, W.jsxs)(`label`, {\n              className: `atlas-dictionary-search`,"
    end = "                ` starting definitions. These are plain-language summaries, not legal definitions.`,\n              ],\n            }),\n"
    if "dictionary body" in os.environ.get("CX_SKIP",""):
        pass
    elif src.count(start) != 1 or src.count(end) != 1:
        sys.exit("PATCH FAILED [dictionary body]: markers not unique")
    else:
      a = src.index(start)
      z = src.index(end) + len(end)
      src = src[:a] + "            (0, W.jsx)(CX_Dictionary, { query: d, setQuery: f, category: cxCat, setCategory: cxSetCat, onRoom: Me, onClose: () => l(!1) }),\n" + src[z:]
      log("  patch ok: dictionary body (1)")
    src = patch(src, "      (0, W.jsx)(_s, {\n        open: p,",
                "      (0, W.jsx)(CX_ResidentCheck, { open: cxRc, onOpenChange: cxSetRc, room: H, node: U, edges: Ce, nodes: H.nodes, onSelect: Ne }),\n"
                "      (0, W.jsx)(_s, {\n        open: p,", label="resident check dialog")
    src = patch(src,
                "                          ` Public sources. Visible gaps. No inferred political labels.`,\n                        ],\n                      }),\n",
                "                          ` Public sources. Visible gaps. No inferred political labels.`,\n                        ],\n                      }),\n"
                "                      (0, W.jsx)(`span`, { className: `cx-build-stamp`, children: `v5.15 · council records updated ${cxFresh().when} · guide sources reviewed Sep 22, 2026` }),\n",
                label="footer build stamp")
    # ---- v5.15: map hover cards, lit connections, arrows that draw ----
    src = patch(src,
                "                      `path`,\n                      {\n                        d: `M${n.x + ((r.x - n.x) / a) * o},",
                "                      `path`,\n                      {\n                        \"data-cx-s\": e.source,\n                        \"data-cx-t\": e.target,\n"
                "                        className: `atlas-edge`,\n"
                "                        pathLength: e.evidence === `missing` || e.evidence === `inferred` ? void 0 : 100,\n"
                "                        d: `M${n.x + ((r.x - n.x) / a) * o},",
                label="map: edge ends for hover")
    src = patch(src,
                "                      tabIndex: 0,\n                      className: `atlas-node`,\n                      transform: `translate(${i.x} ${i.y})`,\n"
                "                      opacity: t === e.nodes[0].id || j.has(i.id) ? 1 : 0.46,\n                      onClick: () => n(i.id),\n",
                "                      tabIndex: 0,\n                      className: `atlas-node`,\n                      transform: `translate(${i.x} ${i.y})`,\n"
                "                      opacity: t === e.nodes[0].id || j.has(i.id) ? 1 : 0.46,\n"
                "                      onMouseEnter: (ev) => cxHoverNode(e, i, ev),\n                      onMouseLeave: cxHoverEnd,\n"
                "                      onFocus: (ev) => cxHoverNode(e, i, ev),\n                      onBlur: cxHoverEnd,\n"
                "                      onClick: (ev) => (cxHoverEnd(ev), n(i.id)),\n",
                label="map: node hover card")
    src = patch(src, "                        (0, W.jsx)(`title`, { children: i.name }),\n", "", label="map: hover card replaces the plain tooltip")
    # desktop constellation: council members and the mayor show their portrait instead of initials
    src = patch(src,
                "                                    (0, W.jsx)(`text`, {\n                                      textAnchor: `middle`,\n                                      y: `5`,\n"
                "                                      fontSize: `14`,\n                                      children: e.name\n                                        .split(` `)\n"
                "                                        .slice(0, 2)\n                                        .map((e) => e[0])\n                                        .join(``),\n                                    }),\n",
                "                                    (0, W.jsx)(CX_StarFace, { id: e.id, name: e.name }),\n",
                label="constellation: portrait faces")
    # after November 3 the voter guide says the election is over (dates also mark themselves passed)
    src = patch(src, ": `Get ready for November 3.`,", ": cxElectionPhase() === `after` ? `The November 3 election is over.` : `Get ready for November 3.`,",
                label="voter guide: post-election heading")
    src = patch(src, ": `Tuesday, November 3, 2026 • General election • Polls 6:30 a.m.–7:30 p.m. Eastern.`,",
                ": cxElectionPhase() === `after` ? `Official results come from the Cuyahoga County Board of Elections. Your practice ballot stays here to look back on.` : `Tuesday, November 3, 2026 • General election • Polls 6:30 a.m.–7:30 p.m. Eastern.`,",
                label="voter guide: post-election line")
    # tabs: the map's tab bars have no rendered panels, so aria-controls pointed at nothing; panels keep aria-labelledby
    src = patch(src, "          \"aria-controls\": l,\n          \"data-state\": u ? `active` : `inactive`,\n",
                "          \"data-state\": u ? `active` : `inactive`,\n", label="tabs: no aria-controls pointing at missing panels")
    # links that moved (checked Oct 1, 2026)
    src = patch(src, "https://www.firstenergycorp.com/help-support/about-firstenergy/operating-companies.html",
                "https://www.firstenergycorp.com/about/utilities.html", label="link: FirstEnergy electric companies")
    src = patch(src, "https://www.nrc.gov/info-finder/reactors/perry.html",
                "https://www.nrc.gov/facilities-safety/facility-finder/reactors/perr1", label="link: NRC Perry Unit 1")
    src = patch(src, "https://www.clevelandmetroschools.org/office-of-the-ceo/about-the-ceo",
                "https://www.clevelandmetroschools.org/division-of-external-affairs/office-of-the-ceo/about-the-ceo", label="link: CMSD About the CEO")
    # sample ballots are published now (county page checked Oct 1, 2026)
    src = patch(src, "`The county sample-ballot page said ballots were being prepared when checked September 22. Your address is entered only on the county website.`",
                "`The county’s sample-ballot page lists a ballot for every precinct for the November 3 election (checked October 1). Your address is entered only on the county website.`",
                label="copy: sample ballots available (guide)")
    src = patch(src, "`The county’s sample-ballot page said ballots were being prepared when checked September 22. Until available, this is a practice assembly from the county catalogue, not a verified personal ballot.`",
                "`The county’s sample-ballot page now lists a ballot for every precinct (checked October 1). This page is still a practice assembly from the county catalogue, not your verified ballot, so check yours there.`",
                label="copy: sample ballots available (practice ballot)")
    src = patch(src, "`Find the races and issues for your precinct when available.`", "`Find the races and issues for your precinct.`",
                label="copy: sample ballot resource")
    # local asset paths -> embedded blob URLs
    n_assets = 0
    def repl(m):
        nonlocal n_assets
        n_assets += 1
        p = m.group(1)
        return f"(globalThis.__cxAsset ? globalThis.__cxAsset(`{p}`) : `{p}`)"
    src = re.sub(r"`(/(?:portraits|records)/[^`]+)`", repl, src)
    if n_assets != 18:
        sys.exit(f"PATCH FAILED [asset paths]: expected 18, found {n_assets}")
    log(f"  patch ok: asset paths ({n_assets})")

    patched = os.path.join(work, "CivicAtlas-ramPAjr5.js")
    write(patched, src)
    shutil.copy(framework, work)
    shutil.copy(runtime, work)
    log(f"patched CivicAtlas: {sha(patched)}")

    # 5. bundle into one IIFE
    entry = os.path.join(work, "entry.js")
    write(entry, 
        'import { i as reactReq, t as rdomReq } from "./framework-D_rUT4EX.js";\n'
        'import App from "./CivicAtlas-ramPAjr5.js";\n'
        "const React = reactReq();\nconst { createRoot } = rdomReq();\n"
        'createRoot(document.getElementById("root")).render(React.createElement(App));\n')
    bundle = os.path.join(work, "app.bundle.js")
    run([tool("esbuild"), entry, "--bundle", "--format=iife", *([] if os.environ.get("CX_DEBUG") else ["--minify"]), "--target=es2020",
         "--legal-comments=none", f"--outfile={bundle}"])
    js = open(bundle, encoding="utf-8").read().replace("</script", "<\\/script")
    log(f"bundle: {len(js)} bytes, {sha(js.encode())}")

    # 6. embedded assets
    assets = {}
    for folder, mime in (("portraits", "image/webp"), ("records", "application/pdf")):
        d = os.path.join(client, folder)
        for f in sorted(os.listdir(d)):
            if f.endswith((".webp", ".pdf")):
                raw = open(os.path.join(d, f), "rb").read()
                assets[f"/{folder}/{f}"] = f"data:{mime};base64," + base64.b64encode(raw).decode()
                log(f"asset  {sha(raw)}  /{folder}/{f}")
    manifest = json.load(open(os.path.join(client, "records", "manifest.json")))
    for r in manifest["records"]:
        got = sha(open(os.path.join(client, r["file"].lstrip("/")), "rb").read())
        ok = "match" if got == r["sha256"] else "MISMATCH"
        log(f"record manifest check {ok}: {r['file']}")
        if ok != "match":
            sys.exit("record hash mismatch")

    def preamble(inline_assets):
        return (
            # small shims for older Safari (before 15.4) and other browsers missing 2021-2022 built-ins
            "(function(){function at(n){n=Math.trunc(n)||0;if(n<0)n+=this.length;return n<0||n>=this.length?void 0:this[n];}"
            "[Array.prototype,String.prototype].forEach(function(p){if(!p.at)Object.defineProperty(p,'at',{value:at,writable:true,configurable:true});});"
            "if(!Object.hasOwn)Object.hasOwn=function(o,k){return Object.prototype.hasOwnProperty.call(o,k);};"
            "var A=" + json.dumps(assets if inline_assets else {}) + ",U={};"
            "globalThis.__cxAsset=function(k){if(U[k])return U[k];var d=A[k];if(!d)return k;"
            "try{var i=d.indexOf(','),mime=d.slice(5,i).split(';')[0],bin=atob(d.slice(i+1)),a=new Uint8Array(bin.length);"
            "for(var j=0;j<bin.length;j++)a[j]=bin.charCodeAt(j);U[k]=URL.createObjectURL(new Blob([a],{type:mime}));}"
            "catch(e){U[k]=d;}return U[k];};"
            "['pushState','replaceState'].forEach(function(m){var o=history[m];history[m]=function(){"
            "try{return o.apply(history,arguments);}catch(e){try{return o.call(history,arguments[0],arguments[1]);}catch(_){}}};});"
            "var th;try{th=localStorage.getItem('cx-theme');}catch(e){}"
            "document.documentElement.setAttribute('data-cx-theme',th==='original'?'original':'bento');"
            "var md;try{md=localStorage.getItem('cx-mode');}catch(e){}"
            "var pf=md==='light'||md==='dark'?md:'system',ef=pf!=='system'?pf:(window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');"
            "document.documentElement.setAttribute('data-cx-mode',ef);document.documentElement.setAttribute('data-cx-mode-pref',pf);"
            "})();"
        )

    base_css = "\n".join(open(p, encoding="utf-8").read() for p in (css_a, css_b, os.path.join(EXT, "cx.css")))
    import bento
    bento_css, bento_rules = bento.bento_layer(base_css)
    log(f"bento layer: {bento_rules} color rules remapped, {len(bento_css)} bytes, {sha(bento_css.encode())}")
    css = base_css + "\n/* ---- Bento Blue layer (generated by bento.py) ---- */\n" + bento_css + "\n" + open(os.path.join(EXT, "cx-bento.css"), encoding="utf-8").read()
    cxm_text = open(os.path.join(EXT, "cxm.css"), encoding="utf-8").read()
    css += "\n/* ---- v5.14 phone app (ext/cxm.css, outside the bento remap) ---- */\n" + cxm_text
    import light
    light_css, light_stats = light.light_layer(cxm_text)
    log(f"light layer (phone and shared pages): {light_stats['mapped']} rules mapped, {light_stats['left']} left on the accent, {len(light_css)} bytes, {sha(light_css.encode())}")
    css += "\n/* ---- light mode for the phone app and shared pages (generated by light.py from ext/cxm.css) ---- */\n" + light_css
    # the desktop app: the saved Original stylesheets and the Bento layer, turned light the same way (ext/cx-bento.css is the hand-written part of Bento)
    bento_hand = open(os.path.join(EXT, "cx-bento.css"), encoding="utf-8").read()
    light_d1, st_d1 = light.light_layer(base_css)
    light_d2, st_d2 = light.light_layer(bento_css + "\n" + bento_hand)
    log(f"light layer (desktop, original): {st_d1['mapped']} rules, {len(light_d1)} bytes, {sha(light_d1.encode())}; (desktop, bento): {st_d2['mapped']} rules, {len(light_d2)} bytes, {sha(light_d2.encode())}")
    css += "\n/* ---- light mode for the desktop app (generated by light.py) ---- */\n" + light_d1 + "\n" + light_d2
    css += "\n/* ---- light mode, hand-written parts that come after the generated layers (ext/cx-light.css) ---- */\n" + open(os.path.join(EXT, "cx-light.css"), encoding="utf-8").read()
    # spaces and comments only: every rule, value, and selector stays as written and in the same order (the Bento and light layers above
    # were generated from the unminified text). About 45 KB less CSS for a phone to read and 6 KB less to download.
    css_full = len(css)
    css = run([tool("esbuild"), "--loader=css", "--minify-whitespace", "--log-level=warning"], input=css)
    log(f"css: {css_full} bytes, {len(css)} without spaces and comments, {sha(css.encode())}")
    css = css.replace("</style", "<\\/style")

    # fonts: the offline file asks Google Fonts (and falls back to system fonts offline);
    # the hosted site serves the same fonts itself, so no visitor IP address goes to Google
    google_fonts = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
                    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Schibsted+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" media="print" onload="this.media=\'all\'">\n')
    font_files = [("Inter", "inter", w) for w in (400, 500, 600, 700)] + [("Schibsted Grotesk", "schibsted-grotesk", w) for w in (500, 600, 700)] + [("IBM Plex Mono", "ibm-plex-mono", w) for w in (400, 500)]
    latin = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
    self_fonts = "<style>\n" + "".join(
        f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{w};font-display:swap;src:url(/fonts/{slug}-latin-{w}-normal.woff2) format('woff2');unicode-range:{latin}}}\n"
        for fam, slug, w in font_files) + "</style>\n"
    boot = ("<style>#cx-boot{min-height:100vh;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;"
            "font:500 16px/1.4 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#f4eee8;background:#141210;text-align:center}"
            "#cx-boot i{width:10px;height:10px;border-radius:50%;background:#ffd36b;animation:cxboot .9s ease-in-out infinite alternate}"
            "#cx-boot small{color:#b9b0a8;font-size:13px;font-weight:400}"
            "@keyframes cxboot{from{opacity:.35;transform:scale(.8)}to{opacity:1;transform:scale(1.15)}}"
            "@media (prefers-reduced-motion:reduce){#cx-boot i{animation:none}}</style>\n")

    # Spanish: the reviewed dictionary (i18n/es.json). The single file carries it inside the page; the hosted site serves it as a file
    # that is fetched only when someone chooses Español.
    i18n_path = os.path.join(ROOT, "i18n", "es.json")
    i18n = json.load(open(i18n_path, encoding="utf-8"))
    i18n_min = json.dumps(i18n, ensure_ascii=False, separators=(",", ":"))
    log(f"data   {sha(i18n_path)}  i18n/es.json  ({len(i18n['exact'])} exact, {len(i18n['masked'])} patterns, {len(i18n['keep'])} kept in English)")

    # Districts by address: the street index (data/districts-2026.json). The hosted site serves it as a file fetched only when someone
    # uses the finder; the single file carries it compressed inside the page and opens it with the browser's own decompressor.
    dist_path = os.path.join(ROOT, "data", "districts-2026.json")
    dist_min = json.dumps(json.load(open(dist_path, encoding="utf-8")), ensure_ascii=False, separators=(",", ":"))
    import gzip as _gzip, base64 as _b64
    dist_gz = _b64.b64encode(_gzip.compress(dist_min.encode("utf-8"), 9, mtime=0)).decode("ascii")
    log(f"data   {sha(dist_path)}  data/districts-2026.json  ({len(dist_min)} bytes; {len(dist_gz)} as base64 gzip inside the single file)")

    # Votes & actions on every city record (scripts/council_record.py, a pure function of data/): the hosted site serves it as a file fetched only
    # when a record or a person's list first needs it; the single file carries it in a block that is read only then.
    sys.path.insert(0, os.path.join(ROOT, "scripts"))
    import council_record
    rec = council_record.build_from_data()
    rec_min = json.dumps(rec, ensure_ascii=False, separators=(",", ":"))
    log(f"council record: {len(rec['files'])} files with dated actions, {len(rec['meetings'])} meetings, {len(rec['issues'])} City Record issues ({len(rec_min)} bytes)")

    def page(inline_assets, fonts):
        dist_tag = ('<script type="application/octet-stream" id="cx-districts-gz">' + dist_gz + '</script>\n') if inline_assets else ""
        dist_tag += ('<script type="application/json" id="cx-council-rec">' + rec_min.replace("<", "\\u003c") + '</script>\n') if inline_assets else ""
        i18n_tag = ('<script type="application/json" id="cx-i18n-es">' + i18n_min.replace("</", "<\\/") + '</script>\n') if inline_assets else ""
        icon = ('<link rel="icon" href="data:image/svg+xml,' + urllib.parse.quote(FAVICON_SVG) + '">\n') if inline_assets else ('<link rel="icon" type="image/svg+xml" href="/favicon.svg">\n<link rel="manifest" href="/manifest.webmanifest">\n'
                                                                                                                                                  '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="Civic Graph">\n<meta name="theme-color" content="#0c0c0e">\n')
        offline = "" if inline_assets else OFFLINE_NOTICE
        early = "" if inline_assets else f"<script>{EARLY_FETCH}</script>\n"
        return f"""<!doctype html>
<html lang="en" class="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cleveland Civic Graph</title>
<meta name="description" content="A question-led map of who decides what in Cleveland, in plain English, with public sources, visible gaps, What's new from Council's record, and a practice ballot.">
{icon}{fonts}{early}<style>
html,body{{margin:0;background:#141210;color:#f4eee8}}
</style>
{boot}</head>
<body class="antialiased">
<noscript><style>#cx-boot{{display:none}}</style><p style="padding:24px;font:16px system-ui">The Cleveland Civic Graph needs JavaScript to run. Every record in it links to a public source.</p></noscript>
<div id="root"><div id="cx-boot" role="status"><i aria-hidden="true"></i>Loading the Cleveland Civic Graph<small>Public records, in plain English</small></div></div>
{offline}<script>{BOOT_TIMEOUT}</script>
<style>
{css}
</style>
<script>{preamble(inline_assets)}</script>
{data_tag()}{i18n_tag}{dist_tag}<script>{js}</script>
</body>
</html>
"""

    html = page(True, google_fonts)
    out = os.path.join(DIST, "Cleveland-Civic-Graph-v5.html")
    write(out, html)
    log(f"OUTPUT {sha(out)}  {os.path.basename(out)}  {os.path.getsize(out)} bytes")
    # Artifact variant: the host supplies the document skeleton, so ship content only
    body = html.split("<body class=\"antialiased\">", 1)[1].rsplit("</body>", 1)[0]
    head = html.split("<head>", 1)[1].split("</head>", 1)[0]
    head = head.replace('<meta charset="utf-8">\n', "").replace('<meta name="viewport" content="width=device-width,initial-scale=1">\n', "")
    art = os.path.join(DIST, "Cleveland-Civic-Graph-v5.artifact.html")
    write(art, head.lstrip() + "<div class=\"antialiased\">" + body + "</div>\n")
    log(f"ARTIFACT {sha(art)}  {os.path.basename(art)}  {os.path.getsize(art)} bytes")
    # Hosted site (Vercel serves site/): same app, assets and fonts as separate cacheable files
    shutil.rmtree(SITE, ignore_errors=True)
    for folder in ("portraits", "records", "fonts"):
        os.makedirs(os.path.join(SITE, folder))
    for k in assets:
        shutil.copy(os.path.join(client, k.lstrip("/")), os.path.join(SITE, k.lstrip("/")))
    # portraits of the people in the federal record (data/portraits-us, written by scripts/fetch_portraits.py): hosted site only, a few KB each
    pdir = os.path.join(ROOT, "data", "portraits-us")
    if os.path.isdir(pdir):
        os.makedirs(os.path.join(SITE, "portraits", "us"), exist_ok=True)
        names = sorted(f for f in os.listdir(pdir) if f.endswith(".webp"))
        h = hashlib.sha256()
        for f in names:
            raw = open(os.path.join(pdir, f), "rb").read()
            h.update(f.encode() + raw)
            open(os.path.join(SITE, "portraits", "us", f), "wb").write(raw)
        log(f"SITE   {h.hexdigest()}  site/portraits/us/  ({len(names)} portraits of people in the federal record)")
    for fam, slug, w in font_files:
        shutil.copy(os.path.join(ROOT, "node_modules", "@fontsource", slug, "files", f"{slug}-latin-{w}-normal.woff2"), os.path.join(SITE, "fonts"))
    site_html = with_csp(page(False, self_fonts))
    write(os.path.join(SITE, "index.html"), site_html)
    write(os.path.join(SITE, "sw.js"), SERVICE_WORKER.replace("__ID__", sha(site_html.encode())[:12]))
    log(f"SITE   {sha(os.path.join(SITE, 'sw.js'))}  site/sw.js  (service worker for the hosted site)")
    write(os.path.join(SITE, "404.html"), NOT_FOUND)

    # v5.16 Bench (stage 8): the approved records, the review status, and the correction history, as small files the app fetches
    os.makedirs(os.path.join(SITE, "bench"), exist_ok=True)
    # v5.16 United States graph data: not embedded (about half a megabyte); the hosted page fetches it
    os.makedirs(os.path.join(SITE, "us"), exist_ok=True)
    # the hosted copies of the larger records are written without the indentation, so a phone reads fewer bytes (same values)
    us_body = json.dumps(json.load(open(os.path.join(ROOT, "data", "us-landscape-2026.json"), encoding="utf-8")), ensure_ascii=False, separators=(",", ":")) + "\n"
    write(os.path.join(SITE, "us", "landscape-2026.json"), us_body)
    log(f"SITE   {sha(us_body.encode())}  site/us/landscape-2026.json")
    # the settled United States graph (scripts/us_map.js): the same physics and seed the page uses, run once here so every device opens the same map at once
    run(["node", os.path.join(ROOT, "scripts", "us_map.js"), os.path.join(ROOT, "data", "us-landscape-2026.json"), os.path.join(SITE, "us", "map-2026.json")])
    log(f"SITE   {sha(os.path.join(SITE, 'us', 'map-2026.json'))}  site/us/map-2026.json  (where each node of the United States graph settles)")
    # what each committee and subcommittee does, and what the committee roles mean: the official words (data/us-explainers-2026.json) and our two
    # lines for each (ext/cx-us-text.jsx), fetched only when a committee, a subcommittee, a role's official words, or a text view first needs them
    keep_row = ("kind", "parent", "chamber", "name", "congress", "text", "note", "checked", "cite", "url", "pulled", "rule_note")
    ex_site = {"congress": ex["congress"], "updated": ex["updated"],
               "committees": {k: {f: r[f] for f in keep_row if f in r} for k, r in ex["committees"].items()},
               "roles": ex["roles"], "process": ex["process"], "sources": {k: {"name": v["name"], "url": v["url"]} for k, v in ex["sources"].items()},
               "lines": us_lines}
    ex_body = json.dumps(ex_site, ensure_ascii=False, separators=(",", ":")) + "\n"
    write(os.path.join(SITE, "us", "explainers-2026.json"), ex_body)
    log(f"SITE   {sha(ex_body.encode())}  site/us/explainers-2026.json  (official words and our two lines for {len(us_lines)} committees and subcommittees)")
    # "how you line up", step 2: the sample questions, fetched only when step 2 is on and opens (never on the first load, never while it is hidden)
    al_body = json.dumps(align_q, ensure_ascii=False, separators=(",", ":")) + "\n"
    write(os.path.join(SITE, "us", "align-2026.json"), al_body)
    log(f"SITE   {sha(al_body.encode())}  site/us/align-2026.json  ({len(align_q['questions'])} sample questions for step 2 of how you line up)")
    mp = os.path.join(ROOT, "data", "meetings-2026.json")  # At City Hall: the Clerk's meeting record, fetched lazily on the hosted site
    if os.path.exists(mp):
        os.makedirs(os.path.join(SITE, "meetings"), exist_ok=True)
        meet_body = json.dumps(json.load(open(mp, encoding="utf-8")), ensure_ascii=False, separators=(",", ":")) + "\n"
        write(os.path.join(SITE, "meetings", "meetings-2026.json"), meet_body)
        log(f"SITE   {sha(meet_body.encode())}  site/meetings/meetings-2026.json")
    vp = os.path.join(ROOT, "data", "us-votes-2026.json")  # D4: how members voted; fetched by Your members only
    if os.path.exists(vp):
        votes_body = open(vp, encoding="utf-8").read()
        write(os.path.join(SITE, "us", "votes-2026.json"), votes_body)
        log(f"SITE   {sha(votes_body.encode())}  site/us/votes-2026.json")
    for name, src_rel, empty in (("public-2026.json", "bench/approved/public-2026.json", {"about": "No record has been approved yet.", "count": 0, "records": {}}),
                                 ("status-2026.json", "bench/status-2026.json", None),
                                 ("corrections-2026.json", "bench/approved/corrections-2026.json", {"about": "No correction has been recorded yet.", "count": 0, "corrections": []})):
        sp = os.path.join(ROOT, *src_rel.split("/"))
        if os.path.exists(sp):
            body = open(sp, encoding="utf-8").read()
        elif empty is not None:
            body = json.dumps(empty) + "\n"
        else:
            continue
        write(os.path.join(SITE, "bench", name), body)
        log(f"SITE   {sha(body.encode())}  site/bench/{name}")
    os.makedirs(os.path.join(SITE, "council"), exist_ok=True)
    write(os.path.join(SITE, "council", "record-2026.json"), rec_min + "\n")
    log(f"SITE   {sha((rec_min + chr(10)).encode())}  site/council/record-2026.json  (dated actions on each city record, fetched when a record or a list first needs them)")
    os.makedirs(os.path.join(SITE, "i18n"), exist_ok=True)
    write(os.path.join(SITE, "i18n", "es.json"), i18n_min + "\n")
    os.makedirs(os.path.join(SITE, "districts"), exist_ok=True)
    write(os.path.join(SITE, "districts", "districts-2026.json"), dist_min + "\n")
    log(f"SITE   {sha((dist_min + chr(10)).encode())}  site/districts/districts-2026.json")
    log(f"SITE   {sha((i18n_min + chr(10)).encode())}  site/i18n/es.json")
    write(os.path.join(SITE, "favicon.svg"), FAVICON_SVG + "\n")
    # installable on a phone's Home Screen (the hosted site only): on an iPhone, Safari clears a website's saved data after about a week away unless the site is on the Home Screen
    write(os.path.join(SITE, "manifest.webmanifest"), json.dumps({"name": "Cleveland Civic Graph", "short_name": "Civic Graph", "description": "A plain-English map of who decides what in Cleveland.", "start_url": "/", "display": "standalone",
                                                                  "background_color": "#0c0c0e", "theme_color": "#0c0c0e", "icons": [{"src": "/favicon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any"}]}, indent=1) + "\n")
    log(f"SITE   {sha(os.path.join(SITE, '404.html'))}  site/404.html  (page not found)")
    site_bytes = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(SITE) for f in fs)
    log(f"SITE   {sha(os.path.join(SITE, 'index.html'))}  site/index.html  {os.path.getsize(os.path.join(SITE, 'index.html'))} bytes "
        f"(+ {len(assets)} assets and {len(font_files)} fonts as files; {site_bytes} bytes in site/)")
    if drift:
        write(os.path.join(DIST, "review-needed.json"), json.dumps({"summaries_to_recheck": drift,
              "how": "Read each summary in ext/cx-reasons.jsx against data/reasons-2026.json, fix it if needed, then run: python3 build.py --mark-reviewed <files>"}, indent=1) + "\n")
    write(os.path.join(DIST, "build-log.txt"), "\n".join(LOG) + "\n")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--mark-reviewed":
        mark_reviewed(sys.argv[2:])
    elif len(sys.argv) > 1 and sys.argv[1] == "--mark-levies-reviewed":
        mark_levies_reviewed(" ".join(sys.argv[2:]))
    elif len(sys.argv) > 1 and sys.argv[1] == "--mark-office-reviewed":
        mark_office_reviewed(" ".join(sys.argv[2:]))
    elif len(sys.argv) > 1 and sys.argv[1] == "--mark-us-text-reviewed":
        mark_us_text_reviewed(" ".join(sys.argv[2:]))
    elif len(sys.argv) > 1 and sys.argv[1] == "--mark-alignment-reviewed":
        mark_alignment_reviewed(" ".join(sys.argv[2:]))
    elif len(sys.argv) > 1 and sys.argv[1] == "--mark-privacy-reviewed":
        mark_privacy_reviewed(" ".join(sys.argv[2:]))
    elif len(sys.argv) > 1 and sys.argv[1] == "--mark-votes-text-reviewed":
        mark_votes_text_reviewed(" ".join(sys.argv[2:]))
    else:
        main()
