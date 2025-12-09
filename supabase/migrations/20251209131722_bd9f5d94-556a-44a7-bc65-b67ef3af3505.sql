-- Criar a ordem que falhou devido ao bug
INSERT INTO public.orders (
  order_id,
  product_id,
  user_id,
  customer_name,
  customer_email,
  customer_phone,
  amount,
  currency,
  status,
  payment_method,
  stripe_payment_intent_id,
  seller_commission
)
SELECT 
  '1NLMERBXQ',
  '5184de7d-73a9-4d73-a923-bd41080b7499',
  p.user_id,
  'Victor Muabi',
  'victormuabi20@gmail.com',
  '+351 ',
  '3',
  'KZ',
  'completed',
  'mbway',
  'pi_3ScQiUGfoQ3QRz9A0dPu3gfS',
  3 * 0.9101
FROM products p
WHERE p.id = '5184de7d-73a9-4d73-a923-bd41080b7499';