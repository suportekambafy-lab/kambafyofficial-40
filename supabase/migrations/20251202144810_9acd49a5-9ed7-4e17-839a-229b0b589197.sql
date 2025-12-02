-- Add DELETE policy for seller_notifications
CREATE POLICY "Users can delete their own notifications" 
ON public.seller_notifications 
FOR DELETE 
USING (auth.uid() = user_id);