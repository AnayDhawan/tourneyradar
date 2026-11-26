/* TourneyRadar service worker.
 *
 * Plain JavaScript on purpose: it is served as-is from /sw.js and cannot go
 * through the Next.js bundler. The rules it follows are covered by
 * lib/service-worker.test.ts, which runs this exact file in a sandbox.
 *
 * What it caches:
 *   - a small app shell (offline page, icons, manifest), precached on install
 *     into a cache named after the build, so every deploy gets a fresh one;
 *   - /_next/static/*, which is content-hashed and immutable, cache-first.
 *
 * What it never touches (the request goes straight to the network and the
 * response never enters a cache): non-GET requests, cross-origin requests
 * (Supabase REST/auth/realtime, map tiles, analytics), /api/*, /auth/*,
 * /relay/*, /_vercel/*, and Next.js data fetches. Pages themselves are
 * network-only; the only thing served from a cache for a navigation is the
 * generic offline page, and only when the network request fails.
 *
 * Versioning: the page registers this file as /sw.js?v=<build id>. The URL
 * changes on every deploy, so the browser installs a new worker, which builds
 * a new shell cache and deletes the old ones on activate.
 */

var VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
var SHELL_CACHE_PREFIX = "tr-shell-";
var SHELL_CACHE = SHELL_CACHE_PREFIX + VERSION;
// Not versioned: file names carry a content hash, so an entry can never be
// stale, and keeping them lets a tab that is still open on the previous deploy
// load its lazy chunks. Trimmed to MAX_STATIC_ENTRIES instead.
var STATIC_CACHE = "tr-static";
var MAX_STATIC_ENTRIES = 150;

var OFFLINE_URL = "/offline.html";
var SHELL_URLS = [
  OFFLINE_URL,
  "/site.webmanifest",
  "/favicon.ico",
  "/favicon.svg",
  "/favicon-96x96.png",
  "/apple-touch-icon.png",
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
];

var NEVER_CACHED_PREFIXES = ["/api/", "/auth/", "/relay/", "/_vercel/"];

function isNeverCached(pathname) {
  for (var i = 0; i < NEVER_CACHED_PREFIXES.length; i++) {
    if (pathname.indexOf(NEVER_CACHED_PREFIXES[i]) === 0) return true;
  }
  return pathname === "/api";
}

// A response is only worth storing when it is a plain, successful, same-origin
// one that does not ask not to be stored or set a cookie.
function isCacheable(response) {
  if (!response || response.status !== 200 || response.type !== "basic") return false;
  var cacheControl = response.headers.get("Cache-Control") || "";
  if (/no-store|private/i.test(cacheControl)) return false;
  return !response.headers.get("Set-Cookie");
}

// Returns "navigate", "static", "shell" or null (leave the request alone).
function classify(request) {
  if (request.method !== "GET") return null;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return null;
  if (isNeverCached(url.pathname)) return null;
  if (request.headers.get("Authorization")) return null;
  if (request.mode === "navigate") return "navigate";
  if (url.pathname.indexOf("/_next/static/") === 0) return "static";
  if (SHELL_URLS.indexOf(url.pathname) !== -1) return "shell";
  return null;
}

function trimStaticCache(cache) {
  return cache.keys().then(function (keys) {
    var excess = keys.length - MAX_STATIC_ENTRIES;
    if (excess <= 0) return undefined;
    // keys() is in insertion order, so the oldest entries go first.
    return Promise.all(keys.slice(0, excess).map(function (key) { return cache.delete(key); }));
  });
}

function cacheFirstStatic(request) {
  return caches.open(STATIC_CACHE).then(function (cache) {
    return cache.match(request).then(function (hit) {
      if (hit) return hit;
      return fetch(request).then(function (response) {
        if (!isCacheable(response)) return response;
        return cache.put(request, response.clone())
          .then(function () { return trimStaticCache(cache); })
          .then(function () { return response; });
      });
    });
  });
}

// Shell files change only with a deploy, which creates a new cache. Serve the
// precached copy and fall through to the network when it is missing.
function shellFile(request) {
  return caches.open(SHELL_CACHE).then(function (cache) {
    return cache.match(request).then(function (hit) { return hit || fetch(request); });
  });
}

function navigation(request) {
  return fetch(request).catch(function () {
    return caches.open(SHELL_CACHE).then(function (cache) {
      return cache.match(OFFLINE_URL).then(function (offline) {
        return offline || Response.error();
      });
    });
  });
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(function (cache) { return cache.addAll(SHELL_URLS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (names) {
        return Promise.all(names
          .filter(function (name) {
            return name.indexOf(SHELL_CACHE_PREFIX) === 0 && name !== SHELL_CACHE;
          })
          .map(function (name) { return caches.delete(name); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var kind = classify(event.request);
  if (kind === null) return;
  if (kind === "static") event.respondWith(cacheFirstStatic(event.request));
  else if (kind === "shell") event.respondWith(shellFile(event.request));
  else event.respondWith(navigation(event.request));
});
