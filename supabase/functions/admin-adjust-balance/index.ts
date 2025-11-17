import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdjustBalanceRequest {
  userId: string;
  targetAvailableBalance: number;
  reason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, targetAvailableBalance, reason }: AdjustBalanceRequest = await req.json();

    console.log(`[ADMIN-ADJUST] Adjusting balance for user ${userId} to ${targetAvailableBalance} KZ available`);

    // Get current balance and retention
    const { data: balanceData, error: balanceError } = await supabase
      .from('customer_balances')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (balanceError) {
      throw new Error(`Failed to fetch balance: ${balanceError.message}`);
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('balance_retention_percentage, retained_fixed_amount, full_name, email')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    const currentBalance = balanceData?.balance || 0;
    const retentionPercentage = profileData?.balance_retention_percentage || 0;

    console.log(`[ADMIN-ADJUST] Current state: balance=${currentBalance}, retention=${retentionPercentage}%`);

    // Calculate required total balance
    // If retention is 50%, then available = total - (total * 0.5)
    // So: available = total * 0.5
    // Therefore: total = available / 0.5
    // Special case: if targetAvailableBalance = 0, we want total = retained (not zero)
    let requiredTotalBalance: number;
    let newRetainedFixed: number;

    if (retentionPercentage > 0) {
      const retentionDecimal = retentionPercentage / 100;
      
      if (targetAvailableBalance === 0) {
        // Special case: when zeroing available balance, keep retained amount
        const currentRetainedFixed = profileData?.retained_fixed_amount || 0;
        requiredTotalBalance = currentRetainedFixed;
        newRetainedFixed = currentRetainedFixed;
      } else {
        requiredTotalBalance = targetAvailableBalance / (1 - retentionDecimal);
        newRetainedFixed = requiredTotalBalance - targetAvailableBalance;
      }
    } else {
      requiredTotalBalance = targetAvailableBalance;
      newRetainedFixed = 0;
    }

    const balanceDifference = requiredTotalBalance - currentBalance;

    console.log(`[ADMIN-ADJUST] Calculations:`, {
      requiredTotalBalance,
      newRetainedFixed,
      balanceDifference
    });

    // Add balance transaction if needed
    if (Math.abs(balanceDifference) > 0.01) {
      const { error: transactionError } = await supabase
        .from('balance_transactions')
        .insert({
          user_id: userId,
          type: balanceDifference > 0 ? 'credit' : 'debit',
          amount: balanceDifference,
          currency: 'KZ',
          description: reason || `Ajuste manual de saldo por Admin - Disponível: ${targetAvailableBalance} KZ`,
          email: profileData.email
        });

      if (transactionError) {
        throw new Error(`Failed to create transaction: ${transactionError.message}`);
      }

      console.log(`[ADMIN-ADJUST] Transaction created: ${balanceDifference} KZ`);
    }

    // Update retained fixed amount
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        retained_fixed_amount: newRetainedFixed
      })
      .eq('user_id', userId);

    if (updateError) {
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    console.log(`[ADMIN-ADJUST] ✅ Balance adjusted successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        previousBalance: currentBalance,
        newTotalBalance: requiredTotalBalance,
        retainedFixed: newRetainedFixed,
        availableBalance: targetAvailableBalance,
        adjustment: balanceDifference
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[ADMIN-ADJUST] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
