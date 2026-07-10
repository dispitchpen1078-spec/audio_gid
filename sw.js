const CACHE_NAME = 'audio-guide-v1';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './guide.html',
  './guide-style.css',
  './guide-app.js',
  './map.png',
  './manifest.json',
  './qr-codes.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      if (response) return response;
      return fetch(e.request).then((res) => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        return res;
      });
    })
  );
});

self.addEventListener('message', (e) => {
  if (e.data.type === 'CACHE_ALL') {
    e.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        const res = await fetch('content.json');
        if (res.ok) {
          const data = await res.json();
          const urls = [];
          Object.values(data.points || {}).forEach(p => {
            if (p.image) urls.push(p.image);
            if (p.audio) urls.push(p.audio);
          });
          urls.push('map.png');
          await cache.addAll(urls.filter(u => !u.startsWith('http')));
        }
      })
    );
  }
});