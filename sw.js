const CACHE_NAME = 'aarambh-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/auth.html',
  '/auth.css',
  '/auth.js',
  '/profile.html',
  '/profile.css',
  '/profile.js',
  '/history.html',
  '/history.css',
  '/history.js',
  '/statistics.html',
  '/statistics.css',
  '/statistics.js',
  '/dashboard.html',
  '/dashboard.css',
  '/dashboard.js',
  '/manifest.json',
  '/assets/aarambh.ico'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Fetch event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  self.clients.claim();
});