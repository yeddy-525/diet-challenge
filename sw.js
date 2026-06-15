// ── Firebase 메시지 수신 (백그라운드 알림) ──
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

if (!firebase.apps.length) {
  firebase.initializeApp({
    apiKey: 'AIzaSyBWUFXjblgxEcJDcBZSwgTNMG7UMpqifc0',
    projectId: 'diet-challenge-7cb23',
    messagingSenderId: '672431991021',
    appId: '1:672431991021:web:6dea93466d4b0d3aa584e4',
  });
}

firebase.messaging().onBackgroundMessage(payload => {
  const n = payload.notification || {};
  self.registration.showNotification(n.title || '몸짱대결', {
    body: n.body || '',
    icon: 'https://yeddy-525.github.io/diet-challenge/icons/icon-192.png',
    tag: 'diet-challenge',
    requireInteraction: false,
  });
});

// ── PWA 캐시 ──
const CACHE = 'diet-v4';
const ASSETS = ['./', './index.html', './guest.html'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' })))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  const isHtml = url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/');

  if (isHtml) {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
  }
});
