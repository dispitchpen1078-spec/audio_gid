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
          // Fallback данные
          const data = {
            points: {
              pool: { image: "images/1.jpg", audio: "audio/1.mp3" },
              building: { image: "images/2.jpg", audio: "audio/2.mp3" },
              cafe: { image: "images/3.jpg", audio: "audio/3.mp3" },
              playground: { image: "images/4.jpg", audio: "audio/4.mp3" },
              campfire: { image: "images/5.jpg", audio: "audio/5.mp3" },
              gym: { image: "images/6.jpg", audio: "audio/6.mp3" },
              tennis: { image: "images/7.jpg", audio: "audio/7.mp3" },
              football: { image: "images/8.jpg", audio: "audio/8.mp3" }
            }
          };
          
          const urls = [];
          Object.values(data.points).forEach(p => {
            if (p.image) urls.push(p.image);
            if (p.audio) urls.push(p.audio);
          });
          urls.push('map.png');
          
          console.log('SW: Caching', urls.length, 'files');
          let success = 0;
          let failed = 0;
          
          for (const url of urls) {
            try {
              const response = await fetch(url, { mode: 'no-cors' });
              if (response) {
                await cache.put(url, response);
                success++;
                console.log('SW cached:', url);
              }
            } catch (err) {
              failed++;
              console.log('SW cache failed:', url, err.message);
            }
          }
          
          console.log(`SW: Cached ${success}/${urls.length}, failed ${failed}`);
          
        } catch (err) {
          console.error('SW CACHE_ALL error:', err);
        }
      })
    );
  }
});
