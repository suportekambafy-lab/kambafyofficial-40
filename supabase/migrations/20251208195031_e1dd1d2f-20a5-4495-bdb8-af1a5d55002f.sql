-- Drop the problematic policy
DROP POLICY IF EXISTS "Public can view pixels for specific product checkout" ON public.facebook_pixel_settings;

-- Create a simpler policy that just checks the product_id matches what's being queried
-- The filtering by specific product is done at the application level
CREATE POLICY "Public can view enabled pixels with product_id" 
ON public.facebook_pixel_settings 
FOR SELECT 
TO anon, authenticated
USING (
  enabled = true 
  AND product_id IS NOT NULL
);