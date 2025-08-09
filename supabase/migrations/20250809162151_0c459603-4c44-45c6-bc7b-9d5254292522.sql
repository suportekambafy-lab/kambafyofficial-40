-- Create partners table
CREATE TABLE public.partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_email TEXT NOT NULL UNIQUE,
  contact_name TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
  api_key TEXT UNIQUE,
  webhook_url TEXT,
  commission_rate NUMERIC DEFAULT 2.5 CHECK (commission_rate >= 0 AND commission_rate <= 10),
  monthly_transaction_limit NUMERIC DEFAULT 1000000,
  current_month_transactions NUMERIC DEFAULT 0,
  total_transactions NUMERIC DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID
);

-- Enable RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Partners can view their own data"
ON public.partners FOR SELECT
USING (api_key = current_setting('request.headers')::json->>'x-api-key');

CREATE POLICY "Public can create partner applications"
ON public.partners FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage all partners"
ON public.partners FOR ALL
USING (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE email = get_current_user_email() AND is_active = true
));

-- Create API usage logs table
CREATE TABLE public.api_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  request_size INTEGER,
  response_size INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for API logs
CREATE POLICY "Partners can view their own logs"
ON public.api_usage_logs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM partners 
  WHERE partners.id = api_usage_logs.partner_id 
  AND partners.api_key = current_setting('request.headers')::json->>'x-api-key'
));

CREATE POLICY "System can insert logs"
ON public.api_usage_logs FOR INSERT
WITH CHECK (true);

-- Create partner transactions table
CREATE TABLE public.partner_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'commission')),
  amount NUMERIC NOT NULL,
  commission_amount NUMERIC DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KZ',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.partner_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for partner transactions
CREATE POLICY "Partners can view their own transactions"
ON public.partner_transactions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM partners 
  WHERE partners.id = partner_transactions.partner_id 
  AND partners.api_key = current_setting('request.headers')::json->>'x-api-key'
));

CREATE POLICY "System can manage transactions"
ON public.partner_transactions FOR ALL
WITH CHECK (true);

-- Function to generate API key
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'kp_' || encode(gen_random_bytes(32), 'hex');
END;
$$;

-- Function to approve partner
CREATE OR REPLACE FUNCTION approve_partner(partner_id UUID, admin_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.partners 
  SET 
    status = 'approved',
    api_key = generate_api_key(),
    approved_at = now(),
    approved_by = admin_id,
    updated_at = now()
  WHERE id = partner_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partner not found';
  END IF;
END;
$$;

-- Function to log API usage
CREATE OR REPLACE FUNCTION log_api_usage(
  _partner_id UUID,
  _endpoint TEXT,
  _method TEXT,
  _status_code INTEGER,
  _response_time_ms INTEGER DEFAULT NULL,
  _ip_address TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.api_usage_logs (
    partner_id,
    endpoint,
    method,
    status_code,
    response_time_ms,
    ip_address,
    user_agent
  ) VALUES (
    _partner_id,
    _endpoint,
    _method,
    _status_code,
    _response_time_ms,
    _ip_address,
    _user_agent
  );
END;
$$;

-- Create indexes for better performance
CREATE INDEX idx_partners_api_key ON public.partners(api_key);
CREATE INDEX idx_partners_status ON public.partners(status);
CREATE INDEX idx_api_usage_logs_partner_id ON public.api_usage_logs(partner_id);
CREATE INDEX idx_api_usage_logs_created_at ON public.api_usage_logs(created_at);
CREATE INDEX idx_partner_transactions_partner_id ON public.partner_transactions(partner_id);
CREATE INDEX idx_partner_transactions_status ON public.partner_transactions(status);

-- Add triggers for updated_at
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create admin notification trigger for new partner applications
CREATE OR REPLACE FUNCTION create_partner_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, entity_id, entity_type, data)
  VALUES (
    'partner_application',
    'Nova Aplicação de Parceiro',
    'A empresa ' || NEW.company_name || ' solicitou parceria',
    NEW.id,
    'partner',
    jsonb_build_object(
      'company_name', NEW.company_name,
      'contact_email', NEW.contact_email,
      'contact_name', NEW.contact_name
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER partner_application_notification
  AFTER INSERT ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION create_partner_notification();