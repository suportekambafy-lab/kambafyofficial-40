import { useSubdomain } from '@/hooks/useSubdomain';
import { memberAreaDebugLogger } from '@/utils/memberAreaDebugLogger';

/**
 * Utilitário para gerar links corretos da área de membros
 * Usa o subdomínio membros.kambafy.com para área de membros
 */
export function useMemberAreaLinks() {
  const { getSubdomainUrl } = useSubdomain();

  const getMemberAreaLoginUrl = (memberAreaId: string) => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
    const isLovablePreview = hostname.includes('lovable.app') || hostname.includes('lovableproject.com');
    
    // Para localhost OU preview do Lovable, usar rotas locais
    if (isLocalhost || isLovablePreview) {
      const url = `/login/${memberAreaId}`;
      memberAreaDebugLogger.logLinkGeneration(memberAreaId, 'login', url);
      return url;
    }
    
    // Para produção kambafy.com, usar URLs do subdomínio membros
    const url = 'https://membros.kambafy.com/login/' + memberAreaId;
    memberAreaDebugLogger.logLinkGeneration(memberAreaId, 'login', url);
    return url;
  };

  const getMemberAreaUrl = (memberAreaId: string, path: string = '') => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
    const isLovablePreview = hostname.includes('lovable.app') || hostname.includes('lovableproject.com');
    
    // Para localhost OU preview do Lovable, usar rotas locais
    if (isLocalhost || isLovablePreview) {
      const fullPath = path ? `/area/${memberAreaId}${path}` : `/area/${memberAreaId}`;
      memberAreaDebugLogger.logLinkGeneration(memberAreaId, 'area', fullPath);
      return fullPath;
    }
    
    // Para produção kambafy.com, usar URLs do subdomínio membros
    const fullPath = path ? `/area/${memberAreaId}${path}` : `/area/${memberAreaId}`;
    const url = 'https://membros.kambafy.com' + fullPath;
    memberAreaDebugLogger.logLinkGeneration(memberAreaId, 'area', url);
    return url;
  };

  const getMemberAreaLessonUrl = (memberAreaId: string, lessonId: string) => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
    const isLovablePreview = hostname.includes('lovable.app') || hostname.includes('lovableproject.com');
    
    if (isLocalhost || isLovablePreview) {
      return `/area/${memberAreaId}/lesson/${lessonId}`;
    }
    return `https://membros.kambafy.com/area/${memberAreaId}/lesson/${lessonId}`;
  };

  const getMemberAreaModuleUrl = (memberAreaId: string, moduleId: string) => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
    const isLovablePreview = hostname.includes('lovable.app') || hostname.includes('lovableproject.com');
    
    if (isLocalhost || isLovablePreview) {
      return `/area/${memberAreaId}/module/${moduleId}`;
    }
    return `https://membros.kambafy.com/area/${memberAreaId}/module/${moduleId}`;
  };

  const navigateToMemberArea = (memberAreaId: string, path: string = '') => {
    const url = getMemberAreaUrl(memberAreaId, path);
    memberAreaDebugLogger.logRedirection(window.location.href, url, 'Navegação via hook para área de membros');
    
    const hostname = window.location.hostname;
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
    const isLovablePreview = hostname.includes('lovable.app') || hostname.includes('lovableproject.com');
    
    if (isLocalhost || isLovablePreview) {
      // Para localhost ou preview, usar navegação local
      window.location.pathname = url;
    } else {
      // Para produção kambafy.com, usar URL completa
      window.location.href = url;
    }
  };

  const navigateToMemberAreaLogin = (memberAreaId: string) => {
    const url = getMemberAreaLoginUrl(memberAreaId);
    memberAreaDebugLogger.logRedirection(window.location.href, url, 'Navegação via hook para login da área de membros');
    
    const hostname = window.location.hostname;
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
    const isLovablePreview = hostname.includes('lovable.app') || hostname.includes('lovableproject.com');
    
    if (isLocalhost || isLovablePreview) {
      // Para localhost ou preview, usar navegação local
      window.location.pathname = url;
    } else {
      // Para produção kambafy.com, usar URL completa
      window.location.href = url;
    }
  };

  return {
    getMemberAreaLoginUrl,
    getMemberAreaUrl,
    getMemberAreaLessonUrl,
    getMemberAreaModuleUrl,
    navigateToMemberArea,
    navigateToMemberAreaLogin
  };
}

/**
 * Versão não-hook para uso em contextos onde hooks não podem ser usados
 */
export function createMemberAreaLinks() {
  const hostname = window.location.hostname;
  
  // Detectar ambiente:
  // - localhost/127.0.0.1: desenvolvimento local
  // - lovable.app/lovableproject.com: preview/publicado do Lovable
  // - kambafy.com: produção real
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
  const isLovablePreview = hostname.includes('lovable.app') || hostname.includes('lovableproject.com');
  const isKambafyProduction = hostname.includes('kambafy.com');
  
  console.log('🏗️ createMemberAreaLinks - Detectando ambiente:', {
    hostname,
    isLocalhost,
    isLovablePreview,
    isKambafyProduction,
  });
  
  // Para desenvolvimento local OU preview do Lovable, usar rotas locais (sem redirecionamento externo)
  if (isLocalhost || isLovablePreview) {
    console.log('🛠️ createMemberAreaLinks - DESENVOLVIMENTO/PREVIEW: usando rotas locais');
    return {
      getMemberAreaLoginUrl: (memberAreaId: string) => {
        const url = `/login/${memberAreaId}`;
        console.log('🔗 Local - getMemberAreaLoginUrl:', { memberAreaId, url, hostname });
        return url;
      },
      getMemberAreaUrl: (memberAreaId: string, path: string = '') => {
        const fullPath = path ? `/area/${memberAreaId}${path}` : `/area/${memberAreaId}`;
        console.log('🔗 Local - getMemberAreaUrl:', { memberAreaId, path, fullPath, hostname });
        return fullPath;
      },
      getMemberAreaLessonUrl: (memberAreaId: string, lessonId: string) => `/area/${memberAreaId}/lesson/${lessonId}`,
      getMemberAreaModuleUrl: (memberAreaId: string, moduleId: string) => `/area/${memberAreaId}/module/${moduleId}`,
    };
  }

  // Para produção kambafy.com, usar URLs do subdomínio membros
  const membersHostname = 'membros.kambafy.com';
  const protocol = 'https:';
  
  console.log('🌐 createMemberAreaLinks - PRODUÇÃO: usando URLs da Kambafy:', {
    membersHostname,
    protocol
  });

  return {
    getMemberAreaLoginUrl: (memberAreaId: string) => {
      const url = `${protocol}//${membersHostname}/login/${memberAreaId}`;
      console.log('🔗 Kambafy - getMemberAreaLoginUrl:', { memberAreaId, url });
      return url;
    },
    getMemberAreaUrl: (memberAreaId: string, path: string = '') => {
      const fullPath = path ? `/area/${memberAreaId}${path}` : `/area/${memberAreaId}`;
      const url = `${protocol}//${membersHostname}${fullPath}`;
      console.log('🔗 Kambafy - getMemberAreaUrl:', { memberAreaId, path, fullPath, url });
      return url;
    },
    getMemberAreaLessonUrl: (memberAreaId: string, lessonId: string) => 
      `${protocol}//${membersHostname}/area/${memberAreaId}/lesson/${lessonId}`,
    getMemberAreaModuleUrl: (memberAreaId: string, moduleId: string) => 
      `${protocol}//${membersHostname}/area/${memberAreaId}/module/${moduleId}`,
  };
}