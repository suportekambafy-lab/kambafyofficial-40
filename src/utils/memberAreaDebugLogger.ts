// Debug logger específico para área de membros
import { logger } from './productionLogger';

export const memberAreaDebugLogger = {
  logLinkGeneration: (memberAreaId: string, type: 'login' | 'area', url: string) => {
    console.log('🏗️ MemberAreaLinks: Gerando link', {
      memberAreaId,
      type,
      url,
      isDevelopment: window.location.hostname.includes('localhost') || window.location.hostname.includes('lovable.app') || window.location.hostname.includes('lovableproject.com')
    });
  },

  logRedirection: (from: string, to: string, reason: string) => {
    console.log('🔗 MemberAreaLinks: Redirecionamento', {
      from,
      to,
      reason,
      timestamp: new Date().toISOString()
    });
  },

  logSubdomainDetection: (subdomain: string, path: string) => {
    console.log('🚀 MemberAreaLinks: Detecção de subdomínio', {
      subdomain,
      path,
      hostname: window.location.hostname,
      fullUrl: window.location.href
    });
  },

  logMemberAreaAccess: (memberAreaId: string, action: string, details?: any) => {
    console.log('🌐 MemberAreaLinks: Acesso à área de membros', {
      memberAreaId,
      action,
      details,
      currentUrl: window.location.href,
      timestamp: new Date().toISOString()
    });
  },

  logAuthenticationState: (isAuthenticated: boolean, memberAreaId?: string) => {
    console.log('🔐 MemberAreaAuth: Estado de autenticação', {
      isAuthenticated,
      memberAreaId,
      currentPath: window.location.pathname,
      timestamp: new Date().toISOString()
    });
  }
};