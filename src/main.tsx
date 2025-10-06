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
        
        // Verificar atualizações a cada 60 segundos
        setInterval(() => {
          registration.update();
        }, 60000);
        
        // Detectar nova versão e forçar atualização
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nova versão disponível - recarregar página
                console.log('🔄 Nova versão disponível - recarregando...');
                window.location.reload();
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
