import { useSubdomain } from '@/hooks/useSubdomain';

/**
 * Utilitário para gerar links corretos da área de membros
 * Usa o subdomínio membros.kambafy.com para área de membros
 */
export function useMemberAreaLinks() {
  const { getSubdomainUrl } = useSubdomain();

  const getMemberAreaLoginUrl = (memberAreaId: string) => {
    return getSubdomainUrl('membros', `/login/${memberAreaId}`);
  };

  const getMemberAreaUrl = (memberAreaId: string, path: string = '') => {
    const fullPath = path ? `/area/${memberAreaId}${path}` : `/area/${memberAreaId}`;
    return getSubdomainUrl('membros', fullPath);
  };

  const getMemberAreaLessonUrl = (memberAreaId: string, lessonId: string) => {
    return getSubdomainUrl('membros', `/area/${memberAreaId}/lesson/${lessonId}`);
  };

  const getMemberAreaModuleUrl = (memberAreaId: string, moduleId: string) => {
    return getSubdomainUrl('membros', `/area/${memberAreaId}/module/${moduleId}`);
  };

  const navigateToMemberArea = (memberAreaId: string, path: string = '') => {
    const url = getMemberAreaUrl(memberAreaId, path);
    window.location.href = url;
  };

  const navigateToMemberAreaLogin = (memberAreaId: string) => {
    const url = getMemberAreaLoginUrl(memberAreaId);
    window.location.href = url;
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
  // Detectar hostname atual
  const hostname = window.location.hostname;
  const baseDomain = hostname.replace(/^(app\.|pay\.|admin\.|membros\.)/, '');
  
  console.log('🏗️ createMemberAreaLinks - Detectando ambiente:', {
    hostname,
    baseDomain,
    isLocalhost: hostname.includes('localhost'),
    isLovable: hostname.includes('lovable.app')
  });
  
  // Para desenvolvimento/preview, usar as rotas diretas
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('lovable.app')) {
    console.log('🛠️ createMemberAreaLinks - Usando ambiente de desenvolvimento');
    return {
      getMemberAreaLoginUrl: (memberAreaId: string) => {
        const url = `/login/${memberAreaId}`;
        console.log('🔗 Dev - getMemberAreaLoginUrl:', { memberAreaId, url });
        return url;
      },
      getMemberAreaUrl: (memberAreaId: string, path: string = '') => {
        const fullPath = path ? `/area/${memberAreaId}${path}` : `/area/${memberAreaId}`;
        console.log('🔗 Dev - getMemberAreaUrl:', { memberAreaId, path, fullPath });
        return fullPath;
      },
      getMemberAreaLessonUrl: (memberAreaId: string, lessonId: string) => `/area/${memberAreaId}/lesson/${lessonId}`,
      getMemberAreaModuleUrl: (memberAreaId: string, moduleId: string) => `/area/${memberAreaId}/module/${moduleId}`,
    };
  }

  // Para produção, usar subdomínio membros
  const membersHostname = `membros.${baseDomain}`;
  const protocol = window.location.protocol;
  
  console.log('🌐 createMemberAreaLinks - Usando ambiente de produção:', {
    membersHostname,
    protocol
  });

  return {
    getMemberAreaLoginUrl: (memberAreaId: string) => {
      const url = `${protocol}//${membersHostname}/login/${memberAreaId}`;
      console.log('🔗 Prod - getMemberAreaLoginUrl:', { memberAreaId, url });
      return url;
    },
    getMemberAreaUrl: (memberAreaId: string, path: string = '') => {
      const fullPath = path ? `/area/${memberAreaId}${path}` : `/area/${memberAreaId}`;
      const url = `${protocol}//${membersHostname}${fullPath}`;
      console.log('🔗 Prod - getMemberAreaUrl:', { memberAreaId, path, fullPath, url });
      return url;
    },
    getMemberAreaLessonUrl: (memberAreaId: string, lessonId: string) => 
      `${protocol}//${membersHostname}/area/${memberAreaId}/lesson/${lessonId}`,
    getMemberAreaModuleUrl: (memberAreaId: string, moduleId: string) => 
      `${protocol}//${membersHostname}/area/${memberAreaId}/module/${moduleId}`,
  };
}