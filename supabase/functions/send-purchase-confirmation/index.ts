import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PurchaseConfirmationRequest {
  customerName: string;
  customerEmail: string;
  productName: string;
  orderId: string;
  amount: string;
  currency: string;
  productId: string;
  shareLink?: string;
  memberAreaId?: string;
  sellerId: string; // ID do vendedor
  orderBump?: {
    bump_product_name: string;
    bump_product_price: string;
    bump_product_image?: string;
    discount: number;
    discounted_price: number;
  };
  baseProductPrice?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      customerName, 
      customerEmail, 
      productName, 
      orderId, 
      amount, 
      currency,
      productId,
      shareLink,
      memberAreaId,
      sellerId,
      orderBump,
      baseProductPrice
    }: PurchaseConfirmationRequest = await req.json();

    console.log('=== PURCHASE CONFIRMATION START ===');
    console.log('Request data:', {
      customerName,
      customerEmail,
      productName,
      orderId,
      amount,
      currency,
      productId,
      shareLink,
      memberAreaId,
      sellerId,
      orderBump,
      baseProductPrice
    });

    // Validate required fields
    if (!customerEmail || !customerName || !productName || !orderId) {
      throw new Error('Missing required fields: customerEmail, customerName, productName, or orderId');
    }

    // Create Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('=== FETCHING SELLER AND PRODUCT DATA ===');
    
    let sellerProfile = null;
    let productData = null;

    if (sellerId) {
      const { data: profile, error: sellerError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', sellerId)
        .single();

      if (!sellerError && profile) {
        sellerProfile = profile;
      }
    }

    if (productId) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('sales, type')
        .eq('id', productId)
        .single();

      if (!productError && product) {
        productData = product;
        console.log('Product type detected:', product.type);
      }
    }

    const currentSales = productData?.sales || 0;
    const newSalesCount = currentSales + 1;
    const isFirstSale = currentSales === 0;

    // Get member area URL if it's a course
    let memberAreaUrl = null;
    if (memberAreaId) {
      const { data: memberAreaData, error: memberAreaError } = await supabase
        .from('member_areas')
        .select('url')
        .eq('id', memberAreaId)
        .single();

      if (!memberAreaError && memberAreaData) {
        memberAreaUrl = `https://app.kambafy.com/member/${memberAreaData.url}`;
      }
    }

    // Create access link
    let accessInfo = '';
    const productType = productData?.type;
    
    console.log('=== CREATING ACCESS INFO ===');
    console.log('Product type:', productType);
    
    // Para produtos do tipo "Link de Pagamento", não incluir informações de acesso
    if (productType === 'Link de Pagamento') {
      console.log('Product is Payment Link - skipping access info');
      accessInfo = '';
    } else if (memberAreaId && memberAreaUrl) {
      console.log('Product has member area - adding course access');
      accessInfo = `
        <div style="background-color: #16a34a; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: white; margin: 0 0 10px 0;">🎓 Acesso ao Curso Liberado!</h3>
          <p style="margin: 0; color: white;">Seu acesso ao curso foi liberado automaticamente. Acesse através do link:</p>
          <a href="${memberAreaUrl}" 
             style="display: inline-block; background-color: white; color: #16a34a; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px; font-weight: bold;">
            Acessar Curso
          </a>
        </div>
      `;
    } else if (shareLink && productType !== 'Link de Pagamento') {
      console.log('Product has share link (not payment link) - adding product access');
      accessInfo = `
        <div style="background-color: #16a34a; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: white; margin: 0 0 10px 0;">📱 Acesso ao Produto</h3>
          <p style="margin: 0; color: white;">Acesse seu produto através do link:</p>
          <a href="${shareLink}" 
             style="display: inline-block; background-color: white; color: #16a34a; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px; font-weight: bold;">
            Acessar Produto
          </a>
        </div>
      `;
    }

    // Create order bump section for email
    let orderBumpSection = '';
    if (orderBump) {
      orderBumpSection = `
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="color: #92400e; margin: 0 0 15px 0;">🎁 Produto Extra Adicionado</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #92400e;">Produto Extra:</td>
              <td style="padding: 8px 0; color: #92400e;">${orderBump.bump_product_name}</td>
            </tr>
            ${orderBump.discount > 0 ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #92400e;">Desconto Aplicado:</td>
              <td style="padding: 8px 0; color: #92400e;">
                <span style="text-decoration: line-through;">${orderBump.bump_product_price}</span>
                <span style="background-color: #dc2626; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-left: 8px;">
                  -${orderBump.discount}% OFF
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #92400e;">Preço com Desconto:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #15803d;">+${orderBump.discounted_price.toFixed(0)} ${currency}</td>
            </tr>
            ` : `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #92400e;">Preço:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #15803d;">+${orderBump.bump_product_price}</td>
            </tr>
            `}
          </table>
        </div>
      `;
    }

    // Criar email diferente para produtos do tipo "Link de Pagamento"  
    let customerEmailHtml = '';
    
    if (productType === 'Link de Pagamento') {
      // Email simples para Link de Pagamento
      customerEmailHtml = `
        <html>
        <head>
          <meta charset="utf-8">
          <title>Confirmação de Compra - Kambafy</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #16a34a; color: white; width: 60px; height: 60px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
              <span style="font-size: 24px; font-weight: bold;">K</span>
            </div>
            <div style="background-color: #16a34a; color: white; padding: 20px; border-radius: 8px;">
              <h1 style="margin: 0; font-size: 24px;">✅ Compra Confirmada!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">Obrigado pela sua compra, ${customerName}!</p>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <h2 style="color: #16a34a; margin: 0 0 15px 0;">Você comprou: ${productName}</h2>
            <p style="font-size: 18px; color: #666; margin: 0;">de ${sellerProfile?.full_name || 'Kambafy'}</p>
          </div>

          <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #16a34a; margin: 0 0 15px 0;">Detalhes do Pedido</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Número do Pedido:</td>
                <td style="padding: 8px 0;">${orderId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Valor Pago:</td>
                <td style="padding: 8px 0; font-size: 18px; color: #16a34a; font-weight: bold;">${amount} ${currency}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Data:</td>
                <td style="padding: 8px 0;">${new Date().toLocaleDateString('pt-BR')}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="color: #16a34a; margin: 0 0 15px 0;">💚 Muito obrigado por comprar com a Kambafy!</h3>
            <p style="margin: 0; color: #16a34a; font-size: 16px;">
              Sua confiança em nós é o que nos motiva a continuar oferecendo os melhores produtos digitais.
            </p>
          </div>

          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #856404; margin: 0 0 10px 0;">📞 Precisa de Ajuda?</h3>
            <p style="margin: 0; color: #856404;">
              Se tiver alguma dúvida, entre em contato conosco:
            </p>
            <p style="margin: 10px 0 0 0; color: #856404;">
              <strong>Email:</strong> suporte@kambafy.com<br>
              <strong>WhatsApp:</strong> (+244) 900 000 000
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="margin: 0; color: #666;">
              <strong>Kambafy</strong><br>
              Obrigado por confiar em nós!
            </p>
          </div>
        </body>
        </html>
      `;
    } else {
      // Email completo para Cursos e E-books (template original)
      customerEmailHtml = `
      <html>
      <head>
        <meta charset="utf-8">
        <title>Confirmação de Compra - Kambafy</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background-color: #16a34a; color: white; width: 60px; height: 60px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
            <span style="font-size: 24px; font-weight: bold;">K</span>
          </div>
          <div style="background-color: #16a34a; color: white; padding: 20px; border-radius: 8px;">
            <h1 style="margin: 0; font-size: 24px;">✅ Compra Confirmada!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">Obrigado pela sua compra, ${customerName}!</p>
          </div>
        </div>

        <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #16a34a; margin: 0 0 20px 0;">Detalhes do Pedido</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Número do Pedido:</td>
              <td style="padding: 8px 0;">${orderId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Produto Principal:</td>
              <td style="padding: 8px 0;">${productName}</td>
            </tr>
            ${baseProductPrice && baseProductPrice !== amount ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Preço do Produto:</td>
              <td style="padding: 8px 0;">${baseProductPrice} ${currency}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Valor Total Pago:</td>
              <td style="padding: 8px 0; font-size: 18px; color: #16a34a; font-weight: bold;">${amount} ${currency}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Data:</td>
              <td style="padding: 8px 0;">${new Date().toLocaleDateString('pt-BR')}</td>
            </tr>
          </table>
        </div>

        ${orderBumpSection}

        ${accessInfo}

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #856404; margin: 0 0 10px 0;">📞 Precisa de Ajuda?</h3>
          <p style="margin: 0; color: #856404;">
            Se tiver alguma dúvida ou problema para acessar seu produto, entre em contato conosco:
          </p>
          <p style="margin: 10px 0 0 0; color: #856404;">
            <strong>Email:</strong> suporte@kambafy.com<br>
            <strong>WhatsApp:</strong> (+244) 900 000 000
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="margin: 0; color: #666;">
            <strong>Kambafy</strong><br>
            Obrigado por confiar em nós!
          </p>
        </div>
      </body>
      </html>
    `;
    }

    console.log('=== SENDING CUSTOMER EMAIL ===');
    console.log('Using email template for product type:', productType);
    
    // Send confirmation email to customer
    const { data: customerEmailResponse, error: customerEmailError } = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: [customerEmail.trim()],
      subject: `Confirmação de Compra - ${productName} - Pedido #${orderId}`,
      html: customerEmailHtml,
    });

    if (customerEmailError) {
      console.error('Erro ao enviar email para cliente:', customerEmailError);
      throw new Error('Falha ao enviar email de confirmação para o cliente');
    }

    console.log("Customer email sent successfully:", customerEmailResponse);

    console.log('=== SENDING SELLER NOTIFICATION ===');
    
    let sellerEmailHtml = '';
    
    // Create seller notification email
    if (sellerProfile) {
      sellerEmailHtml = `
      <html>
      <head>
        <meta charset="utf-8">
        <title>Nova Venda - ${productName} - Kambafy</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background-color: #16a34a; color: white; width: 60px; height: 60px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
            <span style="font-size: 24px; font-weight: bold;">K</span>
          </div>
          <div style="background-color: #16a34a; color: white; padding: 20px; border-radius: 8px;">
            <h1 style="margin: 0; font-size: 24px;">🎉 Nova Venda Confirmada!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">Parabéns! Você vendeu mais um produto.</p>
          </div>
        </div>

        <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #16a34a; margin: 0 0 20px 0;">Detalhes da Venda</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Cliente:</td>
              <td style="padding: 8px 0;">${customerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Produto:</td>
              <td style="padding: 8px 0;">${productName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Valor:</td>
              <td style="padding: 8px 0; font-size: 18px; color: #16a34a; font-weight: bold;">${amount} ${currency}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Pedido:</td>
              <td style="padding: 8px 0;">#${orderId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Data:</td>
              <td style="padding: 8px 0;">${new Date().toLocaleDateString('pt-BR')}</td>
            </tr>
          </table>
        </div>

        ${isFirstSale ? `
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="color: #92400e; margin: 0 0 10px 0;">🎉 Primeira Venda!</h3>
          <p style="margin: 0; color: #92400e;">
            Parabéns pela sua primeira venda! Este é apenas o começo do seu sucesso.
          </p>
        </div>
        ` : `
        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #16a34a; margin: 0 0 10px 0;">📊 Total de Vendas</h3>
          <p style="margin: 0; color: #16a34a; font-size: 18px;">
            Este produto já tem <strong>${newSalesCount} vendas</strong>! Continue assim!
          </p>
        </div>
        `}

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="margin: 0; color: #666;">
            <strong>Kambafy</strong><br>
            Obrigado por vender conosco!
          </p>
        </div>
      </body>
      </html>
      `;

      // Send notification email to seller
      const { data: sellerEmailResponse, error: sellerEmailError } = await resend.emails.send({
        from: "Kambafy <noreply@kambafy.com>",
        to: [sellerProfile.email],
        subject: `🎉 Nova Venda: ${productName} - Pedido #${orderId}`,
        html: sellerEmailHtml,
      });

      if (sellerEmailError) {
        console.error('Erro ao enviar email para vendedor:', sellerEmailError);
      } else {
        console.log("Seller notification email sent successfully:", sellerEmailResponse);
      }
    }

    // Update product sales count
    if (productId) {
      console.log('=== UPDATING PRODUCT SALES COUNT ===');
      
      const { data: updateData, error: updateError } = await supabase
        .from('products')
        .update({ 
          sales: newSalesCount,
          last_sale_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (updateError) {
        console.error('Error updating product sales count:', updateError);
      } else {
        console.log(`Updated product ${productId} sales count to ${newSalesCount}`);
      }
    }

    console.log('=== PURCHASE CONFIRMATION COMPLETE ===');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Purchase confirmation email sent successfully',
      emailSent: true,
      sellerNotified: !!sellerProfile,
      isFirstSale,
      newSalesCount
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("=== ERROR IN PURCHASE CONFIRMATION ===");
    console.error("Error sending purchase confirmation email:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Erro ao enviar email de confirmação',
        timestamp: new Date().toISOString(),
        errorType: error.name || 'UnknownError'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);