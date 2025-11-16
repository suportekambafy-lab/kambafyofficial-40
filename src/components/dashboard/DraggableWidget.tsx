import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DraggableWidgetProps {
  id: string;
  children: React.ReactNode;
  visible: boolean;
  onToggleVisibility: () => void;
  className?: string;
  isDragging?: boolean;
}

export function DraggableWidget({
  id,
  children,
  visible,
  onToggleVisibility,
  className,
}: DraggableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "z-50",
        className
      )}
    >
      {/* Drag Handle */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1 rounded-full shadow-lg">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onToggleVisibility}
          >
            {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Widget Content */}
      <div className={cn(
        "transition-all duration-200",
        isDragging && "shadow-2xl scale-105"
      )}>
        {children}
      </div>
    </div>
  );
}
