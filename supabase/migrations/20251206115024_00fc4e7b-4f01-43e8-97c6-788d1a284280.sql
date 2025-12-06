-- Criar acesso da compradora ao produto
INSERT INTO customer_access (
  product_id,
  customer_email,
  customer_name,
  order_id,
  is_active,
  access_granted_at
) VALUES (
  '0962f42f-8900-4285-bcd1-d1b40d34a9ef',
  'vandaolisouza@gmail.com',
  'Vanderleia Souza',
  (SELECT order_id FROM orders WHERE stripe_payment_intent_id = 'pi_3SbHfjGfoQ3QRz9A09QERTGG'),
  true,
  NOW()
) ON CONFLICT DO NOTHING;