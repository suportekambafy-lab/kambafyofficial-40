-- Grant SELECT permission to anon and authenticated roles
GRANT SELECT ON public.facebook_pixel_settings TO anon;
GRANT SELECT ON public.facebook_pixel_settings TO authenticated;