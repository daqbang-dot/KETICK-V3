const CACHE_NAME = 'bizpro-v54'; // Pastikan 'const' huruf kecil
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon/icon-512.png',
  './src/css/style.css',
  './src/js/app.js',
  './src/modules/dashboard/dashboard.html',
  './src/modules/dashboard/dashboard.js',
  './src/modules/pos/pos.html',
  './src/modules/pos/pos.js',
  './src/modules/inventory/inventory.html',
  './src/modules/crm/crm.html',
  './src/modules/billing/billing.html',
  './src/modules/promo/promo.html',
  './src/modules/social/social.html',
  './src/modules/blast/blast.html',
  './src/modules/autoreply/autoreply.html',
  './src/modules/lhdn/lhdn.html',
  './src/modules/history/history.html',
  './src/modules/report/report.html',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// 1. INSTALL: Simpan semua fail penting
self.addEventListener('install', event => {
  self.skipWaiting(); // ADVANCED: Paksa SW baru terus ambil alih tugas tanpa tunggu!
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// 2. ACTIVATE: Buang memori (cache) versi lama supaya tak bersepah
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) {
            console.log('Buang cache lama:', key);
            return caches.delete(key);
        }
      })
    ))
  );
  self.clients.claim(); // ADVANCED: Pastikan semua tab aktif terus pakai cache baru
});

// 3. FETCH: Strategi Hibrid Pintar
self.addEventListener('fetch', event => {
  // Hanya proses 'GET' request sahaja
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // A. Strategi 'Cache First': Khas untuk fail luar (CDN) sebab ia jarang berubah
  if (url.includes('cdn.tailwindcss.com') || url.includes('cdnjs.cloudflare.com') || url.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).then(networkResponse => {
            return caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
            });
        });
      })
    );
    return;
  }

  // B. Strategi 'Network First, Fallback to Cache': Khas untuk fail sistem kita (HTML/JS/CSS)
  // Ia akan sentiasa cuba tarik dari internet dulu supaya bos nampak update terkini. 
  // Kalau offline (takde line), baru dia panggil dari Cache.
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Jika berjaya dapat dari internet (online), simpan copy (dynamic caching)
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // Jika gagal/offline, baca dari memori (cache)
        return caches.match(event.request);
      })
  );
});
