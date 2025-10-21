import InteractiveHero from "@/components/ui/hero-section-nexus";
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSubdomain } from '@/hooks/useSubdomain';
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO, pageSEO } from "@/components/SEO";
import { AnnouncementBanner } from "@/components/ui/announcement-banner";
import { Sparkles } from "lucide-react";

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
      
      {/* Banner de anúncio - fixo no topo */}
      {showBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="max-w-7xl mx-auto">
            <AnnouncementBanner
              show={showBanner}
              onHide={() => setShowBanner(false)}
              icon={<Sparkles className="h-5 w-5 text-green-600" />}
              title="O seu curso terá um novo visual com a nova área de membro da Kambafy"
              action={{
                label: "Conheça Agora",
                onClick: () => window.open('https://membros.kambafy.com', '_blank')
              }}
            />
          </div>
        </div>
      )}

      {/* Wrapper para ajustar o header do InteractiveHero */}
      <div className="[&_header]:!top-[60px]">
        <InteractiveHero />
      </div>
    </>
  );
};

export default Index;
