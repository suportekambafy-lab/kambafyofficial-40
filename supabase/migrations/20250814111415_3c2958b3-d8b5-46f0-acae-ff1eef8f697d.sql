-- Disable upsell for all products by updating their checkout customization settings
UPDATE checkout_customizations 
SET settings = COALESCE(settings, '{}'::jsonb) || '{"upsell_enabled": false}'::jsonb
WHERE user_id IN (
  SELECT DISTINCT user_id 
  FROM products 
  WHERE status = 'approved'
);