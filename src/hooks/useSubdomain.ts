import { useMemo } from 'react';

type Subdomain = 'main' | 'app' | 'pay' | 'admin' | 'mobile' | 'membros';

type SubdomainTarget = Exclude<Subdomain, 'main'> | 'main';

const KNOWN_SUBDOMAINS = new Set<Exclude<Subdomain, 'main'>>([
  'app',
  'pay',
  'admin',
  'mobile',
  'membros'
]);

export function useSubdomain() {
  const { currentSubdomain, getSubdomainUrl } = useMemo(() => {
    const rawHostname = window.location.hostname;
    const hostname = rawHostname.toLowerCase();
    const normalizedHostname = hostname.replace(/^www\./, '');

    // Detect current subdomain
    let subdomain: Subdomain = 'main';

    const isDevOrPreview =
      normalizedHostname.includes('localhost') ||
      normalizedHostname.includes('127.0.0.1') ||
      normalizedHostname.includes('lovable.app') ||
      normalizedHostname.includes('lovableproject.com');

    // Para desenvolvimento/preview, permitir TODAS as rotas sem restrições de subdomínio
    if (isDevOrPreview) {
      const path = window.location.pathname;

      // 🔍 Debug logging da detecção de subdomínio
      console.log('🔍 useSubdomain: PRÉ-VISUALIZAÇÃO/DEV - Todas as rotas permitidas', {
        hostname: normalizedHostname,
        path,
        isPreview: normalizedHostname.includes('lovable.app'),
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
      } else if (
        path.startsWith('/auth') ||
        path.startsWith('/vendedor') ||
        path.startsWith('/apps') ||
        path.startsWith('/minhas-compras')
      ) {
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
        hostname: normalizedHostname,
        message: 'Todas as rotas funcionam sem redirecionamento'
      });
    } else {
      // Produção: detectar subdomínio pela primeira label do hostname (suporta "www.")
      const firstLabel = normalizedHostname.split('.')[0];

      if (firstLabel === 'mobile') {
        subdomain = 'mobile';
      } else if (firstLabel === 'membros') {
        subdomain = 'membros';
      } else if (firstLabel === 'app') {
        subdomain = 'app';
      } else if (firstLabel === 'pay') {
        subdomain = 'pay';
      } else if (firstLabel === 'admin') {
        subdomain = 'admin';
      } else {
        subdomain = 'main';
      }
    }

    const getSubdomainUrl = (targetSubdomain: SubdomainTarget, path?: string) => {
      const currentPath = path || window.location.pathname + window.location.search + window.location.hash;

      // MOBILE É ISOLADO - nunca redireciona para outro subdomínio
      if (subdomain === 'mobile') {
        return currentPath;
      }

      // Para desenvolvimento/preview, navegar dentro do mesmo domínio
      if (isDevOrPreview) {
        console.log('🔗 getSubdomainUrl DEV: Retornando path local', {
          currentPath,
          targetSubdomain,
          hostname: normalizedHostname,
          message: 'Em desenvolvimento, não há redirecionamento de domínio'
        });
        return currentPath;
      }

      // Se não for kambafy.com, manter na mesma aplicação
      if (!normalizedHostname.includes('kambafy.com')) {
        console.log('🔗 getSubdomainUrl CUSTOM DOMAIN: Retornando path local', {
          currentPath,
          targetSubdomain,
          hostname: normalizedHostname,
          message: 'Em domínio customizado, não há redirecionamento de domínio'
        });
        return currentPath;
      }

      // Base domain: remove subdomínios conhecidos (app/pay/admin/membros/mobile)
      const labels = normalizedHostname.split('.');
      const baseDomain = KNOWN_SUBDOMAINS.has(labels[0] as any) ? labels.slice(1).join('.') : normalizedHostname;

      let targetHostname: string;
      switch (targetSubdomain) {
        case 'mobile':
          targetHostname = normalizedHostname; // Fica onde está
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
