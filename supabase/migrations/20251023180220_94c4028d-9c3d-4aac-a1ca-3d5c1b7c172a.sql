-- ====================================
-- SISTEMA DE REEMBOLSOS - PARTE 1: TABELAS
-- ====================================

-- 1. CRIAR TABELA DE SOLICITAÇÕES DE REEMBOLSO
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  buyer_user_id UUID REFERENCES auth.users(id),
  buyer_email TEXT NOT NULL,
  seller_user_id UUID NOT NULL REFERENCES auth.users(id),
  product_id UUID REFERENCES products(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KZ',
  reason TEXT NOT NULL,
  seller_comment TEXT,
  admin_comment TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved_by_seller',
    'rejected_by_seller',
    'admin_review',
    'approved_by_admin',
    'rejected_by_admin',
    'completed',
    'cancelled'
  )),
  refund_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_refund_requests_order_id ON public.refund_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_buyer_user_id ON public.refund_requests(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_seller_user_id ON public.refund_requests(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON public.refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_created_at ON public.refund_requests(created_at);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_refund_requests_updated_at ON public.refund_requests;
CREATE TRIGGER update_refund_requests_updated_at
  BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 2. CRIAR TABELA DE LOGS DE REEMBOLSO
CREATE TABLE IF NOT EXISTS public.refund_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id UUID NOT NULL REFERENCES public.refund_requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  comment TEXT,
  old_status TEXT,
  new_status TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refund_logs_refund_id ON public.refund_logs(refund_id);
CREATE INDEX IF NOT EXISTS idx_refund_logs_created_at ON public.refund_logs(created_at);

-- 3. ADICIONAR CAMPOS À TABELA ORDERS
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS has_active_refund BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_deadline TIMESTAMP WITH TIME ZONE;

-- Calcular deadline para pedidos existentes (7 dias)
UPDATE public.orders 
SET refund_deadline = created_at + INTERVAL '7 days'
WHERE refund_deadline IS NULL AND status = 'completed';

-- 4. RLS POLICIES PARA refund_requests
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers view own refunds" ON public.refund_requests;
CREATE POLICY "Buyers view own refunds"
ON public.refund_requests FOR SELECT
USING (
  buyer_user_id = auth.uid() OR 
  buyer_email = get_current_user_email()
);

DROP POLICY IF EXISTS "Buyers create refunds" ON public.refund_requests;
CREATE POLICY "Buyers create refunds"
ON public.refund_requests FOR INSERT
WITH CHECK (
  buyer_user_id = auth.uid() OR
  buyer_email = get_current_user_email()
);

DROP POLICY IF EXISTS "Sellers view product refunds" ON public.refund_requests;
CREATE POLICY "Sellers view product refunds"
ON public.refund_requests FOR SELECT
USING (seller_user_id = auth.uid());

DROP POLICY IF EXISTS "Sellers update product refunds" ON public.refund_requests;
CREATE POLICY "Sellers update product refunds"
ON public.refund_requests FOR UPDATE
USING (seller_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage all refunds" ON public.refund_requests;
CREATE POLICY "Admins manage all refunds"
ON public.refund_requests FOR ALL
USING (is_current_user_admin());

DROP POLICY IF EXISTS "System manage refunds" ON public.refund_requests;
CREATE POLICY "System manage refunds"
ON public.refund_requests FOR ALL
USING (true);

-- 5. RLS POLICIES PARA refund_logs
ALTER TABLE public.refund_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view related refund logs" ON public.refund_logs;
CREATE POLICY "Users view related refund logs"
ON public.refund_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.refund_requests 
    WHERE id = refund_logs.refund_id 
    AND (buyer_user_id = auth.uid() OR seller_user_id = auth.uid())
  ) OR is_current_user_admin()
);

DROP POLICY IF EXISTS "System insert refund logs" ON public.refund_logs;
CREATE POLICY "System insert refund logs"
ON public.refund_logs FOR INSERT
WITH CHECK (true);