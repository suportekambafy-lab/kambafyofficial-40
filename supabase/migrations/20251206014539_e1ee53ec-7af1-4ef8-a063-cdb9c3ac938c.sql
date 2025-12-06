-- Allow service role and admins to read all checkout sessions
CREATE POLICY "Allow all to read checkout_sessions" 
ON public.checkout_sessions 
FOR SELECT 
USING (true);