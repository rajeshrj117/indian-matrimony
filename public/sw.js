// Minimal service worker — its main job is to exist and register, which is
// one of the browser's requirements for showing the "Add to Home Screen" /
// install prompt. It passes all requests straight through to the network
// (no offline caching), so it can't serve stale app data.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }
  // event.respondWith() must resolve to a Response — if fetch() itself rejects (dropped
  // connection, request cancelled by navigation, offline, etc.) and we don't catch it,
  // the browser logs "FetchEvent resulted in a network error response: the promise was
  // rejected". Since this worker doesn't cache anything, there's nothing to fall back to;
  // the best we can do is turn that rejection into an explicit, quiet network-error Response.
  event.respondWith(
    fetch(request).catch(() => Response.error())
  );
});