-- Atualizar função admin_ban_product para incluir motivo do banimento
CREATE OR REPLACE FUNCTION public.admin_ban_product(product_id uuid, admin_id uuid DEFAULT NULL::uuid, ban_reason_text text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Atualizar o produto diretamente (bypassa RLS)
  UPDATE public.products 
  SET 
    status = 'Banido',
    admin_approved = false,
    ban_reason = ban_reason_text,
    updated_at = now()
  WHERE id = product_id;
  
  -- Verificar se a atualização foi bem-sucedida
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
END;
$function$