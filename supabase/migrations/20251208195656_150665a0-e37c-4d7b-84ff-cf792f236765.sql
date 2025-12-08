-- Drop existing public policy
DROP POLICY IF EXISTS "Public can view enabled pixels with product_id" ON public.facebook_pixel_settings;

-- Create a more permissive policy that allows any role to view enabled pixels
CREATE POLICY "Anyone can view enabled pixels for checkout" 
ON public.facebook_pixel_settings 
FOR SELECT 
USING (
  enabled = true 
  AND product_id IS NOT NULL
);