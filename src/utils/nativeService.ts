import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';

export async function initializeNativeFeatures(isDarkMode: boolean = false) {
  const isNative = Capacitor.isNativePlatform();
  
  if (!isNative) {
    console.log('Running in web mode - native features disabled');
    return;
  }

  try {
    // Configurar Status Bar
    await configureStatusBar(isDarkMode);

    // Ocultar Splash Screen após carregamento
    await SplashScreen.hide();

    console.log('Native features initialized successfully');
  } catch (error) {
    console.error('Error initializing native features:', error);
  }
}

export async function configureStatusBar(isDarkMode: boolean = false) {
  const isNative = Capacitor.isNativePlatform();
  
  if (!isNative) return;

  try {
    // Configurar estilo da Status Bar baseado no tema
    await StatusBar.setStyle({
      style: isDarkMode ? Style.Dark : Style.Light
    });

    // Configurar cor de fundo baseado no tema
    await StatusBar.setBackgroundColor({
      color: isDarkMode ? '#1a1d26' : '#ffffff'
    });

    // Sobrepor conteúdo web
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (error) {
    console.error('Error configuring status bar:', error);
  }
}

export async function hideSplashScreen() {
  const isNative = Capacitor.isNativePlatform();
  
  if (!isNative) return;

  try {
    await SplashScreen.hide();
  } catch (error) {
    console.error('Error hiding splash screen:', error);
  }
}

export async function showSplashScreen() {
  const isNative = Capacitor.isNativePlatform();
  
  if (!isNative) return;

  try {
    await SplashScreen.show({
      autoHide: false,
      showDuration: 2000
    });
  } catch (error) {
    console.error('Error showing splash screen:', error);
  }
}
