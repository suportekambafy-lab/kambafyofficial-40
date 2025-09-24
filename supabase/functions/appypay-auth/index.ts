import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

// Cache para armazenar token e seu tempo de expiração
let tokenCache: {
  token: string;
  expiresAt: number;
} | null = null;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[APPYPAY-AUTH] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Função de autenticação AppyPay iniciada");

    // Verificar se temos um token válido em cache
    if (tokenCache && tokenCache.expiresAt > Date.now()) {
      logStep("Token válido encontrado no cache");
      return new Response(JSON.stringify({ 
        access_token: tokenCache.token,
        cached: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logStep("Token não encontrado ou expirado, solicitando novo token");

    // Obter credenciais das variáveis de ambiente
    const clientId = Deno.env.get('APPYPAY_CLIENT_ID');
    const clientSecret = Deno.env.get('APPYPAY_CLIENT_SECRET');
    const authBaseUrl = Deno.env.get('APPYPAY_AUTH_BASE_URL');
    // Para OAuth2 v2.0, usar o Application ID URI configurado ou fallback para api://client_id
    const applicationIdUri = Deno.env.get('APPYPAY_APPLICATION_ID_URI') || `api://${clientId}`;

    if (!clientId || !clientSecret || !authBaseUrl) {
      throw new Error('Credenciais AppyPay não configuradas');
    }

    logStep("Credenciais AppyPay carregadas", { 
      clientId: clientId.substring(0, 8) + "...",
      authBaseUrl 
    });

    // Preparar dados para solicitação do token
    // O authBaseUrl já inclui o path completo para o token endpoint
    const tokenUrl = authBaseUrl;
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    // OAuth2 v2.0 uses 'scope' instead of 'resource'
    formData.append('scope', `${applicationIdUri}/.default`);

    logStep("Solicitando token OAuth2", { tokenUrl });

    // Fazer solicitação para obter o token
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Erro na solicitação do token", { 
        status: response.status, 
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Erro ao obter token: ${response.status} - ${errorText}`);
    }

    const tokenData: TokenResponse = await response.json();
    logStep("Token recebido com sucesso", { 
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in 
    });

    // Armazenar token no cache (com margem de segurança de 5 minutos)
    const expiresAt = Date.now() + ((tokenData.expires_in - 300) * 1000);
    tokenCache = {
      token: tokenData.access_token,
      expiresAt
    };

    logStep("Token armazenado no cache", { expiresAt: new Date(expiresAt).toISOString() });

    return new Response(JSON.stringify({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      cached: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logStep("Erro na função de autenticação", { error: error.message });
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Erro ao autenticar com AppyPay'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});