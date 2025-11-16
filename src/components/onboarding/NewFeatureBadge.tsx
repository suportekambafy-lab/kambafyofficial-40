import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewFeatureBadgeProps {
  featureId: string;
  className?: string;
}

export function NewFeatureBadge({ featureId, className }: NewFeatureBadgeProps) {
  // Check if feature was released in last 30 days
  const FEATURE_RELEASE_DATES: Record<string, string> = {
    'dashboard-customization': '2024-01-15',
    'quick-filters': '2024-01-15',
    'drag-drop-widgets': '2024-01-15',
  };

  const releaseDate = FEATURE_RELEASE_DATES[featureId];
  if (!releaseDate) return null;

  const daysSinceRelease = Math.floor(
    (Date.now() - new Date(releaseDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Show badge for 30 days after release
  if (daysSinceRelease > 30) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full',
        'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground',
        'animate-pulse',
        className
      )}
    >
      <Sparkles className="w-3 h-3" />
      Novo
    </span>
  );
}
