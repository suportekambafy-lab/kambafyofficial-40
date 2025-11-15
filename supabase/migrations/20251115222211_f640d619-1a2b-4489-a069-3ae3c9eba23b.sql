-- Função para criar notificação de vendedor automaticamente
CREATE OR REPLACE FUNCTION public.notify_seller_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_name TEXT;
  v_seller_user_id UUID;
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
      'sale',
      '🎉 Nova Venda!',
      'Você vendeu ' || COALESCE(v_product_name, 'um produto') || ' para ' || NEW.customer_name,
      NEW.order_id,
      NEW.amount::NUMERIC,
      COALESCE(NEW.currency, 'KZ'),
      NEW.customer_name,
      v_product_name
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para chamar a função automaticamente
DROP TRIGGER IF EXISTS notify_seller_on_sale_trigger ON public.orders;

CREATE TRIGGER notify_seller_on_sale_trigger
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_seller_on_sale();