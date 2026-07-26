// Minimal service worker — mainly here so the browser considers the app installable.
// This tool relies on live Firestore data, so it deliberately does NOT cache or
// serve page data offline; it just passes requests straight through to the network,
// only falling back to a cached shell file if the device is fully offline.
const CACHE_NAME = 'vk-agency-shell-v2';
const APP_SHELL = [
  './', './index.html', './dashboard.html', './zones.html', './employees.html',
  './daily.html', './attendance.html', './reports.html', './history.html', './account.html',
  './style.css', './firebase-init.js', './common.js', './shell.js',
  './dashboard.js', './zones.js', './employees.js', './daily.js',
  './attendance.js', './reports.js', './history.js', './account.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
