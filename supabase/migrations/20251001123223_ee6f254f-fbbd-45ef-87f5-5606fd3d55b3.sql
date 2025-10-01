-- Criar tabela para ofertas dentro da área de membros
CREATE TABLE public.member_area_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_area_id UUID NOT NULL REFERENCES public.member_areas(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price TEXT NOT NULL,
  discount_percentage INTEGER DEFAULT 0,
  order_number INTEGER NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.member_area_offers ENABLE ROW LEVEL SECURITY;

-- Vendedores podem gerenciar suas ofertas
CREATE POLICY "Users can manage their own member area offers"
  ON public.member_area_offers
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Público pode visualizar ofertas ativas
CREATE POLICY "Public can view active offers"
  ON public.member_area_offers
  FOR SELECT
  USING (enabled = true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_member_area_offers_updated_at
  BEFORE UPDATE ON public.member_area_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para melhor performance
CREATE INDEX idx_member_area_offers_member_area_id ON public.member_area_offers(member_area_id);
CREATE INDEX idx_member_area_offers_product_id ON public.member_area_offers(product_id);
CREATE INDEX idx_member_area_offers_enabled ON public.member_area_offers(enabled);