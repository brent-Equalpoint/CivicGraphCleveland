#!/usr/bin/env python3
"""Tests for scripts/fetch_meetings.py: how the council meetings file is assembled and checked.

  python scripts/test_meetings.py

No network. Every meeting and item below is made up.
"""
import os, sys, unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_meetings as fm


def ev(i, date, body, time="10:00 AM", agenda=True, minutes=False, note=None):
    return {"EventId": i, "EventDate": date + "T00:00:00", "EventTime": time, "EventBodyName": body, "EventLocation": "Room 217", "EventAgendaFile": f"https://example.invalid/a{i}.pdf" if agenda else None,
            "EventMinutesFile": f"https://example.invalid/m{i}.pdf" if minutes else None, "EventInSiteURL": f"https://example.invalid/meeting/{i}", "EventAgendaStatusName": "Final",
            "EventMinutesStatusName": "Final" if minutes else "Draft", "EventComment": note}


def it(seq, f, action, title="A title"):
    return {"EventItemId": seq, "EventItemAgendaSequence": seq, "EventItemMatterFile": f, "EventItemActionName": action, "EventItemTitle": title}


EVENTS = [ev(3, "2026-07-15", "City Council", note="  A notice\r\nwith   spaces  "), ev(1, "2026-06-25", "Utilities Committee", minutes=True), ev(2, "2026-07-15", "Committee of the Whole", time="9:00 AM"), ev(4, "2026-10-08", "City Council", agenda=False)]
ITEMS = {1: [it(2, "556-2026", "recommended for approval"), it(1, None, "approved", "DISPENSE WITH THE JOURNAL")],
         2: [it(1, "556-2026", "recommended for approval")],
         3: [it(5, "556-2026", "approved as amended"), it(3, "601-2026", None), it(4, "556-2026", "approved as amended"), it(6, "Roll Call", "present")],
         4: []}


class Meetings(unittest.TestCase):
    def snap(self):
        return fm.build(EVENTS, ITEMS, "2026-10-03T00:00:00+00:00")

    def test_meetings_come_out_in_date_time_and_body_order(self):
        s = self.snap()
        self.assertEqual([m["id"] for m in s["meetings"]], [1, 2, 3, 4])   # Jun 25, then Jul 15 at 9:00 before 10:00, then Oct 8

    def test_legislation_is_kept_in_agenda_order_and_everything_else_is_left_out(self):
        s = self.snap()
        by = {m["id"]: m for m in s["meetings"]}
        self.assertEqual(by[1]["items"], [["556-2026", "recommended for approval"]])   # the journal motion has no legislation number
        self.assertEqual(by[3]["items"], [["601-2026", ""], ["556-2026", "approved as amended"]])   # an agenda that has not acted yet has an empty action; a repeat is kept once; "Roll Call" is not a file number
        self.assertEqual(by[4]["items"], [])

    def test_links_and_notice_text_are_carried_and_cleaned(self):
        s = self.snap()
        by = {m["id"]: m for m in s["meetings"]}
        self.assertEqual(by[1]["minutes"], "https://example.invalid/m1.pdf")
        self.assertIsNone(by[3]["minutes"])
        self.assertIsNone(by[4]["agenda"])   # not posted yet: say so, do not invent a link
        self.assertEqual(by[3]["note"], "A notice with spaces")
        self.assertEqual(by[1]["page"], "https://example.invalid/meeting/1")

    def test_no_testimony_or_comment_field_exists(self):
        s = self.snap()
        for m in s["meetings"]:
            self.assertEqual(sorted(m), ["agenda", "agenda_status", "body", "date", "id", "items", "minutes", "minutes_status", "note", "page", "place", "time"])

    def test_counts_add_up(self):
        s = self.snap()
        self.assertEqual(s["counts"], {"meetings": 4, "with_agenda": 3, "with_minutes": 1, "legislation_items": 4})

    def test_times_sort_by_the_clock_not_by_the_letters(self):
        self.assertLess(fm.minutes_of("9:00 AM"), fm.minutes_of("10:00 AM"))
        self.assertLess(fm.minutes_of("11:30 AM"), fm.minutes_of("1:00 PM"))
        self.assertEqual(fm.minutes_of("12:00 PM"), 720)
        self.assertEqual(fm.minutes_of("12:15 AM"), 15)
        self.assertEqual(fm.minutes_of(None), -1)

    def test_file_numbers_look_like_file_numbers(self):
        self.assertTrue(fm.is_file_number("556-2026"))
        for bad in ("Roll Call", "", None, "556", "556-26", "a-2026"):
            self.assertFalse(fm.is_file_number(bad), bad)

    def test_the_safety_check_refuses_a_broken_file(self):
        s = self.snap()
        self.assertTrue(any("only 4 meetings" in p for p in fm.check(s)))   # four made-up meetings are not a year
        many = {"year": 2026, "meetings": [{"date": f"2026-0{1 + i % 9}-1{i % 9}", "body": "City Council" if i == 0 else "X", "agenda": "u", "items": [["1-2026", ""]]} for i in range(40)]}
        self.assertEqual(fm.check(many), [])
        many["meetings"][1]["date"] = "2025-12-30"
        self.assertTrue(any("outside the year" in p for p in fm.check(many)))
        none = {"year": 2026, "meetings": [{"date": "2026-01-05", "body": "City Council", "agenda": None, "items": []} for _ in range(40)]}
        self.assertTrue(any("agenda" in p for p in fm.check(none)))


if __name__ == "__main__":
    unittest.main(verbosity=1)
