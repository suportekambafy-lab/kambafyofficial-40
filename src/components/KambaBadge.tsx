
import React from 'react';
import { useKambaLevels } from "@/hooks/useKambaLevels";
import { Badge } from "@/components/ui/badge";

interface KambaBadgeProps {
  totalRevenue: number;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const KambaBadge: React.FC<KambaBadgeProps> = ({ 
  totalRevenue, 
  size = 'md',
  showText = true 
}) => {
  const { currentLevel } = useKambaLevels(totalRevenue);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex items-center gap-2">
      <img 
        src={currentLevel.badge} 
        alt={currentLevel.name}
        className={`${sizeClasses[size]} rounded`}
      />
      {showText && (
        <Badge 
          style={{ backgroundColor: currentLevel.color, color: 'white' }}
          className="text-xs"
        >
          {currentLevel.emoji} {currentLevel.name}
        </Badge>
      )}
    </div>
  );
};
