import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface TawkChatProps {
  propertyId?: string;
  widgetId?: string;
}

export function TawkChat({ 
  propertyId = '68e4dfc836ce7e19507dc359', 
  widgetId = '1j6v0ka31' 
}: TawkChatProps) {
  const { user } = useAuth();

  useEffect(() => {
    // Verificar se o script já foi carregado
    if (document.getElementById('tawk-script')) {
      return;
    }

    // Configurar Tawk_API antes de carregar o script
    (window as any).Tawk_API = (window as any).Tawk_API || {};
    (window as any).Tawk_LoadStart = new Date();
    
    // Customização do widget via JavaScript API
    (window as any).Tawk_API.customStyle = {
      zIndex: 1000,
      visibility: {
        desktop: {
          position: 'br', // bottom-right
          xOffset: 20,
          yOffset: 20
        },
        mobile: {
          position: 'br',
          xOffset: 10,
          yOffset: 10
        }
      }
    };
    
    // Configurar callback onLoad
    (window as any).Tawk_API.onLoad = function() {
      console.log('✅ Tawk.to widget carregado');
      
      // Configurar atributos do vendedor
      if (user) {
        (window as any).Tawk_API.setAttributes({
          'user_id': user.id,
          'tipo': 'Vendedor',
          'email_verificado': user.email_confirmed_at ? 'Sim' : 'Não',
        }, function(error: any) {
          if (error) {
            console.error('Erro ao definir atributos Tawk.to:', error);
          } else {
            console.log('✅ Atributos do vendedor configurados');
          }
        });
      }
    };

    // Configurar informações do visitante (vendedor)
    if (user) {
      (window as any).Tawk_API.visitor = {
        name: user.email?.split('@')[0] || 'Vendedor',
        email: user.email || '',
      };
    }

    // Callback quando chat inicia
    (window as any).Tawk_API.onChatStarted = function() {
      console.log('💬 Chat iniciado com suporte');
    };

    // Callback quando chat termina
    (window as any).Tawk_API.onChatEnded = function() {
      console.log('👋 Chat encerrado');
    };

    // Criar e inserir o script
    const script = document.createElement('script');
    script.id = 'tawk-script';
    script.async = true;
    script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');

    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode?.insertBefore(script, firstScript);

    // Cleanup ao desmontar
    return () => {
      const tawkScript = document.getElementById('tawk-script');
      if (tawkScript) {
        tawkScript.remove();
      }
      
      // Remover o widget do DOM
      const tawkWidget = document.getElementById('tawk-bubble');
      if (tawkWidget) {
        tawkWidget.remove();
      }
      
      // Limpar objetos globais
      delete (window as any).Tawk_API;
      delete (window as any).Tawk_LoadStart;
    };
  }, [propertyId, widgetId, user]);

  return null;
}
