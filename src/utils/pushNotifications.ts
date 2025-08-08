import { supabase } from '@/integrations/supabase/client';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('get-vapid-public-key');
    if (error) throw error;
    return data?.publicKey || null;
  } catch (e) {
    console.warn('Falha ao obter VAPID public key:', e);
    return null;
  }
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready; // garante ativo
    return reg;
  } catch (e) {
    console.error('Erro ao registrar Service Worker:', e);
    return null;
  }
}

async function saveSubscription(userId: string, sub: PushSubscription) {
  const json = sub.toJSON();
  const p256dh = (json.keys as any)?.p256dh;
  const auth = (json.keys as any)?.auth;
  const endpoint = json.endpoint as string;
  if (!endpoint || !p256dh || !auth) return;

  await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint,
    p256dh,
    auth,
    user_agent: navigator.userAgent,
    last_seen_at: new Date().toISOString(),
    is_active: true,
  }, { onConflict: 'endpoint' });
}

export async function initPushForUser(userId: string) {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const registration = await registerServiceWorker();
  if (!registration) return;

  let permission = Notification.permission;
  if (permission === 'default') permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const publicKey = await getVapidPublicKey();
  if (!publicKey) {
    console.warn('VAPID public key ausente. Configure os segredos para ativar Push.');
    return;
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    } catch (e) {
      console.error('Erro ao criar push subscription:', e);
      return;
    }
  }

  await saveSubscription(userId, subscription);
}
