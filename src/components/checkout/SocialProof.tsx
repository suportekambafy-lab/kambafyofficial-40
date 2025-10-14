
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { createPortal } from 'react-dom';

interface SocialProofProps {
  totalSales?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  enabled?: boolean;
  displayDuration?: number; // em segundos
  intervalBetween?: number; // em segundos
  pauseAfterDismiss?: number; // em segundos
  maxNotificationsPerSession?: number;
}

// Dados das cidades por país
const CITIES_BY_COUNTRY = {
  AO: [
    'Luanda', 'Huambo', 'Lobito', 'Benguela', 'Lubango', 
    'Kuito', 'Malanje', 'Namibe', 'Soyo', 'Cabinda',
    'Uíge', 'Saurimo', 'Sumbe', 'Menongue', 'Dondo'
  ],
  PT: [
    'Lisboa', 'Porto', 'Braga', 'Coimbra', 'Funchal',
    'Aveiro', 'Viseu', 'Leiria', 'Setúbal', 'Évora',
    'Faro', 'Bragança', 'Vila Real', 'Guarda', 'Santarém'
  ],
  MZ: [
    'Maputo', 'Beira', 'Nampula', 'Matola', 'Quelimane',
    'Tete', 'Xai-Xai', 'Pemba', 'Inhambane', 'Chimoio',
    'Mocuba', 'Gurué', 'Lichinga', 'Montepuez', 'Ilha de Moçambique'
  ]
};

// Nomes comuns por país
const NAMES_BY_COUNTRY = {
  AO: [
    'João Silva', 'Maria Santos', 'António Ferreira', 'Ana Costa', 'Manuel Rodrigues',
    'Isabel Gomes', 'Pedro Alves', 'Catarina Lopes', 'José Pereira', 'Helena Martins',
    'Francisco Sousa', 'Beatriz Oliveira', 'Carlos Nunes', 'Joana Ribeiro', 'Paulo Carvalho'
  ],
  PT: [
    'Miguel Santos', 'Sofia Oliveira', 'João Pereira', 'Maria Silva', 'António Costa',
    'Ana Rodrigues', 'Pedro Ferreira', 'Catarina Lopes', 'José Gomes', 'Isabel Martins',
    'Francisco Alves', 'Beatriz Sousa', 'Carlos Nunes', 'Joana Ribeiro', 'Paulo Carvalho'
  ],
  MZ: [
    'Armando Sitoe', 'Graça Macamo', 'Eduardo Chissano', 'Fátima Moiane', 'Alberto Nhaca',
    'Esperança Guambe', 'Jorge Machel', 'Lurdes Mondlane', 'Tomás Munguambe', 'Celeste Massinga',
    'Hélder Mutisse', 'Noémia Mahanjane', 'Sérgio Vieira', 'Palmira Nkomo', 'Mário Machungo'
  ]
};

const getPositionClasses = (position: string) => {
  switch (position) {
    case 'top-left':
      return 'top-4 left-4';
    case 'top-right':
      return 'top-4 right-4';
    case 'bottom-left':
      return 'bottom-4 left-4';
    case 'bottom-right':
    default:
      return 'bottom-4 right-4';
  }
};

const getAnimationClasses = (position: string, isVisible: boolean) => {
  const baseTransition = 'transition-all duration-500 ease-in-out';
  
  if (!isVisible) {
    return `opacity-0 scale-95 ${position.includes('bottom') ? 'translate-y-4' : '-translate-y-4'} ${baseTransition}`;
  }
  
  return `opacity-100 scale-100 translate-y-0 ${baseTransition}`;
};

