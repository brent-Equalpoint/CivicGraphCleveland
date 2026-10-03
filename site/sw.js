/* Cleveland Civic Graph service worker, build dd2ec04e4717.
   Purpose: the hosted site opens with no signal, using the copy this browser last loaded.
   Rules that keep it safe:
     - A page load and the /bench/ data files go to the NETWORK FIRST. Online, a visitor always gets the newest
       version. The saved copy is used only when the network fails, or after 8 seconds with no answer.
     - Fonts, portraits, and record PDFs are saved the first time and reused (they change rarely).
     - Nothing else is touched, and nothing from another site.
     - Each build has its own cache name. When a new build installs, every older cache is deleted, so no one is
       left on an old version. */
const V = "cx-dd2ec04e4717";
const SLOW = 8000;
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(["/", "/favicon.svg"])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("cx-") && k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
function networkFirst(req, key) {
  return new Promise((resolve) => {
    let done = false;
    const fromCache = () => caches.match(key).then((hit) => hit || null);
    const timer = setTimeout(() => fromCache().then((hit) => { if (hit && !done) { done = true; resolve(hit); } }), SLOW);
    fetch(req).then((r) => {
      clearTimeout(timer);
      if (r.ok) { const copy = r.clone(); caches.open(V).then((c) => c.put(key, copy)); }
      if (!done) { done = true; resolve(r); }
    }).catch(() => {
      clearTimeout(timer);
      fromCache().then((hit) => { if (!done) { done = true; resolve(hit || new Response("You are offline, and this page has not been saved on this device yet.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } })); } });
    });
  });
}
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") { e.respondWith(networkFirst(req, "/")); return; }
  if (url.pathname.startsWith("/bench/") || url.pathname.startsWith("/us/") || url.pathname.startsWith("/i18n/") || url.pathname.startsWith("/districts/")) { e.respondWith(networkFirst(req, req)); return; }
  if (/^\/(fonts|portraits|records)\//.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(V).then((c) => c.put(req, copy)); } return r; })));
  }
});
