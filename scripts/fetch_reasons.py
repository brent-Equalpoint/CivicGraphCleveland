#!/usr/bin/env python3
"""Snapshot the official "WHEREAS" reasons for the proposals used in My constellation.

For each file number, finds the matter in the Legistar Web API, downloads the ordinance or
resolution text (the .docx attachment Council publishes), and keeps every WHEREAS clause.
Output: data/reasons-2026.json (a build input; the build never fetches live).
The plain-English summaries shown in the app are written by hand in ext/cx-reasons.jsx
from these clauses; this file is the evidence they are checked against.
"""
import json, os, re, io, sys, zipfile, datetime, urllib.error

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import net

B = "https://webapi.legistar.com/v1/cityofcleveland"
ROOT = os.path.join(os.path.dirname(__file__), "..")
FILES = ["556-2026", "561-2026", "114-2026", "975-2026", "240-2026", "107-2026", "239-2026", "111-2026",
         "557-2026", "683-2026", "605-2026", "1031-2026", "620-2026", "117-2026", "664-2026", "245-2026",
         "615-2026", "622-2026", "624-2026", "765-2026", "938-2026", "31-2026", "931-2026"]


def get(url):
    return net.get(url, timeout=90)  # retries with growing pauses (scripts/net.py)


def try_get(url):
    """Like get(), but a document the city no longer serves (403, 404, 410) is None, not a stop. An outage (5xx, timeouts) still raises, and the whole refresh keeps its
    previous data. One missing attachment on one ordinance must not stop the nightly refresh of everything else."""
    try:
        return get(url)
    except urllib.error.HTTPError as e:
        if e.code in (403, 404, 410):
            print("  not served (HTTP %d), using the previous copy if there is one: %s" % (e.code, url))
            return None
        raise


def docx_text(b):
    x = zipfile.ZipFile(io.BytesIO(b)).read("word/document.xml").decode("utf8")
    x = re.sub(r"</w:p>", "\n", x)
    x = re.sub(r"<w:tab/>", " ", x)
    t = re.sub(r"<[^>]+>", "", x)
    for a, c in (("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", '"'), ("&apos;", "'")):
        t = t.replace(a, c)
    return t


def to_text(url, blob):
    ext = url.lower().rsplit(".", 1)[-1]
    if ext == "docx":
        return docx_text(blob)
    import tempfile, subprocess
    with tempfile.TemporaryDirectory() as d:
        src = os.path.join(d, "in." + ext)
        open(src, "wb").write(blob)
        if ext == "pdf":
            return subprocess.run(["pdftotext", "-layout", src, "-"], capture_output=True, text=True).stdout
        if ext == "doc":
            # a private profile per call lets several conversions run at once
            try:
                subprocess.run(["soffice", f"-env:UserInstallation=file://{d}/profile", "--headless", "--convert-to", "txt:Text", "--outdir", d, src], capture_output=True)
            except FileNotFoundError:
                print("  soffice (LibreOffice) is not installed: a .doc cannot be read here, using the previous copy if there is one")
                return ""
            out = os.path.join(d, "in.txt")
            return open(out, encoding="utf8", errors="replace").read() if os.path.exists(out) else ""
    return ""


def whereas(text):
    cl = re.findall(r"WHEREAS,?\s*(.+?)(?=\n\s*WHEREAS|\n\s*(?:NOW,? THEREFORE|BE IT|now,? therefore)|$)", text, flags=re.S | re.I)
    return [re.sub(r"\s+", " ", c).strip() for c in cl]


def main():
    leg = {m["file"]: m for m in json.load(open(os.path.join(ROOT, "data", "legistar-2026.json"), encoding="utf-8"))["matters"]}
    prev_path = os.path.join(ROOT, "data", "reasons-2026.json")
    try:
        prev_items = json.load(open(prev_path, encoding="utf-8")).get("items", {})
    except (OSError, ValueError):
        prev_items = {}
    out = {"source": B, "retrieved_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"), "items": {}}
    for f in FILES:
        m = leg[f]
        prev = prev_items.get(f) or {}
        rec = {"file": f, "matter_id": m["id"], "legistar": m["url"], "summary_url": None, "summary": "", "text_url": None, "whereas": []}
        raw = try_get(f"{B}/matters/{m['id']}/attachments")
        if raw is None:
            # the matter's attachment list is gone: keep what was captured before, and say so
            out["items"][f] = {**(prev or rec), "fetch_note": "kept from the previous refresh: the attachment list could not be fetched on " + out["retrieved_at"][:10]}
            print(f, "kept from the previous refresh")
            continue
        atts = json.loads(raw)
        note = []
        summ = [a for a in atts if "summary" in a["MatterAttachmentName"].lower()]
        if summ:
            a = summ[-1]
            blob = try_get(a["MatterAttachmentHyperlink"])
            text = re.sub(r"[ \t]+", " ", to_text(a["MatterAttachmentHyperlink"], blob)).strip()[:6000] if blob is not None else ""
            if text:
                rec["summary_url"], rec["summary"] = a["MatterAttachmentHyperlink"], text
            elif prev.get("summary"):
                rec["summary_url"], rec["summary"] = prev.get("summary_url"), prev["summary"]
                note.append("summary")
            else:
                rec["summary_url"] = a["MatterAttachmentHyperlink"]
        texts = [a for a in atts if not re.search(r"summary|presentation|city record|a file", a["MatterAttachmentName"], re.I)
                 and re.search(r"\.(docx?|pdf)$", a["MatterAttachmentHyperlink"], re.I)]
        pref = [a for a in texts if re.search(r"final|as amended", a["MatterAttachmentName"], re.I)] or texts
        for a in pref[::-1] + [x for x in atts if re.search(r"city record", x["MatterAttachmentName"], re.I)]:
            blob = try_get(a["MatterAttachmentHyperlink"])
            if blob is None:
                continue
            w = whereas(to_text(a["MatterAttachmentHyperlink"], blob))
            if w:
                rec["text_url"], rec["whereas"], rec["text_name"] = a["MatterAttachmentHyperlink"], w, a["MatterAttachmentName"]
                break
        if not rec["whereas"] and prev.get("whereas"):
            rec["text_url"], rec["whereas"] = prev.get("text_url"), prev["whereas"]
            if prev.get("text_name"):
                rec["text_name"] = prev["text_name"]
            note.append("text")
        if note:
            rec["fetch_note"] = "kept from the previous refresh (" + " and ".join(note) + "): the document could not be read on " + out["retrieved_at"][:10]
        out["items"][f] = rec
        print(f, "whereas:", len(rec["whereas"]), "summary:", len(rec["summary"]))
    json.dump(out, open(os.path.join(ROOT, "data", "reasons-2026.json"), "w", encoding="utf-8", newline="\n"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
