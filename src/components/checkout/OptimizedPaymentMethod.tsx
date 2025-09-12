import { memo } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentMethod {
  id: string;
  name: string;
  image: string;
  enabled: boolean;
}

interface OptimizedPaymentMethodProps {
  method: PaymentMethod;
  isSelected: boolean;
  onClick: () => void;
}

const OptimizedPaymentMethod = memo(({ method, isSelected, onClick }: OptimizedPaymentMethodProps) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md group flex flex-col items-center",
        isSelected 
          ? "border-green-500 bg-green-50 shadow-sm" 
          : "border-gray-200 hover:border-gray-300"
      )}
    >
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      
      <div className="w-12 h-12 mb-2 flex items-center justify-center mx-auto">
        <img
          src={method.image}
          alt={method.name}
          className={cn(
            "w-10 h-10 object-contain transition-all duration-200 mx-auto",
            isSelected ? "scale-110" : "opacity-70 saturate-50 group-hover:opacity-90 group-hover:saturate-75"
          )}
          loading="lazy"
          decoding="async"
          width="40"
          height="40"
        />
      </div>
      
      <p className="text-xs text-gray-700 text-center leading-tight font-medium">
        {method.name}
        {method.id === 'klarna' && (
          <span className="block text-[10px] text-green-600 font-semibold mt-1">
            Pague em 3 prestações sem juros
          </span>
        )}
      </p>
    </div>
  );
});

OptimizedPaymentMethod.displayName = 'OptimizedPaymentMethod';

export { OptimizedPaymentMethod };