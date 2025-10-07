import { useEffect } from 'react';

interface TawkChatProps {
  propertyId?: string;
  widgetId?: string;
}

export function TawkChat({ 
  propertyId = '67040e1c02d78d1a30edb82f', 
  widgetId = '1i9he3f4k' 
}: TawkChatProps) {
  useEffect(() => {
    // Verificar se o script já foi carregado
    if (document.getElementById('tawk-script')) {
      return;
    }

    // Configurar Tawk_API antes de carregar o script
    (window as any).Tawk_API = (window as any).Tawk_API || {};
    (window as any).Tawk_LoadStart = new Date();

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
  }, [propertyId, widgetId]);

  return null;
}
