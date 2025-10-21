import InteractiveHero from "@/components/ui/hero-section-nexus";
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useSubdomain } from '@/hooks/useSubdomain';
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO, pageSEO } from "@/components/SEO";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const { currentSubdomain } = useSubdomain();

  // Se for mobile subdomain, redirecionar para /app
  useEffect(() => {
    if (currentSubdomain === 'mobile') {
      navigate('/app', { replace: true });
    }
  }, [currentSubdomain, navigate]);

  // Mostrar loading enquanto redireciona
  if (currentSubdomain === 'mobile') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Sempre mostrar a landing page (pública)
  return (
    <>
      <SEO {...pageSEO.home} />
      
      {/* Banner de anúncio - acima do header */}
      <div className="bg-emerald-900 text-white px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <Banner
            show={true}
            title="O seu curso terá um novo visual com a nova área de membro da Kambafy"
            className="bg-transparent border-0 shadow-none text-white"
            action={
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => window.open('https://membros.kambafy.com', '_blank')}
              >
                Conheça Agora
              </Button>
            }
          />
        </div>
      </div>

      <InteractiveHero />
    </>
  );
};

export default Index;
