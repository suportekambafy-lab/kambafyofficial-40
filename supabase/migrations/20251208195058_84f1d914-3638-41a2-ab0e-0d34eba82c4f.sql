-- Remove the old problematic policy that was causing issues
DROP POLICY IF EXISTS "Public can view pixels for specific product checkout" ON public.facebook_pixel_settings;