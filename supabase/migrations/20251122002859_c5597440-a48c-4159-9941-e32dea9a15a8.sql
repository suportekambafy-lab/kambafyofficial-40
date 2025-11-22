-- Remover trigger que causa duplicação de notificações de venda
-- As edge functions já enviam as notificações diretamente com o formato correto

DROP TRIGGER IF EXISTS notify_seller_on_sale_trigger ON public.orders;

-- Manter a função para referência histórica mas ela não será mais chamada automaticamente
-- A função notify_seller_on_sale() permanece no banco mas não está mais ativa