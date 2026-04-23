const CACHE_NAME = 'wedplan-v2'; // Incrementamos a versão para forçar atualização
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

// Instalação: Cacheia os assets básicos
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força o novo SW a se tornar ativo imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Ativação: Limpa caches de versões antigas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Assume o controle das abas abertas imediatamente
  );
});

// Fetch: Tenta buscar na rede primeiro (Network First)
self.addEventListener('fetch', (event) => {
  // Ignora requisições de extensões ou esquemas que não sejam http/https (como chrome-extension)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a resposta for válida, guarda uma cópia no cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Se a rede falhar (offline), tenta buscar no cache
        return caches.match(event.request);
      })
  );
});
