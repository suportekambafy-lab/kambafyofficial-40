-- Create table for abandoned cart detection settings
CREATE TABLE public.sales_recovery_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  email_delay_hours INTEGER NOT NULL DEFAULT 24,
  email_subject TEXT NOT NULL DEFAULT 'Complete sua compra - Oferta especial aguarda!',
  email_template TEXT NOT NULL DEFAULT 'Olá {customer_name}, notamos que você iniciou uma compra mas não finalizou. Complete agora e aproveite!',
  max_recovery_attempts INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for tracking abandoned purchases
CREATE TABLE public.abandoned_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KZ',
  abandoned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_recovery_attempt_at TIMESTAMP WITH TIME ZONE,
  recovery_attempts_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'abandoned' CHECK (status IN ('abandoned', 'recovered', 'expired')),
  recovered_at TIMESTAMP WITH TIME ZONE,
  recovered_order_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for recovery email logs
CREATE TABLE public.recovery_email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  abandoned_purchase_id UUID NOT NULL REFERENCES public.abandoned_purchases(id) ON DELETE CASCADE,
  email_sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_subject TEXT NOT NULL,
  email_content TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'failed', 'bounced')),
  error_message TEXT,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for recovery analytics
CREATE TABLE public.sales_recovery_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_abandoned INTEGER NOT NULL DEFAULT 0,
  total_recovery_emails_sent INTEGER NOT NULL DEFAULT 0,
  total_recovered INTEGER NOT NULL DEFAULT 0,
  total_recovered_amount NUMERIC NOT NULL DEFAULT 0,
  recovery_rate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id, date)
);

-- Enable RLS on all tables
ALTER TABLE public.sales_recovery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abandoned_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_recovery_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for sales_recovery_settings
CREATE POLICY "Users can manage their own recovery settings" 
ON public.sales_recovery_settings 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for abandoned_purchases
CREATE POLICY "Users can view abandoned purchases for their products" 
ON public.abandoned_purchases 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM products 
  WHERE products.id = abandoned_purchases.product_id 
  AND products.user_id = auth.uid()
));

CREATE POLICY "System can manage abandoned purchases" 
ON public.abandoned_purchases 
FOR ALL 
USING (true)
WITH CHECK (true);

-- RLS policies for recovery_email_logs
CREATE POLICY "Users can view recovery logs for their products" 
ON public.recovery_email_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM abandoned_purchases ap
  JOIN products p ON p.id = ap.product_id
  WHERE ap.id = recovery_email_logs.abandoned_purchase_id 
  AND p.user_id = auth.uid()
));

CREATE POLICY "System can manage recovery email logs" 
ON public.recovery_email_logs 
FOR ALL 
USING (true)
WITH CHECK (true);

-- RLS policies for sales_recovery_analytics
CREATE POLICY "Users can view their own recovery analytics" 
ON public.sales_recovery_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage recovery analytics" 
ON public.sales_recovery_analytics 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create function to update analytics
CREATE OR REPLACE FUNCTION public.update_recovery_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update analytics when abandoned purchase status changes
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.sales_recovery_analytics (
      user_id, 
      product_id, 
      date,
      total_recovered,
      total_recovered_amount,
      recovery_rate
    )
    SELECT 
      p.user_id,
      NEW.product_id,
      CURRENT_DATE,
      CASE WHEN NEW.status = 'recovered' THEN 1 ELSE 0 END,
      CASE WHEN NEW.status = 'recovered' THEN NEW.amount ELSE 0 END,
      (SELECT 
        CASE WHEN COUNT(*) > 0 
        THEN (COUNT(*) FILTER (WHERE status = 'recovered'))::NUMERIC / COUNT(*)::NUMERIC * 100
        ELSE 0 END
       FROM abandoned_purchases ap2 
       WHERE ap2.product_id = NEW.product_id
       AND date_trunc('day', ap2.created_at) = CURRENT_DATE
      )
    FROM products p
    WHERE p.id = NEW.product_id
    ON CONFLICT (user_id, product_id, date) 
    DO UPDATE SET
      total_recovered = sales_recovery_analytics.total_recovered + EXCLUDED.total_recovered,
      total_recovered_amount = sales_recovery_analytics.total_recovered_amount + EXCLUDED.total_recovered_amount,
      recovery_rate = EXCLUDED.recovery_rate,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for analytics updates
CREATE TRIGGER update_recovery_analytics_trigger
AFTER UPDATE ON public.abandoned_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_recovery_analytics();

-- Create function to detect abandoned purchases
CREATE OR REPLACE FUNCTION public.detect_abandoned_purchase(
  _product_id UUID,
  _customer_email TEXT,
  _customer_name TEXT,
  _customer_phone TEXT DEFAULT NULL,
  _amount NUMERIC,
  _currency TEXT DEFAULT 'KZ',
  _ip_address TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  abandoned_id UUID;
BEGIN
  INSERT INTO public.abandoned_purchases (
    product_id,
    customer_email,
    customer_name,
    customer_phone,
    amount,
    currency,
    ip_address,
    user_agent
  ) VALUES (
    _product_id,
    _customer_email,
    _customer_name,
    _customer_phone,
    _amount,
    _currency,
    _ip_address,
    _user_agent
  ) RETURNING id INTO abandoned_id;
  
  RETURN abandoned_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for updated_at columns
CREATE TRIGGER update_sales_recovery_settings_updated_at
BEFORE UPDATE ON public.sales_recovery_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_abandoned_purchases_updated_at
BEFORE UPDATE ON public.abandoned_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_recovery_analytics_updated_at
BEFORE UPDATE ON public.sales_recovery_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();