import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AdminPageSkeletonProps {
  variant?: 'dashboard' | 'table' | 'cards' | 'default';
}

export function AdminPageSkeleton({ variant = 'default' }: AdminPageSkeletonProps) {
  if (variant === 'dashboard') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[hsl(var(--admin-card-bg))] rounded-2xl p-6 border border-[hsl(var(--admin-border))]">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[hsl(var(--admin-card-bg))] rounded-2xl p-6 border border-[hsl(var(--admin-border))]">
            <Skeleton className="h-5 w-32 mb-4" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="bg-[hsl(var(--admin-card-bg))] rounded-2xl p-6 border border-[hsl(var(--admin-border))]">
            <Skeleton className="h-5 w-32 mb-4" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Filters */}
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Table */}
        <div className="bg-[hsl(var(--admin-card-bg))] rounded-2xl border border-[hsl(var(--admin-border))] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-[hsl(var(--admin-border))] flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
          
          {/* Rows */}
          {[...Array(8)].map((_, i) => (
            <div key={i} className="p-4 border-b border-[hsl(var(--admin-border))] flex gap-4 items-center">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[hsl(var(--admin-card-bg))] rounded-xl p-4 border border-[hsl(var(--admin-border))]">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[hsl(var(--admin-card-bg))] rounded-2xl p-6 border border-[hsl(var(--admin-border))]">
              <div className="flex items-start gap-4 mb-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-20 w-full rounded-lg mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded" />
                <Skeleton className="h-8 w-20 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-[hsl(var(--admin-card-bg))] rounded-xl p-4 border border-[hsl(var(--admin-border))]">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      
      <div className="bg-[hsl(var(--admin-card-bg))] rounded-2xl p-6 border border-[hsl(var(--admin-border))]">
        <Skeleton className="h-5 w-40 mb-6" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4 mb-4">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
