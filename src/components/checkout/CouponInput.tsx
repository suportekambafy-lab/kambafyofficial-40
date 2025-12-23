import { useState, memo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tag, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CouponData {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  currency: string;
  min_purchase_amount: number;
  max_uses: number | null;
  uses_per_customer: number;
  current_uses: number;
}

interface CouponInputProps {
  productId: string;
  customerEmail: string;
  totalAmount: number;
  currency: string;
  onCouponApplied: (coupon: CouponData | null, discountAmount: number) => void;
  t: (key: string) => string;
}

export const CouponInput = memo(({
  productId,
  customerEmail,
  totalAmount,
  currency,
  onCouponApplied,
  t
}: CouponInputProps) => {
  const [couponCode, setCouponCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error(t('coupon.enterCode') || 'Digite um código de cupom');
      return;
    }

    setIsValidating(true);
    
    try {
      // Buscar cupom válido - query simplificada para evitar problemas com datas nulas
      const { data: coupons, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase().trim())
        .eq('is_active', true)
        .or(`product_id.is.null,product_id.eq.${productId}`);

      if (error) throw error;

      if (!coupons || coupons.length === 0) {
        toast.error('Cupom inválido ou expirado');
        return;
      }

      // Filtrar cupons válidos por data
      const now = new Date();
      const validCoupons = coupons.filter(c => {
        const validFrom = c.valid_from ? new Date(c.valid_from) : null;
        const validUntil = c.valid_until ? new Date(c.valid_until) : null;
        
        if (validFrom && now < validFrom) return false;
        if (validUntil && now > validUntil) return false;
        return true;
      });

      if (validCoupons.length === 0) {
        toast.error('Cupom expirado');
        return;
      }

      const coupon = validCoupons[0] as unknown as CouponData;

      // Verificar limite de usos total
      if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
        toast.error(t('coupon.maxUsesReached') || 'Este cupom atingiu o limite de usos');
        return;
      }

      // Verificar usos por cliente
      if (customerEmail) {
        const { count } = await supabase
          .from('coupon_uses')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id)
          .eq('customer_email', customerEmail.toLowerCase());

        if (count !== null && count >= coupon.uses_per_customer) {
          toast.error(t('coupon.alreadyUsed') || 'Você já usou este cupom');
          return;
        }
      }

      // Verificar valor mínimo de compra
      if (coupon.min_purchase_amount && totalAmount < coupon.min_purchase_amount) {
        toast.error(
          `${t('coupon.minPurchase') || 'Compra mínima de'} ${coupon.min_purchase_amount} ${coupon.currency}`
        );
        return;
      }

      // Calcular desconto
      let discount = 0;
      if (coupon.discount_type === 'percentage') {
        discount = totalAmount * (coupon.discount_value / 100);
      } else {
        discount = Math.min(coupon.discount_value, totalAmount);
      }

      setAppliedCoupon(coupon);
      setDiscountAmount(discount);
      onCouponApplied(coupon, discount);
      
      toast.success(t('coupon.applied') || 'Cupom aplicado com sucesso!');
    } catch (error) {
      console.error('Error validating coupon:', error);
      toast.error(t('coupon.error') || 'Erro ao validar cupom');
    } finally {
      setIsValidating(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode('');
    onCouponApplied(null, 0);
    toast.info(t('coupon.removed') || 'Cupom removido');
  };

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            {appliedCoupon.code}
          </span>
          <span className="text-sm text-green-600 dark:text-green-400">
            {appliedCoupon.discount_type === 'percentage' 
              ? `-${appliedCoupon.discount_value}%`
              : `-${appliedCoupon.discount_value} ${currency}`
            }
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={removeCoupon}
          className="h-8 w-8 p-0 text-green-600 hover:text-red-600 hover:bg-red-50"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('coupon.placeholder') || 'COUPON CODE'}
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          className="pl-10 uppercase"
          disabled={isValidating}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={validateCoupon}
        disabled={isValidating || !couponCode.trim()}
      >
        {isValidating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          t('coupon.apply') || 'Apply'
        )}
      </Button>
    </div>
  );
});

CouponInput.displayName = 'CouponInput';
