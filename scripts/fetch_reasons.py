#!/usr/bin/env python3
"""Snapshot the official "WHEREAS" reasons for the proposals used in My constellation.

For each file number, finds the matter in the Legistar Web API, downloads the ordinance or
resolution text (the .docx attachment Council publishes), and keeps every WHEREAS clause.
Output: data/reasons-2026.json (a build input; the build never fetches live).
The plain-English summaries shown in the app are written by hand in ext/cx-reasons.jsx
from these clauses; this file is the evidence they are checked against.
"""
import json, os, re, io, sys, zipfile, datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import net

B = "https://webapi.legistar.com/v1/cityofcleveland"
ROOT = os.path.join(os.path.dirname(__file__), "..")
FILES = ["556-2026", "561-2026", "114-2026", "975-2026", "240-2026", "107-2026", "239-2026", "111-2026",
         "557-2026", "683-2026", "605-2026", "1031-2026", "620-2026", "117-2026", "664-2026", "245-2026",
         "615-2026", "622-2026", "624-2026", "765-2026", "938-2026", "31-2026", "931-2026"]


def get(url):
    return net.get(url, timeout=90)  # retries with growing pauses (scripts/net.py)


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
            subprocess.run(["soffice", f"-env:UserInstallation=file://{d}/profile", "--headless", "--convert-to", "txt:Text", "--outdir", d, src], capture_output=True)
            out = os.path.join(d, "in.txt")
            return open(out, encoding="utf8", errors="replace").read() if os.path.exists(out) else ""
    return ""


def whereas(text):
    cl = re.findall(r"WHEREAS,?\s*(.+?)(?=\n\s*WHEREAS|\n\s*(?:NOW,? THEREFORE|BE IT|now,? therefore)|$)", text, flags=re.S | re.I)
    return [re.sub(r"\s+", " ", c).strip() for c in cl]


def main():
    leg = {m["file"]: m for m in json.load(open(os.path.join(ROOT, "data", "legistar-2026.json"), encoding="utf-8"))["matters"]}
    out = {"source": B, "retrieved_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"), "items": {}}
    for f in FILES:
        m = leg[f]
        atts = json.loads(get(f"{B}/matters/{m['id']}/attachments"))
        rec = {"file": f, "matter_id": m["id"], "legistar": m["url"], "summary_url": None, "summary": "", "text_url": None, "whereas": []}
        summ = [a for a in atts if "summary" in a["MatterAttachmentName"].lower()]
        if summ:
            a = summ[-1]
            rec["summary_url"] = a["MatterAttachmentHyperlink"]
            rec["summary"] = re.sub(r"[ \t]+", " ", to_text(a["MatterAttachmentHyperlink"], get(a["MatterAttachmentHyperlink"]))).strip()[:6000]
        texts = [a for a in atts if not re.search(r"summary|presentation|city record|a file", a["MatterAttachmentName"], re.I)
                 and re.search(r"\.(docx?|pdf)$", a["MatterAttachmentHyperlink"], re.I)]
        pref = [a for a in texts if re.search(r"final|as amended", a["MatterAttachmentName"], re.I)] or texts
        for a in pref[::-1] + [x for x in atts if re.search(r"city record", x["MatterAttachmentName"], re.I)]:
            w = whereas(to_text(a["MatterAttachmentHyperlink"], get(a["MatterAttachmentHyperlink"])))
            if w:
                rec["text_url"], rec["whereas"], rec["text_name"] = a["MatterAttachmentHyperlink"], w, a["MatterAttachmentName"]
                break
        out["items"][f] = rec
        print(f, "whereas:", len(rec["whereas"]), "summary:", len(rec["summary"]))
    json.dump(out, open(os.path.join(ROOT, "data", "reasons-2026.json"), "w", encoding="utf-8", newline="\n"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
