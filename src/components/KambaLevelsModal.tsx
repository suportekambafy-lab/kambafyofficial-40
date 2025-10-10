import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useKambaLevels } from "@/hooks/useKambaLevels";
import { ChevronLeft, ChevronRight, X, Lock, LockOpen, Target } from "lucide-react";
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
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(allLevels.length - 1, prev + 1));
  };

  const visibleLevels = allLevels.slice(currentIndex, currentIndex + 3);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < allLevels.length - 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-0 overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-6 top-6 z-50 rounded-full bg-background/80 backdrop-blur p-2 hover:bg-background transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="space-y-3">
            <h2 className="text-3xl font-bold">Próximas conquistas</h2>
            <p className="text-muted-foreground">
              Para cada marco, um prêmio para te lembrar: você faz acontecer
            </p>
          </div>

          {/* Progress Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Target className="h-5 w-5" />
              <p className="font-medium">Você está conseguindo!</p>
            </div>
            
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                Fature <span className="font-semibold text-primary">{nextLevel ? formatCurrency(nextLevel.threshold) : formatCurrency(allLevels[allLevels.length - 1].threshold)}</span> e desbloqueie o {nextLevel ? nextLevel.name : 'nível máximo'}
              </p>
            </div>
          </div>

          {/* Carousel */}
          <div className="relative">
            <div className="flex gap-6 justify-center items-stretch min-h-[420px]">
              {visibleLevels.map((level, index) => {
                const achieved = isAchieved(level.threshold);
                const isCurrent = currentLevel && level.id === currentLevel.id;
                const globalIndex = currentIndex + index;
                
                return (
                  <div
                    key={level.id}
                    className={`relative flex-1 rounded-2xl p-6 transition-all duration-300 ${
                      achieved 
                        ? 'bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-2 border-primary/30' 
                        : 'bg-gradient-to-br from-muted/50 to-muted/30 border-2 border-border/50'
                    }`}
                    style={{
                      maxWidth: '320px',
                      minHeight: '420px'
                    }}
                  >
                    {/* Lock Icon */}
                    <div className="absolute top-4 right-4">
                      {achieved ? (
                        <div className="p-2 rounded-lg bg-primary/20">
                          <LockOpen className="h-5 w-5 text-primary" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg bg-muted">
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Badge Icon with glow effect */}
                    <div className="flex justify-center mb-6 mt-4">
                      <div className={`relative ${achieved ? 'animate-pulse' : ''}`}>
                        {achieved && (
                          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                        )}
                        <img 
                          src={level.seal} 
                          alt={level.name}
                          className={`relative w-32 h-32 object-contain ${!achieved ? 'opacity-30 grayscale' : ''}`}
                        />
                      </div>
                    </div>

                    {/* Level Info */}
                    <div className="text-center space-y-3">
                      <h3 className={`text-2xl font-bold ${achieved ? 'text-primary' : 'text-muted-foreground'}`}>
                        {level.name.replace('Kamba ', '')}
                      </h3>
                      <p className={`text-sm ${achieved ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {globalIndex + 1}º marco
                      </p>

                      {/* Rewards or message */}
                      <div className="pt-4 space-y-2">
                        {achieved ? (
                          <>
                            <p className="text-sm font-medium">
                              {level.rewards[0]}
                            </p>
                            {level.rewards.length > 1 && (
                              <p className="text-xs text-muted-foreground">
                                Nível desbloqueado!
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm">
                            Faturamento
                          </p>
                        )}
                      </div>

                      {/* Threshold */}
                      <div className={`pt-2 ${achieved ? 'text-primary' : 'text-foreground'}`}>
                        <p className="text-2xl font-bold">
                          {formatCurrency(level.threshold)}
                        </p>
                      </div>

                      {/* Lock Button for locked levels */}
                      {!achieved && (
                        <div className="pt-4">
                          <Button
                            variant="outline"
                            disabled
                            className="w-full"
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

            {/* Navigation Arrows */}
            {canGoPrev && (
              <button
                onClick={handlePrevious}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-background border-2 rounded-full p-3 hover:bg-accent transition-colors shadow-lg"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {canGoNext && (
              <button
                onClick={handleNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-background border-2 rounded-full p-3 hover:bg-accent transition-colors shadow-lg"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
