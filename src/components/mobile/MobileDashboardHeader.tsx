
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
    return `${amount.toLocaleString()} KZ`;
  };

  return (
    <div className="bg-checkout-green text-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Menu className="w-6 h-6" />
        </div>
        
        {/* Meta section - right side */}
        <div className="flex flex-col items-end space-y-1">
          <div className="text-right">
            <div className="text-xs text-white/80">Meta:</div>
            <div className="font-semibold text-sm">{formatPrice(goal)}</div>
          </div>
          <div className="flex flex-col items-end">
            <Progress 
              value={progressPercentage} 
              className="w-20 h-2" 
              variant="yellow"
              style={{'--progress-background': '#FDE047'} as React.CSSProperties}
            />
            <span className="text-xs text-white/80 mt-1">
              {progressPercentage.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
