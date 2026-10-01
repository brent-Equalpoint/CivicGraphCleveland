#!/usr/bin/env python3
"""Shared pieces of the Civic Intelligence Bench scripts.

The Bench turns official records into source-backed, human-approved graph records:

  scripts/packets.py   research and examination: shadow candidates from data/ (agents' side)
  scripts/approve.py   a named person approves, rejects, or asks for revision (human's side)
  scripts/commit.py    deterministic publisher: applies exactly what was approved (commit side)

The three never share a write path. packets.py writes only bench/shadow/registry, entities and
packets. approve.py writes only bench/shadow/approvals.jsonl. commit.py writes only bench/approved/.
No script here writes data/ or anything the app reads today (stage 8, the public projection, is
not wired into build.py yet). Design: docs/civic-agent/Civic-Intelligence-*-v1.md.
"""
import datetime, hashlib, hmac, json, os

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
JURISDICTION = "city:cleveland"

# Relationship families from the Data Contracts, plus `sponsorship`: a formal legislative act that
# is neither a statement nor a vote (CLAUDE.md: sponsorship is not a vote). Proposed stage 0 addition.
EDGE_TYPES = {"legal_authority", "appointment", "oversight", "administration", "ownership", "operation",
              "contract", "funding", "regulation", "vote", "statement", "membership", "service",
              "influence_claim", "inference", "sponsorship"}
EVIDENCE_STATES = {"verified", "partial", "contested", "stale", "missing", "not_applicable"}
CLAIM_VERDICTS = {"verified", "verified_with_limits", "contested", "unsupported", "stale", "needs_specialist_review"}
STRUCTURAL_VERDICTS = {"MERGE", "BLOCK", "QUARANTINE", "HUMAN_REQUIRED"}


def paths(bench_dir=None):
    b = bench_dir or os.environ.get("CX_BENCH_DIR") or os.path.join(ROOT, "bench")
    return {
        "bench": b,
        "registry": os.path.join(b, "shadow", "registry-2026.json"),
        "entities": os.path.join(b, "shadow", "entities-2026.json"),
        "packets": os.path.join(b, "shadow", "packets-2026.json"),
        "approvals": os.path.join(b, "shadow", "approvals.jsonl"),
        "graph": os.path.join(b, "approved", "graph-2026.json"),
        "receipts": os.path.join(b, "approved", "receipts.jsonl"),
        "public": os.path.join(b, "approved", "public-2026.json"),
        "evidence": os.path.join(b, "approved", "evidence"),
        "status": os.path.join(b, "status-2026.json"),
        "reviewers": os.path.join(b, "reviewers.json"),
        "corrections": os.path.join(b, "corrections.jsonl"),
        "corrections_public": os.path.join(b, "approved", "corrections-2026.json"),
        "votes": os.path.join(ROOT, "data", "votes-2026.json"),
        "people": os.path.join(ROOT, "data", "people-2026.json"),
    }


def canon(obj):
    """Canonical bytes: sorted keys, no spaces, UTF-8. The same content always gives the same hash."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def sha(b):
    return hashlib.sha256(b).hexdigest()


def short_id(prefix, *parts):
    """Opaque stable ID from the parts that define the thing (never a bare name or URL)."""
    return prefix + sha(canon(list(parts)))[:12]


def now_utc():
    return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat()


def load_json(path, default=None):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_jsonl(path):
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def write_atomic(path, text):
    """Write the whole file or nothing: a failed write never leaves a half-written record."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    os.replace(tmp, path)


def write_json(path, obj):
    write_atomic(path, json.dumps(obj, indent=1, ensure_ascii=False, sort_keys=True) + "\n")


def append_jsonl(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(obj, ensure_ascii=False, sort_keys=True) + "\n")


def packet_hash(packet):
    """Hash of the frozen candidate: everything a reviewer approves, nothing about when or by whom.
    The graph precondition is left out on purpose: it is checked at commit time, and a commit must not
    change the hash of the very packet it just applied (replay would never settle)."""
    body = {k: v for k, v in packet.items() if k not in ("candidate_sha256", "examiner", "skeptic", "state", "created_at", "version", "graph_precondition", "supersedes_sha256")}
    return sha(canon(body))


# ---------------------------------------------------------------- who may approve, and proof that they did
APPROVAL_KEY_ENV = "BENCH_APPROVAL_KEY"


def attest(record, key):
    """Signature over a decision, made only by the approval workflow, which holds the secret key.
    Anyone who can edit a file in the repository can type a name into it; they cannot produce this."""
    body = {k: v for k, v in record.items() if k != "attestation"}
    return hmac.new(key.encode("utf-8"), canon(body), hashlib.sha256).hexdigest()


def attestation_ok(record, key):
    a = record.get("attestation") or {}
    return bool(a.get("hmac")) and hmac.compare_digest(str(a["hmac"]), attest(record, key))


def load_reviewers(path):
    """{github login (lower case): set of roles}. Roles: reviewer (may reject, ask for changes, record dissent),
    publisher (may approve, and may override a Skeptic veto)."""
    d = load_json(path, {"people": []})
    return {p["github"].lower(): set(p.get("roles", [])) for p in d.get("people", [])}
