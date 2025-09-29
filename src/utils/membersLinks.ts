/**
 * Sistema de links modernos para área de membros
 * Usa subdomínio 'membros' dedicado
 */

export function getMembersLoginUrl(memberAreaId: string): string {
  const hostname = window.location.hostname;
  
  // Para desenvolvimento, usar path local
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1') || 
      hostname.includes('lovable.app') || hostname.includes('lovableproject.com')) {
    return `/members/login/${memberAreaId}`;
  }
  
  // Para produção, usar subdomínio membros
  if (hostname.includes('kambafy.com')) {
    const protocol = window.location.protocol;
    return `${protocol}//membros.kambafy.com/login/${memberAreaId}`;
  }
  
  // Para domínios customizados, manter path local
  return `/members/login/${memberAreaId}`;
}

export function getMembersAreaUrl(memberAreaId: string): string {
  const hostname = window.location.hostname;
  
  // Para desenvolvimento, usar path local
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1') || 
      hostname.includes('lovable.app') || hostname.includes('lovableproject.com')) {
    return `/members/area/${memberAreaId}`;
  }
  
  // Para produção, usar subdomínio membros
  if (hostname.includes('kambafy.com')) {
    const protocol = window.location.protocol;
    return `${protocol}//membros.kambafy.com/area/${memberAreaId}`;
  }
  
  // Para domínios customizados, manter path local
  return `/members/area/${memberAreaId}`;
}

export function navigateToMembersLogin(memberAreaId: string): void {
  const url = getMembersLoginUrl(memberAreaId);
  
  // Se for URL externa, usar window.location
  if (url.startsWith('http')) {
    window.location.href = url;
  } else {
    // Se for path local, usar history
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  }
}

export function navigateToMembersArea(memberAreaId: string): void {
  const url = getMembersAreaUrl(memberAreaId);
  
  // Se for URL externa, usar window.location
  if (url.startsWith('http')) {
    window.location.href = url;
  } else {
    // Se for path local, usar history
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  }
}

// Hook para usar os links de membros
export function useMembersLinks() {
  return {
    getMembersLoginUrl,
    getMembersAreaUrl,
    navigateToMembersLogin,
    navigateToMembersArea,
  };
}
