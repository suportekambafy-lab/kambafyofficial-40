import { KambafyLanding } from "@/components/KambafyLanding";
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useSubdomain } from '@/hooks/useSubdomain';
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO, pageSEO } from "@/components/SEO";

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
      <KambafyLanding />
    </>
  );
};

export default Index;
