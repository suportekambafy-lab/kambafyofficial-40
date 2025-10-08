import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Helper function to send SMS notification
const sendSMSNotification = async (
  phone: string, 
  type: 'purchase_confirmation' | 'payment_reminder' | 'course_access',
  data: {
    customerName: string;
    productName: string;
    memberAreaUrl?: string;
    referenceNumber?: string;
    entity?: string;
    amount?: string;
  }
) => {
  try {
    if (!phone || phone.trim() === '') {
      console.log('[SMS] No phone number provided, skipping SMS');
      return null;
    }

    console.log(`[SMS] Sending ${type} SMS to:`, phone);
    
    const { data: smsResult, error } = await supabase.functions.invoke('send-sms-notification', {
      body: {
        to: phone,
        type: type,
        customerName: data.customerName,
        productName: data.productName,
        memberAreaUrl: data.memberAreaUrl,
        referenceNumber: data.referenceNumber,
        entity: data.entity,
        amount: data.amount,
        message: '' // Will be generated based on type
      }
    });

    if (error) {
      console.error('[SMS] Error sending SMS:', error);
      return null;
    }

    console.log('[SMS] SMS sent successfully:', smsResult);
    return smsResult;
  } catch (error) {
    console.error('[SMS] Exception sending SMS:', error);
    return null;
  }
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PurchaseConfirmationRequest {
  customerName: string;
  customerEmail: string;
  customerPhone?: string; // Telefone do cliente para SMS
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
      customerPhone,
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
    
    // Normalizar email para lowercase
    const normalizedEmail = customerEmail.toLowerCase().trim();

    console.log('=== PURCHASE CONFIRMATION START ===');
    console.log('Request data:', {
      customerName,
      customerEmail: normalizedEmail,
      customerPhone, // Adicionar telefone no log
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
    if (!normalizedEmail || !customerName || !productName || !orderId) {
      throw new Error('Missing required fields: customerEmail, customerName, productName, or orderId');
    }

    // ✅ CRITICAL: Block emails for failed payments
    if (paymentStatus === 'failed') {
      console.log('❌ PAYMENT FAILED - Email and access blocked', {
        orderId,
        customerEmail: normalizedEmail,
        paymentStatus
      });
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Payment failed - no email sent',
        emailSent: false,
        paymentStatus: 'failed'
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
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
              </div>
            </div>

            ${sellerProfile ? `
            <!-- Seller Info -->
            <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
              <h3 style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1e293b;">📧 Informações do Vendedor</h3>
              <p style="margin: 0 0 8px; color: #475569; font-size: 14px;">
                Este produto é vendido por: <strong>${sellerProfile.full_name}</strong>
              </p>
              <p style="margin: 0; color: #475569; font-size: 14px;">
                Para dúvidas sobre o produto: <strong>${sellerProfile.email}</strong>
              </p>
            </div>
            ` : ''}

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
            from: sellerProfile?.full_name 
              ? `${sellerProfile.full_name} via Kambafy <noreply@kambafy.com>`
              : "Kambafy <noreply@kambafy.com>",
            to: [normalizedEmail],
            subject: `Pagamento Pendente - ${productName} - Pedido #${orderId}`,
            html: pendingEmailHtml,
          });

          if (pendingEmailError) {
            console.error('Background task error - sending pending payment email:', pendingEmailError);
          } else {
            console.log('Pending payment email sent successfully:', pendingEmailResponse);
          }

          // Send SMS for pending payment if phone number is provided
          if (customerPhone) {
            await sendSMSNotification(customerPhone, 'payment_reminder', {
              customerName,
              productName,
              referenceNumber: referenceData?.referenceNumber,
              entity: referenceData?.entity,
              amount: amount
            });
          }

        } catch (backgroundError) {
          console.error('Background task error:', backgroundError);
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
          // Usar a rota correta para login da área de membros
          memberAreaUrl = `https://kambafy.com/members/login/${memberAreaId}`;
        }

        // Create access link
        let accessInfo = '';
        const productType = productData?.type;
        
        console.log('=== CREATING ACCESS INFO ===');
        console.log('Product type:', productType);
        console.log('Share link:', shareLink);
        
        // Para produtos do tipo "Link de Pagamento", verificar se tem link de acesso
        if (productType === 'Link de Pagamento' && shareLink) {
          console.log('Product is Payment Link WITH share link - adding access');
          accessInfo = `
            <div style="background-color: #16a34a; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: white; margin: 0 0 10px 0;">🔗 Link de Acesso</h3>
              <p style="margin: 0; color: white;">Acesse seu produto através do link:</p>
              <a href="${shareLink}" 
                 style="display: inline-block; background-color: white; color: #16a34a; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px; font-weight: bold;">
                Acessar Produto
              </a>
            </div>
          `;
        } else if (productType === 'Link de Pagamento') {
          console.log('Product is Payment Link without share link - skipping access info');
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
        } else if (shareLink) {
          console.log('Product has share link - adding product access');
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
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Confirmação de Compra - Kambafy</title>
              <style>
                @media only screen and (max-width: 600px) {
                  .container { width: 100% !important; padding: 15px !important; }
                  .header-title { font-size: 20px !important; }
                  .section { padding: 20px !important; }
                }
              </style>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155;">
              <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                
                <!-- Header -->
                <div style="text-align: center; padding: 40px 30px 30px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0;">
                  <h1 class="header-title" style="margin: 0; font-size: 28px; font-weight: 700; color: #1e293b; letter-spacing: -0.5px;">KAMBAFY</h1>
                  <p style="margin: 15px 0 0; font-size: 18px; font-weight: 500; color: #16a34a;">✅ Compra Confirmada!</p>
                  <p style="margin: 8px 0 0; font-size: 16px; color: #64748b;">Obrigado pela sua compra, ${customerName}!</p>
                </div>

                <!-- Product Info -->
                <div style="padding: 30px 30px 0;">
                  <h2 style="text-align: center; color: #16a34a; margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">Você comprou: ${productName}</h2>
                  <p style="text-align: center; font-size: 16px; color: #64748b; margin: 0 0 25px;">de ${sellerProfile?.full_name || 'Kambafy'}</p>
                </div>

                <!-- Order Details -->
                <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
                  <h3 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1e293b;">Detalhes do Pedido</h3>
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 12px 0; font-weight: 500; color: #475569; width: 40%;">Número do Pedido:</td>
                        <td style="padding: 12px 0; color: #1e293b; font-family: 'Courier New', monospace;">${orderId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; font-weight: 500; color: #475569;">Valor Pago:</td>
                        <td style="padding: 12px 0; font-size: 20px; font-weight: 700; color: #16a34a;">${amount} ${currency}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; font-weight: 500; color: #475569;">Data:</td>
                        <td style="padding: 12px 0; color: #1e293b;">${new Date().toLocaleDateString('pt-BR')}</td>
                      </tr>
                    </table>
                  </div>
                </div>

                ${accessInfo ? `<!-- Access Link -->
                <div style="padding: 0 30px 30px;">
                  ${accessInfo}
                </div>` : ''}

                <!-- Thank You -->
                <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
                  <div style="background-color: #f0fdf4; border: 1px solid #16a34a; border-radius: 8px; padding: 20px; text-align: center;">
                    <h3 style="color: #16a34a; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">💚 Muito obrigado por comprar com a Kambafy!</h3>
                    <p style="margin: 0; color: #15803d; font-size: 14px; line-height: 1.6;">
                      Sua confiança em nós é o que nos motiva a continuar oferecendo os melhores produtos digitais.
                    </p>
                  </div>
                </div>

                <!-- Support -->
                <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
                  <h3 style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1e293b;">Precisa de Ajuda?</h3>
                  <p style="margin: 0 0 12px; color: #475569; font-size: 14px;">
                    Se tiver alguma dúvida, entre em contato conosco:
                  </p>
                  <div style="color: #475569; font-size: 14px;">
                    <p style="margin: 0;"><strong>Email:</strong> suporte@kambafy.com</p>
                  </div>
                </div>

                ${sellerProfile ? `
                <!-- Seller Info -->
                <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
                  <h3 style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1e293b;">📧 Informações do Vendedor</h3>
                  <p style="margin: 0 0 8px; color: #475569; font-size: 14px;">
                    Este produto é vendido por: <strong>${sellerProfile.full_name}</strong>
                  </p>
                  <p style="margin: 0; color: #475569; font-size: 14px;">
                    Para dúvidas sobre o produto: <strong>${sellerProfile.email}</strong>
                  </p>
                </div>
                ` : ''}

                <!-- Footer -->
                <div style="text-align: center; padding: 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
                  <h3 style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #1e293b; letter-spacing: -0.3px;">KAMBAFY</h3>
                  <p style="margin: 0; color: #64748b; font-size: 14px;">
                    Obrigado por confiar em nós!
                  </p>
                </div>

              </div>
            </body>
            </html>
          `;
        } else {
          // Email para Cursos e E-books com acesso
          customerEmailHtml = `
          <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Confirmação de Compra - Kambafy</title>
            <style>
              @media only screen and (max-width: 600px) {
                .container { width: 100% !important; padding: 15px !important; }
                .header-title { font-size: 20px !important; }
                .section { padding: 20px !important; }
              }
            </style>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155;">
            <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              
              <!-- Header -->
              <div style="text-align: center; padding: 40px 30px 30px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0;">
                <h1 class="header-title" style="margin: 0; font-size: 28px; font-weight: 700; color: #1e293b; letter-spacing: -0.5px;">KAMBAFY</h1>
                <p style="margin: 15px 0 0; font-size: 18px; font-weight: 500; color: #16a34a;">✅ Compra Confirmada!</p>
                <p style="margin: 8px 0 0; font-size: 16px; color: #64748b;">Obrigado pela sua compra, ${customerName}!</p>
              </div>

              <!-- Product Info -->
              <div style="padding: 30px 30px 0;">
                <h2 style="text-align: center; color: #16a34a; margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">Você comprou: ${productName}</h2>
                <p style="text-align: center; font-size: 16px; color: #64748b; margin: 0 0 25px;">de ${sellerProfile?.full_name || 'Kambafy'}</p>
              </div>

              ${isNewAccount && temporaryPassword ? `
              <!-- Login Info -->
              <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
                <h3 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1e293b;">🔑 Seus Dados de Acesso</h3>
                <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px;">
                  <p style="margin: 0 0 15px; color: #0c4a6e; font-size: 14px;">
                    Criamos uma conta para você acessar seus produtos:
                  </p>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; font-weight: 500; color: #475569; width: 30%;">Email:</td>
                      <td style="padding: 8px 0; color: #1e293b; font-family: 'Courier New', monospace;">${normalizedEmail}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-weight: 500; color: #475569;">Senha:</td>
                      <td style="padding: 8px 0; color: #1e293b; font-family: 'Courier New', monospace; font-weight: 700;">${temporaryPassword}</td>
                    </tr>
                  </table>
                  <div style="background-color: #fef3cd; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin: 15px 0 0;">
                    <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.6;">
                      <strong>Importante:</strong> Altere esta senha no primeiro acesso por segurança.
                    </p>
                  </div>
                </div>
              </div>
              ` : ''}

              ${accessInfo}

              ${orderBumpSection}

              <!-- Order Details -->
              <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
                <h3 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1e293b;">Detalhes do Pedido</h3>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 12px 0; font-weight: 500; color: #475569; width: 40%;">Número do Pedido:</td>
                      <td style="padding: 12px 0; color: #1e293b; font-family: 'Courier New', monospace;">${orderId}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; font-weight: 500; color: #475569;">Valor Pago:</td>
                      <td style="padding: 12px 0; font-size: 20px; font-weight: 700; color: #16a34a;">${amount} ${currency}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; font-weight: 500; color: #475569;">Data:</td>
                      <td style="padding: 12px 0; color: #1e293b;">${new Date().toLocaleDateString('pt-BR')}</td>
                    </tr>
                  </table>
                </div>
              </div>

              <!-- Support -->
              <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
                <h3 style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1e293b;">Precisa de Ajuda?</h3>
                <p style="margin: 0 0 12px; color: #475569; font-size: 14px;">
                  Se tiver alguma dúvida, entre em contato conosco:
                </p>
                <div style="color: #475569; font-size: 14px;">
                  <p style="margin: 0;"><strong>Email:</strong> suporte@kambafy.com</p>
                </div>
              </div>

              ${sellerProfile ? `
              <!-- Seller Info -->
              <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
                <h3 style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1e293b;">📧 Informações do Vendedor</h3>
                <p style="margin: 0 0 8px; color: #475569; font-size: 14px;">
                  Este produto é vendido por: <strong>${sellerProfile.full_name}</strong>
                </p>
                <p style="margin: 0; color: #475569; font-size: 14px;">
                  Para dúvidas sobre o produto: <strong>${sellerProfile.email}</strong>
                </p>
              </div>
              ` : ''}

              <!-- Footer -->
              <div style="text-align: center; padding: 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
                <h3 style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #1e293b; letter-spacing: -0.3px;">KAMBAFY</h3>
                <p style="margin: 0; color: #64748b; font-size: 14px;">Obrigado por confiar em nós!</p>
              </div>

            </div>
          </body>
          </html>
          `;
        }

        // Send the customer email
        const { data: emailResponse, error: emailError } = await resend.emails.send({
          from: sellerProfile?.full_name 
            ? `${sellerProfile.full_name} via Kambafy <noreply@kambafy.com>`
            : "Kambafy <noreply@kambafy.com>",
          to: [normalizedEmail],
          subject: `Confirmação de Compra - ${productName} - Pedido #${orderId}`,
          html: customerEmailHtml,
        });

        if (emailError) {
          console.error('Background task error - sending confirmation email:', emailError);
        } else {
          console.log("Purchase confirmation email sent successfully:", emailResponse);
        }

        // Send SMS for purchase confirmation if phone number is provided
        if (customerPhone) {
          const memberAreaUrl = memberAreaId ? `https://kambafy.com/members/login/${memberAreaId}` : shareLink;
          await sendSMSNotification(customerPhone, 'purchase_confirmation', {
            customerName,
            productName,
            memberAreaUrl
          });
        }

        // ✅ SEND MEMBER ACCESS EMAIL for main product if it has member area
        if (memberAreaId) {
          console.log('=== SENDING MAIN PRODUCT MEMBER ACCESS EMAIL ===');
          
          try {
            // Get member area details
            const { data: memberArea, error: memberAreaError } = await supabase
              .from('member_areas')
              .select('name, url')
              .eq('id', memberAreaId)
              .single();
            
            if (!memberAreaError && memberArea) {
              const mainMemberAreaUrl = `https://kambafy.com/members/login/${memberAreaId}`;
              
              // Generate temporary password for main product access
              function generateTemporaryPassword(): string {
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
                let password = '';
                for (let i = 0; i < 10; i++) {
                  password += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return password;
              }
              
              const mainTemporaryPassword = generateTemporaryPassword();
              
              // Send member access email for main product
              const mainMemberAccessPayload = {
                studentName: customerName,
                studentEmail: normalizedEmail,
                memberAreaName: memberArea.name,
                memberAreaUrl: mainMemberAreaUrl,
                sellerName: sellerProfile?.full_name || 'Kambafy',
                isNewAccount: !!isNewAccount,
                temporaryPassword: mainTemporaryPassword
              };
              
              console.log('Sending main product member access email:', mainMemberAccessPayload);
              
              const { error: mainAccessEmailError } = await supabase.functions.invoke('send-member-access-email', {
                body: mainMemberAccessPayload
              });
              
              if (mainAccessEmailError) {
                console.error('Error sending main product access email:', mainAccessEmailError);
              } else {
                console.log('✅ Main product access email sent successfully');
              }
            }
          } catch (mainAccessError) {
            console.error('Error processing main product access email:', mainAccessError);
          }
        }

        // Process order bump and send separate email if applicable
        if (orderBump && orderBump.bump_product_name) {
          console.log('=== PROCESSING ORDER BUMP EMAIL ===');
          console.log('Order bump data:', orderBump);
          
          try {
            // Try to fetch order bump product details from database
            let bumpProductData = null;
            let bumpMemberAreaId = null;
            let bumpMemberAreaUrl = null;
            let bumpProductId = null;
            
            // Fetch order bump product from order_bump_data
            const { data: orderDataWithBump, error: orderFetchError } = await supabase
              .from('orders')
              .select('order_bump_data')
              .eq('order_id', orderId)
              .single();
            
            if (!orderFetchError && orderDataWithBump?.order_bump_data) {
              const bumpData = typeof orderDataWithBump.order_bump_data === 'string' 
                ? JSON.parse(orderDataWithBump.order_bump_data)
                : orderDataWithBump.order_bump_data;
              
              bumpProductId = bumpData.bump_product_id;
              
              if (bumpProductId) {
                console.log('Fetching order bump product details for:', bumpProductId);
                const { data: product, error: productError } = await supabase
                  .from('products')
                  .select('name, member_area_id, user_id')
                  .eq('id', bumpProductId)
                  .single();
                
                if (!productError && product) {
                  bumpProductData = product;
                  bumpMemberAreaId = product.member_area_id;
                  console.log('Order bump product found:', {
                    name: product.name,
                    member_area_id: product.member_area_id
                  });
                }
              }
            }
            
            // If order bump has a member area, send access email
            if (bumpMemberAreaId) {
              console.log('Order bump has member area, sending access email...');
              
              // Get member area details
              const { data: memberArea, error: memberAreaError } = await supabase
                .from('member_areas')
                .select('name, url')
                .eq('id', bumpMemberAreaId)
                .single();
              
              if (!memberAreaError && memberArea) {
                bumpMemberAreaUrl = `https://kambafy.com/members/login/${bumpMemberAreaId}`;
                
                // Generate temporary password for order bump access
                function generateTemporaryPassword(): string {
                  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
                  let password = '';
                  for (let i = 0; i < 10; i++) {
                    password += chars.charAt(Math.floor(Math.random() * chars.length));
                  }
                  return password;
                }
                
                const bumpTemporaryPassword = generateTemporaryPassword();
                
                // Send member access email for order bump
                const memberAccessPayload = {
                  studentName: customerName,
                  studentEmail: normalizedEmail,
                  memberAreaName: memberArea.name,
                  memberAreaUrl: bumpMemberAreaUrl,
                  sellerName: sellerProfile?.full_name || 'Kambafy',
                  isNewAccount: false, // Account already exists from main product
                  temporaryPassword: bumpTemporaryPassword
                };
                
                console.log('Sending member access email for order bump:', memberAccessPayload);
                
                const { error: bumpEmailError } = await supabase.functions.invoke('send-member-access-email', {
                  body: memberAccessPayload
                });
                
                if (bumpEmailError) {
                  console.error('Error sending order bump access email:', bumpEmailError);
                } else {
                  console.log('✅ Order bump access email sent successfully');
                }
              }
            } else {
              console.log('Order bump does not have member area, skipping separate access email');
            }
            
          } catch (bumpError) {
            console.error('Error processing order bump email:', bumpError);
          }
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