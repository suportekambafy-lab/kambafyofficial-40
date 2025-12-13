import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-APPYPAY-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const { transactionId } = await req.json();

    if (!transactionId) {
      throw new Error('Transaction ID is required');
    }

    logStep('Checking status for transaction', { transactionId });

    // Get AppyPay credentials
    const appyPayClientId = Deno.env.get('APPYPAY_CLIENT_ID');
    const appyPayClientSecret = Deno.env.get('APPYPAY_CLIENT_SECRET');
    const appyPayResource = Deno.env.get('APPYPAY_RESOURCE');
    const appyPayGrantType = Deno.env.get('APPYPAY_GRANT_TYPE');

    if (!appyPayClientId || !appyPayClientSecret || !appyPayResource || !appyPayGrantType) {
      logStep("Missing AppyPay credentials");
      return new Response(JSON.stringify({ 
        status: 'unknown',
        error: 'AppyPay credentials not configured'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get OAuth token
    const tokenResponse = await fetch('https://login.microsoftonline.com/auth.appypay.co.ao/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'grant_type': appyPayGrantType,
        'client_id': appyPayClientId,
        'client_secret': appyPayClientSecret,
        'resource': appyPayResource
      })
    });

    if (!tokenResponse.ok) {
      logStep('Token request failed', { status: tokenResponse.status });
      return new Response(JSON.stringify({ 
        status: 'unknown',
        error: 'Failed to authenticate with AppyPay'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    logStep('Token obtained, checking transaction status');

    // Check transaction status
    const statusResponse = await fetch(
      `https://gwy-api.appypay.co.ao/v2.0/transactions/${transactionId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!statusResponse.ok) {
      logStep('Status check failed', { status: statusResponse.status });
      return new Response(JSON.stringify({ 
        status: 'pending',
        error: 'Failed to check transaction status'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const statusData = await statusResponse.json();
    
    logStep('Status received', { 
      status: statusData.responseStatus?.status,
      successful: statusData.responseStatus?.successful 
    });

    const status = statusData.responseStatus?.status || 'pending';

    return new Response(JSON.stringify({ 
      status: status,
      successful: statusData.responseStatus?.successful,
      transactionId: statusData.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logStep('ERROR', { message: error instanceof Error ? error.message : 'Unknown error' });
    
    return new Response(JSON.stringify({ 
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
