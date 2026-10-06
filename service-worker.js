const CACHE = 'phuquoc-pwa-v4-ui-logo';
const ASSETS = [
  './','./index.html','./css/style.css','./js/data.js','./js/app.js','./manifest.webmanifest','./assets/logo.png',
  './assets/days/day1.jpg','./assets/days/day2.jpg','./assets/days/day3.jpg','./assets/days/day4.jpg','./assets/days/day5.jpg','./assets/days/day6.jpg',
  './icons/icon-192.png','./icons/icon-512.png'
];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if(response && response.ok && event.request.url.startsWith(self.location.origin)){ const clone=response.clone(); caches.open(CACHE).then(cache=>cache.put(event.request,clone)); }
    return response;
  }).catch(()=> event.request.mode==='navigate' ? caches.match('./index.html') : cached)));
});
