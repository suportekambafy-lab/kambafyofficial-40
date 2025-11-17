interface OneSignalPlugin {
  setAppId: (appId: string) => void;
  setNotificationOpenedHandler: (handler: (jsonData: any) => void) => void;
  promptForPushNotificationsWithUserResponse: (handler: (accepted: boolean) => void) => void;
  getDeviceState: (callback: (state: any) => void) => void;
}

declare global {
  interface Window {
    plugins: {
      OneSignal?: OneSignalPlugin;
      [key: string]: any;
    };
  }
}

export {};

