import { useMemo } from 'react';

export function useSubdomain() {
  const { currentSubdomain, getSubdomainUrl } = useMemo(() => {
    const hostname = window.location.hostname;
    
    // Detect current subdomain
    let subdomain: 'main' | 'app' | 'pay' | 'admin' | 'mobile' | 'membros' = 'main';
    
    // Para desenvolvimento/preview, detectar subdomínio baseado no path
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('lovable.app') || hostname.includes('lovableproject.com')) {
      const path = window.location.pathname;
      
      // 🔍 Debug logging da detecção de subdomínio
      console.log('🔍 useSubdomain: DESENVOLVIMENTO - Detectando subdomínio', {
        hostname,
        path,
        isDevelopment: true,
        isLovableProject: hostname.includes('lovableproject.com')
      });
      
      if (path.startsWith('/mobile')) {
        subdomain = 'mobile';
      } else if (path.startsWith('/admin')) {
        subdomain = 'admin';
      } else if (path.startsWith('/checkout') || path.startsWith('/obrigado')) {
        subdomain = 'pay';
      } else if (path.startsWith('/auth') || path.startsWith('/vendedor') || path.startsWith('/apps') || path.startsWith('/minhas-compras')) {
        subdomain = 'app';
      } else if (path.startsWith('/login/') || path.startsWith('/area/')) {
        subdomain = 'membros';
        console.log('🎓 useSubdomain: MEMBROS detectado para rota', {
          path,
          message: 'Em desenvolvimento, área de membros funciona localmente'
        });
      } else {
        subdomain = 'main'; // Padrão para desenvolvimento
      }
      
      console.log('🎯 useSubdomain: Subdomínio final detectado:', {
        subdomain,
        path,
        hostname
      });
    } else {
      // Para produção com domínios customizados
      if (hostname.startsWith('mobile.')) {
        subdomain = 'mobile';
      } else if (hostname.startsWith('membros.')) {
        subdomain = 'membros';
      } else if (hostname.startsWith('app.')) {
        subdomain = 'app';
      } else if (hostname.startsWith('pay.')) {
        subdomain = 'pay';
      } else if (hostname.startsWith('admin.')) {
        subdomain = 'admin';
      } else {
        subdomain = 'main';
      }
    }
    
    const getSubdomainUrl = (targetSubdomain: 'main' | 'app' | 'pay' | 'admin' | 'mobile' | 'membros', path?: string) => {
      const currentPath = path || window.location.pathname + window.location.search + window.location.hash;
      
      // MOBILE É ISOLADO - nunca redireciona para outro subdomínio
      if (subdomain === 'mobile') {
        return currentPath;
      }
      
      // Para desenvolvimento/preview, navegar dentro do mesmo domínio
      if (hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('lovable.app') || hostname.includes('lovableproject.com')) {
        console.log('🔗 getSubdomainUrl DEV: Retornando path local', {
          currentPath,
          targetSubdomain,
          hostname,
          message: 'Em desenvolvimento, não há redirecionamento de domínio'
        });
        return currentPath;
      }
      
      // Para produção com domínios customizados (exceto mobile)
      const baseDomain = hostname.replace(/^(app\.|pay\.|admin\.|membros\.)/, '');
      
      let targetHostname;
      switch (targetSubdomain) {
        case 'mobile':
          targetHostname = hostname; // Fica onde está
          break;
        case 'membros':
          targetHostname = `membros.${baseDomain}`;
          break;
        case 'app':
          targetHostname = `app.${baseDomain}`;
          break;
        case 'pay':
          targetHostname = `pay.${baseDomain}`;
          break;
        case 'admin':
          targetHostname = `admin.${baseDomain}`;
          break;
        case 'main':
        default:
          targetHostname = baseDomain;
          break;
      }
      
      return `${window.location.protocol}//${targetHostname}${currentPath}`;
    };
    
    return { currentSubdomain: subdomain, getSubdomainUrl };
  }, []);
  
  return { currentSubdomain, getSubdomainUrl };
}