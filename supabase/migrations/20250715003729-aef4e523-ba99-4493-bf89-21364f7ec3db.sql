-- Allow public (unauthenticated users) to view enabled order bump settings for checkout
CREATE POLICY "Public can view active order bumps for checkout" 
ON public.order_bump_settings 
FOR SELECT 
USING (enabled = true);