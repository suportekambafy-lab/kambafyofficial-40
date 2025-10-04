
import { useMemo } from 'react';
import bronzeSeal from '@/assets/seals/bronze.png';
import zingaSeal from '@/assets/seals/zinga.png';
import dikanzaSeal from '@/assets/seals/dikanza.png';
import wakandaSeal from '@/assets/seals/wakanda.png';
import diamanteSeal from '@/assets/seals/diamante.png';

export interface KambaLevel {
  id: string;
  name: string;
  emoji: string;
  threshold: number;
  color: string;
  rewards: string[];
  badge: string;
  seal: string;
}

export const KAMBA_LEVELS: KambaLevel[] = [
  {
    id: 'bronze',
    name: 'Kamba Bronze',
    emoji: '🟤',
    threshold: 1000000,
    color: '#8B5E3C',
    badge: '/lovable-uploads/9a3eb8d5-f7fb-4d71-9fa3-24b656365590.png',
    seal: bronzeSeal,
    rewards: ['🎖 Selo no perfil', '📦 Placa física']
  },
  {
    id: 'zinga',
    name: 'Kamba Zinga',
    emoji: '🟠',
    threshold: 5000000,
    color: '#F58634',
    badge: '/lovable-uploads/ea32f463-fe2f-42a1-b0e2-3652f83cf956.png',
    seal: zingaSeal,
    rewards: ['🎖 Selo no perfil', '📦 Placa física']
  },
  {
    id: 'dikanza',
    name: 'Kamba Dikanza',
    emoji: '🟡',
    threshold: 15000000,
    color: '#FFCB05',
    badge: '/lovable-uploads/da32c56d-6a01-423e-a683-7d131bf39e52.png',
    seal: dikanzaSeal,
    rewards: ['🎖 Selo + Placa', '🎓 Acesso a mentorias', '🌐 Destaque no site']
  },
  {
    id: 'wakanda',
    name: 'Kamba Wakanda',
    emoji: '⚫',
    threshold: 50000000,
    color: '#000000',
    badge: '/lovable-uploads/4cbb6857-ffc5-435f-8067-c6d7686af2a9.png',
    seal: wakandaSeal,
    rewards: ['🎖 Selo + Placa', '🎁 Kit do Criador', '📩 Convite para eventos']
  },
  {
    id: 'diamante',
    name: 'Kamba Diamante',
    emoji: '💎',
    threshold: 100000000,
    color: '#00CFFF',
    badge: '/lovable-uploads/0a88b024-7c04-4e5f-9caa-240ca5244cae.png',
    seal: diamanteSeal,
    rewards: [
      '🎖 Selo + Placa',
      '✈️ Viagem para Dubai (voo + hotel)',
      '🎬 Documentário oficial',
      '👑 Acesso vitalício VIP',
      '💸 Comissão reduzida para 5%'
    ]
  }
];

export const useKambaLevels = (totalRevenue: number) => {
  return useMemo(() => {
    // Encontrar nível atual - null se não alcançou nenhum
    let currentLevel = null;
    let currentLevelIndex = -1; // -1 significa que ainda não alcançou nenhum nível
    
    for (let i = 0; i < KAMBA_LEVELS.length; i++) {
      if (totalRevenue >= KAMBA_LEVELS[i].threshold) {
        currentLevel = KAMBA_LEVELS[i];
        currentLevelIndex = i;
      } else {
        break;
      }
    }

    // Encontrar próximo nível - sempre existe se não chegou ao máximo
    let nextLevel = null;
    if (currentLevelIndex < KAMBA_LEVELS.length - 1) {
      nextLevel = KAMBA_LEVELS[currentLevelIndex + 1];
    }
    
    // Se ainda não alcançou nenhum nível, o próximo é o primeiro
    if (currentLevelIndex === -1) {
      nextLevel = KAMBA_LEVELS[0];
    }

    // Calcular progresso - sempre de 0 até a próxima meta
    let progress = 0;
    if (nextLevel) {
      // Progresso de 0 até a próxima meta não alcançada
      progress = Math.min((totalRevenue / nextLevel.threshold) * 100, 100);
    } else {
      // Se já está no nível máximo
      progress = 100;
    }

    // Níveis conquistados
    const achievedLevels = KAMBA_LEVELS.filter(level => totalRevenue >= level.threshold);

    return {
      currentLevel,
      nextLevel,
      progress: Math.max(0, progress),
      achievedLevels,
      allLevels: KAMBA_LEVELS
    };
  }, [totalRevenue]);
};
