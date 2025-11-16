import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, RotateCcw, Eye, EyeOff } from "lucide-react";
import { WidgetConfig } from "@/hooks/useDashboardPreferences";
import { Switch } from "@/components/ui/switch";

interface WidgetCustomizerProps {
  widgets: WidgetConfig[];
  onToggleWidget: (widgetId: string, visible: boolean) => void;
  onReset: () => void;
}

export function WidgetCustomizer({
  widgets,
  onToggleWidget,
  onReset,
}: WidgetCustomizerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Personalizar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-card border-border z-50">
        <DropdownMenuLabel>Widgets Visíveis</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {widgets.map((widget) => (
          <DropdownMenuItem
            key={widget.id}
            className="flex items-center justify-between cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2">
              {widget.visible ? (
                <Eye className="w-4 h-4 text-primary" />
              ) : (
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm">{widget.title}</span>
            </div>
            <Switch
              checked={widget.visible}
              onCheckedChange={(checked) => onToggleWidget(widget.id, checked)}
            />
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onReset} className="cursor-pointer">
          <RotateCcw className="w-4 h-4 mr-2" />
          Restaurar Padrão
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
