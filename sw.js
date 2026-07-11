const CACHE_NAME = 'audio-gid-v9';

const URLS_TO_CACHE = [
  './',
  './index.html',
  './guide.html',
  './guide-style.css',
  './guide-app.js',
  './content.json',
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
  console.log('SW v9: Installing...');
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of URLS_TO_CACHE) {
        try {
          const response = await fetch(url);
          if (response && response.status === 200) {
            await cache.put(url, response);
            console.log('SW v9 install cached:', url);
          }
        } catch (err) {
          console.log('SW v9 install skip:', url, err.message);
        }
      }
    }).then(() => {
      console.log('SW v9: Install complete');
      self.skipWaiting();
    })
  );
});

// ========== ACTIVATE ==========
self.addEventListener('activate', (e) => {
  console.log('SW v9: Activating...');
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('SW v9: Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      console.log('SW v9: Activated');
      return self.clients.claim();
    })
  );
});

// ========== FETCH ==========
self.addEventListener('fetch', (e) => {
  const requestUrl = new URL(e.request.url);
  const pathname = requestUrl.pathname;

  // Нормализуем путь для поиска в кэше
  // Убираем начальный слеш и префикс репозитория
  let cacheKey = pathname;

  // Если URL содержит /audio_gid/ — убираем префикс
  if (cacheKey.includes('/audio_gid/')) {
    cacheKey = cacheKey.replace('/audio_gid/', '/');
  }

  // Убираем начальный слеш
  if (cacheKey.startsWith('/')) {
    cacheKey = cacheKey.substring(1);
  }

  console.log('SW v9: Fetch request:', e.request.url, '→ cacheKey:', cacheKey);

  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Ищем по нормализованному ключу
      let cachedResponse = await cache.match(cacheKey);

      // Если не нашли — пробуем с ./ префиксом
      if (!cachedResponse) {
        cachedResponse = await cache.match('./' + cacheKey);
      }

      // Если не нашли — пробуем полный URL
      if (!cachedResponse) {
        cachedResponse = await cache.match(e.request);
      }

      if (cachedResponse) {
        console.log('SW v9: Cache hit for:', cacheKey);
        return cachedResponse;
      }

      // Нет в кэше — пробуем сеть
      try {
        const networkResponse = await fetch(e.request);
        if (networkResponse && networkResponse.status === 200) {
          // Кладём в кэш под нормализованным ключом
          const responseClone = networkResponse.clone();
          cache.put(cacheKey, responseClone);
          console.log('SW v9: Cached from network:', cacheKey);
        }
        return networkResponse;
      } catch (err) {
        console.log('SW v9: Network failed:', cacheKey, err.message);
        // Офлайн и нет в кэше
        return new Response('Not found', {
          status: 404,
          statusText: 'Not Found',
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })
  );
});

// ========== MESSAGE (CACHE_ALL) ==========
self.addEventListener('message', (e) => {
  if (e.data.type === 'CACHE_ALL') {
    console.log('SW v9: CACHE_ALL started');
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
              const cloned = cached.clone();
              const blob = await cloned.blob();
              if (blob.size > 0) {
                console.log('SW v9: Already cached:', url, 'size:', blob.size);
                success++;
                continue;
              }
            }

            const res = await fetch(url);
            if (res && res.status === 200) {
              const resClone = res.clone();
              const blob = await resClone.blob();
              if (blob.size > 0) {
                await cache.put(url, res);
                success++;
                console.log('SW v9: Cached:', url, 'size:', blob.size);
              } else {
                failed++;
                console.log('SW v9: Empty response:', url);
              }
            } else {
              failed++;
              console.log('SW v9: Fetch failed:', url, res?.status);
            }
          } catch (err) {
            failed++;
            console.log('SW v9: Error:', url, err.message);
          }
        }

        console.log(`SW v9: Done. Success: ${success}, Failed: ${failed}`);

        if (e.source) {
          e.source.postMessage({
            type: 'CACHE_COMPLETE',
            success: success,
            failed: failed
          });
        }
      })
    );
  }
});
