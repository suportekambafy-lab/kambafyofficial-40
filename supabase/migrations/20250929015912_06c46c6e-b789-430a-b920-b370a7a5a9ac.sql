-- Inserir notificação de teste para pagamento recebido
INSERT INTO public.seller_notifications (
  user_id,
  type,
  title,
  message,
  order_id,
  amount,
  currency,
  read,
  created_at
) 
SELECT 
  id as user_id,
  'payment_approved' as type,
  'Pagamento Recebido!' as title,
  'O cliente Victor Muabi pagou o seu pedido' as message,
  'KMB-' || LPAD((RANDOM() * 999999)::int::text, 6, '0') as order_id,
  2500.00 as amount,
  'KZ' as currency,
  false as read,
  now() as created_at
FROM auth.users 
LIMIT 1;