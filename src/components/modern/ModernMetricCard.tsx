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
  accentColor?: string;
}

export function ModernMetricCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendUp = true,
  className,
  action,
  variant = 'default',
  accentColor = 'bg-primary'
}: ModernMetricCardProps) {
  return (
    <div className={cn(
      "bg-card rounded-xl shadow-card border border-border/50 w-full max-w-full overflow-hidden transition-all duration-200 hover:shadow-card-hover flex",
      variant === 'highlight' && "border-primary/30",
      className
    )}>
      {/* Colored left border */}
      <div className={cn("w-1 rounded-l-xl shrink-0", accentColor)} />
      
      {/* Content */}
      <div className="flex-1 p-4 flex items-center justify-between min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-sm font-medium mb-1">
            {title}
          </p>
          <h3 className="text-2xl font-bold text-foreground tracking-tight truncate">
            {value}
          </h3>
          {action && (
            <div className="mt-2">
              {icon}
            </div>
          )}
          {!action && (
            <div className="mt-2 text-muted-foreground">
              {icon}
            </div>
          )}
        </div>
        
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium shrink-0 ml-4",
            trendUp ? "text-primary" : "text-destructive"
          )}>
            {trendUp ? <TrendingDown className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {trend}
          </div>
        )}
      </div>
    </div>
  );
}
