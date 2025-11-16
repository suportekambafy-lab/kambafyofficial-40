import { Button } from '@/components/ui/button';
import { HelpCircle, Play } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useOnboarding } from '@/hooks/useOnboarding';

export function OnboardingTrigger() {
  const { startTour, resetTour } = useOnboarding('dashboard-tour');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle className="w-4 h-4 mr-2" />
          Ajuda
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card border-border z-50">
        <DropdownMenuLabel>Tour Guiado</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={startTour} className="cursor-pointer">
          <Play className="w-4 h-4 mr-2" />
          Iniciar Tour do Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={resetTour} className="cursor-pointer">
          <Play className="w-4 h-4 mr-2" />
          Reiniciar do Início
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
