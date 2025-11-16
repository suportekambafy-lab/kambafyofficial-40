import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ModernMetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  action?: React.ReactNode;
}

export function ModernMetricCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendUp = true,
  className,
  action
}: ModernMetricCardProps) {
  return (
    <div className={cn(
      "bg-card rounded-lg p-3 shadow-sm border border-primary/20 w-full max-w-full overflow-hidden",
      className
    )}>
      <div className="flex items-center justify-between mb-1.5 min-w-0">
        <p className="text-muted-foreground text-xs truncate">
          {title}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trendUp ? "text-primary" : "text-destructive"
            )}>
              {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend}
            </div>
          )}
        </div>
      </div>
      
      <div className="relative min-w-0">
        <h3 className="text-lg font-bold text-foreground truncate">
          {value}
        </h3>
        
        {action && (
          <div className="mt-2">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}