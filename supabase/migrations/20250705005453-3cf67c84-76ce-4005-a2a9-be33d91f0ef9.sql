-- Allow user_id to be NULL for guest checkouts
-- This is needed because guest users don't have a user_id but still need to place orders

ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- Update the SELECT policy to handle NULL user_id cases
DROP POLICY IF EXISTS "Users can view relevant orders" ON public.orders;

CREATE POLICY "Users can view relevant orders" 
ON public.orders 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR 
  (auth.uid() IS NOT NULL AND public.get_current_user_email() = customer_email) OR
  (auth.uid() IS NULL AND user_id IS NULL)
);

-- Update the UPDATE policy to handle NULL user_id
DROP POLICY IF EXISTS "Sellers can update their orders" ON public.orders;

CREATE POLICY "Sellers can update their orders" 
ON public.orders 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);