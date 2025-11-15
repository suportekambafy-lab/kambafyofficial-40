-- Remover constraint antiga
ALTER TABLE public.seller_notifications DROP CONSTRAINT IF EXISTS seller_notifications_type_check;

-- Adicionar nova constraint com todos os tipos existentes
ALTER TABLE public.seller_notifications 
ADD CONSTRAINT seller_notifications_type_check 
CHECK (type IN ('payment_approved', 'new_sale', 'sale'));

-- Atualizar a função do trigger para usar 'new_sale' em vez de 'sale'
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
    
    -- Inserir notificação para o vendedor com tipo 'new_sale'
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
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;