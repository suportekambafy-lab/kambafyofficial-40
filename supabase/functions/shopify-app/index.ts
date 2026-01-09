import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-shop-domain, x-shopify-topic',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Shopify App credentials (set in environment)
const SHOPIFY_API_KEY = Deno.env.get('SHOPIFY_API_KEY') || '';
const SHOPIFY_API_SECRET = Deno.env.get('SHOPIFY_API_SECRET') || '';
const APP_URL = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.functions.supabase.co') || '';

interface ShopifyOrder {
  id: number;
  order_number: number;
  email: string;
  total_price: string;
  currency: string;
  customer?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
  line_items: Array<{
    title: string;
    quantity: number;
    price: string;
  }>;
}

// Verify Shopify webhook HMAC
async function verifyShopifyHmac(body: string, hmac: string): Promise<boolean> {
  if (!SHOPIFY_API_SECRET || !hmac) return false;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SHOPIFY_API_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const computedHmac = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  return computedHmac === hmac;
}

// Generate payment page HTML
function generatePaymentPage(order: any, shopDomain: string, settings: any): string {
  const paymentMethods = settings?.payment_methods || { express: true, reference: true, card: true };
  
  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pagamento - Kambafy Pay</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .container { background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); max-width: 480px; width: 100%; padding: 32px; }
    .logo { text-align: center; margin-bottom: 24px; }
    .logo img { height: 40px; }
    .logo h1 { font-size: 24px; color: #1a1a1a; margin-top: 8px; }
    .order-info { background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .order-info h2 { font-size: 14px; color: #666; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .order-info .amount { font-size: 32px; font-weight: 700; color: #1a1a1a; }
    .order-info .currency { font-size: 16px; color: #666; }
    .order-info .order-number { font-size: 14px; color: #888; margin-top: 8px; }
    .payment-methods { display: flex; flex-direction: column; gap: 12px; }
    .payment-method { display: flex; align-items: center; gap: 16px; padding: 16px 20px; border: 2px solid #e5e5e5; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
    .payment-method:hover { border-color: #007bff; background: #f0f7ff; }
    .payment-method.selected { border-color: #007bff; background: #e6f0ff; }
    .payment-method .icon { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: #f0f0f0; border-radius: 10px; font-size: 24px; }
    .payment-method .info h3 { font-size: 16px; font-weight: 600; color: #1a1a1a; }
    .payment-method .info p { font-size: 13px; color: #666; margin-top: 2px; }
    .btn { width: 100%; padding: 16px; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 24px; transition: all 0.2s; }
    .btn-primary { background: #007bff; color: white; }
    .btn-primary:hover { background: #0056b3; }
    .btn-primary:disabled { background: #ccc; cursor: not-allowed; }
    .phone-input { margin-top: 16px; display: none; }
    .phone-input.visible { display: block; }
    .phone-input input { width: 100%; padding: 14px 16px; border: 2px solid #e5e5e5; border-radius: 10px; font-size: 16px; }
    .phone-input input:focus { outline: none; border-color: #007bff; }
    .secure-badge { text-align: center; margin-top: 20px; font-size: 12px; color: #888; }
    .secure-badge span { color: #28a745; }
    .loading { display: none; }
    .loading.visible { display: flex; align-items: center; justify-content: center; gap: 8px; }
    .spinner { width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .result { display: none; text-align: center; padding: 40px 20px; }
    .result.visible { display: block; }
    .result.success h2 { color: #28a745; }
    .result.error h2 { color: #dc3545; }
    .result p { margin-top: 12px; color: #666; }
    .reference-box { background: #fff3cd; border-radius: 12px; padding: 20px; margin-top: 20px; text-align: center; }
    .reference-box h3 { font-size: 14px; color: #856404; margin-bottom: 12px; }
    .reference-box .ref-value { font-size: 24px; font-weight: 700; font-family: monospace; color: #1a1a1a; letter-spacing: 2px; }
    .reference-box .entity { font-size: 14px; color: #666; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>💳 Kambafy Pay</h1>
    </div>
    
    <div id="payment-form">
      <div class="order-info">
        <h2>Total a Pagar</h2>
        <div class="amount">${parseFloat(order.amount).toLocaleString('pt-AO')} <span class="currency">${order.currency}</span></div>
        <div class="order-number">Pedido #${order.shopify_order_number || order.shopify_order_id}</div>
      </div>
      
      <div class="payment-methods">
        ${paymentMethods.express ? `
        <div class="payment-method" data-method="express" onclick="selectMethod('express')">
          <div class="icon">📱</div>
          <div class="info">
            <h3>Multicaixa Express</h3>
            <p>Pague com notificação push no telemóvel</p>
          </div>
        </div>
        ` : ''}
        
        ${paymentMethods.reference ? `
        <div class="payment-method" data-method="reference" onclick="selectMethod('reference')">
          <div class="icon">🏦</div>
          <div class="info">
            <h3>Referência Multicaixa</h3>
            <p>Pague no ATM ou Internet Banking</p>
          </div>
        </div>
        ` : ''}
        
        ${paymentMethods.card ? `
        <div class="payment-method" data-method="card" onclick="selectMethod('card')">
          <div class="icon">💳</div>
          <div class="info">
            <h3>Cartão de Crédito/Débito</h3>
            <p>Visa, Mastercard, etc.</p>
          </div>
        </div>
        ` : ''}
      </div>
      
      <div class="phone-input" id="phone-input">
        <input type="tel" id="phone" placeholder="Número de telefone (ex: 923456789)" pattern="[0-9]{9}">
      </div>
      
      <button class="btn btn-primary" id="pay-btn" onclick="processPayment()" disabled>
        <span id="btn-text">Selecione um método de pagamento</span>
        <div class="loading" id="loading">
          <div class="spinner"></div>
          <span>Processando...</span>
        </div>
      </button>
      
      <div class="secure-badge">
        🔒 <span>Pagamento seguro</span> processado pela Kambafy
      </div>
    </div>
    
    <div class="result" id="result-success">
      <h2>✅ Pagamento Confirmado!</h2>
      <p>O seu pagamento foi processado com sucesso.</p>
      <button class="btn btn-primary" onclick="window.location.href='${order.success_url || '/'}'">Continuar</button>
    </div>
    
    <div class="result" id="result-reference">
      <h2>📋 Referência Gerada</h2>
      <p>Use os dados abaixo para pagar no ATM ou Internet Banking:</p>
      <div class="reference-box">
        <h3>Entidade</h3>
        <div class="ref-value" id="ref-entity">---</div>
        <h3 style="margin-top: 16px;">Referência</h3>
        <div class="ref-value" id="ref-number">---</div>
        <div class="entity">Valor: ${parseFloat(order.amount).toLocaleString('pt-AO')} ${order.currency}</div>
      </div>
      <p style="margin-top: 16px; font-size: 13px;">A referência é válida por 72 horas.</p>
    </div>
    
    <div class="result error" id="result-error">
      <h2>❌ Erro no Pagamento</h2>
      <p id="error-message">Ocorreu um erro ao processar o pagamento.</p>
      <button class="btn btn-primary" onclick="location.reload()">Tentar Novamente</button>
    </div>
  </div>
  
  <script>
    let selectedMethod = null;
    const orderId = '${order.id}';
    const shopDomain = '${shopDomain}';
    
    function selectMethod(method) {
      selectedMethod = method;
      document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('selected'));
      document.querySelector('[data-method="' + method + '"]').classList.add('selected');
      
      const phoneInput = document.getElementById('phone-input');
      const btn = document.getElementById('pay-btn');
      const btnText = document.getElementById('btn-text');
      
      if (method === 'express') {
        phoneInput.classList.add('visible');
        btnText.textContent = 'Enviar Notificação';
      } else if (method === 'reference') {
        phoneInput.classList.remove('visible');
        btnText.textContent = 'Gerar Referência';
      } else if (method === 'card') {
        phoneInput.classList.remove('visible');
        btnText.textContent = 'Pagar com Cartão';
      }
      
      btn.disabled = false;
    }
    
    async function processPayment() {
      if (!selectedMethod) return;
      
      const btn = document.getElementById('pay-btn');
      const btnText = document.getElementById('btn-text');
      const loading = document.getElementById('loading');
      
      if (selectedMethod === 'express') {
        const phone = document.getElementById('phone').value;
        if (!phone || phone.length < 9) {
          alert('Por favor, insira um número de telefone válido.');
          return;
        }
      }
      
      btn.disabled = true;
      btnText.style.display = 'none';
      loading.classList.add('visible');
      
      try {
        const body = {
          orderId,
          method: selectedMethod,
          phone: selectedMethod === 'express' ? document.getElementById('phone').value : undefined
        };
        
        const response = await fetch(window.location.origin + '/shopify-app/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Erro ao processar pagamento');
        }
        
        document.getElementById('payment-form').style.display = 'none';
        
        if (selectedMethod === 'card' && result.redirectUrl) {
          window.location.href = result.redirectUrl;
        } else if (selectedMethod === 'reference' && result.reference) {
          document.getElementById('ref-entity').textContent = result.entity || '---';
          document.getElementById('ref-number').textContent = result.reference || '---';
          document.getElementById('result-reference').classList.add('visible');
        } else if (selectedMethod === 'express') {
          document.getElementById('result-success').querySelector('h2').textContent = '📱 Notificação Enviada!';
          document.getElementById('result-success').querySelector('p').textContent = 'Verifique o seu telemóvel para confirmar o pagamento.';
          document.getElementById('result-success').classList.add('visible');
          // Poll for payment status
          pollPaymentStatus();
        } else {
          document.getElementById('result-success').classList.add('visible');
        }
      } catch (error) {
        document.getElementById('payment-form').style.display = 'none';
        document.getElementById('error-message').textContent = error.message;
        document.getElementById('result-error').classList.add('visible');
      }
    }
    
    async function pollPaymentStatus() {
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes with 5s interval
      
      const check = async () => {
        try {
          const response = await fetch(window.location.origin + '/shopify-app/status/' + orderId);
          const result = await response.json();
          
          if (result.status === 'paid') {
            document.getElementById('result-success').querySelector('h2').textContent = '✅ Pagamento Confirmado!';
            document.getElementById('result-success').querySelector('p').textContent = 'O seu pagamento foi processado com sucesso.';
            return;
          }
          
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(check, 5000);
          }
        } catch (e) {
          console.error('Error checking status:', e);
        }
      };
      
      setTimeout(check, 5000);
    }
  </script>
</body>
</html>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/shopify-app', '');
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // OAuth Install endpoint
    if (path === '/install' && req.method === 'GET') {
      const shop = url.searchParams.get('shop');
      if (!shop) {
        return new Response(JSON.stringify({ error: 'Missing shop parameter' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const scopes = 'read_orders,write_orders,read_customers';
      const redirectUri = `${APP_URL}/shopify-app/oauth/callback`;
      const nonce = crypto.randomUUID();
      
      // Store nonce for verification
      await supabase.from('shopify_stores').upsert({
        shop_domain: shop,
        settings: { oauth_nonce: nonce }
      }, { onConflict: 'shop_domain' });

      const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${nonce}`;
      
      return Response.redirect(authUrl, 302);
    }

    // OAuth Callback endpoint
    if (path === '/oauth/callback' && req.method === 'GET') {
      const shop = url.searchParams.get('shop');
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      
      if (!shop || !code) {
        return new Response('Missing parameters', { status: 400 });
      }

      // Verify state/nonce
      const { data: storeData } = await supabase
        .from('shopify_stores')
        .select('settings')
        .eq('shop_domain', shop)
        .single();

      if (storeData?.settings?.oauth_nonce !== state) {
        return new Response('Invalid state', { status: 403 });
      }

      // Exchange code for access token
      const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: SHOPIFY_API_KEY,
          client_secret: SHOPIFY_API_SECRET,
          code
        })
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        return new Response('Failed to get access token', { status: 400 });
      }

      // Save access token
      await supabase.from('shopify_stores').update({
        access_token: tokenData.access_token,
        scope: tokenData.scope,
        is_active: true,
        installed_at: new Date().toISOString(),
        settings: { 
          payment_methods: { express: true, reference: true, card: true },
          oauth_nonce: null 
        }
      }).eq('shop_domain', shop);

      // Register webhooks
      const webhooks = ['orders/create', 'orders/paid', 'app/uninstalled'];
      for (const topic of webhooks) {
        await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': tokenData.access_token
          },
          body: JSON.stringify({
            webhook: {
              topic,
              address: `${APP_URL}/shopify-app/webhooks`,
              format: 'json'
            }
          })
        });
      }

      // Redirect to config page
      return Response.redirect(`${Deno.env.get('PUBLIC_APP_URL') || 'https://kambafy.com'}/seller/shopify-config?shop=${shop}`, 302);
    }

    // Webhook handler
    if (path === '/webhooks' && req.method === 'POST') {
      const hmac = req.headers.get('x-shopify-hmac-sha256') || '';
      const shopDomain = req.headers.get('x-shopify-shop-domain') || '';
      const topic = req.headers.get('x-shopify-topic') || '';
      
      const body = await req.text();
      
      // Verify HMAC
      if (!await verifyShopifyHmac(body, hmac)) {
        console.error('Invalid HMAC signature');
        return new Response('Unauthorized', { status: 401 });
      }

      const data = JSON.parse(body);

      if (topic === 'orders/create') {
        const order: ShopifyOrder = data;
        
        // Create order record
        await supabase.from('shopify_orders').upsert({
          shop_domain: shopDomain,
          shopify_order_id: String(order.id),
          shopify_order_number: String(order.order_number),
          amount: parseFloat(order.total_price),
          currency: order.currency === 'USD' ? 'USD' : 'AOA',
          status: 'pending',
          customer_email: order.email,
          customer_name: order.customer ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() : '',
          customer_phone: order.customer?.phone,
          metadata: { line_items: order.line_items }
        }, { onConflict: 'shop_domain,shopify_order_id' });

        console.log(`Order ${order.order_number} created for ${shopDomain}`);
      } 
      else if (topic === 'orders/paid') {
        // Update order status
        await supabase.from('shopify_orders')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('shop_domain', shopDomain)
          .eq('shopify_order_id', String(data.id));
      }
      else if (topic === 'app/uninstalled') {
        // Mark store as uninstalled
        await supabase.from('shopify_stores')
          .update({ 
            is_active: false, 
            uninstalled_at: new Date().toISOString(),
            access_token: null 
          })
          .eq('shop_domain', shopDomain);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Payment page
    if (path.startsWith('/pay/') && req.method === 'GET') {
      const orderId = path.replace('/pay/', '');
      
      const { data: order, error } = await supabase
        .from('shopify_orders')
        .select('*, shopify_stores!inner(*)')
        .eq('id', orderId)
        .single();

      if (error || !order) {
        return new Response('Order not found', { status: 404 });
      }

      if (order.status === 'paid') {
        return new Response(`
          <html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
            <div style="text-align:center;">
              <h1>✅ Este pedido já foi pago!</h1>
              <p>Obrigado pela sua compra.</p>
            </div>
          </body></html>
        `, {
          headers: { 'Content-Type': 'text/html' }
        });
      }

      const html = generatePaymentPage(order, order.shop_domain, order.shopify_stores?.settings);
      
      return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Process payment
    if (path === '/process' && req.method === 'POST') {
      const { orderId, method, phone } = await req.json();
      
      const { data: order, error } = await supabase
        .from('shopify_orders')
        .select('*, shopify_stores!inner(*)')
        .eq('id', orderId)
        .single();

      if (error || !order) {
        return new Response(JSON.stringify({ error: 'Order not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const store = order.shopify_stores;
      if (!store.kambafy_api_key) {
        return new Response(JSON.stringify({ error: 'Store not configured' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Call Kambafy Payments API
      const kambaPayUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/kambafy-payments-api`;
      
      let endpoint = '';
      let paymentBody: any = {
        email: order.customer_email,
        amount: order.amount,
        currency: order.currency,
        orderId: order.id,
        customerName: order.customer_name,
        customerPhone: phone || order.customer_phone,
        metadata: { 
          shopify_order_id: order.shopify_order_id,
          shopify_order_number: order.shopify_order_number,
          shop_domain: order.shop_domain
        }
      };

      if (method === 'express') {
        endpoint = '/payments/express';
        paymentBody.phone = phone || order.customer_phone;
      } else if (method === 'reference') {
        endpoint = '/payments/reference';
      } else if (method === 'card') {
        endpoint = '/payments/card';
        paymentBody.successUrl = `${APP_URL}/shopify-app/callback?orderId=${orderId}&status=success`;
        paymentBody.cancelUrl = `${APP_URL}/shopify-app/pay/${orderId}`;
      }

      const paymentResponse = await fetch(`${kambaPayUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': store.kambafy_api_key
        },
        body: JSON.stringify(paymentBody)
      });

      const paymentResult = await paymentResponse.json();

      if (!paymentResponse.ok) {
        return new Response(JSON.stringify({ error: paymentResult.error || 'Payment failed' }), {
          status: paymentResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Update order with payment method
      await supabase.from('shopify_orders')
        .update({ 
          payment_method: method,
          kambafy_payment_id: paymentResult.paymentId 
        })
        .eq('id', orderId);

      return new Response(JSON.stringify(paymentResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Payment callback (for card payments)
    if (path === '/callback' && req.method === 'GET') {
      const orderId = url.searchParams.get('orderId');
      const status = url.searchParams.get('status');
      
      if (!orderId) {
        return new Response('Missing orderId', { status: 400 });
      }

      const { data: order } = await supabase
        .from('shopify_orders')
        .select('*, shopify_stores!inner(*)')
        .eq('id', orderId)
        .single();

      if (!order) {
        return new Response('Order not found', { status: 404 });
      }

      if (status === 'success') {
        // Mark order as paid
        await supabase.from('shopify_orders')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', orderId);

        // Update Shopify order
        if (order.shopify_stores?.access_token) {
          await fetch(`https://${order.shop_domain}/admin/api/2024-01/orders/${order.shopify_order_id}.json`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': order.shopify_stores.access_token
            },
            body: JSON.stringify({
              order: {
                id: parseInt(order.shopify_order_id),
                financial_status: 'paid',
                note: 'Paid via Kambafy Pay'
              }
            })
          });
        }

        return new Response(`
          <html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
            <div style="text-align:center;">
              <h1>✅ Pagamento Confirmado!</h1>
              <p>O seu pagamento foi processado com sucesso.</p>
              <p>Será redirecionado em breve...</p>
              <script>setTimeout(() => window.close(), 3000);</script>
            </div>
          </body></html>
        `, {
          headers: { 'Content-Type': 'text/html' }
        });
      }

      return Response.redirect(`${APP_URL}/shopify-app/pay/${orderId}`, 302);
    }

    // Check payment status
    if (path.startsWith('/status/') && req.method === 'GET') {
      const orderId = path.replace('/status/', '');
      
      const { data: order } = await supabase
        .from('shopify_orders')
        .select('status, paid_at')
        .eq('id', orderId)
        .single();

      return new Response(JSON.stringify(order || { status: 'unknown' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get store config
    if (path === '/config' && req.method === 'GET') {
      const shopDomain = url.searchParams.get('shop');
      
      if (!shopDomain) {
        return new Response(JSON.stringify({ error: 'Missing shop parameter' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: store } = await supabase
        .from('shopify_stores')
        .select('shop_domain, settings, is_active, installed_at, kambafy_api_key')
        .eq('shop_domain', shopDomain)
        .single();

      return new Response(JSON.stringify({ 
        store: store ? {
          ...store,
          kambafy_api_key: store.kambafy_api_key ? '****' + store.kambafy_api_key.slice(-4) : null
        } : null 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update store config
    if (path === '/config' && req.method === 'POST') {
      const { shopDomain, kambafyApiKey, settings } = await req.json();
      
      if (!shopDomain) {
        return new Response(JSON.stringify({ error: 'Missing shop domain' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const updateData: any = {};
      if (kambafyApiKey) updateData.kambafy_api_key = kambafyApiKey;
      if (settings) updateData.settings = settings;

      const { error } = await supabase
        .from('shopify_stores')
        .update(updateData)
        .eq('shop_domain', shopDomain);

      if (error) {
        return new Response(JSON.stringify({ error: 'Failed to update config' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate payment link for manual orders
    if (path === '/generate-link' && req.method === 'POST') {
      const { shopDomain, shopifyOrderId, amount, currency, customerEmail, customerName, customerPhone } = await req.json();
      
      // Get store
      const { data: store } = await supabase
        .from('shopify_stores')
        .select('*')
        .eq('shop_domain', shopDomain)
        .single();

      if (!store || !store.is_active) {
        return new Response(JSON.stringify({ error: 'Store not found or inactive' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Create or update order
      const { data: order, error } = await supabase
        .from('shopify_orders')
        .upsert({
          shop_domain: shopDomain,
          shopify_order_id: shopifyOrderId,
          amount,
          currency: currency || 'AOA',
          customer_email: customerEmail,
          customer_name: customerName,
          customer_phone: customerPhone,
          status: 'pending'
        }, { onConflict: 'shop_domain,shopify_order_id' })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: 'Failed to create order' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const paymentUrl = `${APP_URL}/shopify-app/pay/${order.id}`;

      return new Response(JSON.stringify({ 
        success: true,
        paymentUrl,
        orderId: order.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Shopify App error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});