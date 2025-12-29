-- Add original currency tracking to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS original_currency TEXT DEFAULT 'KZ';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS original_amount NUMERIC;

-- Add preferred currency to profiles  
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'KZ';

-- Add comment for documentation
COMMENT ON COLUMN public.orders.original_currency IS 'Currency in which the customer paid (KZ, MZN, EUR, GBP, USD)';
COMMENT ON COLUMN public.orders.original_amount IS 'Amount in the original currency before conversion to KZ';
COMMENT ON COLUMN public.profiles.preferred_currency IS 'Seller preferred display currency for dashboard';