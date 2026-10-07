#!/usr/bin/env python3
"""One command for what "shipped" means (docs/ROADMAP.md).

  python scripts/release.py                  the full gate: verify everything locally and say whether it is ready to push
  python scripts/release.py --push           the full gate, then push, wait for Vercel, and confirm the live page matches
  python scripts/release.py --fast [--push]  the fast lane, for a change the reviewer reads on the live site himself (see below)
  python scripts/release.py --no-push        never push, even with --push: a dry run of either lane
  python scripts/release.py --fresh          ignore the saved pass and run every step again (with --fast, light mode runs too)
  python scripts/release.py --jobs N         run N browser checks at a time (default: min(4, half the processors), or CHECK_JOBS)
  python scripts/release.py --skip-checks    leave out the browser checks (full gate only; such a run is never saved as a pass)

Steps, in this order. It stops at the first one that fails, and says how long each step took.
Steps 2 to 4 are skipped when this exact input already passed them today (see "The saved pass" below).
  1. Pull first: fetch, and fast-forward if the nightly job committed. A diverged branch stops here.
     With --fast: read what changed since the last release (origin/main) and plan the checks, or refuse and say why.
  2. Build twice from clean and require the same hash both times.
  3. Run the unit tests and the data safety check, side by side.
  4. Run the browser checks and the accessibility audit (scripts/checks/run.js, several at a time): every check, and the light-mode
     checks in Bento and in Original, in one pool. With --fast: the checks in the plan.
  5. Require that the committed site/ is exactly what the build produced.
  6. Write the new hashes into STATE-OF-BUILD.md, from dist/build-log.txt.
With --push:
  7. Push, wait for the Vercel Production deployment of this commit, then fetch the live page and
     require its hash to equal site/index.html, and require a wrong address to answer 404.
     With --fast: then find the full gate the push started on GitHub (the Checks workflow) and print where to watch it.

The fast lane (--fast) is for changes Brent reviews on the live site himself: copy, small UI and CSS tweaks, interpretive text with its
notice, a data refresh, docs. Never skipped, in any lane: the two clean builds with matching hashes, every unit test and refresh.py --check,
the committed-site check, and the browser checks security-policy, privacy-policy, remember-place, districts, shell, offline-shell, and
update-wins (scripts/checks/lists.js). Beyond those it runs only the checks the change can affect, light mode only when the look can have
changed, and Spanish when i18n/ changed (scripts/checks/changed.js says how). It refuses, and says why, when the change touches build.py
(the compiled app's patches and the Content-Security-Policy), refresh.py or a fetcher, design/tokens.json, the Spanish pipeline,
vercel.json, a privacy or storage path, the gate or the workflows themselves, or the packages, or when more than 25 files changed
(site/, docs, and photos not counted). Then run the full gate. After a fast push the full gate runs on GitHub as the safety net
(.github/workflows/checks.yml): if anything fails there, the commit is marked red and an issue names the failing checks.

The saved pass: when steps 2 to 4 pass (checks included), a stamp is saved inside .git (never committed). It holds a hash of
everything the result depends on (source, data, dictionary, design, tests, checks), today's date, and the lane. The next run with the
same hash on the same day, and the same built site on disk, skips the builds, tests, and browser checks, because nothing could have
changed their answer. A full pass also stands for --fast; a fast pass never stands for the full gate. Any edit, any new nightly data,
a new day, or --fresh runs everything. The push step is never skipped.
It never commits for you: the commit message says what changed for a resident, so a person writes it.
Needs git, python, node, and (for --push) the GitHub CLI signed in.
"""
import concurrent.futures, hashlib, json, os, re, shutil, subprocess, sys, time, urllib.request, urllib.error

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
REPO = "brent-Equalpoint/CivicGraphCleveland"
LIVE = "https://clecivic.vercel.app"
NO_PUSH = "--no-push" in sys.argv
PUSH = "--push" in sys.argv and not NO_PUSH
CHECKS = "--skip-checks" not in sys.argv
FAST = "--fast" in sys.argv
FRESH = "--fresh" in sys.argv
LANE = "fast" if FAST else "full"
T0 = time.time()
_step = {"n": None, "t": T0}


