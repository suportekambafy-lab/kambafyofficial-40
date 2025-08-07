-- Create a policy to allow public access to products for checkout
CREATE POLICY "Public can view products for checkout" 
ON public.products 
FOR SELECT 
USING (true);