const SocialProof: React.FC<SocialProofProps> = ({ 
  totalSales = 1247, 
  position = 'bottom-right',
  enabled = true,
  displayDuration = 8, // 8 segundos por padrão
  intervalBetween = 25, // 25 segundos entre notificações
  pauseAfterDismiss = 60, // 1 minuto de pausa após dismiss
  maxNotificationsPerSession = 5 // máximo 5 notificações por sessão
}) => {
  const { userCountry } = useGeoLocation();
  const [currentNotification, setCurrentNotification] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Limpar todos os timeouts ao desmontar
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  // Função para gerar notificação de venda
  const generateSaleNotification = useCallback(() => {
    const countryCode = userCountry.code;
    const cities = CITIES_BY_COUNTRY[countryCode as keyof typeof CITIES_BY_COUNTRY] || CITIES_BY_COUNTRY.AO;
    const names = NAMES_BY_COUNTRY[countryCode as keyof typeof NAMES_BY_COUNTRY] || NAMES_BY_COUNTRY.AO;
    
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    const timeAgo = Math.floor(Math.random() * 15) + 1; // 1-15 minutos
    
    return `${randomName} comprou a partir de ${randomCity} há ${timeAgo} min`;
  }, [userCountry.code]);

  // Função para mostrar notificação com animação suave
  const showNotification = useCallback(async () => {
    if (isProcessing || isDismissed || notificationCount >= maxNotificationsPerSession) {
      console.log('🔔 Social Proof: Não pode mostrar notificação', {
        isProcessing,
        isDismissed,
        notificationCount,
        maxNotificationsPerSession
      });
      return;
    }

    setIsProcessing(true);
    
    // Gerar e mostrar notificação
    const notification = generateSaleNotification();
    setCurrentNotification(notification);
    setNotificationCount(prev => prev + 1);
    
    console.log('✅ Social Proof: Mostrando notificação', {
      notification,
      count: notificationCount + 1,
      max: maxNotificationsPerSession
    });
    
    // Fade in
    await new Promise(resolve => {
      const timeout = setTimeout(() => {
        setIsVisible(true);
        resolve(true);
      }, 100);
      timeoutsRef.current.push(timeout);
    });
    
    // Manter visível pelo tempo configurado
    await new Promise(resolve => {
      const timeout = setTimeout(resolve, displayDuration * 1000);
      timeoutsRef.current.push(timeout);
    });
    
    // Fade out
    setIsVisible(false);
    
    await new Promise(resolve => {
      const timeout = setTimeout(() => {
        setCurrentNotification(null);
        setIsProcessing(false);
        resolve(true);
      }, 500);
      timeoutsRef.current.push(timeout);
    });
    
    // Pausa entre notificações (2 segundos extras)
    await new Promise(resolve => {
      const timeout = setTimeout(resolve, 2000);
      timeoutsRef.current.push(timeout);
    });
  }, [isProcessing, isDismissed, notificationCount, maxNotificationsPerSession, generateSaleNotification, displayDuration]);

  // Implementar snooze ao invés de dismiss permanente
  const handleDismiss = useCallback(() => {
    console.log('🔕 Social Proof: Notificação dispensada, pausando por', pauseAfterDismiss, 'segundos');
    
    setIsVisible(false);
    
    const hideTimeout = setTimeout(() => {
      setCurrentNotification(null);
      setIsDismissed(true);
      setIsProcessing(false);
      
      // Reativar após tempo de pausa
      const snoozeTimeout = setTimeout(() => {
        console.log('🔔 Social Proof: Reativando notificações');
        setIsDismissed(false);
      }, pauseAfterDismiss * 1000);
      
      timeoutsRef.current.push(snoozeTimeout);
    }, 500);
    
    timeoutsRef.current.push(hideTimeout);
  }, [pauseAfterDismiss]);

  // Sistema de notificações com timing otimizado
  useEffect(() => {
    if (!enabled) {
      console.log('🔔 Social Proof: Desabilitado');
      return;
    }

    console.log('🔔 Social Proof: Iniciando sistema', {
      displayDuration,
      intervalBetween,
      maxNotificationsPerSession
    });

    // Primeira notificação após 5 segundos (dar tempo do usuário ver o checkout)
    const initialTimeout = setTimeout(() => {
      showNotification();
    }, 5000);
    
    timeoutsRef.current.push(initialTimeout);
    
    // Notificações subsequentes no intervalo configurado
    const interval = setInterval(() => {
      if (!isProcessing && !isDismissed && notificationCount < maxNotificationsPerSession) {
        showNotification();
      }
    }, intervalBetween * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [enabled, isProcessing, isDismissed, notificationCount, maxNotificationsPerSession, intervalBetween, showNotification]);

  if (!enabled || !currentNotification) return null;

  const popupContent = (
    <div 
      className={`
        fixed z-50 max-w-sm mx-4
        ${getPositionClasses(position)}
        transition-all duration-300 ease-out
        ${getAnimationClasses(position, isVisible)}
      `}
    >
      <div className="bg-white border border-green-200 rounded-lg shadow-lg p-4 flex items-center gap-3 group hover:shadow-xl transition-all duration-300">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <ShoppingCart className="w-5 h-5 text-green-600" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {currentNotification}
          </p>
        </div>
        
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          aria-label="Dispensar notificação"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // Usar portal para renderizar fora do DOM normal
  return createPortal(popupContent, document.body);
};

export default SocialProof;
