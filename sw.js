const CACHE_NAME = 'audio-gid-v10';

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
  console.log('SW v10: Installing...');
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of URLS_TO_CACHE) {
        try {
          const response = await fetch(url);
          if (response && response.status === 200) {
            await cache.put(url, response);
            console.log('SW v10 install cached:', url);
          }
        } catch (err) {
          console.log('SW v10 install skip:', url, err.message);
        }
      }
    }).then(() => {
      console.log('SW v10: Install complete');
      self.skipWaiting();
    })
  );
});

// ========== ACTIVATE ==========
self.addEventListener('activate', (e) => {
  console.log('SW v10: Activating...');
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('SW v10: Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      console.log('SW v10: Activated');
      return self.clients.claim();
    })
  );
});

// ========== FETCH ==========
self.addEventListener('fetch', (e) => {
  const requestUrl = new URL(e.request.url);
  let cacheKey = requestUrl.pathname;

  // Нормализуем путь
  if (cacheKey.includes('/audio_gid/')) {
    cacheKey = cacheKey.replace('/audio_gid/', './');
  } else if (cacheKey.startsWith('/')) {
    cacheKey = '.' + cacheKey;
  }

  console.log('SW v10: Fetch:', e.request.url, '→ key:', cacheKey);

  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Пробуем найти по нормализованному ключу
      let cachedResponse = await cache.match(cacheKey);

      // Если не нашли — пробуем без ./
      if (!cachedResponse && cacheKey.startsWith('./')) {
        cachedResponse = await cache.match(cacheKey.substring(2));
      }

      // Если не нашли — пробуем полный URL
      if (!cachedResponse) {
        cachedResponse = await cache.match(e.request.url);
      }

      if (cachedResponse) {
        console.log('SW v10: CACHE HIT:', cacheKey);

        // Проверяем, что ответ валидный (не пустой)
        const cloned = cachedResponse.clone();
        const blob = await cloned.blob();
        if (blob.size > 0) {
          console.log('SW v10: Serving from cache, size:', blob.size);
          return cachedResponse;
        } else {
          console.log('SW v10: Cached response is empty, fetching...');
        }
      }

      // Нет в кэше или пустой — пробуем сеть
      try {
        const networkResponse = await fetch(e.request);
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          const blob = await responseClone.blob();
          if (blob.size > 0) {
            await cache.put(cacheKey, networkResponse.clone());
            console.log('SW v10: Cached from network:', cacheKey, 'size:', blob.size);
          }
        }
        return networkResponse;
      } catch (err) {
        console.log('SW v10: OFFLINE, no cache:', cacheKey);
        // Офлайн и нет в кэше — возвращаем пустой MP3 чтобы не ломать плеер
        if (cacheKey.endsWith('.mp3') || cacheKey.endsWith('.ogg') || cacheKey.endsWith('.wav')) {
          return new Response(new Blob(), {
            status: 200,
            statusText: 'OK',
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': '0'
            }
          });
        }
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
    console.log('SW v10: CACHE_ALL started');
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
                console.log('SW v10: Already cached:', url, 'size:', blob.size);
                success++;
                continue;
              }
            }

            const res = await fetch(url);
            if (res && res.status === 200) {
              // КЛОНИРУЕМ до проверки blob!
              const resForCache = res.clone();
              const resForCheck = res.clone();
              const blob = await resForCheck.blob();
              if (blob.size > 0) {
                await cache.put(url, resForCache);
                success++;
                console.log('SW v10: Cached:', url, 'size:', blob.size);
              } else {
                failed++;
                console.log('SW v10: Empty response:', url);
              }
            } else {
              failed++;
              console.log('SW v10: Fetch failed:', url, res?.status);
            }
          } catch (err) {
            failed++;
            console.log('SW v10: Error:', url, err.message);
          }
        }

        console.log(`SW v10: Done. Success: ${success}, Failed: ${failed}`);

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
