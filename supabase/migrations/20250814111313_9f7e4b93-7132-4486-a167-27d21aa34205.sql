-- Disable upsell for all active products
UPDATE checkout_customizations 
SET upsell_enabled = false 
WHERE user_id IN (
  SELECT DISTINCT user_id 
  FROM products 
  WHERE status = 'approved'
);