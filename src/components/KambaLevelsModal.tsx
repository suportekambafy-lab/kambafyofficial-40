import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useKambaLevels } from "@/hooks/useKambaLevels";
import { X, Lock, LockOpen, Target, ChevronLeft, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const mouseCoords = useRef({
    startX: 0,
    scrollLeft: 0
  });

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const element = scrollRef.current;
    if (!element) return;
    
    const startX = e.pageX - element.offsetLeft;
    const scrollLeft = element.scrollLeft;
    mouseCoords.current = { startX, scrollLeft };
    setIsDragging(true);
    element.style.cursor = 'grabbing';
    element.style.scrollSnapType = 'none';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const element = scrollRef.current;
    if (!element) return;
    
    e.preventDefault();
    const x = e.pageX - element.offsetLeft;
    const walkX = (x - mouseCoords.current.startX) * 1.5;
    element.scrollLeft = mouseCoords.current.scrollLeft - walkX;
  };

  const handleMouseUp = () => {
    const element = scrollRef.current;
    if (element) {
      element.style.cursor = 'grab';
      element.style.scrollSnapType = 'x mandatory';
    }
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    const element = scrollRef.current;
    if (isDragging && element) {
      element.style.cursor = 'grab';
      element.style.scrollSnapType = 'x mandatory';
    }
    setIsDragging(false);
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

  const visibleLevels = allLevels;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1200px] h-auto max-h-[90vh] p-0 overflow-hidden bg-background rounded-2xl md:rounded-3xl border-border/50">
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 md:right-6 md:top-6 z-50 rounded-full p-2 hover:bg-muted transition-colors"
          aria-label="Fechar modal"
        >
          <X className="h-5 w-5 md:h-6 md:w-6 text-foreground" />
        </button>

        <div className="p-6 md:p-8 lg:p-10 space-y-6">
          {/* Header */}
          <div className="space-y-2 pr-8">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Próximas conquistas</h2>
            <p className="text-sm text-muted-foreground">
              Para cada marco, um prêmio para te lembrar: você faz acontecer
            </p>
          </div>

          {/* Progress Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-500" />
              <p className="font-medium text-sm text-foreground">Você está conseguindo!</p>
            </div>
            
            <div className="space-y-2">
              <Progress 
                value={progress} 
                className="h-2 bg-muted [&>div]:bg-foreground dark:[&>div]:bg-white" 
              />
              <p className="text-sm text-muted-foreground">
                Fature{' '}
                <span className="font-semibold text-orange-500">
                  {nextLevel ? formatCurrencyShort(nextLevel.threshold) : formatCurrencyShort(allLevels[allLevels.length - 1].threshold)}
                </span>
                {' '}e desbloqueie o {nextLevel ? nextLevel.name.replace('Kamba ', '') : 'nível máximo'}
              </p>
            </div>
          </div>

          {/* Carousel with Navigation */}
          <div className="relative overflow-hidden">
            {/* Left Arrow */}
            <Button
              variant="outline"
              size="icon"
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background shadow-lg border-border/50 hover:bg-muted hidden md:flex"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            {/* Right Arrow */}
            <Button
              variant="outline"
              size="icon"
              onClick={scrollRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background shadow-lg border-border/50 hover:bg-muted hidden md:flex"
              aria-label="Próximo"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            {/* Cards Carousel */}
            <div 
              ref={scrollRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              className="flex gap-5 pb-4 md:px-14 overflow-x-auto"
              style={{ 
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none'
              }}
            >
              {visibleLevels.map((level, index) => {
                const achieved = isAchieved(level.threshold);
                
                return (
                  <div
                    key={level.id}
                    className={`relative rounded-2xl p-5 transition-all duration-300 flex-shrink-0 snap-start w-[260px] min-h-[380px] flex flex-col ${
                      achieved 
                        ? 'bg-gradient-to-b from-[#0B4F6C] to-[#0C557A]' 
                        : 'bg-gradient-to-b from-gray-600 to-gray-700'
                    }`}
                  >
                    {/* Lock/Unlock Icon */}
                    <div className="absolute top-4 right-4">
                      {achieved ? (
                        <LockOpen className="h-5 w-5 text-yellow-400" />
                      ) : (
                        <Lock className="h-5 w-5 text-gray-400" />
                      )}
                    </div>

                    {/* Badge/Seal Image */}
                    <div className="flex-1 flex items-center justify-center py-4">
                      <div className={`relative ${achieved ? '' : 'grayscale opacity-60'}`}>
                        {achieved && (
                          <div className="absolute inset-0 bg-blue-400/30 rounded-full blur-2xl scale-150" />
                        )}
                        <img 
                          src={level.seal} 
                          alt={level.name}
                          className="relative w-28 h-28 object-contain"
                        />
                      </div>
                    </div>

                    {/* Level Info */}
                    <div className="text-center space-y-2 mt-auto">
                      <h3 className={`text-lg font-bold ${achieved ? 'text-yellow-400' : 'text-gray-300'}`}>
                        {level.name.replace('Kamba ', '')}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {index + 1}º marco
                      </p>

                      {/* Description or Revenue */}
                      <div className="pt-3 space-y-1">
                        {index === 0 && achieved ? (
                          <>
                            <p className="text-sm text-gray-300">
                              Primeiro produto ativado.
                            </p>
                            <p className="text-sm text-gray-300">
                              Nível desbloqueado!
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-gray-300">Faturamento</p>
                            <p className={`text-xl font-bold ${achieved ? 'text-white' : 'text-gray-300'}`}>
                              {formatCurrency(level.threshold)}
                            </p>
                          </>
                        )}
                      </div>

                      {/* Lock Button for locked levels */}
                      {!achieved && (
                        <div className="pt-4">
                          <Button
                            variant="outline"
                            disabled
                            className="w-full text-sm py-2.5 bg-transparent border-white/20 text-white/80 hover:bg-white/10"
                          >
                            <Lock className="h-4 w-4 mr-2" />
                            Prêmio bloqueado
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
