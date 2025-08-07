-- Criar tabela de afiliados
CREATE TABLE public.affiliates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- vendedor que tem o produto
  affiliate_user_id UUID NOT NULL, -- afiliado que quer promover
  product_id UUID NOT NULL,
  affiliate_name TEXT NOT NULL,
  affiliate_email TEXT NOT NULL,
  commission_rate TEXT NOT NULL DEFAULT '10%',
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('ativo', 'pendente', 'recusado', 'bloqueado', 'cancelado')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

-- Create policies for affiliates
CREATE POLICY "Users can view affiliates for their products" 
ON public.affiliates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create affiliate requests" 
ON public.affiliates 
FOR INSERT 
WITH CHECK (auth.uid() = affiliate_user_id);

CREATE POLICY "Product owners can update affiliate requests" 
ON public.affiliates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own affiliate requests" 
ON public.affiliates 
FOR UPDATE 
USING (auth.uid() = affiliate_user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_affiliates_updated_at
BEFORE UPDATE ON public.affiliates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key constraints
ALTER TABLE public.affiliates
ADD CONSTRAINT affiliates_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.affiliates
ADD CONSTRAINT affiliates_affiliate_user_id_fkey 
FOREIGN KEY (affiliate_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.affiliates
ADD CONSTRAINT affiliates_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;