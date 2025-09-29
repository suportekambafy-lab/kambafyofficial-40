import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SimpleMembersAccess {
  isVerified: boolean;
  email: string | null;
  memberAreaId: string | null;
}

export function useSimpleMembersAccess(): SimpleMembersAccess {
  const location = useLocation();
  const [accessData, setAccessData] = useState<SimpleMembersAccess>({
    isVerified: false,
    email: null,
    memberAreaId: null,
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const verified = searchParams.get('verified') === 'true';
    const email = searchParams.get('email');
    
    // Extrair memberAreaId da URL (path: /members/area/:id)
    const pathSegments = location.pathname.split('/');
    const memberAreaId = pathSegments[3] || null;

    setAccessData({
      isVerified: verified,
      email: email ? decodeURIComponent(email) : null,
      memberAreaId,
    });
  }, [location.search, location.pathname]);

  return accessData;
}