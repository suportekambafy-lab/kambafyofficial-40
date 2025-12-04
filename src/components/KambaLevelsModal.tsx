import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useKambaLevels } from "@/hooks/useKambaLevels";
import { X, Lock, LockOpen, Target, ChevronLeft, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface KambaLevelsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalRevenue: number;
}

export const KambaLevelsModal: React.FC<KambaLevelsModalProps> = ({
  open,
  onOpenChange,
  totalRevenue
}) => {
  const { currentLevel, nextLevel, progress, allLevels } = useKambaLevels(totalRevenue);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleScrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -280, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 280, behavior: 'smooth' });
    }
  };

  const formatCurrency = (value: number) => {
    const parts = value.toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const decimalPart = parts[1];
    return `${integerPart},${decimalPart} Kz`;
  };

  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M Kz`;
    } else if (value >= 1000) {
      return `${Math.round(value / 1000)}K Kz`;
    } else {
      return `${Math.round(value)} Kz`;
    }
  };

  const isAchieved = (levelThreshold: number) => {
    return totalRevenue >= levelThreshold;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[80vh] p-0 overflow-hidden bg-background rounded-2xl border-border/50">
        <VisuallyHidden>
          <DialogTitle>Próximas conquistas</DialogTitle>
          <DialogDescription>Visualize suas conquistas e próximos marcos</DialogDescription>
        </VisuallyHidden>
        
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 z-50 rounded-full p-1.5 hover:bg-muted transition-colors"
          aria-label="Fechar modal"
        >
          <X className="h-5 w-5 text-foreground" />
        </button>

        <div className="p-4 md:p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Header */}
          <div className="space-y-1 pr-8">
            <h2 className="text-lg md:text-xl font-bold text-foreground">Próximas conquistas</h2>
            <p className="text-xs text-muted-foreground">
              Para cada marco, um prêmio para te lembrar: você faz acontecer
            </p>
          </div>

          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-[hsl(var(--checkout-orange))]" />
              <p className="font-medium text-xs text-foreground">Você está conseguindo!</p>
            </div>
            
            <div className="space-y-1.5">
              <Progress 
                value={progress} 
                className="h-1.5 bg-muted [&>div]:bg-primary" 
              />
              <p className="text-xs text-muted-foreground">
                Fature{' '}
                <span className="font-semibold text-[hsl(var(--checkout-orange))]">
                  {nextLevel ? formatCurrencyShort(nextLevel.threshold) : formatCurrencyShort(allLevels[allLevels.length - 1].threshold)}
                </span>
                {' '}e desbloqueie o {nextLevel ? nextLevel.name.replace('Kamba ', '') : 'nível máximo'}
              </p>
            </div>
          </div>

          {/* Carousel Container */}
          <div className="relative">
            {/* Navigation Buttons */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleScrollLeft}
              className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/95 shadow-lg border-border/50 hover:bg-muted hidden md:flex items-center justify-center"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleScrollRight}
              className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/95 shadow-lg border-border/50 hover:bg-muted hidden md:flex items-center justify-center"
              aria-label="Próximo"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Scrollable Cards Container */}
            <div 
              ref={carouselRef}
              className="carousel-scroll flex gap-3 pb-2 md:mx-8 overflow-x-auto"
            >
              {allLevels.map((level, index) => {
                const achieved = isAchieved(level.threshold);
                
                return (
                  <div
                    key={level.id}
                    className={`relative rounded-xl p-3 transition-all duration-300 flex-shrink-0 w-[calc(50%-6px)] min-w-[140px] max-w-[180px] min-h-[220px] flex flex-col ${
                      achieved 
                        ? 'bg-gradient-to-b from-[#0B4F6C] to-[#0C557A]' 
                        : 'bg-gradient-to-b from-gray-600 to-gray-700'
                    }`}
                  >
                    {/* Lock/Unlock Icon */}
                    <div className="absolute top-2 right-2">
                      {achieved ? (
                        <LockOpen className="h-4 w-4 text-yellow-400" />
                      ) : (
                        <Lock className="h-4 w-4 text-gray-400" />
                      )}
                    </div>

                    {/* Badge/Seal Image */}
                    <div className="flex-1 flex items-center justify-center py-2">
                      <div className={`relative ${achieved ? '' : 'grayscale opacity-60'}`}>
                        {achieved && (
                          <div className="absolute inset-0 bg-blue-400/30 rounded-full blur-xl scale-150" />
                        )}
                        <img 
                          src={level.seal} 
                          alt={level.name}
                          className="relative w-16 h-16 object-contain"
                        />
                      </div>
                    </div>

                    {/* Level Info */}
                    <div className="text-center space-y-1 mt-auto">
                      <h3 className={`text-sm font-bold ${achieved ? 'text-yellow-400' : 'text-gray-300'}`}>
                        {level.name.replace('Kamba ', '')}
                      </h3>
                      <p className="text-[10px] text-gray-400">
                        {index + 1}º marco
                      </p>

                      {/* Description or Revenue */}
                      <div className="pt-1 space-y-0.5">
                        <p className="text-[10px] text-gray-300">Faturamento</p>
                        <p className={`text-xs font-bold ${achieved ? 'text-white' : 'text-gray-300'}`}>
                          {formatCurrencyShort(level.threshold)}
                        </p>
                      </div>

                      {/* Lock Button for locked levels */}
                      {!achieved && (
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            disabled
                            size="sm"
                            className="w-full text-[10px] py-1.5 h-auto bg-transparent border-white/20 text-white/80 hover:bg-white/10"
                          >
                            <Lock className="h-3 w-3 mr-1" />
                            Bloqueado
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
