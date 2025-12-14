-- Add columns for multiple email templates and discount settings
ALTER TABLE public.sales_recovery_settings
ADD COLUMN IF NOT EXISTS email_subject_2 text,
ADD COLUMN IF NOT EXISTS email_template_2 text,
ADD COLUMN IF NOT EXISTS email_subject_3 text,
ADD COLUMN IF NOT EXISTS email_template_3 text,
ADD COLUMN IF NOT EXISTS enable_discount_on_last boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS discount_value numeric DEFAULT 10;

-- Add comment
COMMENT ON COLUMN public.sales_recovery_settings.enable_discount_on_last IS 'Whether to offer a discount coupon on the last recovery email';
COMMENT ON COLUMN public.sales_recovery_settings.discount_type IS 'Type of discount: percentage or fixed';
COMMENT ON COLUMN public.sales_recovery_settings.discount_value IS 'Discount value (percentage or fixed amount)';