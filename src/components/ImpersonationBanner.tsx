import { AlertTriangle, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ImpersonationBannerProps {
  targetUserName: string;
  targetUserEmail: string;
}

export function ImpersonationBanner({ targetUserName, targetUserEmail }: ImpersonationBannerProps) {
  const { toast } = useToast();

  const handleExitImpersonation = async () => {
    try {
      // Limpar dados de impersonation
      localStorage.removeItem('impersonation_data');
      
      // Fazer logout do usuário impersonado
      await supabase.auth.signOut();
      
      toast({
        title: 'Impersonation encerrado',
        description: 'Você saiu do modo de impersonation.',
      });
      
      // Redirecionar para login admin
      window.location.href = '/admin/login';
    } catch (error) {
      console.error('Erro ao sair do impersonation:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao sair do modo impersonation',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 animate-pulse" />
            <div>
              <p className="font-semibold text-sm">
                🎭 Modo Administrador - Visualizando como: {targetUserName}
              </p>
              <p className="text-xs opacity-90">
                {targetUserEmail}
              </p>
            </div>
          </div>
          <Button
            onClick={handleExitImpersonation}
            variant="secondary"
            size="sm"
            className="bg-white/20 hover:bg-white/30 text-white border-white/30"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair do Impersonation
          </Button>
        </div>
      </div>
    </div>
  );
}
