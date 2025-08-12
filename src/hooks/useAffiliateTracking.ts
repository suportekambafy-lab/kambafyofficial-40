import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useAffiliateTracking() {
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  const [isValidAffiliate, setIsValidAffiliate] = useState<boolean>(false);
  const location = useLocation();

  useEffect(() => {
    // Extrair código de afiliação da URL (parâmetro ?ref=)
    const urlParams = new URLSearchParams(location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
      console.log('🔗 Código de afiliado detectado na URL:', refCode);
      setAffiliateCode(refCode);
      setIsValidAffiliate(false); // Será validado durante o checkout
      // Armazenar no localStorage para persistir durante a sessão
      localStorage.setItem('affiliate_code', refCode);
    } else {
      // Verificar se há código armazenado no localStorage
      const storedCode = localStorage.getItem('affiliate_code');
      if (storedCode) {
        console.log('🔗 Código de afiliado recuperado do localStorage:', storedCode);
        setAffiliateCode(storedCode);
        setIsValidAffiliate(false); // Será validado durante o checkout
      }
    }
  }, [location.search]);

  const clearAffiliateCode = () => {
    console.log('🧹 Limpando código de afiliado');
    setAffiliateCode(null);
    setIsValidAffiliate(false);
    localStorage.removeItem('affiliate_code');
  };

  const markAsValidAffiliate = () => {
    setIsValidAffiliate(true);
  };

  const markAsInvalidAffiliate = () => {
    setIsValidAffiliate(false);
  };

  return {
    affiliateCode,
    hasAffiliate: !!affiliateCode,
    isValidAffiliate,
    clearAffiliateCode,
    markAsValidAffiliate,
    markAsInvalidAffiliate
  };
}