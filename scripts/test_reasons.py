#!/usr/bin/env python3
"""The reasons fetcher (scripts/fetch_reasons.py) must not stop the nightly refresh because one document is gone.

A document the city no longer serves (403, 404, 410) is skipped and the previous copy is kept, with a note. An outage (HTTP 500, a timeout)
still raises, so the whole refresh stops and keeps its previous data. A .doc that cannot be read here (no LibreOffice) is skipped, not a crash.
No network: the downloads are replaced by small fakes.
"""
import io, json, os, sys, tempfile, unittest, urllib.error, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import fetch_reasons as fr


def docx(text):
    b = io.BytesIO()
    with zipfile.ZipFile(b, "w") as z:
        z.writestr("word/document.xml", "<w:document><w:p>%s</w:p></w:document>" % text)
    return b.getvalue()


def http_error(code, url="https://example.test/x"):
    return urllib.error.HTTPError(url, code, "x", {}, None)


class Reasons(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        os.makedirs(os.path.join(self.tmp.name, "data"))
        leg = {"matters": [{"file": "1-2026", "id": 1, "url": "https://legistar.test/1"}, {"file": "2-2026", "id": 2, "url": "https://legistar.test/2"}]}
        json.dump(leg, open(os.path.join(self.tmp.name, "data", "legistar-2026.json"), "w"))
        self.prev = {"source": fr.B, "retrieved_at": "2026-10-12T00:00:00+00:00", "items": {
            "1-2026": {"file": "1-2026", "matter_id": 1, "legistar": "https://legistar.test/1", "summary_url": "https://docs.test/s1.docx", "summary": "old summary",
                       "text_url": "https://docs.test/t1.docx", "whereas": ["old reason one", "old reason two"], "text_name": "Final"},
            "2-2026": {"file": "2-2026", "matter_id": 2, "legistar": "https://legistar.test/2", "summary_url": None, "summary": "",
                       "text_url": "https://docs.test/t2.docx", "whereas": ["old reason for two"], "text_name": "Final"}}}
        json.dump(self.prev, open(os.path.join(self.tmp.name, "data", "reasons-2026.json"), "w"))
        self.old = (fr.ROOT, fr.FILES, fr.get)
        fr.ROOT, fr.FILES = self.tmp.name, ["1-2026", "2-2026"]

    def tearDown(self):
        fr.ROOT, fr.FILES, fr.get = self.old
        self.tmp.cleanup()

    def run_main(self, table):
        def fake(url):
            v = table.get(url)
            if isinstance(v, Exception):
                raise v
            if v is None:
                raise http_error(404, url)
            return v
        fr.get = fake
        fr.main()
        return json.load(open(os.path.join(self.tmp.name, "data", "reasons-2026.json"), encoding="utf-8"))["items"]

    def atts(self, mid, text_url):
        return json.dumps([{"MatterAttachmentName": "Final", "MatterAttachmentHyperlink": text_url}]).encode()

    def test_a_missing_attachment_list_keeps_the_previous_record(self):
        table = {fr.B + "/matters/1/attachments": self.atts(1, "https://docs.test/t1.docx"), "https://docs.test/t1.docx": docx("WHEREAS, new reason one."),
                 fr.B + "/matters/2/attachments": None}
        items = self.run_main(table)
        self.assertEqual(items["1-2026"]["whereas"], ["new reason one."])
        self.assertEqual(items["2-2026"]["whereas"], ["old reason for two"])
        self.assertIn("kept from the previous refresh", items["2-2026"]["fetch_note"])

    def test_a_missing_text_document_keeps_the_previous_reasons(self):
        table = {fr.B + "/matters/1/attachments": self.atts(1, "https://docs.test/t1.docx"), "https://docs.test/t1.docx": None,
                 fr.B + "/matters/2/attachments": self.atts(2, "https://docs.test/t2.docx"), "https://docs.test/t2.docx": docx("WHEREAS, fresh reason for two.")}
        items = self.run_main(table)
        self.assertEqual(items["1-2026"]["whereas"], ["old reason one", "old reason two"])
        self.assertEqual(items["1-2026"]["text_url"], "https://docs.test/t1.docx")
        self.assertIn("kept from the previous refresh", items["1-2026"]["fetch_note"])
        self.assertEqual(items["2-2026"]["whereas"], ["fresh reason for two."])
        self.assertNotIn("fetch_note", items["2-2026"])

    def test_an_outage_still_stops_the_refresh(self):
        table = {fr.B + "/matters/1/attachments": http_error(500)}
        with self.assertRaises(urllib.error.HTTPError):
            self.run_main(table)
        # nothing was written: the previous file is untouched
        kept = json.load(open(os.path.join(self.tmp.name, "data", "reasons-2026.json"), encoding="utf-8"))
        self.assertEqual(kept["retrieved_at"], "2026-10-12T00:00:00+00:00")

    def test_a_doc_that_cannot_be_read_here_is_skipped(self):
        import subprocess
        real = subprocess.run

        def no_soffice(cmd, *a, **k):
            if cmd and cmd[0] == "soffice":
                raise FileNotFoundError(2, "no soffice")
            return real(cmd, *a, **k)
        subprocess.run = no_soffice
        try:
            self.assertEqual(fr.to_text("https://docs.test/x.doc", b"not a real doc"), "")
        finally:
            subprocess.run = real


if __name__ == "__main__":
    unittest.main()
