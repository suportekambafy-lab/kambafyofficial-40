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
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 text-white shadow-md border-b-2 border-red-700">
      <div className="max-w-7xl mx-auto px-3 py-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold text-xs">
              🎭 Admin: {targetUserName}
            </span>
            <span className="text-xs opacity-80">({targetUserEmail})</span>
            {isReadOnly && (
              <span className="flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
                <Eye className="h-3 w-3" />
                Leitura
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded">
              <Clock className="h-3 w-3" />
              <span className="font-mono font-semibold text-xs">
                {formatTime(timeRemaining)}
              </span>
            </div>
            
            <Button
              onClick={handleExitImpersonation}
              variant="secondary"
              size="sm"
              className="h-6 px-2 text-xs bg-white/20 hover:bg-white/30 text-white border-white/30 font-medium"
            >
              <LogOut className="h-3 w-3 mr-1" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
