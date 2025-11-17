-- Habilitar extensão HTTP para permitir triggers chamarem edge functions
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Atualizar função notify_seller_on_sale para enviar push notification via edge function
CREATE OR REPLACE FUNCTION public.notify_seller_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_product_name TEXT;
  v_seller_user_id UUID;
  v_notification_id UUID;
  v_response extensions.http_response;
  v_service_role_key TEXT;
BEGIN
  -- Apenas processar quando status muda para 'completed'
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status != 'completed') THEN
    
    -- Buscar nome do produto e user_id do vendedor
    SELECT p.name, p.user_id 
    INTO v_product_name, v_seller_user_id
    FROM public.products p
    WHERE p.id = NEW.product_id;
    
    -- Inserir notificação para o vendedor
    INSERT INTO public.seller_notifications (
      user_id,
      type,
      title,
      message,
      order_id,
      amount,
      currency,
      customer_name,
      product_name
    ) VALUES (
      v_seller_user_id,
      'new_sale',
      '🎉 Nova Venda!',
      'Você vendeu ' || COALESCE(v_product_name, 'um produto') || ' para ' || NEW.customer_name,
      NEW.order_id,
      NEW.amount::NUMERIC,
      COALESCE(NEW.currency, 'KZ'),
      NEW.customer_name,
      v_product_name
    ) RETURNING id INTO v_notification_id;
    
    -- Buscar service role key (disponível via environment no Supabase)
    v_service_role_key := current_setting('app.settings.service_role_key', true);
    
    -- Chamar edge function para enviar push notification via OneSignal
    BEGIN
      SELECT * INTO v_response FROM extensions.http((
        'POST',
        'https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/trigger-seller-notification',
        ARRAY[
          extensions.http_header('Content-Type', 'application/json'),
          extensions.http_header('Authorization', 'Bearer ' || COALESCE(v_service_role_key, ''))
        ],
        'application/json',
        json_build_object(
          'notification_id', v_notification_id,
          'user_id', v_seller_user_id,
          'title', '🎉 Nova Venda!',
          'message', 'Você vendeu ' || COALESCE(v_product_name, 'um produto') || ' para ' || NEW.customer_name,
          'order_id', NEW.order_id,
          'amount', NEW.amount,
          'currency', COALESCE(NEW.currency, 'KZ')
        )::text
      )::extensions.http_request);
      
      -- Log do resultado
      RAISE NOTICE '✅ Edge function chamada com sucesso. Status: %', v_response.status;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log do erro mas não falhar a transação
      RAISE WARNING '⚠️ Erro ao chamar edge function de notificação: %', SQLERRM;
    END;
    
  END IF;
  
  RETURN NEW;
END;
$$;