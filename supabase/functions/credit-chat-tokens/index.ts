import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREDIT-CHAT-TOKENS] ${step}${detailsStr}`);
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
      transactionId,
      paymentMethod,
      amount
    } = await req.json();

    logStep('Request received', { tokens, packageId, packageName, transactionId, paymentMethod });

    if (!tokens || tokens <= 0) {
      throw new Error('Invalid tokens amount');
    }

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

    // Check if this transaction was already processed (prevent double credit)
    if (transactionId) {
      const { data: existingTransaction } = await supabase
        .from('chat_token_transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('metadata->>transaction_id', transactionId)
        .eq('type', 'purchase')
        .single();

      if (existingTransaction) {
        logStep('Transaction already processed', { transactionId });
        return new Response(JSON.stringify({ 
          success: true,
          message: 'Tokens já foram creditados anteriormente',
          alreadyProcessed: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get current balance
    const { data: currentCredits, error: creditsError } = await supabase
      .from('seller_chat_credits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let newBalance: number;

    if (creditsError || !currentCredits) {
      // Create new record if doesn't exist
      logStep('Creating new credit record');
      newBalance = tokens;
      
      const { error: insertError } = await supabase
        .from('seller_chat_credits')
        .insert({
          user_id: user.id,
          token_balance: tokens,
          total_tokens_purchased: tokens,
          total_tokens_used: 0
        });

      if (insertError) {
        logStep('Error creating credit record', insertError);
        throw new Error('Failed to create credit record');
      }
    } else {
      // Update existing record
      newBalance = currentCredits.token_balance + tokens;
      
      const { error: updateError } = await supabase
        .from('seller_chat_credits')
        .update({
          token_balance: newBalance,
          total_tokens_purchased: currentCredits.total_tokens_purchased + tokens,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        logStep('Error updating credit record', updateError);
        throw new Error('Failed to update credit record');
      }
    }

    logStep('Credits updated', { previousBalance: currentCredits?.token_balance || 0, newBalance });

    // Record the transaction
    const { error: transactionError } = await supabase
      .from('chat_token_transactions')
      .insert({
        user_id: user.id,
        type: 'purchase',
        tokens: tokens,
        balance_after: newBalance,
        package_id: packageId || null,
        description: `Compra de ${tokens.toLocaleString()} tokens - ${packageName || 'Pacote'}`,
        metadata: {
          transaction_id: transactionId,
          payment_method: paymentMethod,
          amount: amount,
          processed_at: new Date().toISOString()
        }
      });

    if (transactionError) {
      logStep('Error recording transaction', transactionError);
      // Don't fail - tokens were already credited
    }

    logStep('Transaction recorded successfully');

    return new Response(JSON.stringify({ 
      success: true,
      newBalance: newBalance,
      tokensAdded: tokens,
      message: `${tokens.toLocaleString()} tokens adicionados com sucesso!`
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
