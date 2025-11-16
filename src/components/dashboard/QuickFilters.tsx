import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const FILTERS = [
  { id: 'today', label: 'Hoje', icon: Zap },
  { id: '7days', label: '7 dias', icon: Clock },
  { id: '30days', label: '30 dias', icon: Calendar },
  { id: 'all', label: 'Tudo', icon: TrendingUp },
];

export function QuickFilters({ activeFilter, onFilterChange }: QuickFiltersProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {FILTERS.map((filter) => {
        const Icon = filter.icon;
        const isActive = activeFilter === filter.id;
        
        return (
          <Button
            key={filter.id}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(filter.id)}
            className={cn(
              "transition-all duration-200",
              isActive && "shadow-md"
            )}
          >
            <Icon className="w-4 h-4 mr-2" />
            {filter.label}
          </Button>
        );
      })}
    </div>
  );
}
