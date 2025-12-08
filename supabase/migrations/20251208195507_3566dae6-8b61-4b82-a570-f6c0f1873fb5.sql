-- Drop and recreate the policy as PERMISSIVE (default)
DROP POLICY IF EXISTS "Public can view enabled pixels with product_id" ON public.facebook_pixel_settings;

CREATE POLICY "Public can view enabled pixels with product_id" 
ON public.facebook_pixel_settings 
FOR SELECT 
TO anon, authenticated
USING (
  enabled = true 
  AND product_id IS NOT NULL
);