const CACHE_NAME = 'audio-gid-v4';

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
  console.log('SW v4: Installing...');
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of URLS_TO_CACHE) {
        try {
          const response = await fetch(url);
          if (response && response.status === 200) {
            await cache.put(url, response);
            console.log('SW v4 install cached:', url);
          }
        } catch (err) {
          console.log('SW v4 install skip:', url, err.message);
        }
      }
    }).then(() => {
      self.skipWaiting();
    })
  );
});

// ========== ACTIVATE ==========
self.addEventListener('activate', (e) => {
  console.log('SW v4: Activating...');
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('SW v4: Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      console.log('SW v4: Activated, claiming clients');
      return self.clients.claim();
    })
  );
});

// ========== FETCH ==========
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      if (response) return response;
      return fetch(e.request).catch(() => null);
    })
  );
});

// ========== MESSAGE ==========
self.addEventListener('message', (e) => {
  if (e.data.type === 'CACHE_ALL') {
    console.log('SW v4: CACHE_ALL started');
    e.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        const urls = [];
        Object.values(CONTENT_DATA.points).forEach(p => {
          if (p.image) urls.push(p.image);
          if (p.audio) urls.push(p.audio);
        });
        urls.push('map.png');
        
        let success = 0;
        for (const url of urls) {
          try {
            const cached = await cache.match(url);
            if (cached) { success++; continue; }
            
            const res = await fetch(url);
            if (res && res.status === 200) {
              await cache.put(url, res);
              success++;
            }
          } catch (err) {
            console.log('SW v4 cache fail:', url);
          }
        }
        console.log('SW v4: Cached', success, 'files');
      })
    );
  }
});