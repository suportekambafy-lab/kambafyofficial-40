import { useState } from 'react';
import { Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { CouponInput } from './CouponInput';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CollapsibleCouponSectionProps {
  productId: string;
  customerEmail: string;
  totalAmount: number;
  currency: string;
  onCouponApplied: (coupon: any, discountAmount: number) => void;
  tc: (key: string) => string;
}

export const CollapsibleCouponSection = ({
  productId,
  customerEmail,
  totalAmount,
  currency,
  onCouponApplied,
  tc
}: CollapsibleCouponSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-4 mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer w-full justify-center py-2">
          <Tag className="w-4 h-4" />
          <span className="underline">{tc('coupon.haveCoupon')}</span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <CouponInput
            productId={productId}
            customerEmail={customerEmail}
            totalAmount={totalAmount}
            currency={currency}
            onCouponApplied={onCouponApplied}
            t={tc}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
