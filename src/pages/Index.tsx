import InteractiveHero from "@/components/ui/hero-section-nexus";
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSubdomain } from '@/hooks/useSubdomain';
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO, pageSEO } from "@/components/SEO";
import { AnnouncementBanner } from "@/components/ui/announcement-banner";
import { useAuth } from '@/contexts/AuthContext';
import { useOneSignalAutoLink } from '@/hooks/useOneSignalAutoLink';

const Index = () => {
  const navigate = useNavigate();
  const { currentSubdomain } = useSubdomain();
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(true);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // ✅ Verificação automática de OneSignal (na landing page)
  useOneSignalAutoLink(user?.email, user?.id);

  // Se for mobile subdomain, redirecionar para /app
  useEffect(() => {
    if (currentSubdomain === 'mobile') {
      navigate('/app', { replace: true });
    }
  }, [currentSubdomain, navigate]);

  // Controlar visibilidade do banner baseado no scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Só mostrar o banner se estiver próximo do topo (menos de 100px)
      if (currentScrollY > 100) {
        setBannerVisible(false);
      } else {
        setBannerVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

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
        <div 
          className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
            bannerVisible ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <AnnouncementBanner
            show={showBanner}
            onHide={() => setShowBanner(false)}
            title="O seu curso terá um novo visual com a nova área de membro da Kambafy"
            mobileTitle="Nova Área de Membros"
            action={{
              label: "Conheça Agora",
              onClick: () => window.open('https://membros.kambafy.com', '_blank')
            }}
          />
        </div>
      )}

      {/* Ajustar header para ficar abaixo do banner */}
      <div className={showBanner && bannerVisible ? "[&_header]:!top-[48px]" : ""}>
        <InteractiveHero />
      </div>
    </>
  );
};

export default Index;
