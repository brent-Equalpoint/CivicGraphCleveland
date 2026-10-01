"""Shared HTTP helper for the fetch scripts: retries with growing pauses.

A nightly job meets rate limits and brief outages, so every request retries up to 6 times,
waiting about 2, 4, 8, 16 and 32 seconds (plus a little jitter), and honors a server's
Retry-After header when it sends one. A 404 or other client error fails at once: retrying a
missing page only hides the problem.
"""
import random, time, urllib.error, urllib.request

UA = "ClevelandCivicGraph/5.15 (Equalpoint; nightly public-records refresh)"
TRIES = 6


def get(url, timeout=90):
    for i in range(TRIES):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            return urllib.request.urlopen(req, timeout=timeout).read()
        except urllib.error.HTTPError as e:
            if e.code < 500 and e.code not in (408, 429):
                raise
            wait = e.headers.get("Retry-After") if e.headers else None
            delay = float(wait) if wait and wait.isdigit() else 2 ** (i + 1)
            err = e
        except Exception as e:  # timeouts, resets, DNS hiccups
            delay, err = 2 ** (i + 1), e
        if i == TRIES - 1:
            raise err
        time.sleep(min(delay, 60) + random.uniform(0, 1))
