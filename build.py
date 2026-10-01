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
               '<g fill="#d9541f"><circle cx="32" cy="20" r="8"/><circle cx="18" cy="42" r="8"/><circle cx="46" cy="42" r="8"/></g></svg>')

# v5.16: hosted site only. The single file is built to work offline, so it never shows this.
OFFLINE_NOTICE = ('<div id="cx-offline" role="status" hidden>You appear to be offline. You can keep reading what is already open. '
                  'New records will show up when you reconnect.</div>\n'
                  '<style>#cx-offline{position:fixed;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));z-index:99999;max-width:560px;margin:0 auto;'
                  'padding:14px 16px;border-radius:14px;background:#ffd36b;color:#141210;font:600 16px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;'
                  'box-shadow:0 6px 24px #0008}#cx-offline[hidden]{display:none}</style>\n'
                  '<script>(function(){var n=document.getElementById("cx-offline");function u(){n.hidden=navigator.onLine!==false;}'
                  'addEventListener("offline",u);addEventListener("online",u);u();})();</script>\n')

# v5.16: if the app has not drawn after 12 seconds (old browser, blocked script, very slow connection) say so in plain words
BOOT_TIMEOUT = ("setTimeout(function(){var b=document.getElementById('cx-boot');if(!b)return;"
                "b.innerHTML='This is taking longer than usual.<small>Your connection may be slow, or your browser may be out of date. "
                "Try again, or open this page in a newer browser.</small>"
                "<button type=\"button\" onclick=\"location.reload()\" style=\"margin-top:10px;min-height:48px;padding:0 22px;border:0;border-radius:12px;"
                "background:#d9541f;color:#fff;font:600 17px system-ui,sans-serif;cursor:pointer\">Try again</button>';},12000);")

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
a.main{background:#d9541f;border-color:#d9541f;color:#fff}
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
    ext_js = "\n/* ---- data/legistar-2026.json ---- */\nconst CX_LEG = " + json.dumps(
        {k: leg[k] for k in ("source", "retrieved_at", "count")} | {"matters": [
            {k: m[k] for k in ("id", "file", "type", "status", "title", "intro", "passed", "url", "sponsors")} for m in leg["matters"]]},
        ensure_ascii=False, separators=(",", ":")) + ";\n"
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
    ext_js += "/* ---- data/changes-2026.json (What's new) ---- */\nconst CX_UPDATES = " + json.dumps(
        {"updated": leg["retrieved_at"], "log": ups}, ensure_ascii=False, separators=(",", ":")) + ";\n"
    # v5.13 "Who decides here?": ward maps as SVG paths + decision paths/addresses/ward money
    geo_path, pl_path = os.path.join(ROOT, "data", "geo-2026.json"), os.path.join(ROOT, "data", "place-2026.json")
    geo, pl = json.load(open(geo_path, encoding="utf-8")), json.load(open(pl_path, encoding="utf-8"))
    log(f"data   {sha(geo_path)}  geo-2026.json  (retrieved {geo['retrieved_at']})")
    log(f"data   {sha(pl_path)}  place-2026.json  ({len(pl['histories'])} histories, {len(pl['addresses'])} addresses, {len(pl['funds'])} ward-money items, retrieved {pl['retrieved_at']})")
    ext_js += "\n/* ---- data/geo-2026.json (as SVG) ---- */\nconst CX_GEO = " + json.dumps(geo_svg(geo), separators=(",", ":")) + ";\n"
    ext_js += "/* ---- data/place-2026.json ---- */\nconst CX_PL = " + json.dumps(
        {"retrieved": pl["retrieved_at"], "histories": pl["histories"], "addresses": pl["addresses"],
         "funds": {f: {k: r.get(k) for k in ("file", "text_url", "amounts", "limit", "wards")} for f, r in pl["funds"].items()}},
        ensure_ascii=False, separators=(",", ":")) + ";\n"
    # v5.14 phone app: cxm-*.jsx reuse the same data and helpers as the desktop app
    for name in ("cx-data.jsx", "cx-ui.jsx", "cx-leaders.jsx", "cx-reasons.jsx", "cx-place.jsx", "cx-live.jsx", "cx-story.jsx",
                 "cxm-core.jsx", "cxm-today.jsx", "cxm-explore.jsx", "cxm-place.jsx", "cxm-people.jsx", "cxm-ballot.jsx", "cxm-more.jsx", "cxm-live.jsx"):
        out = run([tool("esbuild"), os.path.join(EXT, name), "--loader:.jsx=jsx",
                   "--jsx-factory=u.createElement", "--jsx-fragment=u.Fragment", "--target=es2020"])
        ext_js += f"\n/* ---- {name} ---- */\n" + out
    log(f"extension compiled: {len(ext_js)} bytes")

    # 4. patches
    log("Applying patches:")
    src = patch(src, "export { Qh as default };", "export { CX_Root as default };", label="phone app: root switch")
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
                "                  (0, W.jsx)(`span`, { className: `cx-sidebar-label`, children: `CIVIC INTELLIGENCE` }),\n"
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

    src = patch(src,
                "            className: `atlas-header-actions`,\n            children: [\n",
                "            className: `atlas-header-actions`,\n            children: [\n              (0, W.jsx)(CX_FreshChip, {}),\n              (0, W.jsx)(CX_ThemeSwitch, {}),\n",
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
            "})();"
        )

    base_css = "\n".join(open(p, encoding="utf-8").read() for p in (css_a, css_b, os.path.join(EXT, "cx.css")))
    import bento
    bento_css, bento_rules = bento.bento_layer(base_css)
    log(f"bento layer: {bento_rules} color rules remapped, {len(bento_css)} bytes, {sha(bento_css.encode())}")
    css = base_css + "\n/* ---- Bento Blue layer (generated by bento.py) ---- */\n" + bento_css + "\n" + open(os.path.join(EXT, "cx-bento.css"), encoding="utf-8").read()
    css += "\n/* ---- v5.14 phone app (ext/cxm.css, outside the bento remap) ---- */\n" + open(os.path.join(EXT, "cxm.css"), encoding="utf-8").read()
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

    def page(inline_assets, fonts):
        icon = ('<link rel="icon" href="data:image/svg+xml,' + urllib.parse.quote(FAVICON_SVG) + '">\n') if inline_assets else '<link rel="icon" type="image/svg+xml" href="/favicon.svg">\n'
        offline = "" if inline_assets else OFFLINE_NOTICE
        return f"""<!doctype html>
<html lang="en" class="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cleveland Civic Graph</title>
<meta name="description" content="A question-led map of who decides what in Cleveland, in plain English, with public sources, visible gaps, What's new from Council's record, and a practice ballot.">
{icon}{fonts}<style>
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
<script>{js}</script>
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
    for fam, slug, w in font_files:
        shutil.copy(os.path.join(ROOT, "node_modules", "@fontsource", slug, "files", f"{slug}-latin-{w}-normal.woff2"), os.path.join(SITE, "fonts"))
    site_html = page(False, self_fonts)
    write(os.path.join(SITE, "index.html"), site_html)
    write(os.path.join(SITE, "404.html"), NOT_FOUND)
    write(os.path.join(SITE, "favicon.svg"), FAVICON_SVG + "\n")
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
    else:
        main()