def arg(flag):
    i = sys.argv.index(flag) if flag in sys.argv else -1
    return sys.argv[i + 1] if 0 <= i < len(sys.argv) - 1 and not sys.argv[i + 1].startswith("--") else None


JOBS = arg("--jobs")


def run(cmd, **kw):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", **kw)
    return r.returncode, (r.stdout + r.stderr).strip()


def clock(s):
    return f"{int(s // 60)}m {int(round(s % 60)):02d}s" if s >= 60 else f"{s:.1f}s"


def step(n, text):
    took()
    _step.update(n=n, t=time.time())
    print(f"\n[{n}] {text}", flush=True)


def took():
    if _step["n"] is not None and time.time() - _step["t"] >= 1:
        print(f"  (step {_step['n']} took {clock(time.time() - _step['t'])})", flush=True)
    _step["n"] = None


def fail(msg):
    took()
    print(f"\nSTOPPED: {msg}\n(after {clock(time.time() - T0)})")
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


# every unit test, and the data safety check (the Checks workflow runs the same list)
UNIT = [[sys.executable, "scripts/test_bench.py"], [sys.executable, "scripts/test_bench_gate.py"], [sys.executable, "scripts/test_links.py"], [sys.executable, "scripts/test_us.py"],
        ["node", "scripts/test_us_model.js"], ["node", "scripts/test_us_map.js"], ["node", "scripts/test_alignment.js"], [sys.executable, "scripts/test_privacy.py"],
        [sys.executable, "scripts/test_meetings.py"], [sys.executable, "scripts/test_us_explainers.py"], ["node", "scripts/test_meetings.js"], [sys.executable, "scripts/test_votes.py"],
        [sys.executable, "scripts/test_cityrecord.py"], [sys.executable, "scripts/test_votes_actions.py"], [sys.executable, "scripts/test_offices.py"], ["node", "scripts/test_offices.js"], [sys.executable, "scripts/test_aliases.py"], ["node", "scripts/test_aliases.js"], ["node", "scripts/test_place_split.js"], [sys.executable, "scripts/test_records.py"], ["node", "scripts/test_headline.js"], ["node", "scripts/test_districts.js"],
        [sys.executable, "scripts/test_districts.py"], ["node", "scripts/test_design.js"], [sys.executable, "scripts/test_i18n.py"], ["node", "scripts/test_release_plan.js"],
        [sys.executable, "scripts/refresh.py", "--check"]]

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


def covers(saved, plan):
    """a saved fast pass stands only for a plan it ran in full"""
    return bool(saved) and all(set(plan[k]) <= set(saved.get(k, [])) for k in ("checks", "light", "spanish"))


def read_stamp(key, plan):
    try:
        d = json.load(open(stamp_path(), encoding="utf-8"))
        site = hashlib.sha256(open(os.path.join(ROOT, "site", "index.html"), "rb").read()).hexdigest()
        if d.get("key") != key or d.get("hashes", {}).get("index") != site or not d.get("checks"):
            return None
        lane = d.get("lane", "full")   # a stamp from before the fast lane was a full pass
        if lane == "full" or (plan and covers(d.get("plan"), plan)):
            return d
    except Exception:
        pass
    return None


def release_base():
    """the last release: where this branch meets GitHub's (origin/main unless the branch follows another)"""
    for ref in ("@{upstream}", "origin/main"):
        rc, out = run(["git", "merge-base", "HEAD", ref])
        if rc == 0 and re.fullmatch(r"[0-9a-f]{40}", out.strip()):
            return out.strip()
    return None


def safety_net_last():
    """the last full gate on GitHub for main, if the GitHub CLI can say"""
    g = gh()
    if not g:
        return None
    try:
        r = subprocess.run([g, "run", "list", "--repo", REPO, "--workflow", "checks.yml", "--branch", "main", "--event", "push", "--limit", "6",
                            "--json", "status,conclusion,headSha,url"], cwd=ROOT, capture_output=True, text=True, timeout=30)
        runs = json.loads(r.stdout or "[]")
    except Exception:
        return None
    done = [x for x in runs if x.get("status") == "completed" and x.get("conclusion") in ("success", "failure")]
    return done[0] if done else None


