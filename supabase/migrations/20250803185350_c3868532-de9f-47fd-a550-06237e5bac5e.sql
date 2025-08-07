-- Fix RLS policy for orders table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Update the existing policy to allow inserts without authentication (for checkout)
DROP POLICY IF EXISTS "Enable order creation for all" ON public.orders;

CREATE POLICY "Enable order creation for all" ON public.orders
  FOR INSERT
  WITH CHECK (true);

-- Also ensure updates can happen for payment processing
DROP POLICY IF EXISTS "Enable order updates" ON public.orders;

CREATE POLICY "Enable order updates" ON public.orders
  FOR UPDATE
  USING (true);