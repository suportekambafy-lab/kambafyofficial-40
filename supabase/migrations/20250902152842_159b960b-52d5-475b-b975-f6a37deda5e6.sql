-- Adicionar campos de duração de acesso à tabela products
ALTER TABLE public.products 
ADD COLUMN access_duration_type TEXT DEFAULT 'lifetime' CHECK (access_duration_type IN ('days', 'months', 'years', 'lifetime')),
ADD COLUMN access_duration_value INTEGER DEFAULT NULL,
ADD COLUMN access_duration_description TEXT DEFAULT NULL;

-- Comentários para explicar os campos
COMMENT ON COLUMN public.products.access_duration_type IS 'Tipo de duração: days, months, years, ou lifetime';
COMMENT ON COLUMN public.products.access_duration_value IS 'Valor numérico da duração (null para lifetime)';
COMMENT ON COLUMN public.products.access_duration_description IS 'Descrição personalizada da duração (ex: "Acesso por 6 meses")';

-- Modificar order_bump_settings para suportar extensões de tempo
ALTER TABLE public.order_bump_settings
ADD COLUMN bump_type TEXT DEFAULT 'product' CHECK (bump_type IN ('product', 'access_extension')),
ADD COLUMN access_extension_type TEXT DEFAULT NULL CHECK (access_extension_type IS NULL OR access_extension_type IN ('days', 'months', 'years', 'lifetime')),
ADD COLUMN access_extension_value INTEGER DEFAULT NULL,
ADD COLUMN access_extension_description TEXT DEFAULT NULL;

-- Comentários para os novos campos
COMMENT ON COLUMN public.order_bump_settings.bump_type IS 'Tipo de order bump: product ou access_extension';
COMMENT ON COLUMN public.order_bump_settings.access_extension_type IS 'Tipo de extensão de acesso';
COMMENT ON COLUMN public.order_bump_settings.access_extension_value IS 'Valor da extensão de acesso';
COMMENT ON COLUMN public.order_bump_settings.access_extension_description IS 'Descrição da extensão de acesso';

-- Criar tabela para controlar acesso dos clientes com expiração
CREATE TABLE public.customer_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  access_granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  access_expires_at TIMESTAMP WITH TIME ZONE NULL, -- NULL significa acesso vitalício
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Índices para otimização
  CONSTRAINT unique_customer_product_order UNIQUE (customer_email, product_id, order_id)
);

-- Índices para performance
CREATE INDEX idx_customer_access_email ON public.customer_access(customer_email);
CREATE INDEX idx_customer_access_product ON public.customer_access(product_id);
CREATE INDEX idx_customer_access_expires ON public.customer_access(access_expires_at) WHERE access_expires_at IS NOT NULL;
CREATE INDEX idx_customer_access_active ON public.customer_access(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.customer_access ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para customer_access
CREATE POLICY "Sellers can view access for their products" 
ON public.customer_access 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.products 
    WHERE products.id = customer_access.product_id 
    AND products.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage customer access" 
ON public.customer_access 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Criar função para calcular data de expiração
CREATE OR REPLACE FUNCTION public.calculate_access_expiration(
  duration_type TEXT,
  duration_value INTEGER,
  base_date TIMESTAMP WITH TIME ZONE DEFAULT now()
) RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
AS $function$
BEGIN
  IF duration_type = 'lifetime' OR duration_type IS NULL THEN
    RETURN NULL; -- Acesso vitalício
  END IF;
  
  CASE duration_type
    WHEN 'days' THEN
      RETURN base_date + (duration_value || ' days')::INTERVAL;
    WHEN 'months' THEN
      RETURN base_date + (duration_value || ' months')::INTERVAL;
    WHEN 'years' THEN
      RETURN base_date + (duration_value || ' years')::INTERVAL;
    ELSE
      RETURN NULL; -- Fallback para acesso vitalício
  END CASE;
END;
$function$;

-- Criar função para estender acesso de cliente
CREATE OR REPLACE FUNCTION public.extend_customer_access(
  p_customer_email TEXT,
  p_product_id UUID,
  p_order_id TEXT,
  p_extension_type TEXT,
  p_extension_value INTEGER
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  access_record RECORD;
  new_expiration TIMESTAMP WITH TIME ZONE;
  access_id UUID;
BEGIN
  -- Buscar registro de acesso existente
  SELECT * INTO access_record
  FROM public.customer_access
  WHERE customer_email = p_customer_email
    AND product_id = p_product_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF access_record IS NOT NULL THEN
    -- Calcular nova data de expiração baseada na atual ou agora
    IF access_record.access_expires_at IS NOT NULL THEN
      new_expiration := public.calculate_access_expiration(
        p_extension_type, 
        p_extension_value, 
        GREATEST(access_record.access_expires_at, now())
      );
    ELSE
      -- Se tinha acesso vitalício, calcular a partir de agora
      new_expiration := public.calculate_access_expiration(
        p_extension_type, 
        p_extension_value, 
        now()
      );
    END IF;
    
    -- Atualizar registro existente
    UPDATE public.customer_access
    SET 
      access_expires_at = new_expiration,
      is_active = true,
      updated_at = now()
    WHERE id = access_record.id;
    
    access_id := access_record.id;
  ELSE
    -- Criar novo registro de acesso
    new_expiration := public.calculate_access_expiration(
      p_extension_type, 
      p_extension_value, 
      now()
    );
    
    INSERT INTO public.customer_access (
      customer_email,
      customer_name,
      product_id,
      order_id,
      access_expires_at
    ) VALUES (
      p_customer_email,
      p_customer_email, -- Usar email como nome por padrão
      p_product_id,
      p_order_id,
      new_expiration
    ) RETURNING id INTO access_id;
  END IF;
  
  RETURN access_id;
END;
$function$;

-- Criar função para verificar se cliente tem acesso ativo
CREATE OR REPLACE FUNCTION public.check_customer_access(
  p_customer_email TEXT,
  p_product_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  access_record RECORD;
BEGIN
  SELECT * INTO access_record
  FROM public.customer_access
  WHERE customer_email = p_customer_email
    AND product_id = p_product_id
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF access_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Se access_expires_at é NULL, é acesso vitalício
  IF access_record.access_expires_at IS NULL THEN
    RETURN true;
  END IF;
  
  -- Verificar se ainda não expirou
  RETURN access_record.access_expires_at > now();
END;
$function$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_customer_access_updated_at
  BEFORE UPDATE ON public.customer_access
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();