import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { Resend } from 'npm:resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MissingAccessOrder {
  order_id: string;
  customer_email: string;
  customer_name: string;
  product_id: string;
  product_name: string;
  product_type: string;
  share_link: string;
  seller_email: string;
  seller_name: string;
  created_at: string;
}

serve(async (req) => {
  console.log('🔄 [RESEND-ACCESS] Starting resend process');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar todos os pedidos completados
    const { data: allCompletedOrders, error: fetchError } = await supabase
      .from('orders')
      .select(`
        order_id,
        customer_email,
        customer_name,
        product_id,
        created_at,
        products!inner(
          name,
          type,
          share_link,
          user_id,
          profiles!inner(
            email,
            full_name
          )
        )
      `)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ [RESEND-ACCESS] Error fetching orders:', fetchError);
      throw fetchError;
    }

    console.log(`📦 [RESEND-ACCESS] Found ${allCompletedOrders?.length || 0} completed orders`);

    // Filtrar pedidos que NÃO têm customer_access
    const missingAccessOrders = [];
    
    for (const order of allCompletedOrders || []) {
      const { data: existingAccess } = await supabase
        .from('customer_access')
        .select('id')
        .eq('customer_email', order.customer_email.toLowerCase().trim())
        .eq('product_id', order.product_id)
        .single();
      
      if (!existingAccess) {
        missingAccessOrders.push(order);
      }
    }

    console.log(`📦 [RESEND-ACCESS] Found ${missingAccessOrders.length} orders without access`);

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    for (const order of missingAccessOrders || []) {
      try {
        const product = order.products as any;
        const seller = product.profiles;

        // 1. Criar registro de customer_access
        const { error: accessError } = await supabase
          .from('customer_access')
          .insert({
            customer_email: order.customer_email.toLowerCase().trim(),
            customer_name: order.customer_name,
            product_id: order.product_id,
            order_id: order.order_id,
            is_active: true,
            access_granted_at: new Date().toISOString(),
            access_expires_at: null, // Acesso vitalício
          });

        if (accessError && accessError.code !== '23505') { // Ignorar duplicatas
          console.error(`❌ [RESEND-ACCESS] Error creating access for ${order.customer_email}:`, accessError);
          errors.push({ email: order.customer_email, error: accessError.message });
          errorCount++;
          continue;
        }

        // 2. Enviar email de acesso
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
                          🎉 Seu Acesso Está Pronto!
                        </h1>
                        <p style="color: #ffffff; margin: 10px 0 0; font-size: 16px; opacity: 0.9;">
                          Obrigado pela sua compra, ${order.customer_name}!
                        </p>
                      </td>
                    </tr>

                    <!-- Product Info -->
                    <tr>
                      <td style="padding: 30px;">
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                          <h2 style="color: #333; margin: 0 0 10px; font-size: 20px;">
                            ${product.name}
                          </h2>
                          <p style="color: #666; margin: 0; font-size: 14px;">
                            Pedido: <strong>${order.order_id}</strong>
                          </p>
                        </div>

                        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                          Seu acesso ao <strong>${product.name}</strong> foi confirmado! 
                          ${product.type === 'E-book' || product.type === 'Ebook' 
                            ? 'Clique no botão abaixo para fazer o download do seu ebook:' 
                            : 'Clique no botão abaixo para acessar:'}
                        </p>

                        <!-- CTA Button -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding: 20px 0;">
                              <a href="${product.share_link}" 
                                 style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                                ${product.type === 'E-book' || product.type === 'Ebook' ? '📥 Baixar E-book' : '🚀 Acessar Agora'}
                              </a>
                            </td>
                          </tr>
                        </table>

                        <!-- Access Link -->
                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 20px;">
                          <p style="color: #666; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                            Link de acesso direto:
                          </p>
                          <p style="margin: 0;">
                            <a href="${product.share_link}" 
                               style="color: #667eea; word-break: break-all; font-size: 13px; text-decoration: none;">
                              ${product.share_link}
                            </a>
                          </p>
                        </div>

                        <!-- Support Info -->
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                          <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
                            <strong>Precisa de ajuda?</strong><br>
                            Entre em contato com o vendedor: 
                            <a href="mailto:${seller.email}" style="color: #667eea; text-decoration: none;">
                              ${seller.email}
                            </a>
                          </p>
                        </div>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                        <p style="color: #999; font-size: 12px; margin: 0;">
                          Este email foi enviado pela plataforma Kambafy<br>
                          Você está recebendo porque completou uma compra
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        const { error: emailError } = await resend.emails.send({
          from: 'Kambafy <noreply@kambafy.com>',
          to: [order.customer_email],
          subject: `✅ Seu acesso ao ${product.name} está pronto!`,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`❌ [RESEND-ACCESS] Error sending email to ${order.customer_email}:`, emailError);
          errors.push({ email: order.customer_email, error: emailError.message });
          errorCount++;
        } else {
          console.log(`✅ [RESEND-ACCESS] Access granted and email sent to ${order.customer_email}`);
          successCount++;
        }

        // Delay para não sobrecarregar Resend
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err: any) {
        console.error(`❌ [RESEND-ACCESS] Error processing order ${order.order_id}:`, err);
        errors.push({ email: order.customer_email, error: err.message });
        errorCount++;
      }
    }

    const summary = {
      success: true,
      total_orders: missingAccessOrders?.length || 0,
      emails_sent: successCount,
      errors: errorCount,
      error_details: errors,
      message: `Processamento concluído: ${successCount} emails enviados, ${errorCount} erros`
    };

    console.log('📊 [RESEND-ACCESS] Summary:', summary);

    return new Response(
      JSON.stringify(summary),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('💥 [RESEND-ACCESS] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
