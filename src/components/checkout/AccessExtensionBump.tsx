import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, Zap } from "lucide-react";

interface AccessExtensionBumpProps {
  title: string;
  description: string;
  extensionType: string;
  extensionValue: number;
  extensionDescription: string;
  price: string;
  discount?: number;
  currency?: string;
  onToggle: (selected: boolean) => void;
}

export const AccessExtensionBump = ({
  title,
  description,
  extensionType,
  extensionValue,
  extensionDescription,
  price,
  discount = 0,
  currency = 'KZ',
  onToggle
}: AccessExtensionBumpProps) => {
  const [isSelected, setIsSelected] = useState(false);

  const handleToggle = (checked: boolean) => {
    setIsSelected(checked);
    onToggle(checked);
  };

  const formatExtensionTime = () => {
    if (extensionType === 'lifetime') return 'Acesso Vitalício';
    
    // Opções predefinidas mais claras
    if (extensionType === 'months' && extensionValue === 6) return '+6 Meses de Acesso';
    if (extensionType === 'years' && extensionValue === 1) return '+1 Ano de Acesso';
    
    // Fallback para casos antigos
    const unit = extensionType === 'days' ? 'dia' : extensionType === 'months' ? 'mês' : 'ano';
    const unitPlural = extensionType === 'days' ? 'dias' : extensionType === 'months' ? 'meses' : 'anos';
    
    return `+${extensionValue} ${extensionValue === 1 ? unit : unitPlural}`;
  };

  const discountedPrice = discount > 0 ? (parseFloat(price) * (1 - discount / 100)).toFixed(2) : price;

  return (
    <Card className={`relative transition-all duration-200 ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : 'hover:shadow-md'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="access-extension-bump"
            checked={isSelected}
            onCheckedChange={handleToggle}
            className="mt-1 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                  OFERTA ESPECIAL
                </span>
                {discount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    -{discount}% OFF
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-checkout-text">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>

            {/* Extension Details */}
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {formatExtensionTime()}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {extensionDescription}
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Acesso estendido imediatamente após o pagamento</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>
                  {extensionType === 'lifetime' 
                    ? 'Nunca mais pague por este produto'
                    : 'Tempo adicional para estudar no seu ritmo'
                  }
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-green-600" />
                <span className="text-sm text-muted-foreground">Apenas por:</span>
              </div>
              <div className="text-right">
                {discount > 0 && (
                  <span className="text-sm text-gray-500 line-through mr-2">
                    {parseFloat(price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                  </span>
                )}
                <span className="text-lg font-bold text-green-600">
                  {parseFloat(discountedPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
              <Plus className="w-3 h-3 text-white" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};