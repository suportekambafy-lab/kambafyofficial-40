import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle } from 'lucide-react';

export function IbanNotificationBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkIbanStatus = async () => {
      if (!user) return;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('iban')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking IBAN status:', error);
          return;
        }

        // Mostrar banner se não tiver IBAN configurado e não foi dispensado
        const hasIban = profile?.iban && profile.iban.trim() !== '';
        const dismissedKey = `iban_banner_dismissed_${user.id}`;
        const isDismissed = localStorage.getItem(dismissedKey) === 'true';
        
        setShowBanner(!hasIban && !isDismissed);
      } catch (error) {
        console.error('Error checking IBAN status:', error);
      }
    };

    if (user) {
      checkIbanStatus();
    }
  }, [user]);

  const handleDismiss = () => {
    if (user) {
      const dismissedKey = `iban_banner_dismissed_${user.id}`;
      localStorage.setItem(dismissedKey, 'true');
    }
    setDismissed(true);
    setShowBanner(false);
  };

  const handleGoToFinancial = () => {
    navigate('/vendedor/financeiro');
  };

  if (!showBanner || dismissed) {
    return null;
  }

  return (
    <div className="bg-yellow-400 border-b border-yellow-500 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-800" />
          <div className="text-yellow-800">
            <span className="font-semibold">Configure seu IBAN</span>
            <span className="ml-2">para começar a receber pagamentos das suas vendas.</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleGoToFinancial}
            size="sm"
            className="bg-yellow-800 hover:bg-yellow-900 text-yellow-100 text-xs"
          >
            Configurar Agora
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-yellow-800 hover:bg-yellow-500/20 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}