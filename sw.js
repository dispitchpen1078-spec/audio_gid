const CACHE_NAME = 'audio-gid-v11';

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

// Определяем MIME-type по расширению
function getMimeType(url) {
  if (url.endsWith('.mp3')) return 'audio/mpeg';
  if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'image/jpeg';
  if (url.endsWith('.png')) return 'image/png';
  if (url.endsWith('.json')) return 'application/json';
  if (url.endsWith('.css')) return 'text/css';
  if (url.endsWith('.js')) return 'application/javascript';
  if (url.endsWith('.html')) return 'text/html';
  return 'application/octet-stream';
}

// ========== INSTALL ==========
self.addEventListener('install', (e) => {
  console.log('SW v11: Installing...');
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of URLS_TO_CACHE) {
        try {
          const response = await fetch(url);
          if (response && response.status === 200) {
            const blob = await response.blob();
            const mimeType = getMimeType(url);
            const newResponse = new Response(blob, {
              status: 200,
              statusText: 'OK',
              headers: {
                'Content-Type': mimeType,
                'Content-Length': blob.size.toString()
              }
            });
            await cache.put(url, newResponse);
            console.log('SW v11 install cached:', url, 'size:', blob.size, 'type:', mimeType);
          }
        } catch (err) {
          console.log('SW v11 install skip:', url, err.message);
        }
      }
    }).then(() => {
      console.log('SW v11: Install complete');
      self.skipWaiting();
    })
  );
});

// ========== ACTIVATE ==========
self.addEventListener('activate', (e) => {
  console.log('SW v11: Activating...');
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('SW v11: Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      console.log('SW v11: Activated');
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

  console.log('SW v11: Fetch:', e.request.url, '→ key:', cacheKey);

  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Ищем по нормализованному ключу
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
        console.log('SW v11: CACHE HIT:', cacheKey);

        // Проверяем заголовки
        const contentType = cachedResponse.headers.get('Content-Type');
        console.log('SW v11: Cached response type:', contentType);

        // Для аудио проверяем, что Content-Type правильный
        if (cacheKey.endsWith('.mp3') && (!contentType || !contentType.includes('audio'))) {
          console.log('SW v11: Wrong content-type for audio, fixing...');
          const blob = await cachedResponse.blob();
          const fixedResponse = new Response(blob, {
            status: 200,
            statusText: 'OK',
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': blob.size.toString()
            }
          });
          return fixedResponse;
        }

        return cachedResponse;
      }

      // Нет в кэше — пробуем сеть
      try {
        const networkResponse = await fetch(e.request);
        if (networkResponse && networkResponse.status === 200) {
          const blob = await networkResponse.clone().blob();
          const mimeType = getMimeType(cacheKey);
          const cacheResponse = new Response(blob, {
            status: 200,
            statusText: 'OK',
            headers: {
              'Content-Type': mimeType,
              'Content-Length': blob.size.toString()
            }
          });
          await cache.put(cacheKey, cacheResponse);
          console.log('SW v11: Cached from network:', cacheKey, 'size:', blob.size);

          // Возвращаем оригинальный network response
          return networkResponse;
        }
        return networkResponse;
      } catch (err) {
        console.log('SW v11: OFFLINE, no cache:', cacheKey);
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
    console.log('SW v11: CACHE_ALL started');
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
              const blob = await cached.blob();
              if (blob.size > 0) {
                console.log('SW v11: Already cached:', url, 'size:', blob.size);
                success++;
                continue;
              }
            }

            const res = await fetch(url);
            if (res && res.status === 200) {
              const blob = await res.blob();
              if (blob.size > 0) {
                const mimeType = getMimeType(url);
                const response = new Response(blob, {
                  status: 200,
                  statusText: 'OK',
                  headers: {
                    'Content-Type': mimeType,
                    'Content-Length': blob.size.toString()
                  }
                });
                await cache.put(url, response);
                success++;
                console.log('SW v11: Cached:', url, 'size:', blob.size, 'type:', mimeType);
              } else {
                failed++;
                console.log('SW v11: Empty response:', url);
              }
            } else {
              failed++;
              console.log('SW v11: Fetch failed:', url, res?.status);
            }
          } catch (err) {
            failed++;
            console.log('SW v11: Error:', url, err.message);
          }
        }

        console.log(`SW v11: Done. Success: ${success}, Failed: ${failed}`);

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
