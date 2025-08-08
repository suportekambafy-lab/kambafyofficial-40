import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { initPushForUser } from '@/utils/pushNotifications';

export function usePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    initPushForUser(user.id);
  }, [user?.id]);
}
