
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useKambaLevels } from "@/hooks/useKambaLevels";

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
  const { currentLevel, achievedLevels, allLevels } = useKambaLevels(totalRevenue);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img 
              src={currentLevel.badge} 
              alt={currentLevel.name}
              className="w-8 h-8 rounded"
            />
            Níveis de Reconhecimento Kamba
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Seu Nível Atual</h3>
              <Badge 
                style={{ backgroundColor: currentLevel.color, color: 'white' }}
                className="text-xs"
              >
                {currentLevel.emoji} {currentLevel.name}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Faturamento total: {formatCurrency(totalRevenue)}
            </p>
          </div>

          <div className="space-y-4">
            {allLevels.map((level, index) => {
              const achieved = isAchieved(level.threshold);
              const isCurrent = level.id === currentLevel.id;
              
              return (
                <div
                  key={level.id}
                  className={`relative rounded-lg border p-4 transition-all ${
                    achieved 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  } ${isCurrent ? 'ring-2 ring-blue-500' : ''}`}
                >
                  {achieved && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-green-500 rounded-full p-1">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <img 
                      src={level.badge} 
                      alt={level.name}
                      className={`w-16 h-16 rounded-lg ${!achieved ? 'opacity-50 grayscale' : ''}`}
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className={`font-semibold ${achieved ? 'text-green-700' : 'text-muted-foreground'}`}>
                          {level.emoji} {level.name}
                        </h3>
                        {isCurrent && (
                          <Badge variant="outline" className="text-xs">
                            Atual
                          </Badge>
                        )}
                      </div>
                      
                      <p className={`text-sm mb-3 ${achieved ? 'text-green-600' : 'text-muted-foreground'}`}>
                        Meta: {formatCurrency(level.threshold)}
                      </p>

                      <div className="space-y-1">
                        <p className={`text-sm font-medium ${achieved ? 'text-green-700' : 'text-muted-foreground'}`}>
                          Recompensas:
                        </p>
                        <ul className="space-y-1">
                          {level.rewards.map((reward, rewardIndex) => (
                            <li 
                              key={rewardIndex}
                              className={`text-sm flex items-center gap-2 ${
                                achieved ? 'text-green-600' : 'text-muted-foreground'
                              }`}
                            >
                              {achieved ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <div className="w-3 h-3 rounded-full border border-gray-300" />
                              )}
                              {reward}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center text-sm text-muted-foreground mt-6">
            Continue vendendo para desbloquear novos níveis e recompensas!
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
