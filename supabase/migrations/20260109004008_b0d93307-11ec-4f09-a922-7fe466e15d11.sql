-- Tabela para armazenar lojas Shopify conectadas
CREATE TABLE public.shopify_stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_domain TEXT NOT NULL UNIQUE,
  access_token TEXT,
  scope TEXT,
  kambafy_partner_id UUID REFERENCES public.partners(id),
  kambafy_api_key TEXT,
  settings JSONB DEFAULT '{"payment_methods": {"express": true, "reference": true, "card": true}}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  uninstalled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para rastrear pedidos Shopify e pagamentos
CREATE TABLE public.shopify_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_domain TEXT NOT NULL REFERENCES public.shopify_stores(shop_domain),
  shopify_order_id TEXT NOT NULL,
  shopify_order_number TEXT,
  shopify_checkout_token TEXT,
  kambafy_payment_id UUID REFERENCES public.external_payments(id),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'AOA',
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  customer_email TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shop_domain, shopify_order_id)
);

-- Índices para performance
CREATE INDEX idx_shopify_stores_partner ON public.shopify_stores(kambafy_partner_id);
CREATE INDEX idx_shopify_orders_shop ON public.shopify_orders(shop_domain);
CREATE INDEX idx_shopify_orders_status ON public.shopify_orders(status);
CREATE INDEX idx_shopify_orders_payment ON public.shopify_orders(kambafy_payment_id);

-- Enable RLS
ALTER TABLE public.shopify_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_orders ENABLE ROW LEVEL SECURITY;

-- Policies para shopify_stores (acesso via service role para edge functions)
CREATE POLICY "Service role full access to shopify_stores"
ON public.shopify_stores
FOR ALL
USING (true)
WITH CHECK (true);

-- Policies para shopify_orders
CREATE POLICY "Service role full access to shopify_orders"
ON public.shopify_orders
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_shopify_stores_updated_at
BEFORE UPDATE ON public.shopify_stores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shopify_orders_updated_at
BEFORE UPDATE ON public.shopify_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();