def fast_plan():
    base = release_base()
    if not base:
        fail("the fast lane compares with the last release (origin/main), and git cannot find it here. Run the full gate: python scripts/release.py")
    r = subprocess.run(["node", "scripts/checks/changed.js", "--release", "--since", base] + (["--fresh"] if FRESH else []), cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    try:
        plan = json.loads(r.stdout) if r.returncode == 0 else None
    except ValueError:
        plan = None
    if not plan:
        fail("could not work out what changed since the last release:\n" + (r.stdout + r.stderr)[-1200:])
    print(f"  since the last release ({base[:7]}): {len(plan['changed'])} changed file{'' if len(plan['changed']) == 1 else 's'} ({plan['counted']} counted, at most {plan['max']})")
    if not plan["ok"]:
        print("  The fast lane cannot take this change:")
        for r in plan["refuse"]:
            print("    - " + r)
        fail("run the full gate instead: python scripts/release.py" + (" --push" if "--push" in sys.argv else ""))
    for n in plan["notes"][:6]:
        print("  " + n)
    extra = [c for c in plan["checks"] if c not in plan["always"]]
    print(f"  browser checks: the {len(plan['always'])} that always run" + (f", and {len(extra)} this change can affect: {', '.join(extra)}" if extra else ", and none other"))
    print("  light mode, Bento and Original: " + (", ".join(plan["light"]) if plan["light"] else "not needed (the look did not change)"))
    if plan["spanish"]:
        print("  Spanish: spanish-switch, and " + ", ".join(plan["spanish"]))
    last = safety_net_last()
    if last and last["conclusion"] == "failure":
        print(f"  WARNING: the last full gate on GitHub failed (commit {last['headSha'][:7]}): {last['url']}")
        print("           A fast release adds to a main branch that is already red. Fix that with the full gate first if you can.")
    return plan


def main():
    try:
        sys.stdout.reconfigure(errors="replace")   # a check's message can quote page text the console cannot print
    except (AttributeError, ValueError):
        pass
    if FAST and not CHECKS:
        fail("--fast never skips the browser checks it needs; leave out --skip-checks")
    print(f"Release gate: {'fast lane' if FAST else 'full gate'}{', no push' if NO_PUSH else ', then push' if PUSH else ''}.")
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
    plan = fast_plan() if FAST else None

    key = inputs_key()
    saved = None if FRESH or not CHECKS else read_stamp(key, plan)
    if saved:
        a = saved["hashes"]
        what = "the full gate" if saved.get("lane", "full") == "full" else "the fast lane's plan"
        print(f"\n[2-4] Already verified: these exact inputs passed the builds, unit tests, and browser checks of {what} today ({saved['when']}).")
        print(f"  site/index.html {a['index'][:16]}... Skipping to step 5. Use --fresh to run them again.")
    else:
        a = verify(key, plan)

    step(5, "The committed site is what the build produced")
    rc, out = run(["git", "status", "--short", "--", "site", "ext", "build.py", "data", "bench"])
    if out:
        print("  uncommitted changes in the built inputs or outputs:\n    " + out.replace("\n", "\n    "))
        fail("commit these (with a one-line message about what changed for a resident), then run this again. The passes above are saved, so the next run skips them.")
    print("  clean")
    finish(a)


def unit_tests():
    """every unit test at once (each is its own process and writes nothing shared); reported in the list's order"""
    def one(cmd):
        t = time.time()
        rc, out = run(cmd)
        return cmd, rc, out, time.time() - t
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(8, len(UNIT))) as ex:
        results = list(ex.map(one, UNIT))
    for cmd, rc, out, secs in results:
        print(f"  {'ok  ' if rc == 0 else 'FAIL'} {' '.join(cmd[1:])}  ({secs:.1f}s)")
    for cmd, rc, out, secs in results:
        if rc:
            fail(f"{' '.join(cmd[1:])} failed:\n" + out[-1200:])


