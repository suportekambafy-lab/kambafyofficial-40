-- Add approved_at column to track when product was actually approved
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- Create index for better query performance when filtering by approved_at
CREATE INDEX IF NOT EXISTS idx_products_approved_at ON public.products(approved_at) WHERE approved_at IS NOT NULL;

-- Backfill: For products that have approved_by_admin_id set, use updated_at as approximate approved_at
UPDATE public.products 
SET approved_at = updated_at 
WHERE admin_approved = true 
  AND approved_by_admin_id IS NOT NULL 
  AND approved_at IS NULL;