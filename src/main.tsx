import { StrictMode } from "react";
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Preload de rotas críticas
import "./utils/preloadCriticalRoutes.ts";

// Initialize push notifications service
import { initPushForUser } from './utils/pushNotifications';

// Service Worker registration and PWA setup
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('✅ Service Worker registrado:', registration.scope);
      
      // Update available
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 Nova versão do PWA disponível');
            }
          });
        }
      });
    } catch (error) {
      console.log('❌ Service Worker falhou:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
