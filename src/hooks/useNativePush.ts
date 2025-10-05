import { useState, useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export interface NativePushOptions {
  onNotificationReceived?: (notification: any) => void;
  onNotificationActionPerformed?: (notification: any) => void;
}

export function useNativePush(options?: NativePushOptions) {
  const [isSupported, setIsSupported] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    setIsSupported(isNative);

    if (!isNative) {
      // Fallback para web
      if ('Notification' in window) {
        setIsSupported(true);
        setPermissionStatus(
          Notification.permission === 'granted' ? 'granted' :
          Notification.permission === 'denied' ? 'denied' : 'prompt'
        );
      }
      return;
    }

    // Configurar listeners nativos
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token: ' + token.value);
      setToken(token.value);
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ' + JSON.stringify(notification));
      options?.onNotificationReceived?.(notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
      options?.onNotificationActionPerformed?.(notification);
    });

    // Verificar permissão atual
    PushNotifications.checkPermissions().then(result => {
      setPermissionStatus(result.receive === 'granted' ? 'granted' : 
                         result.receive === 'denied' ? 'denied' : 'prompt');
    });

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    const isNative = Capacitor.isNativePlatform();

    if (!isNative) {
      // Fallback para web
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        setPermissionStatus(permission === 'granted' ? 'granted' : 
                           permission === 'denied' ? 'denied' : 'prompt');
        return permission === 'granted';
      }
      return false;
    }

    try {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        setPermissionStatus('denied');
        return false;
      }

      setPermissionStatus('granted');
      await PushNotifications.register();
      return true;
    } catch (error) {
      console.error('Error requesting push permission:', error);
      return false;
    }
  };

  const sendLocalNotification = async (title: string, body: string, data?: any) => {
    const isNative = Capacitor.isNativePlatform();

    if (!isNative) {
      // Fallback para web
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/kambafy-symbol.svg',
          badge: '/kambafy-symbol.svg',
          data
        });
        return true;
      }
      return false;
    }

    try {
      // Importar LocalNotifications dinamicamente para evitar erro em web
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 100) },
            sound: 'default',
            smallIcon: 'res://drawable/ic_notification',
            extra: data
          }
        ]
      });
      return true;
    } catch (error) {
      console.error('Error sending local notification:', error);
      return false;
    }
  };

  return {
    isSupported,
    permissionStatus,
    token,
    requestPermission,
    sendLocalNotification
  };
}
