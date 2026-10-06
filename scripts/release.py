#!/usr/bin/env python3
"""One command for what "shipped" means (docs/ROADMAP.md).

  python scripts/release.py              verify everything locally and say whether it is ready to push
  python scripts/release.py --push       verify, push, wait for Vercel, and confirm the live page matches
  python scripts/release.py --skip-checks   leave out the browser checks (they take about two minutes)
  python scripts/release.py --fresh      ignore the saved pass and run every step again

Steps, in this order. It stops at the first one that fails.
Steps 2 to 4 are skipped when this exact input already passed them today (see "The saved pass" below).
  1. Pull first: fetch, and fast-forward if the nightly job committed. A diverged branch stops here.
  2. Build twice from clean and require the same hash both times.
  3. Run the unit tests and the data safety check.
  4. Run the browser checks and the accessibility audit (scripts/checks/run.js).
  5. Require that the committed site/ is exactly what the build produced.
  6. Write the new hashes into STATE-OF-BUILD.md, from dist/build-log.txt.
With --push:
  7. Push, wait for the Vercel Production deployment of this commit, then fetch the live page and
     require its hash to equal site/index.html, and require a wrong address to answer 404.
The saved pass: when steps 2 to 4 pass in full (checks included), a stamp is saved inside .git (never committed). It holds a hash of
everything the result depends on (source, data, dictionary, design, tests, checks) and today's date. The next run with the same hash
on the same day, and the same built site on disk, skips the builds, tests, and browser checks, because nothing could have changed their
answer. Any edit, any new nightly data, a new day, or --fresh runs everything. The push step is never skipped.
It never commits for you: the commit message says what changed for a resident, so a person writes it.
Needs git, python, node, and (for --push) the GitHub CLI signed in.
"""
import hashlib, os, re, shutil, subprocess, sys, time, urllib.request, urllib.error

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
REPO = "brent-Equalpoint/CivicGraphCleveland"
LIVE = "https://clecivic.vercel.app"
PUSH = "--push" in sys.argv
CHECKS = "--skip-checks" not in sys.argv


def run(cmd, **kw):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", **kw)
    return r.returncode, (r.stdout + r.stderr).strip()


def step(n, text):
    print(f"\n[{n}] {text}")


def fail(msg):
    print(f"\nSTOPPED: {msg}")
    sys.exit(1)


def gh():
    for c in (shutil.which("gh"), r"C:\Program Files\GitHub CLI\gh.exe", "/usr/bin/gh"):
        if c and os.path.exists(c):
            return c
    return None


def build_hashes():
    rc, out = run([sys.executable, "build.py"])
    if rc:
        fail("build failed:\n" + out[-800:])
    log = open(os.path.join(ROOT, "dist", "build-log.txt"), encoding="utf-8").read()
    one = re.search(r"^OUTPUT ([0-9a-f]{64})\s+\S+\s+(\d+) bytes", log, re.M)
    idx = re.search(r"^SITE\s+([0-9a-f]{64})\s+site/index\.html\s+(\d+) bytes", log, re.M)
    nf = re.search(r"^SITE\s+([0-9a-f]{64})\s+site/404\.html", log, re.M)
    if not (one and idx and nf):
        fail("could not read the hashes from dist/build-log.txt")
    return {"single": one.group(1), "single_bytes": int(one.group(2)), "index": idx.group(1), "index_bytes": int(idx.group(2)), "404": nf.group(1)}


# what steps 2 to 4 depend on. Built outputs (site, dist, build) and files the run itself rewrites are left out.
STAMP_PATHS = ["ext", "build.py", "bento.py", "light.py", "data", "bench", "i18n", "design", "scripts", "package.json", "package-lock.json", "docs/design-system.md", "inputs"]
STAMP_SKIP = ("i18n/work/crawl-es.json", "/__pycache__/", ".pyc")


