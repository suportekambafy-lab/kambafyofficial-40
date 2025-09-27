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
  paymentMethod?: string;
  paymentStatus?: string;
  referenceData?: {
    referenceNumber?: string;
    entity?: string;
    dueDate?: string;
  };
  isNewAccount?: boolean;
  temporaryPassword?: string;
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
      baseProductPrice,
      paymentMethod,
      paymentStatus,
      referenceData,
      isNewAccount,
      temporaryPassword
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
      baseProductPrice,
      paymentMethod,
      paymentStatus,
      referenceData
    });

    // Validate required fields
    if (!customerEmail || !customerName || !productName || !orderId) {
      throw new Error('Missing required fields: customerEmail, customerName, productName, or orderId');
    }

    // Check if this is a pending reference payment
    const isPendingReference = paymentMethod === 'reference' && paymentStatus === 'pending';
    
    if (isPendingReference) {
      console.log('=== PENDING REFERENCE PAYMENT DETECTED ===');
      console.log('Sending immediate response and processing email in background');
      
      // Create pending payment email HTML
      const pendingEmailHtml = `
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Pagamento Pendente - ${productName} - Kambafy</title>
          <style>
            @media only screen and (max-width: 600px) {
              .container { width: 100% !important; padding: 15px !important; }
              .header-title { font-size: 20px !important; }
              .section { padding: 20px !important; }
              .payment-table td { display: block !important; width: 100% !important; padding: 5px 0 !important; }
              .payment-table td:first-child { font-weight: bold; margin-bottom: 5px; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155;">
          <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            
            <!-- Header -->
            <div style="text-align: center; padding: 40px 30px 30px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <h1 class="header-title" style="margin: 0; font-size: 28px; font-weight: 700; color: #1e293b; letter-spacing: -0.5px;">KAMBAFY</h1>
              <p style="margin: 15px 0 0; font-size: 18px; font-weight: 500; color: #f59e0b;">Pagamento Pendente</p>
              <p style="margin: 8px 0 0; font-size: 16px; color: #64748b;">Complete o seu pagamento para acessar o produto</p>
            </div>

            <!-- Payment Details -->
            <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
              <h2 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1e293b;">Dados para Pagamento</h2>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                <table class="payment-table" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; font-weight: 500; color: #475569; width: 30%;">Entidade:</td>
                    <td style="padding: 12px 0; font-size: 20px; font-weight: 700; color: #1e293b; font-family: 'Courier New', monospace;">${referenceData?.entity || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; font-weight: 500; color: #475569;">Referência:</td>
                    <td style="padding: 12px 0; font-size: 20px; font-weight: 700; color: #1e293b; font-family: 'Courier New', monospace;">${referenceData?.referenceNumber || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; font-weight: 500; color: #475569;">Valor:</td>
                    <td style="padding: 12px 0; font-size: 20px; font-weight: 700; color: #059669;">${amount} ${currency}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; font-weight: 500; color: #475569;">Data Limite:</td>
                    <td style="padding: 12px 0; color: #1e293b; font-weight: 500;">${referenceData?.dueDate ? new Date(referenceData.dueDate).toLocaleDateString('pt-BR') : 'N/A'}</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Order Details -->
            <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
              <h3 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1e293b;">Detalhes do Pedido</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: 500; color: #475569; width: 30%;">Pedido:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${orderId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 500; color: #475569;">Produto:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${productName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 500; color: #475569;">Cliente:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${customerName}</td>
                </tr>
              </table>
            </div>

            <!-- How to Pay -->
            <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
              <h3 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1e293b;">Como Pagar</h3>
              <div style="color: #475569; line-height: 1.6;">
                <p style="margin: 0 0 12px;">1. Use os dados acima no seu Multicaixa Express ou app bancário</p>
                <p style="margin: 0 0 12px;">2. O pagamento será processado automaticamente</p>
                <p style="margin: 0 0 12px;">3. Você receberá um email de confirmação quando o pagamento for aprovado</p>
                <p style="margin: 0;">4. O acesso ao produto será liberado imediatamente após a confirmação</p>
              </div>
            </div>

            <!-- Support -->
            <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
              <h3 style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1e293b;">Precisa de Ajuda?</h3>
              <p style="margin: 0 0 12px; color: #475569; font-size: 14px;">
                Se tiver alguma dúvida sobre o pagamento, entre em contato conosco:
              </p>
              <div style="color: #475569; font-size: 14px;">
                <p style="margin: 0;"><strong>Email:</strong> suporte@kambafy.com</p>
                <p style="margin: 5px 0 0;"><strong>WhatsApp:</strong> (+244) 900 000 000</p>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <h3 style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #1e293b; letter-spacing: -0.3px;">KAMBAFY</h3>
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                Obrigado por escolher a Kambafy
              </p>
            </div>

          </div>
        </body>
        </html>
      `;

      // Start background task for email sending (fire and forget)
      (async () => {
        try {
          console.log('Background task: Sending pending payment email');
          const { data: pendingEmailResponse, error: pendingEmailError } = await resend.emails.send({
            from: "Kambafy <noreply@kambafy.com>",
            to: [customerEmail.trim()],
            subject: `Pagamento Pendente - ${productName} - Pedido #${orderId}`,
            html: pendingEmailHtml,
          });

          if (pendingEmailError) {
            console.error('Background task error - sending pending payment email:', pendingEmailError);
          } else {
            console.log("Pending payment email sent successfully:", pendingEmailResponse);
          }
        } catch (error) {
          console.error('Background task error:', error);
        }
      })();
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Pending payment email will be sent',
        emailSent: true,
        paymentStatus: 'pending'
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // For completed payments, continue with the full flow but also optimize with background tasks
    console.log('=== PROCESSING COMPLETED PAYMENT ===');
    
    // Send immediate response and process email in background (fire and forget)
    (async () => {
      try {
        console.log('Background task: Processing completed payment email');
        
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

        // Create customer email HTML based on product type
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
                <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 700; color: #1e293b; letter-spacing: -0.5px;">KAMBAFY</h1>
                <div style="background-color: #16a34a; color: white; padding: 20px; border-radius: 8px;">
                  <h2 style="margin: 0; font-size: 24px; font-weight: 600;">Compra Confirmada!</h2>
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
                <h3 style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #1e293b; letter-spacing: -0.3px;">KAMBAFY</h3>
                <p style="margin: 0; color: #64748b; font-size: 14px;">
                  Obrigado por confiar em nós!
                </p>
              </div>
            </body>
            </html>
          `;
        } else {
          // Email completo para Cursos e E-books
          customerEmailHtml = `
          <html>
          <head>
            <meta charset="utf-8">
            <title>Confirmação de Compra - Kambafy</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 700; color: #1e293b; letter-spacing: -0.5px;">KAMBAFY</h1>
              <div style="background-color: #16a34a; color: white; padding: 20px; border-radius: 8px;">
                <h2 style="margin: 0; font-size: 24px; font-weight: 600;">Compra Confirmada!</h2>
                <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">Obrigado pela sua compra, ${customerName}!</p>
              </div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <h2 style="color: #16a34a; margin: 0 0 15px 0;">Você comprou: ${productName}</h2>
              <p style="font-size: 18px; color: #666; margin: 0;">de ${sellerProfile?.full_name || 'Kambafy'}</p>
            </div>

            ${isNewAccount && temporaryPassword ? `
            <!-- Login Information for New Account -->
            <div style="background-color: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 25px; margin: 25px 0;">
              <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">🔑 Seus Dados de Acesso</h3>
              <p style="margin: 0 0 20px 0; color: #1e40af; font-weight: 500;">
                Criamos automaticamente uma conta para você acessar seus produtos:
              </p>
              <div style="background-color: white; border-radius: 6px; padding: 20px; margin: 15px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #1e40af; width: 30%;">Email:</td>
                    <td style="padding: 10px 0; color: #1e293b; font-family: 'Courier New', monospace; font-weight: 600;">${customerEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #1e40af;">Senha:</td>
                    <td style="padding: 10px 0; color: #1e293b; font-family: 'Courier New', monospace; font-weight: 600; background-color: #f8fafc; padding: 8px; border-radius: 4px;">${temporaryPassword}</td>
                  </tr>
                </table>
              </div>
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>⚠️ Importante:</strong> Recomendamos que você altere essa senha assim que fizer o primeiro login para uma senha de sua preferência.
                </p>
              </div>
              <div style="text-align: center; margin: 20px 0;">
                <a href="https://app.kambafy.com/auth" 
                   style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  Fazer Login Agora
                </a>
              </div>
            </div>
            ` : ''}

            ${accessInfo}
            ${orderBumpSection}

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
              <h3 style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #1e293b; letter-spacing: -0.3px;">KAMBAFY</h3>
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                Obrigado por confiar em nós!
              </p>
            </div>
          </body>
          </html>
          `;
        }

        // Send the customer email
        const { data: emailResponse, error: emailError } = await resend.emails.send({
          from: "Kambafy <noreply@kambafy.com>",
          to: [customerEmail.trim()],
          subject: `Confirmação de Compra - ${productName} - Pedido #${orderId}`,
          html: customerEmailHtml,
        });

        if (emailError) {
          console.error('Background task error - sending confirmation email:', emailError);
        } else {
          console.log("Purchase confirmation email sent successfully:", emailResponse);
        }

      } catch (error) {
        console.error('Background task error:', error);
      }
    })();

    // Return immediate response for completed payments
    return new Response(JSON.stringify({
      success: true,
      message: 'Purchase confirmation email will be sent',
      emailSent: true,
      paymentStatus: 'completed'
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-purchase-confirmation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);