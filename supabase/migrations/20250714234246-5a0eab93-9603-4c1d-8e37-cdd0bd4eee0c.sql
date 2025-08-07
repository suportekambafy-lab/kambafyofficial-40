-- Remover registros duplicados mantendo apenas o mais recente
DELETE FROM public.order_bump_settings 
WHERE id NOT IN (
  SELECT DISTINCT ON (product_id) id 
  FROM public.order_bump_settings 
  ORDER BY product_id, created_at DESC
);

-- Adicionar constraint única para product_id
ALTER TABLE public.order_bump_settings 
ADD CONSTRAINT order_bump_settings_product_id_key UNIQUE (product_id);

-- Criar tabela para múltiplos order bumps/extras
CREATE TABLE public.order_bump_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_bump_id UUID NOT NULL REFERENCES public.order_bump_settings(id) ON DELETE CASCADE,
  bump_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  bump_product_name TEXT NOT NULL,
  bump_product_price TEXT NOT NULL,
  bump_product_image TEXT,
  discount INTEGER DEFAULT 0,
  order_position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security na nova tabela
ALTER TABLE public.order_bump_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para order_bump_items
CREATE POLICY "Users can manage their own order bump items" 
ON public.order_bump_items 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.order_bump_settings obs
    WHERE obs.id = order_bump_items.order_bump_id 
    AND obs.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.order_bump_settings obs
    WHERE obs.id = order_bump_items.order_bump_id 
    AND obs.user_id = auth.uid()
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_order_bump_items_updated_at
BEFORE UPDATE ON public.order_bump_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();