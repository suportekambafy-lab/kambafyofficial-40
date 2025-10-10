import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useKambaLevels } from "@/hooks/useKambaLevels";
import { X, Lock, LockOpen, Target } from "lucide-react";
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
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const element = scrollRef.current;
    if (!element) return;
    
    setIsDragging(true);
    setStartX(e.pageX - element.offsetLeft);
    setScrollLeft(element.scrollLeft);
    element.style.scrollSnapType = 'none';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const element = scrollRef.current;
    if (!element) return;
    
    e.preventDefault();
    const x = e.pageX - element.offsetLeft;
    const walk = (x - startX) * 2;
    element.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    if (scrollRef.current) {
      scrollRef.current.style.scrollSnapType = 'x mandatory';
    }
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    if (isDragging && scrollRef.current) {
      scrollRef.current.style.scrollSnapType = 'x mandatory';
    }
    setIsDragging(false);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M KZ`;
    } else if (value >= 1000) {
      return `${Math.round(value / 1000)}K KZ`;
    } else {
      return `${Math.round(value)} KZ`;
    }
  };

  const isAchieved = (levelThreshold: number) => {
    return totalRevenue >= levelThreshold;
  };

  const visibleLevels = allLevels;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1900px] h-auto max-h-[90vh] p-0 overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 rounded-2xl md:rounded-3xl">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 md:right-8 md:top-8 z-50 rounded-full bg-background/80 backdrop-blur p-2 md:p-2.5 hover:bg-background transition-colors"
        >
          <X className="h-5 w-5 md:h-6 md:w-6" />
        </button>

        <div className="p-4 md:p-8 lg:p-10 space-y-4 md:space-y-5">
          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold">Próximas conquistas</h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Para cada marco, um prêmio para te lembrar: você faz acontecer
            </p>
          </div>

          {/* Progress Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Target className="h-5 w-5" />
              <p className="font-medium text-sm md:text-base">Você está conseguindo!</p>
            </div>
            
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs md:text-sm text-muted-foreground">
                Fature <span className="font-semibold text-primary">{nextLevel ? formatCurrency(nextLevel.threshold) : formatCurrency(allLevels[allLevels.length - 1].threshold)}</span> e desbloqueie o {nextLevel ? nextLevel.name : 'nível máximo'}
              </p>
            </div>
          </div>

          {/* Carousel */}
          <div className="relative py-2 -mx-4 px-4 md:mx-0 md:px-0">
            <div 
              ref={scrollRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              className="flex gap-4 md:gap-6 items-stretch overflow-x-scroll overflow-y-hidden pb-4 snap-x snap-mandatory scrollbar-hide select-none"
              style={{ 
                WebkitOverflowScrolling: 'touch',
                scrollBehavior: 'smooth',
                cursor: isDragging ? 'grabbing' : 'grab'
              }}
            >
              {visibleLevels.map((level, index) => {
                const achieved = isAchieved(level.threshold);
                const isCurrent = currentLevel && level.id === currentLevel.id;
                
                return (
                  <div
                    key={level.id}
                    className={`relative rounded-2xl md:rounded-3xl p-4 md:p-5 transition-all duration-300 flex-shrink-0 snap-start w-[85vw] sm:w-[280px] md:w-[300px] lg:w-[340px] touch-pan-x ${
                      achieved 
                        ? 'bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-2 border-primary/30' 
                        : 'bg-gradient-to-br from-muted/50 to-muted/30 border-2 border-border/50'
                    }`}
                  >
                    {/* Lock Icon */}
                    <div className="absolute top-3 right-3">
                      {achieved ? (
                        <div className="p-1.5 rounded-lg bg-primary/20">
                          <LockOpen className="h-4 w-4 text-primary" />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-lg bg-muted">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Badge Icon with glow effect */}
                    <div className="flex justify-center mb-3 mt-2">
                      <div className={`relative ${achieved ? 'animate-pulse' : ''}`}>
                        {achieved && (
                          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                        )}
                        <img 
                          src={level.seal} 
                          alt={level.name}
                          className={`relative w-20 h-20 md:w-24 md:h-24 object-contain ${!achieved ? 'opacity-30 grayscale' : ''}`}
                        />
                      </div>
                    </div>

                    {/* Level Info */}
                    <div className="text-center space-y-2">
                      <h3 className={`text-lg md:text-xl font-bold ${achieved ? 'text-primary' : 'text-muted-foreground'}`}>
                        {level.name.replace('Kamba ', '')}
                      </h3>
                      <p className={`text-xs md:text-sm ${achieved ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {index + 1}º marco
                      </p>

                      {/* Rewards or message */}
                      <div className="pt-2 space-y-1">
                        {achieved ? (
                          <>
                            <p className="text-xs md:text-sm font-medium">
                              {level.rewards[0]}
                            </p>
                            {level.rewards.length > 1 && (
                              <p className="text-xs text-muted-foreground">
                                Nível desbloqueado!
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs md:text-sm">
                            Faturamento
                          </p>
                        )}
                      </div>

                      {/* Threshold */}
                      <div className={`pt-2 ${achieved ? 'text-primary' : 'text-foreground'}`}>
                        <p className="text-xl md:text-2xl font-bold">
                          {formatCurrency(level.threshold)}
                        </p>
                      </div>

                      {/* Lock Button for locked levels */}
                      {!achieved && (
                        <div className="pt-3">
                          <Button
                            variant="outline"
                            disabled
                            className="w-full text-xs md:text-sm py-3"
                          >
                            <Lock className="h-3 w-3 md:h-4 md:w-4 mr-2" />
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
