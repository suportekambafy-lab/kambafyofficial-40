import { useMemo } from 'react';
import { logger } from '@/utils/productionLogger';

// Hook para remover logs desnecessários em produção
export const useConditionalLogging = () => {
  const conditionalLog = useMemo(() => ({
    // Substituir console.log por logger otimizado
    log: (message: string, data?: any, component?: string) => {
      logger.debug(message, { component, data });
    },
    
    // Manter errors sempre
    error: (message: string, data?: any, component?: string) => {
      logger.error(message, { component, data });
    },
    
    // Warn só para problemas importantes
    warn: (message: string, data?: any, component?: string) => {
      logger.warn(message, { component, data });
    },
    
    // Info para eventos importantes
    info: (message: string, data?: any, component?: string) => {
      logger.info(message, { component, data });
    }
  }), []);

  return conditionalLog;
};