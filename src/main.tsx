import { StrictMode } from "react";
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Preload de rotas críticas
import "./utils/preloadCriticalRoutes.ts";

// Sistema interno de membros (sem redirecionamentos)
import '@/utils/internalMembersLinks';

// Registro do Service Worker com atualização forçada
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        console.log('✅ Service Worker registrado com sucesso');
        
        // Verificar atualizações apenas uma vez a cada 5 minutos (não infinito)
        let lastUpdate = Date.now();
        setInterval(() => {
          const now = Date.now();
          if (now - lastUpdate > 300000) { // 5 minutos
            lastUpdate = now;
            registration.update();
          }
        }, 300000);
        
        // Detectar nova versão mas NÃO forçar reload automático
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nova versão disponível - apenas logar, SEM reload
                console.log('ℹ️ Nova versão disponível - recarregue manualmente se necessário');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('❌ Erro ao registrar Service Worker:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
