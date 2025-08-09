
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Settings, BarChart3 } from "lucide-react";

interface IntegrationCardProps {
  name: string;
  icon: React.ReactNode;
  active: boolean;
  createdAt: string;
  productName?: string;
  type?: string;
  onToggle: (active: boolean) => void;
  onConfigure: () => void;
  onDelete: () => void;
  onPanel?: () => void;
}

export function IntegrationCard({ 
  name, 
  icon, 
  active, 
  createdAt, 
  productName,
  type,
  onToggle, 
  onConfigure,
  onDelete,
  onPanel
}: IntegrationCardProps) {
  return (
    <Card className="w-full">
      <CardContent className="p-3 xs:p-4">
        <div className="flex flex-col gap-3 xs:gap-4">
          {/* Top section - Icon, name and badge */}
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 xs:w-10 xs:h-10 rounded-full bg-gray-100 flex-shrink-0">
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2">
                <h3 className="font-medium text-sm xs:text-base truncate">{name}</h3>
                <div className="flex items-center gap-2">
                  {productName && (
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {productName}
                    </Badge>
                  )}
                  <Badge variant={active ? "default" : "secondary"} className="text-xs whitespace-nowrap">
                    {active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Criado: {createdAt}</p>
            </div>
          </div>
          
          {/* Bottom section - Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onConfigure}
              className="flex-1 xs:flex-none text-xs xs:text-sm"
            >
              <Settings className="w-3 h-3 xs:w-4 xs:h-4 xs:mr-2" />
              <span className="hidden xs:inline">Configurar</span>
              <span className="xs:hidden">Config</span>
            </Button>
            
            {type === 'sales-recovery' && onPanel && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onPanel}
                className="flex-1 xs:flex-none text-xs xs:text-sm"
              >
                <BarChart3 className="w-3 h-3 xs:w-4 xs:h-4 xs:mr-2" />
                <span className="hidden xs:inline">Painel</span>
                <span className="xs:hidden">Painel</span>
              </Button>
            )}
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0 px-2 xs:px-3"
            >
              <Trash2 className="w-3 h-3 xs:w-4 xs:h-4" />
            </Button>
            
            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
              <span className="text-xs text-muted-foreground hidden sm:inline">Ativo</span>
              <Switch
                checked={active}
                onCheckedChange={onToggle}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
