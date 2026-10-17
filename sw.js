// Service worker de Logística TEINCOMIN (app de escritorio + página de firma del celular).
// Abre al instante con la copia guardada y la actualiza en segundo plano. Las llamadas al Apps Script nunca se cachean.
const CACHE = 'log-v5';
const SHELL = ['./', './index.html', './firma.html', './styles.css', './api.js', './app.js', './pedidos.js', './kardex.js',
  './manifest.webmanifest', './firma.webmanifest', './icon-192.png', './icon-512.png', './teincomin.png'];
const LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];
const CACHEABLE_ORIGINS = ['https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))
      .then(() => Promise.all(LIBS.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  if (!sameOrigin && !CACHEABLE_ORIGINS.includes(url.origin)) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    const fromNetwork = fetch(sameOrigin ? new Request(req.url, { cache: 'no-cache' }) : req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    });
    if (cached) { e.waitUntil(fromNetwork.catch(() => {})); return cached; }
    return fromNetwork;
  })());
});
