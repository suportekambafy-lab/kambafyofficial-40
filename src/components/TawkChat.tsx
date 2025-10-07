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
    // Verificar se o script ou widget já existem
    if (document.getElementById('tawk-script') || (window as any).Tawk_API) {
      return;
    }

    // Detectar se é mobile
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      navigator.userAgent.toLowerCase()
    );

    // Configurar Tawk_API antes de carregar o script
    (window as any).Tawk_API = (window as any).Tawk_API || {};
    (window as any).Tawk_LoadStart = new Date();
    
    // Customização avançada do widget via JavaScript API
    (window as any).Tawk_API.customStyle = {
      zIndex: 2147483647,
      visibility: {
        desktop: {
          position: 'br',
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
    
    // Configurar callback onLoad com customizações avançadas
    (window as any).Tawk_API.onLoad = function() {
      // Customizar aparência do widget
      const style = document.createElement('style');
      style.id = 'tawk-custom-styles';
      style.textContent = `
        /* Customização do botão do chat */
        #tawk-bubble {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          transition: transform 0.2s ease !important;
          z-index: 2147483647 !important;
        }
        #tawk-bubble:hover {
          transform: scale(1.05) !important;
        }
        
        /* Container do widget */
        .tawk-min-container {
          z-index: 2147483647 !important;
        }
        
        /* Janela do chat */
        iframe#tawk-chat-iframe {
          z-index: 2147483647 !important;
        }
        
        /* Customização da janela do chat */
        .tawk-custom-color-visitor {
          background-color: hsl(var(--primary)) !important;
        }
        
        .tawk-custom-color-agent {
          background-color: hsl(var(--muted)) !important;
        }
        
        /* Cabeçalho do chat */
        .tawk-header {
          background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%) !important;
        }
        
        /* Mobile específico */
        @media (max-width: 768px) {
          #tawk-bubble {
            bottom: 20px !important;
            right: 10px !important;
            z-index: 2147483647 !important;
          }
          
          .tawk-min-container {
            z-index: 2147483647 !important;
          }
          
          iframe#tawk-chat-iframe {
            z-index: 2147483647 !important;
          }
        }
      `;
      document.head.appendChild(style);
      
      // Configurar atributos do vendedor
      if (user) {
        (window as any).Tawk_API.setAttributes({
          'user_id': user.id,
          'tipo': 'Vendedor Kambafy',
          'email_verificado': user.email_confirmed_at ? 'Sim' : 'Não',
          'plataforma': 'Kambafy Dashboard',
        }, function(error: any) {
          if (error) {
            console.error('Erro ao definir atributos Tawk.to:', error);
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
      
      // Remover estilos customizados
      const customStyle = document.getElementById('tawk-custom-styles');
      if (customStyle) {
        customStyle.remove();
      }
      
      // Limpar objetos globais
      delete (window as any).Tawk_API;
      delete (window as any).Tawk_LoadStart;
    };
  }, [propertyId, widgetId, user]);

  return null;
}
