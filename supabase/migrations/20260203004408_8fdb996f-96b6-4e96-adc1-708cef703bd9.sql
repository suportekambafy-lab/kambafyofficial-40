-- Corrigir políticas RLS para product_offers
-- Donos de produtos devem ver TODAS as ofertas (ativas e inativas)

-- Remover política pública que pode causar conflito
DROP POLICY IF EXISTS "Anyone can read active offers" ON public.product_offers;
DROP POLICY IF EXISTS "Product owners can manage their offers" ON public.product_offers;

-- Política 1: Donos do produto podem ver TODAS as ofertas do seu produto
CREATE POLICY "Product owners can view all their offers"
ON public.product_offers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products 
    WHERE products.id = product_offers.product_id 
    AND products.user_id = auth.uid()
  )
);

-- Política 2: Público pode ver apenas ofertas ATIVAS (para checkout)
CREATE POLICY "Public can view active offers"
ON public.product_offers FOR SELECT
USING (is_active = true);

-- Política 3: Donos podem inserir ofertas nos seus produtos
CREATE POLICY "Product owners can insert offers"
ON public.product_offers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products 
    WHERE products.id = product_offers.product_id 
    AND products.user_id = auth.uid()
  )
);

-- Política 4: Donos podem atualizar ofertas dos seus produtos
CREATE POLICY "Product owners can update offers"
ON public.product_offers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.products 
    WHERE products.id = product_offers.product_id 
    AND products.user_id = auth.uid()
  )
);

-- Política 5: Donos podem deletar ofertas dos seus produtos
CREATE POLICY "Product owners can delete offers"
ON public.product_offers FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.products 
    WHERE products.id = product_offers.product_id 
    AND products.user_id = auth.uid()
  )
);