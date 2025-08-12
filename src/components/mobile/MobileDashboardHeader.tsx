
import React from 'react';
import { Progress } from "@/components/ui/progress";
import { Menu } from 'lucide-react';

interface MobileDashboardHeaderProps {
  goal: number;
  totalRevenue: number;
  progressPercentage: number;
}

export function MobileDashboardHeader({ goal, totalRevenue, progressPercentage }: MobileDashboardHeaderProps) {
  const formatPrice = (amount: number): string => {
    return `${parseFloat(amount.toString()).toLocaleString('pt-BR')} KZ`;
  };

  return (
    <div 
      className="relative bg-checkout-green text-white p-4 min-h-[200px] flex flex-col justify-between overflow-hidden"
      style={{
        backgroundImage: `url('/lovable-uploads/373ca352-3319-4914-9898-1dc76571a167.png?v=${Date.now()}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/30"></div>
      
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Menu className="w-6 h-6" />
        </div>
        
        {/* Meta section - right side */}
        <div className="flex flex-col items-end space-y-1">
          <div className="text-right">
            <div className="text-xs text-white/90">Meta:</div>
            <div className="font-semibold text-sm">{formatPrice(goal)}</div>
          </div>
          <div className="flex flex-col items-end">
            <Progress 
              value={progressPercentage} 
              className="w-20 h-2" 
              variant="yellow"
              style={{'--progress-background': '#FDE047'} as React.CSSProperties}
            />
            <span className="text-xs text-white/90 mt-1">
              {progressPercentage.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
      
      {/* Bottom space for the banner image visibility */}
      <div className="relative z-10 h-16"></div>
    </div>
  );
}