def inputs_key():
    rc, out = run(["git", "ls-files", "-co", "--exclude-standard", "--"] + STAMP_PATHS)
    h = hashlib.sha256()
    for f in sorted(x for x in out.splitlines() if x and not any(k in "/" + x for k in STAMP_SKIP)):
        fp = os.path.join(ROOT, f)
        if not os.path.isfile(fp):
            continue
        h.update(f.encode() + b"\0" + hashlib.sha256(open(fp, "rb").read()).digest())
    h.update(time.strftime("%Y-%m-%d").encode())
    return h.hexdigest()


def stamp_path():
    rc, out = run(["git", "rev-parse", "--git-dir"])
    return os.path.join(ROOT, out.strip(), "release-verified.json")


def read_stamp(key):
    try:
        import json
        d = json.load(open(stamp_path(), encoding="utf-8"))
        site = hashlib.sha256(open(os.path.join(ROOT, "site", "index.html"), "rb").read()).hexdigest()
        if d.get("key") == key and d.get("hashes", {}).get("index") == site and d.get("checks"):
            return d
    except Exception:
        pass
    return None


def main():
    step(1, "Pull first")
    run(["git", "fetch", "-q"])
    rc, st = run(["git", "status", "-sb"])
    head = st.splitlines()[0]
    print("  " + head)
    if "behind" in head:
        if "ahead" in head:
            fail("local and GitHub have both moved. Merge by hand, then run this again.")
        rc, out = run(["git", "pull", "--ff-only", "-q"])
        if rc:
            fail("pull failed:\n" + out)
        print("  pulled the nightly commit")

    key = inputs_key()
    saved = None if "--fresh" in sys.argv or not CHECKS else read_stamp(key)
    if saved:
        a = saved["hashes"]
        print(f"\n[2-4] Already verified: these exact inputs passed the builds, unit tests, and browser checks today ({saved['when']}).")
        print(f"  site/index.html {a['index'][:16]}... Skipping to step 5. Use --fresh to run them again.")
    else:
        a = verify(key)

    step(5, "The committed site is what the build produced")
    rc, out = run(["git", "status", "--short", "--", "site", "ext", "build.py", "data", "bench"])
    if out:
        print("  uncommitted changes in the built inputs or outputs:\n    " + out.replace("\n", "\n    "))
        fail("commit these (with a one-line message about what changed for a resident), then run this again. The passes above are saved, so the next run skips them.")
    print("  clean")
    finish(a)


def verify(key):
    step(2, "Build twice from clean and compare")
    a = build_hashes()
    b = build_hashes()
    if a != b:
        fail(f"two clean builds differ:\n  {a}\n  {b}")
    print(f"  identical: single file {a['single'][:16]}..., site/index.html {a['index'][:16]}...")

    step(3, "Unit tests and data safety check")
    for cmd in ([sys.executable, "scripts/test_bench.py"], [sys.executable, "scripts/test_bench_gate.py"], [sys.executable, "scripts/test_links.py"], [sys.executable, "scripts/test_us.py"], ["node", "scripts/test_us_model.js"], ["node", "scripts/test_us_map.js"], ["node", "scripts/test_alignment.js"], [sys.executable, "scripts/test_privacy.py"], [sys.executable, "scripts/test_meetings.py"], [sys.executable, "scripts/test_us_explainers.py"], ["node", "scripts/test_meetings.js"], [sys.executable, "scripts/test_votes.py"], [sys.executable, "scripts/test_cityrecord.py"], [sys.executable, "scripts/test_votes_actions.py"], ["node", "scripts/test_headline.js"], ["node", "scripts/test_districts.js"], [sys.executable, "scripts/test_districts.py"], ["node", "scripts/test_design.js"], [sys.executable, "scripts/test_i18n.py"], [sys.executable, "scripts/refresh.py", "--check"]):
        rc, out = run(cmd)
        print(f"  {'ok  ' if rc == 0 else 'FAIL'} {' '.join(cmd[1:])}")
        if rc:
            fail(out[-1200:])

    if CHECKS:
        step(4, "Browser checks and accessibility audit")
        rc, out = run(["node", "scripts/checks/run.js"])
        print("  " + out.splitlines()[-1] if out else "")
        if rc:
            fail(out[-2500:])
        # the light look: the layout, contrast, and color-vision checks again with light mode on, in both styles
        light = ",".join(["axe", "no-bleed", "text-overlap", "story-fit", "color-vision", "targets", "titles-never-cut", "print"])
        for style in ("bento", "original"):
            rc, out = run(["node", "scripts/checks/run.js", "--only", light], env=dict(os.environ, CHECK_MODE="light", CHECK_THEME=style))
            print(f"  light mode, {style}: " + (out.splitlines()[-1] if out else ""))
            if rc:
                fail(out[-2500:])
        import json
        # saved only when everything ran, and only if the inputs did not change while it ran
        if inputs_key() == key:
            json.dump({"key": key, "hashes": a, "checks": True, "when": time.strftime("%Y-%m-%d %H:%M")}, open(stamp_path(), "w", encoding="utf-8"))
            print("  saved this pass (inside .git). The next run on the same inputs today skips steps 2 to 4.")
    else:
        step(4, "Browser checks SKIPPED (--skip-checks)")
    return a


