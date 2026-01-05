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

    // Atualizar tema do WebView
    updateThemeColor(isDarkMode);

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

// Atualiza a meta tag theme-color para sincronizar o WebView com o tema
export function updateThemeColor(isDarkMode: boolean) {
  const themeColor = isDarkMode ? '#1a1d26' : '#ffffff';
  
  // Atualizar meta theme-color
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', themeColor);
  } else {
    // Criar meta tag se não existir
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    metaThemeColor.setAttribute('content', themeColor);
    document.head.appendChild(metaThemeColor);
  }

  // Atualizar cor de fundo do body para match
  document.body.style.backgroundColor = themeColor;
  
  console.log('🎨 Theme color updated to:', themeColor);
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
