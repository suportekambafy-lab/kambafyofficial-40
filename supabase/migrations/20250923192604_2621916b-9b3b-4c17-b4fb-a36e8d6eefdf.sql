-- Corrigir vendas em EUR para KZ (taxa aproximada: 1 EUR = 1053 KZ)
UPDATE public.orders 
SET 
  amount = CASE 
    WHEN currency = 'EUR' AND amount::numeric < 1000 THEN (amount::numeric * 1053)::text
    ELSE amount
  END,
  currency = 'KZ',
  seller_commission = CASE 
    WHEN currency = 'EUR' AND amount::numeric < 1000 AND seller_commission IS NOT NULL 
    THEN seller_commission * 1053
    ELSE seller_commission
  END,
  affiliate_commission = CASE 
    WHEN currency = 'EUR' AND amount::numeric < 1000 AND affiliate_commission IS NOT NULL 
    THEN affiliate_commission * 1053
    ELSE affiliate_commission
  END,
  updated_at = now()
WHERE currency = 'EUR' AND amount::numeric < 1000;

-- Corrigir vendas que parecem ser EUR mas estão marcadas como KZ
-- (vendas com valores suspeitos como 149 KZ que deveriam ser ~156.897 KZ)
UPDATE public.orders 
SET 
  amount = CASE 
    WHEN amount IN ('149', '172.9') AND currency = 'KZ' THEN 
      CASE 
        WHEN amount = '149' THEN '156897'  -- €149 * 1053 = 156.897 KZ
        WHEN amount = '172.9' THEN '182063' -- €172.9 * 1053 = 182.063 KZ
        ELSE amount
      END
    ELSE amount
  END,
  seller_commission = CASE 
    WHEN amount IN ('149', '172.9') AND currency = 'KZ' AND seller_commission IS NOT NULL THEN
      CASE 
        WHEN amount = '149' THEN seller_commission * 1053
        WHEN amount = '172.9' THEN seller_commission * 1053
        ELSE seller_commission
      END
    ELSE seller_commission
  END,
  affiliate_commission = CASE 
    WHEN amount IN ('149', '172.9') AND currency = 'KZ' AND affiliate_commission IS NOT NULL THEN
      CASE 
        WHEN amount = '149' THEN affiliate_commission * 1053
        WHEN amount = '172.9' THEN affiliate_commission * 1053
        ELSE affiliate_commission
      END
    ELSE affiliate_commission
  END,
  updated_at = now()
WHERE amount IN ('149', '172.9') 
  AND currency = 'KZ' 
  AND created_at >= '2024-01-01'  -- Só vendas recentes
  AND payment_method IN ('card', 'stripe', 'klarna', 'transfer', 'reference', 'express');