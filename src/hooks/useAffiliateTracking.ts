import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useAffiliateTracking() {
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Extrair código de afiliação da URL (parâmetro ?ref=)
    const urlParams = new URLSearchParams(location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
      setAffiliateCode(refCode);
      // Armazenar no localStorage para persistir durante a sessão
      localStorage.setItem('affiliate_code', refCode);
    } else {
      // Verificar se há código armazenado no localStorage
      const storedCode = localStorage.getItem('affiliate_code');
      if (storedCode) {
        setAffiliateCode(storedCode);
      }
    }
  }, [location.search]);

  const clearAffiliateCode = () => {
    setAffiliateCode(null);
    localStorage.removeItem('affiliate_code');
  };

  return {
    affiliateCode,
    hasAffiliate: !!affiliateCode,
    clearAffiliateCode
  };
}