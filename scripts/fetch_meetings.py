#!/usr/bin/env python3
"""Cleveland City Council meetings: the calendar of Council and committee meetings, with the agenda, the minutes, and which legislation was on each agenda.

Output: data/meetings-2026.json (a build input; the build never fetches live).

Source: the city's own Legistar web API (https://webapi.legistar.com/v1/cityofcleveland, "events" and each event's "eventitems"), the same system that
holds the legislation we already read. It is an official record, so it updates automatically like the rest of data/.

What it keeps, for every meeting of 2026 (past and scheduled):
  * the date, time, body (City Council, Finance Committee, ...), and room;
  * links to the agenda, the minutes (when the Clerk has posted them), and the city's own meeting page;
  * the Clerk's notice text for the meeting, when there is one;
  * each piece of legislation on the agenda, with what happened to it at that meeting ("approved", "recommended for approval", ...). On an agenda that has
    not met yet there is no action, so the item is simply "on the agenda".

What it does not keep, on purpose:
  * testimony, public comment, or what anyone said: Legistar does not hold them, and nothing here infers them;
  * video: Legistar reports a video status for every meeting but no file address, so the meeting page link is the way to the recording;
  * how each member voted: that already comes from the City Record (data/votes-2026.json).

refresh.py runs this nightly, best effort: if the city's server is slow or changes, the file already saved stays and a warning is printed.
"""
import concurrent.futures as cf, datetime, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import net

B = "https://webapi.legistar.com/v1/cityofcleveland"
YEAR = 2026
OUT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "meetings-2026.json"))
NOTE_MAX = 500


def get_json(url):
    return json.loads(net.get(url.replace(" ", "%20"), timeout=90))


def clean(text):
    return " ".join(str(text or "").split())


def is_file_number(text):
    """Legislation numbers look like 556-2026."""
    a, _, b = str(text or "").partition("-")
    return a.isdigit() and b.isdigit() and len(b) == 4


def minutes_of(clock):
    """'10:00 AM' -> 600, '1:30 PM' -> 810; a time that cannot be read sorts first of the day."""
    try:
        hm, _, ap = clean(clock).partition(" ")
        h, _, m = hm.partition(":")
        h = int(h) % 12 + (12 if ap.upper().startswith("P") else 0)
        return h * 60 + int(m or 0)
    except ValueError:
        return -1


def build(events, items_by_event, retrieved_at):
    """Pure: Legistar's events and each event's items in, the meetings file out. No network, so it can be tested."""
    meetings = []
    for e in sorted(events, key=lambda e: (e["EventDate"], minutes_of(e.get("EventTime")), e["EventBodyName"], e["EventId"])):
        seen, legislation = set(), []
        for x in sorted(items_by_event.get(e["EventId"], []), key=lambda x: (x.get("EventItemAgendaSequence") or 0, x.get("EventItemId") or 0)):
            f = clean(x.get("EventItemMatterFile"))
            if not is_file_number(f):
                continue
            row = (f, clean(x.get("EventItemActionName")))
            if row not in seen:
                seen.add(row)
                legislation.append(list(row))
        meetings.append({
            "id": e["EventId"], "date": e["EventDate"][:10], "time": clean(e.get("EventTime")), "body": clean(e["EventBodyName"]), "place": clean(e.get("EventLocation")),
            "agenda": e.get("EventAgendaFile") or None, "minutes": e.get("EventMinutesFile") or None, "page": e.get("EventInSiteURL") or None,
            "agenda_status": clean(e.get("EventAgendaStatusName")), "minutes_status": clean(e.get("EventMinutesStatusName")),
            "note": clean(e.get("EventComment"))[:NOTE_MAX], "items": legislation,
        })
    return {
        "source": B, "retrieved_at": retrieved_at, "year": YEAR,
        "about": "Meetings of Cleveland City Council and its committees from the city's Legistar record. Each meeting links to its agenda, its minutes once posted, and the city's meeting page. "
                 "Testimony and public comment are not in this record.",
        "counts": {"meetings": len(meetings), "with_agenda": sum(1 for m in meetings if m["agenda"]), "with_minutes": sum(1 for m in meetings if m["minutes"]),
                   "legislation_items": sum(len(m["items"]) for m in meetings)},
        "meetings": meetings,
    }


def check(snap):
    """Problems that mean tonight's file should not replace the old one. Empty list: safe."""
    bad, ms = [], snap.get("meetings", [])
    if len(ms) < 30:
        bad.append(f"meetings: only {len(ms)} meetings")
    if not any(m["body"] == "City Council" for m in ms):
        bad.append("meetings: no City Council meeting")
    if any(not m["date"].startswith(str(snap.get("year", YEAR))) for m in ms):
        bad.append("meetings: a meeting outside the year")
    today = datetime.date.today().isoformat()
    past = [m for m in ms if m["date"] <= today]
    if past and sum(1 for m in past if m["agenda"]) < len(past) * 0.8:
        bad.append("meetings: fewer than 80% of past meetings have an agenda")
    if ms and sum(len(m["items"]) for m in ms) < 20:
        bad.append("meetings: almost no legislation on any agenda")
    return bad


def main():
    now = datetime.datetime.now(datetime.timezone.utc)
    q = f"EventDate ge datetime'{YEAR}-01-01' and EventDate lt datetime'{YEAR + 1}-01-01'"
    events = get_json(f"{B}/events?$filter={q}&$orderby=EventDate asc")

    def items(e):
        return e["EventId"], get_json(f"{B}/events/{e['EventId']}/eventitems")

    with cf.ThreadPoolExecutor(4) as ex:
        by = dict(ex.map(items, events))
    snap = build(events, by, now.isoformat(timespec="seconds"))
    bad = check(snap)
    if bad:
        raise RuntimeError("; ".join(bad))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    tmp = OUT + ".tmp"
    json.dump(snap, open(tmp, "w", encoding="utf-8", newline="\n"), indent=0, ensure_ascii=False)
    os.replace(tmp, OUT)
    print("meetings:", snap["counts"], "->", OUT)


if __name__ == "__main__":
    main()
