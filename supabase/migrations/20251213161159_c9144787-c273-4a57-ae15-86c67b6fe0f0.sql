-- Política pública para validar cupons no checkout (clientes precisam ler cupons válidos)
CREATE POLICY "Anyone can read active coupons for validation"
ON public.discount_coupons
FOR SELECT
USING (is_active = true);