import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface CrispChatProps {
  websiteId?: string;
}

export function CrispChat({ websiteId = '62ac656c-3096-4b39-bbe1-05a210b6dfc4' }: CrispChatProps) {
  const { user } = useAuth();

  useEffect(() => {
    // Limpar instância anterior se existir
    if (window.$crisp) {
      window.$crisp = [];
      const existingScript = document.getElementById('crisp-script');
      if (existingScript) {
        existingScript.remove();
      }
    }

    // Inicializar Crisp
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = websiteId;

    // Carregar script do Crisp
    const script = document.createElement('script');
    script.id = 'crisp-script';
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      // Customizar aparência
      if (window.$crisp) {
        // Aguardar o Crisp carregar completamente
        window.$crisp.push(['safe', true]);

        // Definir posição
        window.$crisp.push(['config', 'position:reverse', [false]]);
        
        // Customizar cores (tema Kambafy)
        window.$crisp.push(['config', 'color:theme', ['#10b981']]);
        
        // Chat fica visível e acessível
        window.$crisp.push(['do', 'chat:show']);
        
        // Se o usuário estiver logado, enviar informações
        if (user) {
          window.$crisp.push(['set', 'user:email', [user.email || '']]);
          window.$crisp.push(['set', 'user:nickname', [user.email || 'Vendedor']]);
          
          // Adicionar informações customizadas
          window.$crisp.push(['set', 'session:data', [[
            ['user_id', user.id],
            ['user_type', 'seller'],
            ['email_verified', user.email_confirmed_at ? 'yes' : 'no'],
            ['platform', 'web']
          ]]]);
        }
      }
    };

    // Cleanup ao desmontar
    return () => {
      if (window.$crisp) {
        window.$crisp = [];
      }
      const scriptElement = document.getElementById('crisp-script');
      if (scriptElement) {
        scriptElement.remove();
      }
    };
  }, [websiteId, user]);

  return null;
}

// Declaração de tipos globais para TypeScript
declare global {
  interface Window {
    $crisp: any[];
    CRISP_WEBSITE_ID: string;
  }
}
