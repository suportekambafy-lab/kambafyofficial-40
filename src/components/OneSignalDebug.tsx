import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

export function OneSignalDebug() {
  const [debugInfo, setDebugInfo] = useState({
    nativeExternalId: null as string | null,
    fallbackExternalId: null as string | null,
    finalExternalId: null as string | null,
    source: null as string | null,
  });

  useEffect(() => {
    const checkExternalId = () => {
      const nativeId = (window as any).NATIVE_EXTERNAL_ID;
      const fallbackId = localStorage.getItem('onesignal_external_id');
      const finalId = nativeId || fallbackId;
      
      setDebugInfo({
        nativeExternalId: nativeId,
        fallbackExternalId: fallbackId,
        finalExternalId: finalId,
        source: nativeId ? 'NATIVE' : fallbackId ? 'FALLBACK' : 'NONE',
      });

      console.log('🔍 [OneSignal Debug Component] Status:', {
        nativeId,
        fallbackId,
        finalId,
        source: nativeId ? 'NATIVE' : fallbackId ? 'FALLBACK' : 'NONE',
      });
    };

    checkExternalId();
    const interval = setInterval(checkExternalId, 2000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="fixed bottom-4 right-4 p-4 max-w-md bg-card/95 backdrop-blur z-50">
      <h3 className="font-bold text-sm mb-2">🔍 OneSignal Debug Info</h3>
      <div className="space-y-1 text-xs">
        <div>
          <span className="font-semibold">Native External ID:</span>{' '}
          <span className={debugInfo.nativeExternalId ? 'text-green-500' : 'text-red-500'}>
            {debugInfo.nativeExternalId || '❌ Não encontrado'}
          </span>
        </div>
        <div>
          <span className="font-semibold">Fallback External ID:</span>{' '}
          <span className={debugInfo.fallbackExternalId ? 'text-yellow-500' : 'text-gray-500'}>
            {debugInfo.fallbackExternalId || '⚠️ Não gerado'}
          </span>
        </div>
        <div className="pt-2 border-t">
          <span className="font-semibold">External ID Ativo:</span>{' '}
          <span className={debugInfo.finalExternalId ? 'text-blue-500' : 'text-red-500'}>
            {debugInfo.finalExternalId || '❌ Nenhum'}
          </span>
        </div>
        <div>
          <span className="font-semibold">Fonte:</span>{' '}
          <span className={
            debugInfo.source === 'NATIVE' ? 'text-green-500' : 
            debugInfo.source === 'FALLBACK' ? 'text-yellow-500' : 
            'text-red-500'
          }>
            {debugInfo.source}
          </span>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
        {debugInfo.source === 'NATIVE' && '✅ Código nativo implementado'}
        {debugInfo.source === 'FALLBACK' && '⚠️ Usando ID local (implementar código nativo)'}
        {debugInfo.source === 'NONE' && '❌ Erro: Nenhum ID disponível'}
      </div>
    </Card>
  );
}
