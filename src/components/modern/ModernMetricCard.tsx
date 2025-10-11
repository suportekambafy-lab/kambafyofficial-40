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
      "bg-card rounded-xl p-6 shadow-sm border border-primary/20",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-muted-foreground text-sm">
          {title}
        </p>
        <div className="flex items-center gap-2">
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              trendUp ? "text-primary" : "text-destructive"
            )}>
              {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend}
            </div>
          )}
        </div>
      </div>
      
      <div className="relative">
        <h3 className="text-2xl font-bold text-foreground mb-1">
          {value}
        </h3>
        
        {action && (
          <div className="absolute bottom-0 right-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}