def finish(a):
    step(6, "STATE-OF-BUILD.md hashes")
    p = os.path.join(ROOT, "STATE-OF-BUILD.md")
    s = open(p, encoding="utf-8").read()
    s2 = re.sub(r"SHA-256  [0-9a-f]{64}\nSize     [\d,]+ bytes", f"SHA-256  {a['single']}\nSize     {a['single_bytes']:,} bytes", s, count=1)
    s2 = re.sub(r"`index\.html` SHA-256 `[0-9a-f]{64}`, [\d,]+ bytes, plus `404\.html` SHA-256 `[0-9a-f]{64}`",
                f"`index.html` SHA-256 `{a['index']}`, {a['index_bytes']:,} bytes, plus `404.html` SHA-256 `{a['404']}`", s2, count=1)
    if s2 != s:
        open(p, "w", encoding="utf-8", newline="\n").write(s2)
        print("  updated. Commit it: STATE-OF-BUILD.md now names this build.")
    else:
        print("  already current")

    if not PUSH:
        print("\nREADY. Everything above passed. Run with --push to ship.")
        return

    step(7, "Push and verify the live site")
    rc, out = run(["git", "push"])
    if rc:
        fail("push failed:\n" + out)
    sha = run(["git", "rev-parse", "HEAD"])[1][:7]
    g = gh()
    if not g:
        fail("pushed, but the GitHub CLI is not installed, so the deploy cannot be confirmed. Check Vercel by hand.")
    ok = False
    for i in range(18):
        time.sleep(20)
        rc, out = run([g, "api", f"repos/{REPO}/deployments", "--jq", ".[0] | [.id, .sha[0:7]] | @tsv"])
        if rc or not out:
            continue
        dep_id, dep_sha = out.split("\t")
        rc, state = run([g, "api", f"repos/{REPO}/deployments/{dep_id}/statuses", "--jq", ".[0].state"])
        print(f"  try {i + 1}: deployment {dep_sha} {state}")
        if dep_sha == sha and state == "success":
            ok = True
            break
        if dep_sha == sha and state in ("failure", "error"):
            fail(f"Vercel reports {state} for {sha}")
    if not ok:
        fail("the deployment did not report success in six minutes")
    body = urllib.request.urlopen(urllib.request.Request(LIVE + "/", headers={"User-Agent": "release.py"}), timeout=30).read()
    live = hashlib.sha256(body).hexdigest()
    built = hashlib.sha256(open(os.path.join(ROOT, "site", "index.html"), "rb").read()).hexdigest()
    if live != built:
        fail(f"live page differs from the build:\n  live  {live}\n  built {built}")
    try:
        urllib.request.urlopen(urllib.request.Request(LIVE + "/nothing-here", headers={"User-Agent": "release.py"}), timeout=30)
        fail("a wrong address did not answer 404")
    except urllib.error.HTTPError as e:
        if e.code != 404:
            fail(f"a wrong address answered {e.code}, not 404")
    print(f"\nSHIPPED. {LIVE} serves {built[:16]}..., commit {sha}.")


if __name__ == "__main__":
    main()
