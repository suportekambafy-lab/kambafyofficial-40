import { useMemo } from 'react';

export function useSubdomain() {
  const { currentSubdomain, getSubdomainUrl } = useMemo(() => {
    const hostname = window.location.hostname;
    
    // Detect current subdomain
    let subdomain: 'main' | 'app' | 'pay' | 'admin' | 'mobile' | 'membros' = 'main';
    
    // Para desenvolvimento/preview, permitir TODAS as rotas sem restrições de subdomínio
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('lovable.app') || hostname.includes('lovableproject.com')) {
      const path = window.location.pathname;
      
      // 🔍 Debug logging da detecção de subdomínio
      console.log('🔍 useSubdomain: PRÉ-VISUALIZAÇÃO/DEV - Todas as rotas permitidas', {
        hostname,
        path,
        isPreview: hostname.includes('lovable.app'),
        isDevelopment: true,
        message: 'Sem restrições de subdomínio na pré-visualização'
      });
      
      // Na pré-visualização, detectar subdomínio apenas para funcionalidades internas,
      // mas TODAS as rotas são permitidas
      if (path.startsWith('/mobile')) {
        subdomain = 'mobile';
      } else if (path.startsWith('/admin')) {
        subdomain = 'admin';
      } else if (path.startsWith('/checkout') || path.startsWith('/obrigado')) {
        subdomain = 'pay'; 
      } else if (path.startsWith('/auth') || path.startsWith('/vendedor') || path.startsWith('/apps') || path.startsWith('/minhas-compras')) {
        subdomain = 'app';
      } else if (path.startsWith('/login/') || path.startsWith('/area/') || path.startsWith('/members/')) {
        subdomain = 'membros';
        console.log('🎓 useSubdomain: MEMBROS - Funcionando na pré-visualização', {
          path,
          message: 'Área de membros funciona diretamente na pré-visualização'
        });
      } else {
        subdomain = 'main'; // Padrão para desenvolvimento
      }
      
      console.log('✅ useSubdomain: Subdomínio detectado na pré-visualização:', {
        subdomain,
        path,
        hostname,
        message: 'Todas as rotas funcionam sem redirecionamento'
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
      
      // Se não for kambafy.com, manter na mesma aplicação
      if (!hostname.includes('kambafy.com')) {
        console.log('🔗 getSubdomainUrl CUSTOM DOMAIN: Retornando path local', {
          currentPath,
          targetSubdomain,
          hostname,
          message: 'Em domínio customizado, não há redirecionamento de domínio'
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