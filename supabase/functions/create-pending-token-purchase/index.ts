import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PENDING-TOKEN-PURCHASE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const {
      tokens,
      packageId,
      packageName,
      amount,
      referenceNumber,
      entity,
      transactionId
    } = await req.json();

    logStep('Request received', { tokens, packageId, referenceNumber, entity });

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    logStep('User authenticated', { userId: user.id, email: user.email });

    // Create a pending token transaction that can be matched by the webhook
    const { error: insertError } = await supabase
      .from('chat_token_transactions')
      .insert({
        user_id: user.id,
        type: 'pending_purchase',
        tokens: tokens,
        balance_after: 0, // Will be updated when payment confirmed
        package_id: packageId || null,
        description: `Compra pendente - ${tokens.toLocaleString()} tokens - ${packageName || 'Pacote'}`,
        metadata: {
          transaction_id: transactionId,
          reference_number: referenceNumber,
          entity: entity,
          payment_method: 'reference',
          amount: amount,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      });

    if (insertError) {
      logStep('Error creating pending transaction', insertError);
      throw new Error('Failed to create pending transaction');
    }

    logStep('Pending transaction created successfully', { referenceNumber });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Compra pendente registrada. Tokens serão creditados após confirmação do pagamento.',
      referenceNumber
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logStep('ERROR', { message: error instanceof Error ? error.message : 'Unknown error' });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
