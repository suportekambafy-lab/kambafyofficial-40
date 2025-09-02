import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0"

interface CreateChargeRequest {
  amount: number;
  currency: string;
  description: string;
  merchantTransactionId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  smsNotification?: boolean;
  emailNotification?: boolean;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    console.log('🔄 TESTE - Iniciando criação de cobrança AppyPay');
    
    const requestData: CreateChargeRequest = await req.json();
    console.log('📥 TESTE - Dados recebidos:', JSON.stringify(requestData, null, 2));

    // TESTE: Retornar dados simulados para testar a interface
    const mockCharge = {
      id: 'test_' + Date.now(),
      reference: '999 888 777',
      amount: requestData.amount,
      currency: requestData.currency,
      description: requestData.description,
      merchantTransactionId: requestData.merchantTransactionId,
      status: 'pending',
      expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
      paymentInstructions: 'Use esta referência para pagamento em qualquer terminal Multicaixa ou banco em Angola',
      customerName: requestData.customerName,
      customerEmail: requestData.customerEmail,
      customerPhone: requestData.customerPhone
    };

    console.log('✅ TESTE - Cobrança simulada criada:', mockCharge);

    return new Response(
      JSON.stringify({
        success: true,
        charge: mockCharge
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 TESTE - Erro inesperado:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});