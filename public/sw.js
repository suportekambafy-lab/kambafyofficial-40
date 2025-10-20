// Service Worker para PWA com cache otimizado e atualização forçada
// VERSÃO ATUALIZADA - Incrementar quando houver mudanças importantes
const CACHE_VERSION = 'kambafy-v' + Date.now(); // Versão dinâmica baseada em timestamp
const CACHE_NAME = CACHE_VERSION;

// URLs que NUNCA devem ser cacheadas (sempre buscar da rede)
const NEVER_CACHE = [
  '/index.html',
  '/',
  '/vendedor',
  '/checkout'
];

// Domínios externos que NUNCA devem ser interceptados pelo SW
const EXTERNAL_APIS = [
  'ipapi.co',
  'exchangerate-api.com',
  'cloudflarestream.com',
  'r2.cloudflarestorage.com',
  'b-cdn.net'
];

// Instalação - skipWaiting para forçar ativação imediata
self.addEventListener('install', (event) => {
  console.log('🔄 SW: Instalando nova versão:', CACHE_VERSION);
  
  // Força a ativação imediata sem esperar
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✅ SW: Cache criado:', CACHE_NAME);
      return cache.addAll(['/manifest.json']);
    })
  );
});

// Ativação - limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('🔄 SW: Ativando nova versão:', CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Força o controle imediato de todas as páginas
      self.clients.claim(),
      
      // Limpar caches antigos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ SW: Deletando cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Fetch - Network First para HTML, Cache First para assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // NUNCA interceptar APIs externas
  if (EXTERNAL_APIS.some(domain => url.hostname.includes(domain))) {
    return; // Deixa o navegador lidar diretamente
  }
  
  // NUNCA cachear HTML e rotas principais
  if (NEVER_CACHE.some(path => url.pathname === path || url.pathname.startsWith(path))) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }
  
  // Para assets (JS, CSS, imagens), usar cache mas sempre tentar atualizar
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2)$/)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch(event.request)
          .then((response) => {
            // Cachear a nova versão
            cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => {
            // Se offline, retornar do cache
            return cache.match(event.request);
          });
      })
    );
    return;
  }
  
  // Para tudo o resto, tentar network primeiro
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
      .then(response => {
        // Se não há resposta, retornar uma resposta vazia válida
        if (!response) {
          return new Response('', { status: 504, statusText: 'Gateway Timeout' });
        }
        return response;
      })
  );
});