-- Set search_path for the new trigger function to avoid mutable search path warning
ALTER FUNCTION public.products_generate_seo() SET search_path = public;