-- Tabela para múltiplas ofertas por produto
CREATE TABLE public.product_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AOA',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_product_offers_product_id ON public.product_offers(product_id);
CREATE INDEX idx_product_offers_active ON public.product_offers(product_id, is_active);

-- RLS
ALTER TABLE public.product_offers ENABLE ROW LEVEL SECURITY;

-- Política: dono do produto pode gerenciar ofertas
CREATE POLICY "Product owners can manage their offers"
ON public.product_offers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.products 
    WHERE products.id = product_offers.product_id 
    AND products.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products 
    WHERE products.id = product_offers.product_id 
    AND products.user_id = auth.uid()
  )
);

-- Política: qualquer um pode ler ofertas ativas (para checkout)
CREATE POLICY "Anyone can read active offers"
ON public.product_offers
FOR SELECT
USING (is_active = true);

-- Trigger para updated_at
CREATE TRIGGER update_product_offers_updated_at
BEFORE UPDATE ON public.product_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna ao produto para habilitar ofertas múltiplas
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS has_multiple_offers BOOLEAN DEFAULT false;