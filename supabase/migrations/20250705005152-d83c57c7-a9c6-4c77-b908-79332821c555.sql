-- Fix RLS policy issue for guest checkout
-- The foreign key constraint to auth.users is preventing guest checkouts

-- Drop the foreign key constraint that's causing the issue
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- Recreate the INSERT policy to ensure it works properly
DROP POLICY IF EXISTS "Allow public order creation for checkout" ON public.orders;

CREATE POLICY "Enable public order creation" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_product ON public.orders(user_id, product_id);