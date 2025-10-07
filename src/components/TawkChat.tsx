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
    console.log('🚀 TawkChat iniciando...');
    
    // Verificar se o script já foi carregado
    if (document.getElementById('tawk-script')) {
      console.log('⚠️ Script Tawk já carregado, pulando');
      return;
    }

    // Detectar se é mobile
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      navigator.userAgent.toLowerCase()
    );
    console.log('📱 Dispositivo detectado:', isMobile ? 'Mobile' : 'Desktop');

    // Configurar Tawk_API antes de carregar o script
    console.log('⚙️ Configurando Tawk_API...');
    (window as any).Tawk_API = (window as any).Tawk_API || {};
    (window as any).Tawk_LoadStart = new Date();
    
    // Customização avançada do widget via JavaScript API
    (window as any).Tawk_API.customStyle = {
      zIndex: isMobile ? 9999 : 1000,
      visibility: {
        desktop: {
          position: 'br',
          xOffset: 20,
          yOffset: 20
        },
        mobile: {
          position: 'br',
          xOffset: 15,
          yOffset: 80
        }
      }
    };
    
    // Configurar callback onLoad com customizações avançadas
    (window as any).Tawk_API.onLoad = function() {
      console.log('✅ Tawk.to widget carregado');
      
      // Customizar aparência do widget
      const style = document.createElement('style');
      style.textContent = `
        /* Customização do botão do chat */
        #tawk-bubble {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          transition: transform 0.2s ease !important;
          z-index: 9999 !important;
        }
        #tawk-bubble:hover {
          transform: scale(1.05) !important;
        }
        
        /* Container do widget */
        .tawk-min-container {
          z-index: 9999 !important;
        }
        
        /* Janela do chat */
        iframe#tawk-chat-iframe {
          z-index: 9999 !important;
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
            bottom: 70px !important;
            right: 10px !important;
            z-index: 9999 !important;
          }
          
          .tawk-min-container {
            z-index: 9999 !important;
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
      console.log('💬 Chat iniciado com suporte Kambafy');
    };

    // Callback quando chat termina
    (window as any).Tawk_API.onChatEnded = function() {
      console.log('👋 Chat encerrado');
    };
    
    // Callback quando mensagem é recebida
    (window as any).Tawk_API.onChatMessageVisitor = function(message: any) {
      console.log('📤 Mensagem enviada:', message);
    };
    
    // Callback quando agente responde
    (window as any).Tawk_API.onChatMessageAgent = function(message: any) {
      console.log('📥 Mensagem recebida do suporte:', message);
    };

    // Criar e inserir o script
    console.log('📝 Criando script Tawk.to...');
    const script = document.createElement('script');
    script.id = 'tawk-script';
    script.async = true;
    script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    
    script.onload = () => {
      console.log('✅ Script Tawk.to carregado com sucesso!');
    };
    
    script.onerror = (error) => {
      console.error('❌ Erro ao carregar script Tawk.to:', error);
    };

    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode?.insertBefore(script, firstScript);
    console.log('📦 Script Tawk.to inserido no DOM');

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
      const customStyles = document.querySelectorAll('style');
      customStyles.forEach(style => {
        if (style.textContent?.includes('tawk-custom')) {
          style.remove();
        }
      });
      
      // Limpar objetos globais
      delete (window as any).Tawk_API;
      delete (window as any).Tawk_LoadStart;
    };
  }, [propertyId, widgetId, user]);

  return null;
}
