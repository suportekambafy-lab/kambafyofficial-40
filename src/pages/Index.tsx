
import { KambafyLanding } from "@/components/KambafyLanding";
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useSubdomain } from '@/hooks/useSubdomain';
import Mobile from './Mobile';
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO, pageSEO } from "@/components/SEO";

const Index = () => {
  const { loading } = useAuth();
  const navigate = useNavigate();
  const { currentSubdomain } = useSubdomain();

  // Debug logs para investigar o problema
  console.log('🔍 Index.tsx - currentSubdomain:', currentSubdomain);
  console.log('🔍 Index.tsx - hostname:', window.location.hostname);
  console.log('🔍 Index.tsx - pathname:', window.location.pathname);

  // Se for mobile ou app subdomain, mostrar interface mobile específica
  if (currentSubdomain === 'mobile' || currentSubdomain === 'app') {
    console.log('✅ Redirecionando para Mobile component');
    return <Mobile />;
  }

  // Para o domínio principal (kambafy.com), sempre mostrar a landing page
  // Não verificar autenticação aqui pois é uma página pública
  if (currentSubdomain === 'main') {
    return (
      <>
        <SEO {...pageSEO.home} />
        <div className="relative overflow-hidden">
          <KambafyLanding />
        </div>
      </>
    );
  }

  // Para outros subdomínios, não mostrar loading - mostrar conteúdo diretamente
  // O AuthProvider já gerencia o estado interno

  return (
    <>
      <SEO {...pageSEO.home} />
      <div className="relative overflow-hidden">
        <KambafyLanding />
      </div>
    </>
  );
};

export default Index;
