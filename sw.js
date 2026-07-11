const CACHE_NAME = 'audio-gid-v5';

const URLS_TO_CACHE = [
  './',
  './index.html',
  './gid.html',
  './guide-style.css',
  './guide-app.js',
  './map.png',
  './manifest.json',
  './qr-codes.html'
];

const CONTENT_DATA = {
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

// ========== INSTALL ==========
self.addEventListener('install', (e) => {
  console.log('SW v5: Installing...');
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of URLS_TO_CACHE) {
        try {
          const response = await fetch(url);
          if (response && response.status === 200) {
            await cache.put(url, response);
            console.log('SW v5 install cached:', url);
          }
        } catch (err) {
          console.log('SW v5 install skip:', url, err.message);
        }
      }
    }).then(() => {
      self.skipWaiting();
    })
  );
});

// ========== ACTIVATE ==========
self.addEventListener('activate', (e) => {
  console.log('SW v5: Activating...');
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('SW v5: Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      console.log('SW v5: Activated');
      return self.clients.claim();
    })
  );
});

// ========== FETCH ==========
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // Если есть в кэше — отдаём из кэша
      if (cachedResponse) {
        console.log('SW v5: Cache hit:', e.request.url);
        return cachedResponse;
      }
      
      // Иначе пробуем загрузить из сети
      return fetch(e.request).then((networkResponse) => {
        // Если успешно — кладём в кэш и отдаём
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      }).catch((err) => {
        // Сеть недоступна и нет в кэше — возвращаем пустой ответ вместо ошибки
        console.log('SW v5: Network failed, no cache:', e.request.url);
        // Для аудио возвращаем пустой 200 ответ, чтобы не ломать плеер
        if (e.request.url.match(/\.(mp3|mp4|ogg|wav)$/i)) {
          return new Response('', { status: 200, statusText: 'OK' });
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});

// ========== MESSAGE ==========
self.addEventListener('message', (e) => {
  if (e.data.type === 'CACHE_ALL') {
    console.log('SW v5: CACHE_ALL started');
    e.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        const urls = [];
        Object.values(CONTENT_DATA.points).forEach(p => {
          if (p.image) urls.push(p.image);
          if (p.audio) urls.push(p.audio);
        });
        urls.push('map.png');
        
        let success = 0;
        let failed = 0;
        
        for (const url of urls) {
          try {
            const cached = await cache.match(url);
            if (cached) {
              console.log('SW v5: Already cached:', url);
              success++;
              continue;
            }
            
            const res = await fetch(url);
            if (res && res.status === 200) {
              await cache.put(url, res);
              success++;
              console.log('SW v5: Cached:', url);
            } else {
              failed++;
              console.log('SW v5: Fetch failed:', url, res?.status);
            }
          } catch (err) {
            failed++;
            console.log('SW v5: Error:', url, err.message);
          }
        }
        
        console.log(`SW v5: Done. Success: ${success}, Failed: ${failed}`);
      })
    );
  }
});