-- Tabela de cupons de desconto
CREATE TABLE public.discount_coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  currency VARCHAR(3) DEFAULT 'EUR',
  min_purchase_amount DECIMAL(10,2) DEFAULT 0,
  max_uses INTEGER,
  uses_per_customer INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, code)
);

-- Tabela de usos de cupons
CREATE TABLE public.coupon_uses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.discount_coupons(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_email VARCHAR(255) NOT NULL,
  discount_applied DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;

-- Políticas para discount_coupons
CREATE POLICY "Users can view their own coupons"
ON public.discount_coupons
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own coupons"
ON public.discount_coupons
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coupons"
ON public.discount_coupons
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own coupons"
ON public.discount_coupons
FOR DELETE
USING (auth.uid() = user_id);

-- Políticas para coupon_uses (vendedores podem ver usos dos seus cupons)
CREATE POLICY "Users can view uses of their coupons"
ON public.coupon_uses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.discount_coupons
    WHERE discount_coupons.id = coupon_uses.coupon_id
    AND discount_coupons.user_id = auth.uid()
  )
);

-- Política pública para validar cupons no checkout (necessário para clientes)
CREATE POLICY "Anyone can insert coupon uses"
ON public.coupon_uses
FOR INSERT
WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_discount_coupons_user_id ON public.discount_coupons(user_id);
CREATE INDEX idx_discount_coupons_code ON public.discount_coupons(code);
CREATE INDEX idx_discount_coupons_product_id ON public.discount_coupons(product_id);
CREATE INDEX idx_coupon_uses_coupon_id ON public.coupon_uses(coupon_id);
CREATE INDEX idx_coupon_uses_customer_email ON public.coupon_uses(customer_email);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_discount_coupons_updated_at
BEFORE UPDATE ON public.discount_coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();