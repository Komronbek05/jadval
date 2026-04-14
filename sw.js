const CACHE_NAME = 'dtt-schedule-v6-cache-1';

// Основные файлы для предварительного кеширования
const STATIC_ASSETS = [
    '/',
  '/sw.js',
  '/icon.png',
    '/index.html',
    '/manifest.json'
];

// Установка: кешируем базовые файлы
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Форсируем обновление SW
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// Активация: удаляем старые версии кеша
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Перехват запросов (Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // Игнорируем запросы к Firebase Database и Gemini API (они должны быть свежими)
    if (requestUrl.hostname.includes('firebasedatabase.app') || 
        requestUrl.hostname.includes('generativelanguage.googleapis.com')) {
        return;
    }

    // Для остальных файлов (включая CDN: Tailwind, шрифты, иконки) используем кеш + фоновое обновление
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const networkFetch = fetch(event.request).then((response) => {
                // Кешируем только успешные ответы
                if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            }).catch(() => {
                // Если нет интернета и нет в кеше — просто глотаем ошибку 
                // (Приложение все равно загрузит HTML из кеша)
            });

            // Мгновенно отдаем кеш (если есть), иначе ждем сеть
            return cachedResponse || networkFetch;
        })
    );
});
