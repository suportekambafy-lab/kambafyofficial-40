-- Tabela para log de eventos do Facebook (deduplicação e rastreamento)
CREATE TABLE public.facebook_events_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  event_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB,
  response JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice único para deduplicação por event_id
CREATE UNIQUE INDEX idx_facebook_events_log_event_id ON public.facebook_events_log(event_id);

-- Índices para consultas
CREATE INDEX idx_facebook_events_log_user_id ON public.facebook_events_log(user_id);
CREATE INDEX idx_facebook_events_log_product_id ON public.facebook_events_log(product_id);
CREATE INDEX idx_facebook_events_log_status ON public.facebook_events_log(status);
CREATE INDEX idx_facebook_events_log_created_at ON public.facebook_events_log(created_at);

-- RLS
ALTER TABLE public.facebook_events_log ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own event logs"
ON public.facebook_events_log
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage event logs"
ON public.facebook_events_log
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_facebook_events_log_updated_at
BEFORE UPDATE ON public.facebook_events_log
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();