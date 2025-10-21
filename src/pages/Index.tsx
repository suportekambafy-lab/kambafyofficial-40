import InteractiveHero from "@/components/ui/hero-section-nexus";
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSubdomain } from '@/hooks/useSubdomain';
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO, pageSEO } from "@/components/SEO";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const { currentSubdomain } = useSubdomain();
  const [showBanner, setShowBanner] = useState(true);

  // Se for mobile subdomain, redirecionar para /app
  useEffect(() => {
    if (currentSubdomain === 'mobile') {
      navigate('/app', { replace: true });
    }
  }, [currentSubdomain, navigate]);

  // Esconder/mostrar banner ao rolar
  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Rolando para baixo - esconder
        setShowBanner(false);
      } else if (currentScrollY < lastScrollY) {
        // Rolando para cima - mostrar
        setShowBanner(true);
      }
      
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      
      {/* Banner de anúncio */}
      <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${showBanner ? 'translate-y-0' : '-translate-y-full'}`}>
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
      </div>

      {/* Espaçamento para compensar o banner fixo */}
      <div className={`transition-all duration-300 ${showBanner ? 'h-16' : 'h-0'}`} />

      <InteractiveHero />
    </>
  );
};

export default Index;
