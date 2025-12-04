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
  variant?: 'default' | 'highlight';
}

export function ModernMetricCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendUp = true,
  className,
  action,
  variant = 'default'
}: ModernMetricCardProps) {
  return (
    <div className={cn(
      "bg-card rounded-[14px] p-4 shadow-card border border-border/50 w-full max-w-full overflow-hidden transition-all duration-200 hover:shadow-card-hover",
      variant === 'highlight' && "border-primary/30 bg-gradient-to-br from-card to-secondary/30",
      className
    )}>
      <div className="flex items-start justify-between mb-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-primary shrink-0">
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            trendUp ? "text-primary bg-secondary" : "text-destructive bg-destructive/10"
          )}>
            {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>
      
      <div className="min-w-0">
        <h3 className="text-[26px] font-bold text-foreground tracking-tight truncate mb-1">
          {value}
        </h3>
        <p className="text-muted-foreground text-[13px] font-medium truncate">
          {title}
        </p>
        
        {action && (
          <div className="mt-3">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
