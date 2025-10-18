/**
 * Sistema de links INTERNOS para área de membros
 * Sempre usa navegação interna do React Router - SEM redirecionamentos
 */

import { useNavigate } from 'react-router-dom';

// URLs sempre internas - navegação direta sem prefixo /members/
export function getInternalMembersLoginUrl(memberAreaId: string): string {
  return `/login/${memberAreaId}`;
}

export function getInternalMembersAreaUrl(memberAreaId: string): string {
  return `/area/${memberAreaId}`;
}

// Hook para navegação interna segura
export function useInternalMembersNavigation() {
  const navigate = useNavigate();

  const goToLogin = (memberAreaId: string) => {
    console.log('🔄 Navegando para login da área:', memberAreaId);
    navigate(`/login/${memberAreaId}`);
  };

  const goToArea = (memberAreaId: string) => {
    console.log('🔄 Navegando para área de membros:', memberAreaId);
    navigate(`/area/${memberAreaId}`);
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
  login: (id: string) => `/login/${id}`,
  area: (id: string) => `/area/${id}`,
};

console.log('✅ Sistema de links INTERNOS para membros carregado - sem redirecionamentos');