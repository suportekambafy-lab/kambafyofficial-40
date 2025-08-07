-- Criar função para admin aprovar produtos
CREATE OR REPLACE FUNCTION public.admin_approve_product(product_id uuid, admin_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Atualizar o produto diretamente (bypassa RLS)
  UPDATE public.products 
  SET 
    status = 'Ativo',
    admin_approved = true,
    revision_requested = false,
    revision_requested_at = null,
    updated_at = now()
  WHERE id = product_id;
  
  -- Verificar se a atualização foi bem-sucedida
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
END;
$function$;