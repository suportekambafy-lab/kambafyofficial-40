-- Add columns to track commission sources for coproducers
ALTER TABLE public.coproducers 
ADD COLUMN IF NOT EXISTS commission_from_producer_sales boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS commission_from_affiliate_sales boolean NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.coproducers.commission_from_producer_sales IS 'Whether coproducer receives commission from direct producer sales';
COMMENT ON COLUMN public.coproducers.commission_from_affiliate_sales IS 'Whether coproducer receives commission from affiliate sales';