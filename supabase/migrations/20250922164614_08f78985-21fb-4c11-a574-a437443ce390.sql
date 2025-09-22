-- Remover constraint que impede múltiplos order bumps por categoria
-- Esta constraint antiga estava impedindo a criação de múltiplos order bumps independentes

-- Primeiro, verificar e remover constraint existente se existir
DO $$
BEGIN
    -- Verificar se a constraint existe e removê-la
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'order_bump_settings_product_category_unique' 
        AND table_name = 'order_bump_settings'
    ) THEN
        ALTER TABLE public.order_bump_settings 
        DROP CONSTRAINT order_bump_settings_product_category_unique;
    END IF;

    -- Verificar se há outro índice único problemático e removê-lo
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'order_bump_settings_product_id_bump_category_key'
        AND tablename = 'order_bump_settings'
    ) THEN
        DROP INDEX IF EXISTS public.order_bump_settings_product_id_bump_category_key;
    END IF;
END $$;

-- Atualizar a função de validação para funcionar corretamente com o novo sistema
CREATE OR REPLACE FUNCTION check_max_order_bumps() 
RETURNS TRIGGER AS $$
BEGIN
  SET search_path = public;
  
  -- Verificar se já existem 3 order bumps ATIVOS para este produto
  IF NEW.enabled = true AND (
    SELECT COUNT(*) FROM public.order_bump_settings 
    WHERE product_id = NEW.product_id 
    AND enabled = true 
    AND (NEW.id IS NULL OR id != NEW.id)  -- Excluir o próprio registro se for update
  ) >= 3 THEN
    RAISE EXCEPTION 'Máximo de 3 order bumps ativos permitidos por produto';
  END IF;
  
  -- Se não há bump_order definido, atribuir o próximo número disponível
  IF NEW.bump_order IS NULL THEN
    NEW.bump_order := COALESCE(
      (SELECT MAX(bump_order) + 1 FROM public.order_bump_settings 
       WHERE product_id = NEW.product_id), 
      1
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Recriar o trigger para INSERT e UPDATE
DROP TRIGGER IF EXISTS validate_max_order_bumps ON public.order_bump_settings;
CREATE TRIGGER validate_max_order_bumps
  BEFORE INSERT OR UPDATE ON public.order_bump_settings
  FOR EACH ROW
  EXECUTE FUNCTION check_max_order_bumps();

-- Atualizar order bumps existentes que não têm bump_order definido
UPDATE public.order_bump_settings 
SET bump_order = COALESCE(bump_order, 1) 
WHERE bump_order IS NULL;

-- Criar índice único que permite múltiplos order bumps por produto
-- mas mantém a ordem única
DROP INDEX IF EXISTS public.idx_unique_order_bump_per_product;
CREATE UNIQUE INDEX idx_unique_order_bump_per_product 
ON public.order_bump_settings (product_id, bump_order);

-- Adicionar comentário explicativo
COMMENT ON INDEX public.idx_unique_order_bump_per_product IS 
'Permite múltiplos order bumps por produto, mas garante ordem única';