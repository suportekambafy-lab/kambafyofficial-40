-- Fix RLS policies for orders table to allow checkout without authentication issues

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Allow order creation for checkout" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

-- Create new policies that allow public order creation but restrict viewing
CREATE POLICY "Allow public order creation for checkout" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

-- Policy for viewing orders - users can see orders if they are the seller OR if their email matches customer_email
CREATE POLICY "Users can view relevant orders" 
ON public.orders 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  (SELECT email FROM auth.users WHERE id = auth.uid()) = customer_email
);

-- Policy to allow sellers to update their orders
CREATE POLICY "Sellers can update their orders" 
ON public.orders 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add index for better performance on customer_email lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);