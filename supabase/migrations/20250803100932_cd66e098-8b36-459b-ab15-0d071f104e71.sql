-- Permitir visualização pública das configurações de checkout para que apareçam durante o processo de compra
CREATE POLICY "Public can view checkout customizations for checkout page" 
ON public.checkout_customizations 
FOR SELECT 
USING (true);