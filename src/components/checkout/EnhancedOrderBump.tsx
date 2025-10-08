import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Zap, Check } from "lucide-react";

interface EnhancedOrderBumpProps {
  title: string;
  description: string;
  productName: string;
  price: string;
  originalPrice?: string;
  discount?: number;
  onToggle: (selected: boolean) => void;
  benefits?: string[];
  isBestseller?: boolean;
}

export const EnhancedOrderBump = ({
  title,
  description,
  productName,
  price,
  originalPrice,
  discount = 0,
  onToggle,
  benefits = [],
  isBestseller = false
}: EnhancedOrderBumpProps) => {
  const [isSelected, setIsSelected] = useState(false);

  const handleToggle = (checked: boolean) => {
    setIsSelected(checked);
    onToggle(checked);
  };

  const defaultBenefits = benefits.length > 0 ? benefits : [
    "Acesso instantâneo após o pagamento",
    "Conteúdo exclusivo e atualizado",
    "Suporte prioritário incluído"
  ];

  const savingsAmount = originalPrice 
    ? (parseFloat(originalPrice) - parseFloat(price)).toFixed(2)
    : discount > 0 
    ? (parseFloat(price) * (discount / 100)).toFixed(2)
    : null;

  return (
    <Card className={`relative transition-all duration-300 ${
      isSelected 
        ? 'ring-2 ring-primary bg-primary/5 shadow-lg scale-[1.02]' 
        : 'hover:shadow-md hover:scale-[1.01]'
    }`}>
      {/* Bestseller Badge */}
      {isBestseller && (
        <div className="absolute -top-3 left-4 z-10">
          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md px-3 py-1">
            <Star className="w-3 h-3 mr-1" />
            MAIS VENDIDO
          </Badge>
        </div>
      )}

      {/* Discount Badge */}
      {(discount > 0 || savingsAmount) && (
        <div className="absolute -top-3 right-4 z-10">
          <Badge variant="destructive" className="shadow-md px-3 py-1 font-bold">
            <TrendingUp className="w-3 h-3 mr-1" />
            {discount > 0 ? `-${discount}%` : `Economize ${savingsAmount}`}
          </Badge>
        </div>
      )}

      <CardContent className="p-5 pt-6">
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <Checkbox
            id="enhanced-order-bump"
            checked={isSelected}
            onCheckedChange={handleToggle}
            className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase">
                  Oferta Exclusiva
                </span>
              </div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {description}
              </p>
              <p className="text-sm font-semibold text-primary">
                📦 {productName}
              </p>
            </div>

            {/* Benefits */}
            {defaultBenefits.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg space-y-2">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  ✨ O que você ganha:
                </p>
                {defaultBenefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Price Section */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                {originalPrice && (
                  <span className="text-sm text-gray-400 line-through">
                    {originalPrice}
                  </span>
                )}
                <span className="text-2xl font-bold text-primary">
                  {price}
                </span>
              </div>
              
              {savingsAmount && (
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Você economiza
                  </p>
                  <p className="text-lg font-bold text-green-600">
                    {savingsAmount}
                  </p>
                </div>
              )}
            </div>

            {/* CTA Text */}
            <div className="text-center">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {isSelected 
                  ? "✓ Adicionado ao seu pedido" 
                  : "☝️ Marque a caixa acima para adicionar"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
