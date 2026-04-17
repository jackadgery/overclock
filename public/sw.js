const CACHE_NAME = "overclock-v1";

// Cache Next.js static assets aggressively (content-hashed, safe to cache forever)
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Delete old caches on activation
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept Supabase, API routes, or auth calls
  if (
    url.hostname.includes("supabase.co") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/")
  ) {
    return;
  }

  // Cache-first for Next.js static assets (JS, CSS — content-hashed, immutable)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const toCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, toCache));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for everything else (HTML pages, images)
  // Falls back to cache if offline, then a plain offline message
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful HTML responses for offline fallback
        if (
          response.ok &&
          request.method === "GET" &&
          request.headers.get("accept")?.includes("text/html")
        ) {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, toCache));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(
          (cached) =>
            cached ||
            new Response(
              `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OVERCLOCK — Offline</title><style>body{background:#0a0a0c;color:#525252;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}div{text-align:center}.t{color:#00f0ff;font-size:.65rem;letter-spacing:.15em;margin-bottom:.5rem}.m{font-size:.8rem}</style></head><body><div><div class="t">SYS.ERR // NO SIGNAL</div><div class="m">Reconnect to access OVERCLOCK</div></div></body></html>`,
              { headers: { "Content-Type": "text/html" } }
            )
        )
      )
  );
});
