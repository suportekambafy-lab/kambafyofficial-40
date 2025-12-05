-- Add customer_country column to orders table for IP-based location tracking
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_country TEXT;

-- Create index for faster queries by country
CREATE INDEX IF NOT EXISTS idx_orders_customer_country ON public.orders(customer_country);

-- Add comment explaining the column
COMMENT ON COLUMN public.orders.customer_country IS 'Country detected by IP at checkout time';