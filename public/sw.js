// Service Worker para PWA, cache e Web Push - v10 (SOM CORRIGIDO FINAL)
const CACHE_NAME = 'kambafy-v10';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/kambafy-icon.png',
  '/kambafy-logo.png',
  '/sounds/notification.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache apenas URLs locais para evitar erros de CORS
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});

// Util: enviar mensagem para todos os clientes
async function broadcastMessage(data) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  for (const client of clients) client.postMessage(data);
}

// Exibir notificação de forma segura
async function showNotification(title, options) {
  try {
    const reg = await self.registration.showNotification(title, options);
    return reg;
  } catch (e) {
    // Ignorar erros silenciosamente
  }
}

// Handler para mensagens vindas do cliente (ex.: venda simulada)
self.addEventListener('message', (event) => {
  const data = event.data || {};
  // Venda manual (fallback/teste)
  if (data.type === 'VENDA_REALIZADA') {
    const title = 'Kambafy - Venda Realizada! 🎉';
    const body = `Sua comissão: ${data.valorComissao}\nProduto: ${data.produtoNome}`;
    showNotification(title, {
      body,
      icon: '/kambafy-icon.png',
      badge: '/kambafy-icon.png',
      tag: 'kambafy-sale',
      data: { url: '/', ts: Date.now() }
    });
    broadcastMessage({ type: 'PLAY_NOTIFICATION_SOUND' });
  }
});

// Handler para Web Push
self.addEventListener('push', (event) => {
  console.log('🔔 [SW] Push notification recebida!', event);
  
  let payload = {};
  try {
    if (event.data) {
      payload = event.data.json();
      console.log('🔔 [SW] Payload da notificação:', payload);
    }
  } catch (e) {
    console.error('🔔 [SW] Erro ao parsear payload:', e);
    payload = { title: '', body: event.data?.text() || 'Nova notificação' };
  }

  const title = payload.title || '';
  const body = payload.body || 'Você recebeu uma nova venda.';
  const url = payload.url || '/';
  const isVenda = title.includes('Nova Venda') || payload.tag === 'kambafy-sale' || payload.data?.isVenda;

  console.log('🔔 [SW] É venda?', isVenda);
  console.log('🔔 [SW] Título:', title);
  console.log('🔔 [SW] Tag:', payload.tag);
  console.log('🔔 [SW] Data:', payload.data);

  event.waitUntil((async () => {
    // Sempre mostrar a notificação
    await showNotification(title, {
      body,
      icon: '/kambafy-icon.png',
      badge: '/kambafy-icon.png',
      tag: payload.tag || 'kambafy-push',
      data: { url, ts: Date.now(), ...payload.data },
      silent: false
    });
    
    // SÓ TOCAR SOM SE FOR VENDA
    if (isVenda) {
      console.log('🔊 [SW] É VENDA! Enviando comando para tocar som de moeda...');
      await broadcastMessage({ 
        type: 'PLAY_NOTIFICATION_SOUND',
        isVenda: true,
        sound: 'coins'
      });
      console.log('🔊 [SW] Comando de som de moeda enviado!');
    } else {
      console.log('🔊 [SW] Não é venda, não tocando som');
    }
  })());
});

// Foco/abertura ao clicar na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      if (client.url.includes(new URL(targetUrl, self.location.origin).pathname)) {
        client.focus();
        return;
      }
    }
    await self.clients.openWindow(targetUrl);
  })());
});