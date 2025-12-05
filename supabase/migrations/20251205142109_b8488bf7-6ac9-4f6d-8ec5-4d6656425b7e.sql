-- Create table for checkout sessions/visits
CREATE TABLE public.checkout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  country TEXT,
  city TEXT,
  region TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for querying today's sessions
CREATE INDEX idx_checkout_sessions_created_at ON public.checkout_sessions(created_at);
CREATE INDEX idx_checkout_sessions_product_id ON public.checkout_sessions(product_id);

-- Enable RLS
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (anonymous checkout visitors)
CREATE POLICY "Anyone can insert checkout sessions"
ON public.checkout_sessions
FOR INSERT
WITH CHECK (true);

-- Sellers can view sessions for their products
CREATE POLICY "Sellers can view sessions for their products"
ON public.checkout_sessions
FOR SELECT
USING (
  product_id IN (
    SELECT id FROM public.products WHERE user_id = auth.uid()
  )
);