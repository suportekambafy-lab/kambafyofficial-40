import { AlertTriangle, LogOut, Clock, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useImpersonationProtection } from '@/hooks/useImpersonationProtection';

interface ImpersonationBannerProps {
  targetUserName: string;
  targetUserEmail: string;
}

export function ImpersonationBanner({ targetUserName, targetUserEmail }: ImpersonationBannerProps) {
  const { toast } = useToast();
  const { timeRemaining, exitImpersonation, isReadOnly } = useImpersonationProtection();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExitImpersonation = async () => {
    await exitImpersonation();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 text-white shadow-lg border-b-4 border-red-700">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 animate-pulse" />
            <div>
              <div className="flex items-center gap-3">
                <p className="font-bold text-sm">
                  🎭 MODO ADMINISTRADOR - Visualizando como: {targetUserName}
                </p>
                {isReadOnly && (
                  <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded text-xs">
                    <Eye className="h-3 w-3" />
                    Somente Leitura
                  </span>
                )}
              </div>
              <p className="text-xs opacity-90 mt-0.5">
                {targetUserEmail}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded">
              <Clock className="h-4 w-4" />
              <span className="font-mono font-semibold text-sm">
                {formatTime(timeRemaining)}
              </span>
            </div>
            
            <Button
              onClick={handleExitImpersonation}
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 font-semibold"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair do Impersonation
            </Button>
          </div>
        </div>
        
        {isReadOnly && (
          <div className="mt-2 text-xs bg-red-700/50 px-3 py-1.5 rounded">
            ⚠️ <strong>Atenção:</strong> Você está em modo somente leitura. Não é possível criar produtos, fazer transações ou modificar dados.
          </div>
        )}
      </div>
    </div>
  );
}
