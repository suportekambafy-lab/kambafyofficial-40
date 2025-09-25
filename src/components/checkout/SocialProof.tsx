
import React, { useState, useEffect } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { createPortal } from 'react-dom';

interface SocialProofProps {
  totalSales?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  enabled?: boolean;
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
  if (!isVisible) return 'opacity-0 scale-95 translate-y-2';
  
  switch (position) {
    case 'top-left':
    case 'top-right':
      return 'opacity-100 scale-100 translate-y-0 animate-slide-in-top';
    case 'bottom-left':
    case 'bottom-right':
    default:
      return 'opacity-100 scale-100 translate-y-0 animate-slide-in-bottom';
  }
};

const SocialProof: React.FC<SocialProofProps> = ({ 
  totalSales = 1247, 
  position = 'bottom-right',
  enabled = true 
}) => {
  const { userCountry } = useGeoLocation();
  const [currentNotification, setCurrentNotification] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Função para gerar notificação de venda
  const generateSaleNotification = () => {
    const countryCode = userCountry.code;
    const cities = CITIES_BY_COUNTRY[countryCode as keyof typeof CITIES_BY_COUNTRY] || CITIES_BY_COUNTRY.AO;
    const names = NAMES_BY_COUNTRY[countryCode as keyof typeof NAMES_BY_COUNTRY] || NAMES_BY_COUNTRY.AO;
    
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    const timeAgo = Math.floor(Math.random() * 15) + 1; // 1-15 minutos
    
    return `${randomName} comprou a partir de ${randomCity} há ${timeAgo} min`;
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentNotification(null);
      setIsDismissed(true);
    }, 300);
  };

  useEffect(() => {
    if (!enabled || isDismissed) return;

    // Função para mostrar notificação
    const showNotification = () => {
      const notification = generateSaleNotification();
      setCurrentNotification(notification);
      setIsVisible(true);
      
      // Esconder automaticamente após 10 segundos (mais tempo)
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          setCurrentNotification(null);
        }, 300);
      }, 10000);
    };

    // Primeira notificação após 2 segundos (mais rápido)
    const initialTimeout = setTimeout(showNotification, 2000);
    
    // Notificações subsequentes a cada 10-15 segundos (mais frequente)
    const interval = setInterval(() => {
      if (!currentNotification && !isDismissed) {
        showNotification();
      }
    }, Math.random() * 5000 + 10000); // 10-15 segundos

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [currentNotification, userCountry, enabled, isDismissed]);

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
      <div className="bg-white border border-green-200 rounded-lg shadow-lg p-4 flex items-center gap-3 group hover:shadow-xl transition-shadow">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
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
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
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
