import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { initPushForUser } from '@/utils/pushNotifications';

const isPushSupported = () =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

export const PushPermissionPrompt: React.FC = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (!isPushSupported()) return;
    setStatus(Notification.permission);
    setVisible(Notification.permission !== 'granted');
  }, []);

  const handleEnable = async () => {
    try {
      if (!isPushSupported()) return;

      // Pedir permissão em resposta a clique do usuário
      const permission = await Notification.requestPermission();
      setStatus(permission);

      if (permission === 'granted') {
        if (user?.id) await initPushForUser(user.id);
        setVisible(false);
      } else if (permission === 'denied') {
        // Mostrar instrução rápida
        alert('Você bloqueou notificações. Ative em: Configurações do site > Notificações > Permitir.');
      }
    } catch (e) {
      console.error('Erro ao solicitar permissão de notificação:', e);
    }
  };

  if (!visible || !user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="rounded-lg border bg-card text-card-foreground shadow-lg p-4">
        <div className="mb-2 font-medium">Ativar notificações de vendas</div>
        <p className="text-sm opacity-80 mb-3">
          Receba alertas instantâneos quando uma venda for confirmada. Você pode alterar isso a qualquer momento nas configurações do navegador.
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleEnable}>Permitir notificações</Button>
          <Button size="sm" variant="ghost" onClick={() => setVisible(false)}>Agora não</Button>
        </div>
        {status === 'denied' && (
          <p className="text-xs mt-2 opacity-70">
            Permissão bloqueada. Vá em Configurações do site e defina Notificações como "Permitir" para este site.
          </p>
        )}
      </div>
    </div>
  );
};

export default PushPermissionPrompt;
