-- Primeiro, vamos remover a constraint que impede múltiplos order bumps
-- e adicionar uma coluna para identificar order bumps múltiplos

-- Adicionar coluna para ordem/posição do order bump
ALTER TABLE public.order_bump_settings 
ADD COLUMN IF NOT EXISTS bump_order INTEGER DEFAULT 1;

-- Adicionar constraint para limitar máximo 3 order bumps por produto
CREATE OR REPLACE FUNCTION check_max_order_bumps() 
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se já existem 3 order bumps para este produto
  IF (SELECT COUNT(*) FROM public.order_bump_settings 
      WHERE product_id = NEW.product_id AND enabled = true) >= 3 THEN
    RAISE EXCEPTION 'Máximo de 3 order bumps permitidos por produto';
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
$$ LANGUAGE plpgsql;

-- Criar trigger para validar máximo de order bumps
DROP TRIGGER IF EXISTS validate_max_order_bumps ON public.order_bump_settings;
CREATE TRIGGER validate_max_order_bumps
  BEFORE INSERT ON public.order_bump_settings
  FOR EACH ROW
  EXECUTE FUNCTION check_max_order_bumps();

-- Atualizar order bumps existentes para ter bump_order
UPDATE public.order_bump_settings 
SET bump_order = 1 
WHERE bump_order IS NULL;

-- Criar índice único composto para permitir múltiplos order bumps por produto
DROP INDEX IF EXISTS idx_unique_order_bump_per_product;
CREATE UNIQUE INDEX idx_unique_order_bump_per_product 
ON public.order_bump_settings (product_id, bump_order);