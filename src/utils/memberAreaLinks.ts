import { useSubdomain } from '@/hooks/useSubdomain';
import { memberAreaDebugLogger } from '@/utils/memberAreaDebugLogger';

/**
 * Utilitário para gerar links corretos da área de membros
 * Usa o subdomínio membros.kambafy.com para área de membros
 */
export function useMemberAreaLinks() {
  const { getSubdomainUrl } = useSubdomain();

  const getMemberAreaLoginUrl = (memberAreaId: string) => {
    // Para localhost, usar rotas locais
    const hostname = window.location.hostname;
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      const url = `/login/${memberAreaId}`;
      memberAreaDebugLogger.logLinkGeneration(memberAreaId, 'login', url);
      return url;
    }
    
    // Para todos os outros ambientes, usar URLs da Kambafy
    const url = 'https://membros.kambafy.com/login/' + memberAreaId;
    memberAreaDebugLogger.logLinkGeneration(memberAreaId, 'login', url);
    return url;
  };

  const getMemberAreaUrl = (memberAreaId: string, path: string = '') => {
    // Para localhost, usar rotas locais
    const hostname = window.location.hostname;
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      const fullPath = path ? `/area/${memberAreaId}${path}` : `/area/${memberAreaId}`;
      memberAreaDebugLogger.logLinkGeneration(memberAreaId, 'area', fullPath);
      return fullPath;
    }
    
    // Para todos os outros ambientes, usar URLs da Kambafy
    const fullPath = path ? `/area/${memberAreaId}${path}` : `/area/${memberAreaId}`;
    const url = 'https://membros.kambafy.com' + fullPath;
    memberAreaDebugLogger.logLinkGeneration(memberAreaId, 'area', url);
    return url;
  };

  const getMemberAreaLessonUrl = (memberAreaId: string, lessonId: string) => {
    const hostname = window.location.hostname;
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return `/area/${memberAreaId}/lesson/${lessonId}`;
    }
    return `https://membros.kambafy.com/area/${memberAreaId}/lesson/${lessonId}`;
  };

  const getMemberAreaModuleUrl = (memberAreaId: string, moduleId: string) => {
    const hostname = window.location.hostname;
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return `/area/${memberAreaId}/module/${moduleId}`;
    }
    return `https://membros.kambafy.com/area/${memberAreaId}/module/${moduleId}`;
  };

  const navigateToMemberArea = (memberAreaId: string, path: string = '') => {
    const url = getMemberAreaUrl(memberAreaId, path);
    memberAreaDebugLogger.logRedirection(window.location.href, url, 'Navegação via hook para área de membros');
    
    const hostname = window.location.hostname;
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      // Para localhost, usar navegação local
      window.location.pathname = url;
    } else {
      // Para todos os outros ambientes, usar URL completa da Kambafy
      window.location.href = url;
    }
  };

  const navigateToMemberAreaLogin = (memberAreaId: string) => {
    const url = getMemberAreaLoginUrl(memberAreaId);
    memberAreaDebugLogger.logRedirection(window.location.href, url, 'Navegação via hook para login da área de membros');
    
    const hostname = window.location.hostname;
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      // Para localhost, usar navegação local
      window.location.pathname = url;
    } else {
      // Para todos os outros ambientes, usar URL completa da Kambafy
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
  // Para produção/kambafy, sempre usar URLs da Kambafy
  const hostname = window.location.hostname;
  
  // Detectar se devemos usar URLs de produção da Kambafy
  const shouldUseKambafyUrls = !hostname.includes('localhost') && !hostname.includes('127.0.0.1');
  
  console.log('🏗️ createMemberAreaLinks - Detectando ambiente:', {
    hostname,
    shouldUseKambafyUrls,
    message: shouldUseKambafyUrls ? 'Usando URLs da Kambafy' : 'Usando URLs locais'
  });
  
  // Para desenvolvimento local, usar as rotas diretas
  if (!shouldUseKambafyUrls) {
    console.log('🛠️ createMemberAreaLinks - DESENVOLVIMENTO detectado');
    return {
      getMemberAreaLoginUrl: (memberAreaId: string) => {
        const url = `/login/${memberAreaId}`;
        console.log('🔗 Dev - getMemberAreaLoginUrl:', { memberAreaId, url, hostname });
        return url;
      },
      getMemberAreaUrl: (memberAreaId: string, path: string = '') => {
        const fullPath = path ? `/area/${memberAreaId}${path}` : `/area/${memberAreaId}`;
        console.log('🔗 Dev - getMemberAreaUrl:', { memberAreaId, path, fullPath, hostname });
        return fullPath;
      },
      getMemberAreaLessonUrl: (memberAreaId: string, lessonId: string) => `/area/${memberAreaId}/lesson/${lessonId}`,
      getMemberAreaModuleUrl: (memberAreaId: string, moduleId: string) => `/area/${memberAreaId}/module/${moduleId}`,
    };
  }

  // Para todos os outros ambientes (produção, preview, etc), usar URLs da Kambafy
  const membersHostname = 'membros.kambafy.com';
  const protocol = 'https:';
  
  console.log('🌐 createMemberAreaLinks - Usando URLs da Kambafy:', {
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