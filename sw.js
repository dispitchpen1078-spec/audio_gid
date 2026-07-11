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
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('SW installing, caching:', URLS_TO_CACHE);
      for (const url of URLS_TO_CACHE) {
        try {
          await cache.add(url);
          console.log('Cached on install:', url);
        } catch (err) {
          console.log('Install cache skip:', url, err.message);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
  console.log('SW activated');
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
        try {
          const res = await fetch('content.json');
          let data = DEFAULT_CONTENT; // fallback
          
          if (res.ok) {
            try {
              data = await res.json();
            } catch (parseErr) {
              console.log('content.json parse error, using default');
            }
          }
          
          const urls = [];
          Object.values(data.points || {}).forEach(p => {
            if (p.image && !p.image.startsWith('http')) urls.push(p.image);
            if (p.audio && !p.audio.startsWith('http')) urls.push(p.audio);
          });
          urls.push('map.png');
          
          console.log('Caching URLs:', urls);
          
          // Кэшируем по одному, чтобы один упавший не ломал всё
          for (const url of urls) {
            try {
              const response = await fetch(url);
              if (response.ok) {
                await cache.put(url, response);
                console.log('Cached:', url);
              } else {
                console.log('Failed to fetch for cache:', url, response.status);
              }
            } catch (err) {
              console.log('Cache error for', url, err.message);
            }
          }
          
          // Отправляем ответ обратно в основной поток
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({ type: 'CACHE_COMPLETE', cached: urls.length });
          });
          
        } catch (err) {
          console.error('CACHE_ALL error:', err);
        }
      })
    );
  }
});
