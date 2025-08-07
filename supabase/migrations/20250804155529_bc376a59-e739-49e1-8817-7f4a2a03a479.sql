-- Fix RLS policies for orders table to allow guest checkout orders
DROP POLICY IF EXISTS "Enable order creation for all" ON public.orders;

-- Create a new policy that specifically allows checkout orders (with null user_id)
CREATE POLICY "Allow checkout order creation" ON public.orders
FOR INSERT 
WITH CHECK (
  -- Allow orders with null user_id (guest checkout)
  user_id IS NULL 
  OR 
  -- Allow orders for authenticated users
  auth.uid() = user_id
);

-- Update the select policy to also allow viewing orders by customer email for guest orders
DROP POLICY IF EXISTS "Sellers, customers and affiliates can view relevant orders" ON public.orders;

CREATE POLICY "Enhanced order viewing policy" ON public.orders
FOR SELECT 
USING (
  -- Product owner can view orders for their products
  (EXISTS (SELECT 1 FROM products WHERE products.id = orders.product_id AND products.user_id = auth.uid()))
  OR
  -- Authenticated user can view their own orders
  (auth.uid() = user_id) 
  OR 
  -- Admin users can view all orders
  (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.email = get_current_user_email() AND admin_users.is_active = true))
  OR
  -- Guest customers can view orders using their email (for authenticated users only)
  ((auth.uid() IS NOT NULL) AND (get_current_user_email() = customer_email))
  OR
  -- Affiliates can view orders with their affiliate code
  ((auth.uid() IS NOT NULL) AND (affiliate_code IS NOT NULL) AND (EXISTS (SELECT 1 FROM affiliates a WHERE ((a.affiliate_code)::text = (orders.affiliate_code)::text) AND (a.affiliate_user_id = auth.uid()) AND (a.status = 'ativo'::text))))
);