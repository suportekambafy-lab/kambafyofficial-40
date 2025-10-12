-- CORREÇÃO CRÍTICA: Reverter aprovações indevidas de vendas "reference" e "transfer"

-- ETAPA 1: Reverter status de vendas "reference" e "transfer" aprovadas indevidamente às 10:43
UPDATE orders
SET 
  status = 'pending',
  updated_at = created_at
WHERE payment_method IN ('reference', 'transfer', 'bank_transfer', 'transferencia')
  AND status = 'completed'
  AND updated_at >= '2025-10-12 10:43:00'
  AND updated_at < '2025-10-12 10:45:00';

-- ETAPA 2: Deletar transações criadas pela aprovação indevida às 10:43
DELETE FROM balance_transactions
WHERE created_at >= '2025-10-12 10:43:00'
  AND created_at < '2025-10-12 10:45:00'
  AND type IN ('sale_revenue', 'platform_fee')
  AND order_id IN (
    SELECT order_id FROM orders
    WHERE payment_method IN ('reference', 'transfer', 'bank_transfer', 'transferencia')
  );

-- ETAPA 3: Recalcular TODOS os saldos dos vendedores
SELECT admin_recalculate_all_seller_balances();

-- ETAPA 4: Criar trigger para PREVENIR aprovações automáticas de "reference" e "transfer"
CREATE OR REPLACE FUNCTION public.prevent_auto_complete_reference_transfers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Prevenir mudanças automáticas de status para 'completed' em vendas reference/transfer
  -- Estas vendas devem ser aprovadas APENAS manualmente pelo admin
  IF TG_OP = 'UPDATE' 
     AND OLD.status = 'pending' 
     AND NEW.status = 'completed'
     AND NEW.payment_method IN ('reference', 'transfer', 'bank_transfer', 'transferencia')
     AND current_setting('request.jwt.claims', true)::json->>'email' NOT IN (
       SELECT email FROM admin_users WHERE is_active = true
     ) THEN
    RAISE EXCEPTION 'Vendas com método de pagamento "reference" ou "transfer" só podem ser aprovadas manualmente por administradores';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar o trigger
DROP TRIGGER IF EXISTS prevent_auto_complete_reference_transfers_trigger ON orders;
CREATE TRIGGER prevent_auto_complete_reference_transfers_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_auto_complete_reference_transfers();

-- Log da correção
COMMENT ON FUNCTION public.prevent_auto_complete_reference_transfers IS 'Criado em 2025-10-12: Previne aprovações automáticas de vendas reference/transfer - devem ser aprovadas manualmente pelo admin';