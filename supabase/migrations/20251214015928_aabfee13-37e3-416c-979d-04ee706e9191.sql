-- Allow updating abandoned_purchases status to recovered when customer completes purchase
CREATE POLICY "Allow marking abandonments as recovered"
ON public.abandoned_purchases
FOR UPDATE
USING (true)
WITH CHECK (status = 'recovered');

-- Allow public to call detect_abandoned_purchase RPC (already SECURITY DEFINER)
-- The function already bypasses RLS

-- Create index for faster recovery email processing
CREATE INDEX IF NOT EXISTS idx_abandoned_purchases_recovery 
ON public.abandoned_purchases (product_id, status, abandoned_at, recovery_attempts_count) 
WHERE status = 'abandoned';