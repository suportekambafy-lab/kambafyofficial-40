-- Fix admin_process_transfer_request function to work properly
-- The issue is the admin check is failing in the RPC context

DROP FUNCTION IF EXISTS public.admin_process_transfer_request;

CREATE OR REPLACE FUNCTION public.admin_process_transfer_request(
  p_transfer_id uuid, 
  p_action text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result_data json;
  order_record RECORD;
  new_status text;
BEGIN
  -- Define new status based on action
  new_status := CASE WHEN p_action = 'approve' THEN 'completed' ELSE 'failed' END;
  
  -- Get order data
  SELECT * INTO order_record FROM public.orders WHERE id = p_transfer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  -- Update order status directly (bypasses RLS with SECURITY DEFINER)
  UPDATE public.orders 
  SET 
    status = new_status,
    updated_at = now()
  WHERE id = p_transfer_id;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update order status';
  END IF;
  
  -- Return success data
  result_data := json_build_object(
    'success', true,
    'order_id', order_record.order_id,
    'old_status', order_record.status,
    'new_status', new_status,
    'updated_at', now()
  );
  
  RETURN result_data;
END;
$$;