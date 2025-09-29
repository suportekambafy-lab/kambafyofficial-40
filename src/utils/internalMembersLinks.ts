/**
 * Sistema de links INTERNOS para área de membros
 * Sempre usa navegação interna do React Router - SEM redirecionamentos
 */

import { useNavigate } from 'react-router-dom';

// URLs sempre internas - nunca redireciona para subdomínio
export function getInternalMembersLoginUrl(memberAreaId: string): string {
  return `/members/login/${memberAreaId}`;
}

export function getInternalMembersAreaUrl(memberAreaId: string): string {
  return `/members/area/${memberAreaId}`;
}

// Hook para navegação interna segura
export function useInternalMembersNavigation() {
  const navigate = useNavigate();

  const goToLogin = (memberAreaId: string) => {
    navigate(`/members/login/${memberAreaId}`);
  };

  const goToArea = (memberAreaId: string) => {
    navigate(`/members/area/${memberAreaId}`);
  };

  return {
    goToLogin,
    goToArea,
    getLoginUrl: getInternalMembersLoginUrl,
    getAreaUrl: getInternalMembersAreaUrl,
  };
}

// Função utilitária para gerar URLs internas
export const internalMembersUrls = {
  login: (id: string) => `/members/login/${id}`,
  area: (id: string) => `/members/area/${id}`,
};

console.log('✅ Sistema de links INTERNOS para membros carregado - sem redirecionamentos');