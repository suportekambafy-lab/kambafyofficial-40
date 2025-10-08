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
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 30px; text-align: center; border-bottom: 2px solid #f0f0f0;">
                        <h1 style="color: #333333; margin: 0; font-size: 24px; font-weight: 600;">
                          Seu Acesso Está Pronto
                        </h1>
                        <p style="color: #666666; margin: 10px 0 0; font-size: 15px;">
                          Olá, ${order.customer_name}
                        </p>
                      </td>
                    </tr>

                    <!-- Product Info -->
                    <tr>
                      <td style="padding: 30px;">
                        <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                          Obrigado pela sua compra de <strong>${product.name}</strong>.
                        </p>

                        <p style="color: #666666; font-size: 14px; line-height: 1.5; margin: 0 0 25px;">
                          ${product.type === 'E-book' || product.type === 'Ebook' 
                            ? 'Seu ebook já está disponível para download.' 
                            : 'Seu acesso já está liberado.'}
                        </p>

                        <!-- CTA Button -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding: 10px 0 25px 0;">
                              <a href="${product.share_link}" 
                                 style="display: inline-block; padding: 14px 35px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 500; font-size: 15px;">
                                ${product.type === 'E-book' || product.type === 'Ebook' ? 'Baixar E-book' : 'Acessar Agora'}
                              </a>
                            </td>
                          </tr>
                        </table>

                        <!-- Access Link -->
                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; border: 1px solid #e0e0e0;">
                          <p style="color: #666666; font-size: 12px; margin: 0 0 8px; font-weight: 500;">
                            Link de acesso direto:
                          </p>
                          <p style="margin: 0;">
                            <a href="${product.share_link}" 
                               style="color: #0066cc; word-break: break-all; font-size: 13px; text-decoration: underline;">
                              ${product.share_link}
                            </a>
                          </p>
                        </div>

                        <p style="color: #999999; font-size: 13px; margin: 20px 0 0; line-height: 1.5;">
                          Pedido: ${order.order_id}
                        </p>
                      </td>
                    </tr>

                    <!-- Contact Info -->
                    <tr>
                      <td style="padding: 30px; border-top: 1px solid #e0e0e0;">
                        <h3 style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #333333;">📧 Informações de Contato</h3>
                        <p style="margin: 0 0 15px; color: #666666; font-size: 14px;">
                          <strong>Vendedor:</strong> ${seller.full_name}
                        </p>
                        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border-left: 3px solid #0066cc;">
                          <p style="margin: 0 0 12px; color: #666666; font-size: 14px;">
                            <strong>📧 Contato do Vendedor:</strong><br>
                            <a href="mailto:${seller.email}" style="color: #0066cc; text-decoration: none;">${seller.email}</a>
                          </p>
                          <p style="margin: 0; color: #666666; font-size: 14px;">
                            <strong>🏢 Suporte Kambafy:</strong><br>
                            <a href="mailto:suporte@kambafy.com" style="color: #0066cc; text-decoration: none;">suporte@kambafy.com</a>
                          </p>
                        </div>
                        <p style="margin: 15px 0 0; color: #999999; font-size: 13px; font-style: italic;">
                          💡 Para dúvidas sobre o produto, contacte o vendedor. Para questões técnicas da plataforma, contacte o suporte Kambafy.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                        <p style="color: #999999; font-size: 12px; margin: 0;">
                          Kambafy – Plataforma de Vendas Digitais
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
          from: seller?.full_name 
            ? `${seller.full_name} via Kambafy <noreply@kambafy.com>`
            : 'Kambafy <noreply@kambafy.com>',
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
