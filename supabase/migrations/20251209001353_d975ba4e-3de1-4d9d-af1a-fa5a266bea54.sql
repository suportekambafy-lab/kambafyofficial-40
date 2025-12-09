-- First, remove existing duplicates keeping only the most recent one per user+product combination
DELETE FROM public.affiliates
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY affiliate_user_id, product_id 
      ORDER BY created_at DESC
    ) as rn
    FROM public.affiliates
  ) ranked
  WHERE rn > 1
);

-- Now add unique constraint to prevent future duplicate affiliate requests
ALTER TABLE public.affiliates 
ADD CONSTRAINT affiliates_unique_user_product UNIQUE (affiliate_user_id, product_id);