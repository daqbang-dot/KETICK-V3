const CACHE_NAME = 'bizpro-v20';
const urlsToCache = [
  './',
  './index.html',
  './src/css/style.css',
  './src/js/app.js',
  './src/modules/dashboard/dashboard.html',
  './src/modules/pos/pos.html',
  './src/modules/inventory/inventory.html',
  './src/modules/crm/crm.html',
  './src/modules/billing/billing.html',
  './src/modules/promo/promo.html',
  './src/modules/social/social.html',
  './src/modules/blast/blast.html',
  './src/modules/autoreply/autoreply.html',
  './src/modules/lhdn/lhdn.html',
  './src/modules/history/history.html',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
});