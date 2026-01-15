
-- Fix incorrect sales count for "Orçamento Mensal" product
-- Database shows 2 sales but only 1 completed order exists
UPDATE products 
SET sales = 1 
WHERE id = '3b9bd54c-c54e-43af-bb7a-22c888b243d2';