def browser_checks(plan):
    cmd = ["node", "scripts/checks/run.js"]
    if plan:
        cmd += ["--exact", ",".join(plan["checks"])]
        if plan["light"]:
            cmd += ["--light", ",".join(plan["light"])]
        if plan["spanish"]:
            cmd += ["--spanish", ",".join(plan["spanish"])]
    else:
        cmd += ["--light"]   # every check, then the light-mode list (scripts/checks/lists.js) in Bento and in Original
    if JOBS:
        cmd += ["--jobs", JOBS]
    # streamed, so a person sees each result as it is decided (in the table's order); kept in dist/checks-output.txt
    p = subprocess.Popen(cmd, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace", bufsize=1)
    lines = []
    for line in p.stdout:
        if not line.startswith("  ... "):   # the progress notes are for the screen, not the record
            lines.append(line.rstrip("\n"))
        print("  " + line.rstrip("\n"), flush=True)
    rc = p.wait()
    try:
        open(os.path.join(ROOT, "dist", "checks-output.txt"), "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
    except OSError:
        pass
    if rc:
        failed = next((l for l in lines if l.startswith("Failed: ")), "")
        fail(f"browser checks failed. {failed or ' '.join(lines[-1:])} (the whole output is above and in dist/checks-output.txt)")


def verify(key, plan):
    step(2, "Build twice from clean and compare")
    a = build_hashes()
    b = build_hashes()
    if a != b:
        fail(f"two clean builds differ:\n  {a}\n  {b}")
    print(f"  identical: single file {a['single'][:16]}..., site/index.html {a['index'][:16]}...")

    step(3, "Unit tests and data safety check")
    unit_tests()

    if CHECKS:
        step(4, "Browser checks and accessibility audit" + (" (the fast lane's plan)" if plan else ", then light mode in Bento and in Original"))
        browser_checks(plan)
        # saved only when everything ran, and only if the inputs did not change while it ran
        if inputs_key() == key:
            d = {"key": key, "hashes": a, "checks": True, "lane": LANE, "when": time.strftime("%Y-%m-%d %H:%M")}
            if plan:
                d["plan"] = {k: plan[k] for k in ("checks", "light", "spanish")}
            json.dump(d, open(stamp_path(), "w", encoding="utf-8"))
            print("  saved this pass (inside .git). The next run on the same inputs today skips steps 2 to 4.")
    else:
        step(4, "Browser checks SKIPPED (--skip-checks)")
    return a


def safety_net(sha):
    """the full gate on GitHub for the pushed commit: find the run the push started, or start one"""
    g = gh()
    for i in range(9):
        rc, out = run([g, "run", "list", "--repo", REPO, "--workflow", "checks.yml", "--commit", sha, "--limit", "1", "--json", "url,status"])
        try:
            runs = json.loads(out) if rc == 0 else []
        except ValueError:
            runs = []
        if runs:
            print(f"  The full gate is running on GitHub as the safety net ({runs[0]['status']}): {runs[0]['url']}")
            print("  If any check fails there, the commit is marked red and the issue \"Checks failed on main\" names the failing checks.")
            return
        time.sleep(10)
    rc, out = run([g, "workflow", "run", "checks.yml", "--repo", REPO, "--ref", "main"])
    if rc == 0:
        print("  The push did not show a Checks run, so the full gate was started by hand on main (gh workflow run checks.yml). Watch: gh run list --workflow checks.yml")
    else:
        print("  WARNING: no full gate is running on GitHub for this commit, and starting one failed:\n    " + out[-300:].replace("\n", "\n    "))
        print("  Start it yourself: gh workflow run checks.yml --ref main")


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
        took()
        print(f"\nREADY. Everything above passed ({'fast lane' if FAST else 'full gate'}, {clock(time.time() - T0)} on the clock). " + ("Not pushed (--no-push)." if NO_PUSH else "Run with --push to ship."))
        return

    step(7, "Push and verify the live site")
    rc, out = run(["git", "push"])
    if rc:
        fail("push failed:\n" + out)
    full_sha = run(["git", "rev-parse", "HEAD"])[1].strip()
    sha = full_sha[:7]
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
    if FAST:
        safety_net(full_sha)
    took()
    print(f"\nSHIPPED{' (fast lane)' if FAST else ''}. {LIVE} serves {built[:16]}..., commit {sha}. {clock(time.time() - T0)} on the clock.")


if __name__ == "__main__":
    main()
