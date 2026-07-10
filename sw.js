const CACHE_NAME = "guide-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/guide.html",
  "/guide-style.css",
  "/guide-app.js",
  "/admin",
  "/qr",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      if (response) return response;
      return fetch(e.request).then(fetchResponse => {
        // Кэшируем изображения и аудио на лету
        if (e.request.url.match(/\.(jpg|jpeg|png|gif|mp3|mp4)$/)) {
          const clone = fetchResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return fetchResponse;
      }).catch(() => {
        // Offline fallback
        if (e.request.destination === "document") {
          return caches.match("/index.html");
        }
      });
    })
  );
});