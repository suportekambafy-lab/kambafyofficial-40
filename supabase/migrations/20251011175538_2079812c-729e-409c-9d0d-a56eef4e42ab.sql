-- Habilitar realtime para tabelas que ainda não estão configuradas
BEGIN;

-- 1. Configurar REPLICA IDENTITY
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE admin_notifications REPLICA IDENTITY FULL;
ALTER TABLE customer_balances REPLICA IDENTITY FULL;
ALTER TABLE withdrawal_requests REPLICA IDENTITY FULL;
ALTER TABLE customer_access REPLICA IDENTITY FULL;
ALTER TABLE balance_transactions REPLICA IDENTITY FULL;

-- 2. Adicionar à publicação realtime (skip se já existir)
DO $$
BEGIN
  -- admin_notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'admin_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE admin_notifications;
  END IF;

  -- customer_balances
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'customer_balances'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE customer_balances;
  END IF;

  -- withdrawal_requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'withdrawal_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE withdrawal_requests;
  END IF;

  -- customer_access
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'customer_access'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE customer_access;
  END IF;

  -- balance_transactions
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'balance_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE balance_transactions;
  END IF;
END
$$;

COMMIT;