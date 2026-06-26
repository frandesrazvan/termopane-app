const CACHE_NAME = "termopane-static-v1";
const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/icons/termopane-icon.svg",
  "/icons/termopane-maskable.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());

  return response;
}

async function networkFirstNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(
      `<!doctype html>
<html lang="ro">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Termopane App offline</title>
    <style>
      body {
        margin: 0;
        background: #fafaf9;
        color: #18181b;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }
      section {
        max-width: 420px;
        border: 1px solid #e4e4e7;
        border-radius: 8px;
        background: white;
        padding: 20px;
        box-shadow: 0 1px 2px rgba(24, 24, 27, 0.06);
      }
      h1 {
        margin: 0;
        font-size: 20px;
      }
      p {
        margin: 12px 0 0;
        color: #52525b;
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <main>
      <section>
        <h1>Conexiune indisponibila</h1>
        <p>Aplicatia nu poate incarca aceasta pagina fara internet. Reincearca dupa revenirea conexiunii.</p>
      </section>
    </main>
  </body>
</html>`,
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
        status: 503,
        statusText: "Offline",
      },
    );
  }
}
