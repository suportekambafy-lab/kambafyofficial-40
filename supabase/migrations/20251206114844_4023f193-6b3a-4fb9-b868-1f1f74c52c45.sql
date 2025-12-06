-- Atualizar dados do cliente na ordem MBway
UPDATE orders 
SET 
  customer_email = 'vandaolisouza@gmail.com',
  customer_name = 'Vanderleia Souza',
  customer_phone = '+351 913889747',
  updated_at = NOW()
WHERE stripe_payment_intent_id = 'pi_3SbHfjGfoQ3QRz9A09QERTGG';