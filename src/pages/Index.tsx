
import { KambafyLanding } from "@/components/KambafyLanding";
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useSubdomain } from '@/hooks/useSubdomain';
import Mobile from './Mobile';
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO, pageSEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { loading } = useAuth();
  const navigate = useNavigate();
  const { currentSubdomain } = useSubdomain();

  // Removido console.log desnecessário

  // Se for mobile subdomain, mostrar interface mobile específica
  if (currentSubdomain === 'mobile') {
    return <Mobile />;
  }

  // Para o domínio principal (kambafy.com), sempre mostrar a landing page
  // Não verificar autenticação aqui pois é uma página pública
  if (currentSubdomain === 'main') {
    return (
      <>
        <SEO {...pageSEO.home} />
        <div className="relative overflow-hidden">
          {/* Link de teste para área de membros */}
          <div className="fixed top-4 right-4 z-50 space-y-2">
            <Button 
              onClick={() => window.open('https://membros.kambafy.com/login/290b0398-c5f4-4681-944b-edc40f6fe0a2', '_blank')}
              variant="outline"
              size="sm"
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              🧪 Teste Login victormuabi
            </Button>
            <Button 
              onClick={() => window.open('https://membros.kambafy.com/area/290b0398-c5f4-4681-944b-edc40f6fe0a2', '_blank')}
              variant="outline"
              size="sm"
              className="bg-green-600 text-white hover:bg-green-700 ml-2"
            >
              🧪 Teste Área victormuabi
            </Button>
          </div>
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
