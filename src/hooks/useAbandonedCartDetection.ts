import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AbandonedCartData {
  productId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  amount: number;
  currency: string;
}

interface UseAbandonedCartDetectionOptions {
  enabled: boolean;
  minDataRequired: boolean; // true if name and email are filled
  paymentCompleted: boolean;
}

export const useAbandonedCartDetection = (
  data: AbandonedCartData,
  options: UseAbandonedCartDetectionOptions
) => {
  const abandonedIdRef = useRef<string | null>(null);
  const hasRegisteredRef = useRef(false);
  const lastDataRef = useRef<string>('');

  // Function to register abandoned purchase
  const registerAbandonedPurchase = useCallback(async () => {
    // Skip if payment completed or data not filled
    if (options.paymentCompleted || !options.minDataRequired || !options.enabled) {
      console.log('🛒 Skipping abandoned cart detection:', {
        paymentCompleted: options.paymentCompleted,
        minDataRequired: options.minDataRequired,
        enabled: options.enabled
      });
      return;
    }

    // Create a data signature to avoid duplicate registrations
    const dataSignature = `${data.productId}-${data.customerEmail}-${data.amount}`;
    
    // Skip if already registered with same data
    if (hasRegisteredRef.current && lastDataRef.current === dataSignature) {
      console.log('🛒 Already registered abandoned cart with same data');
      return;
    }

    try {
      console.log('🛒 Registering abandoned purchase...', data);
      
      // Check if there's a recent abandonment for this email/product (within last 30 minutes)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data: existingAbandonment, error: checkError } = await supabase
        .from('abandoned_purchases')
        .select('id')
        .eq('product_id', data.productId)
        .eq('customer_email', data.customerEmail)
        .eq('status', 'abandoned')
        .gte('abandoned_at', thirtyMinutesAgo)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing abandonment:', checkError);
      }

      // If recent abandonment exists, update it instead of creating new
      if (existingAbandonment) {
        console.log('🛒 Updating existing abandonment:', existingAbandonment.id);
        
        const { error: updateError } = await supabase
          .from('abandoned_purchases')
          .update({
            amount: data.amount,
            currency: data.currency,
            customer_name: data.customerName,
            customer_phone: data.customerPhone || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAbandonment.id);

        if (updateError) {
          console.error('Error updating abandonment:', updateError);
        } else {
          abandonedIdRef.current = existingAbandonment.id;
          hasRegisteredRef.current = true;
          lastDataRef.current = dataSignature;
          console.log('✅ Updated existing abandoned purchase:', existingAbandonment.id);
        }
        return;
      }

      // Call the detect_abandoned_purchase function
      const { data: result, error } = await supabase.rpc('detect_abandoned_purchase', {
        _product_id: data.productId,
        _customer_email: data.customerEmail,
        _customer_name: data.customerName,
        _amount: data.amount,
        _currency: data.currency,
        _customer_phone: data.customerPhone || null,
        _ip_address: null,
        _user_agent: navigator.userAgent
      });

      if (error) {
        console.error('Error registering abandoned purchase:', error);
        return;
      }

      abandonedIdRef.current = result;
      hasRegisteredRef.current = true;
      lastDataRef.current = dataSignature;
      console.log('✅ Registered abandoned purchase:', result);
    } catch (err) {
      console.error('Failed to register abandoned purchase:', err);
    }
  }, [data, options]);

  // Function to mark as recovered
  const markAsRecovered = useCallback(async (orderId: string) => {
    if (!data.customerEmail || !data.productId) return;

    try {
      console.log('🛒 Marking abandoned purchases as recovered for:', data.customerEmail);
      
      // Update all abandoned purchases for this email/product as recovered
      const { error } = await supabase
        .from('abandoned_purchases')
        .update({
          status: 'recovered',
          recovered_at: new Date().toISOString(),
          recovered_order_id: orderId,
          updated_at: new Date().toISOString()
        })
        .eq('product_id', data.productId)
        .eq('customer_email', data.customerEmail)
        .eq('status', 'abandoned');

      if (error) {
        console.error('Error marking as recovered:', error);
      } else {
        console.log('✅ Marked abandoned purchases as recovered');
      }
    } catch (err) {
      console.error('Failed to mark as recovered:', err);
    }
  }, [data.customerEmail, data.productId]);

  // Register on page exit (beforeunload)
  useEffect(() => {
    if (!options.enabled || !options.minDataRequired) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (options.paymentCompleted) return;
      
      // Use sendBeacon for reliable sending during page unload
      const payload = JSON.stringify({
        _product_id: data.productId,
        _customer_email: data.customerEmail,
        _customer_name: data.customerName,
        _amount: data.amount,
        _currency: data.currency,
        _customer_phone: data.customerPhone || null,
        _user_agent: navigator.userAgent
      });

      // Try to send via beacon (more reliable during unload)
      try {
        navigator.sendBeacon(
          `https://hcbkqygdtzpxvctfdqbd.supabase.co/rest/v1/rpc/detect_abandoned_purchase`,
          payload
        );
      } catch {
        // Fallback - will be called anyway
      }

      // Also try regular call
      registerAbandonedPurchase();
    };

    // Register on visibility change (when user switches tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !options.paymentCompleted) {
        registerAbandonedPurchase();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [data, options, registerAbandonedPurchase]);

  // Register after inactivity (30 seconds without interaction)
  useEffect(() => {
    if (!options.enabled || !options.minDataRequired || options.paymentCompleted) return;

    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        console.log('🛒 User inactive for 30 seconds, registering abandonment...');
        registerAbandonedPurchase();
      }, 30000); // 30 seconds
    };

    // Events that indicate user activity
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    
    activityEvents.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    // Start initial timer
    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [options, registerAbandonedPurchase]);

  return {
    markAsRecovered,
    registerAbandonedPurchase
  };
};
