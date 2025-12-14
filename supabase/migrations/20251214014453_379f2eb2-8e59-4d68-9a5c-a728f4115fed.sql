-- Add unique constraint for product_id and user_id combination
ALTER TABLE public.sales_recovery_settings 
ADD CONSTRAINT sales_recovery_settings_product_user_unique 
UNIQUE (product_id, user_id);