import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

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

    console.log('=== CHECKING IF CUSTOMER HAS ACCOUNT ===');
    
    // Check if customer already has an account
    const { data: existingUser, error: userCheckError } = await supabase.auth.admin.listUsers();
    
    let userHasAccount = false;
    let newlyCreatedUser = null;
    
    if (!userCheckError && existingUser) {
      userHasAccount = existingUser.users.some(user => user.email === customerEmail.trim());
    }
    
    console.log('Customer has existing account:', userHasAccount);
    
    // If customer doesn't have account, create one and send password setup email
    if (!userHasAccount) {
      console.log('=== CREATING NEW CUSTOMER ACCOUNT ===');
      
      try {
        // Create user account with temporary password
        const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
          email: customerEmail.trim(),
          password: Math.random().toString(36).slice(-12), // Temporary random password
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            full_name: customerName
          }
        });
        
        if (createUserError) {
          console.error('Error creating user account:', createUserError);
        } else {
          newlyCreatedUser = newUser.user;
          console.log('New user account created:', newUser.user?.id);
          
          // Send password setup email using Supabase's reset password flow
          console.log('=== SENDING PASSWORD SETUP EMAIL ===');
          
          // Generate a secure password reset link using Supabase
          const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: customerEmail.trim(),
            options: {
              redirectTo: `${Deno.env.get('SUPABASE_URL')?.includes('localhost') ? 'http://localhost:5173' : 'https://kambafy.com'}/auth?mode=reset-password&type=customer`
            }
          });
          
          if (resetError) {
            console.error('Error generating password reset link:', resetError);
          } else {
            const resetLink = resetData.properties?.action_link;
            
            const passwordSetupEmailHtml = `
              <html>
              <head>
                <meta charset="utf-8">
                <title>Bem-vindo à Kambafy - Configure sua Senha</title>
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <div style="background-color: #16a34a; color: white; width: 60px; height: 60px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
                    <span style="font-size: 24px; font-weight: bold;">K</span>
                  </div>
                  <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 8px;">
                    <h1 style="margin: 0; font-size: 24px;">🎉 Bem-vindo à Kambafy!</h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">Sua conta foi criada automaticamente</p>
                  </div>
                </div>

                <div style="background-color: #f0f9ff; padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #2563eb;">
                  <h2 style="color: #1e40af; margin: 0 0 15px 0;">🔐 Configure sua Senha</h2>
                  <p style="margin: 0 0 15px 0; color: #1e40af;">
                    Olá, <strong>${customerName}</strong>!
                  </p>
                  <p style="margin: 0 0 15px 0; color: #1e40af;">
                    Como você fez uma compra conosco, criamos automaticamente uma conta para você acessar seus produtos e acompanhar suas compras.
                  </p>
                  <p style="margin: 0 0 15px 0; color: #1e40af;">
                    Para começar a usar sua conta, você precisa configurar uma senha. Clique no botão abaixo:
                  </p>
                  <div style="text-align: center; margin: 20px 0;">
                    <a href="${resetLink || `https://kambafy.com/auth?mode=reset-password&type=customer&email=${encodeURIComponent(customerEmail)}`}" 
                       style="display: inline-block; background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      Configurar Minha Senha
                    </a>
                  </div>
                  <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 12px; text-align: center;">
                    Este link é válido por 1 hora. Se não conseguir configurar a senha, entre em contato conosco.
                  </p>
                </div>

                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                  <h3 style="color: #16a34a; margin: 0 0 15px 0;">📱 O que você pode fazer com sua conta:</h3>
                  <ul style="margin: 0; padding-left: 20px; color: #555;">
                    <li style="margin-bottom: 8px;">Acessar todos os seus produtos comprados</li>
                    <li style="margin-bottom: 8px;">Acompanhar o histórico de compras</li>
                    <li style="margin-bottom: 8px;">Receber atualizações sobre novos produtos</li>
                    <li style="margin-bottom: 8px;">Acesso direto à área de membros dos cursos</li>
                  </ul>
                </div>

                <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #856404; margin: 0 0 10px 0;">📞 Precisa de Ajuda?</h3>
                  <p style="margin: 0; color: #856404;">
                    Se tiver alguma dúvida sobre sua conta ou dificuldades para configurar a senha, entre em contato:
                  </p>
                  <p style="margin: 10px 0 0 0; color: #856404;">
                    <strong>Email:</strong> suporte@kambafy.com<br>
                    <strong>WhatsApp:</strong> (+244) 900 000 000
                  </p>
                </div>

                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                  <p style="margin: 0; color: #666;">
                    <strong>Kambafy</strong><br>
                    Bem-vindo à nossa comunidade!
                  </p>
                </div>
              </body>
              </html>
            `;
          
            const { data: passwordEmailResponse, error: passwordEmailError } = await resend.emails.send({
              from: "Kambafy <noreply@kambafy.com>",
              to: [customerEmail.trim()],
              subject: "🔐 Configure sua senha - Bem-vindo à Kambafy!",
              html: passwordSetupEmailHtml,
            });
            
            if (passwordEmailError) {
              console.error('Error sending password setup email:', passwordEmailError);
            } else {
              console.log("Password setup email sent successfully:", passwordEmailResponse);
            }
          }
        }
      } catch (createAccountError) {
        console.error('Error in account creation process:', createAccountError);
      }
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

    // Send affiliate commission email if applicable
    if (orderId) {
      console.log('=== CHECKING FOR AFFILIATE COMMISSION ===');
      
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          affiliates!inner(
            affiliate_user_id,
            affiliate_name,
            affiliate_email,
            commission_rate
          )
        `)
        .eq('order_id', orderId)
        .single();

      if (!orderError && orderData?.affiliates) {
        const affiliate = orderData.affiliates;
        const affiliateCommission = orderData.affiliate_commission || 0;
        
        if (affiliateCommission > 0) {
          console.log('=== SENDING AFFILIATE COMMISSION EMAIL ===');
          
          const affiliateEmailHtml = `
            <html>
            <head>
              <meta charset="utf-8">
              <title>Comissão de Afiliado - Kambafy</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background-color: #16a34a; color: white; width: 60px; height: 60px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
                  <span style="font-size: 24px; font-weight: bold;">K</span>
                </div>
                <div style="background-color: #16a34a; color: white; padding: 20px; border-radius: 8px;">
                  <h1 style="margin: 0; font-size: 24px;">💰 Comissão Confirmada!</h1>
                  <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">Parabéns ${affiliate.affiliate_name}, você ganhou uma comissão!</p>
                </div>
              </div>

              <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
                <h2 style="color: #16a34a; margin: 0 0 20px 0;">Detalhes da Comissão</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Produto Vendido:</td>
                    <td style="padding: 8px 0;">${productName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Valor da Venda:</td>
                    <td style="padding: 8px 0;">${amount} ${currency}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Taxa de Comissão:</td>
                    <td style="padding: 8px 0;">${affiliate.commission_rate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Sua Comissão:</td>
                    <td style="padding: 8px 0; font-size: 18px; color: #16a34a; font-weight: bold;">${affiliateCommission.toFixed(0)} ${currency}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Data da Venda:</td>
                    <td style="padding: 8px 0;">${new Date().toLocaleDateString('pt-BR')}</td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0288d1;">
                <h3 style="color: #01579b; margin: 0 0 15px 0;">📊 Informações de Pagamento</h3>
                <p style="margin: 0 0 10px 0; color: #01579b;">
                  Sua comissão será processada e paga de acordo com o cronograma de pagamentos:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #01579b;">
                  <li style="margin-bottom: 5px;">Pagamentos são processados automaticamente após 7 dias da confirmação da venda</li>
                  <li style="margin-bottom: 5px;">Você pode acompanhar suas comissões no painel do afiliado</li>
                  <li style="margin-bottom: 5px;">O valor será transferido para sua conta bancária cadastrada</li>
                </ul>
              </div>

              <div style="background-color: #f3e5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #9c27b0;">
                <h3 style="color: #4a148c; margin: 0 0 15px 0;">🚀 Continue Promovendo</h3>
                <p style="margin: 0 0 10px 0; color: #4a148c;">
                  Continue compartilhando seus links de afiliado para ganhar mais comissões! Acesse sua área de afiliado para:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #4a148c;">
                  <li style="margin-bottom: 5px;">Ver relatórios detalhados de vendas</li>
                  <li style="margin-bottom: 5px;">Baixar materiais promocionais</li>
                  <li style="margin-bottom: 5px;">Acompanhar suas comissões em tempo real</li>
                </ul>
                <div style="text-align: center; margin-top: 15px;">
                  <a href="https://kambafy.com/dashboard/afiliados" 
                     style="display: inline-block; background-color: #9c27b0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Acessar Área do Afiliado
                  </a>
                </div>
              </div>

              <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #856404; margin: 0 0 10px 0;">📞 Precisa de Ajuda?</h3>
                <p style="margin: 0; color: #856404;">
                  Se tiver alguma dúvida sobre suas comissões ou pagamentos, entre em contato conosco:
                </p>
                <p style="margin: 10px 0 0 0; color: #856404;">
                  <strong>Email:</strong> suporte@kambafy.com<br>
                  <strong>WhatsApp:</strong> (+244) 900 000 000
                </p>
              </div>

              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="margin: 0; color: #666;">
                  <strong>Kambafy</strong><br>
                  Obrigado por ser nosso parceiro!
                </p>
              </div>
            </body>
            </html>
          `;

          const { data: affiliateEmailResponse, error: affiliateEmailError } = await resend.emails.send({
            from: "Kambafy <noreply@kambafy.com>",
            to: [affiliate.affiliate_email],
            subject: `💰 Comissão confirmada: ${affiliateCommission.toFixed(0)} ${currency} - ${productName}`,
            html: affiliateEmailHtml,
          });

          if (affiliateEmailError) {
            console.error('Error sending affiliate commission email:', affiliateEmailError);
          } else {
            console.log("Affiliate commission email sent successfully:", affiliateEmailResponse);
          }
        }
      }
    }

    // Send email to seller if available
    let sellerEmailResponse = null;
    
    if (sellerProfile && sellerProfile.email && sellerProfile.email.trim() !== '') {
      console.log('=== SENDING SELLER EMAIL ===');
      
      const congratsTitle = isFirstSale 
        ? "🎉 Parabéns pela sua primeira venda!" 
        : `🎉 Parabéns por mais uma venda!`;
      
      const congratsMessage = isFirstSale
        ? `<p style="font-size: 18px; color: #16a34a; margin: 20px 0;">Que emocionante! Você acabou de fazer a sua primeira venda na Kambafy! 🚀</p>`
        : `<p style="font-size: 18px; color: #16a34a; margin: 20px 0;">Mais uma venda realizada com sucesso! Você está indo muito bem! 💪</p>`;

      const sellerEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Parabéns pela Venda - Kambafy</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #16a34a; color: white; width: 60px; height: 60px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
              <span style="font-size: 24px; font-weight: bold;">K</span>
            </div>
            <div style="background-color: #16a34a; color: white; padding: 20px; border-radius: 8px;">
              <h1 style="margin: 0; font-size: 24px;">${congratsTitle}</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">Olá, ${sellerProfile.full_name || 'Vendedor'}!</p>
            </div>
          </div>

          ${congratsMessage}

          <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #16a34a; margin: 0 0 20px 0;">Detalhes da Venda</h2>
            <table style="width: 100%; border-collapse: collapse;">
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
                <td style="padding: 8px 0; font-weight: bold;">Cliente:</td>
                <td style="padding: 8px 0;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Email do Cliente:</td>
                <td style="padding: 8px 0;">${customerEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Valor Total da Venda:</td>
                <td style="padding: 8px 0; font-size: 18px; color: #16a34a; font-weight: bold;">${amount} ${currency}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Pedido:</td>
                <td style="padding: 8px 0;">#${orderId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Total de Vendas:</td>
                <td style="padding: 8px 0; font-weight: bold;">${newSalesCount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Data:</td>
                <td style="padding: 8px 0;">${new Date().toLocaleDateString('pt-BR')}</td>
              </tr>
            </table>
          </div>

          ${orderBumpSection}

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="margin: 0; color: #666;">
              <strong>Kambafy</strong><br>
              Continue vendendo e crescendo conosco!
            </p>
          </div>
        </body>
        </html>
      `;

      try {
        const { data: sellerResponse, error: sellerError } = await resend.emails.send({
          from: "Kambafy <noreply@kambafy.com>",
          to: [sellerProfile.email.trim()],
          subject: isFirstSale 
            ? `🎉 Primeira Venda: ${productName} - Parabéns!`
            : `🎉 Nova Venda: ${productName} - ${amount} ${currency}`,
          html: sellerEmailHtml,
        });
        
        if (!sellerError) {
          sellerEmailResponse = sellerResponse;
          console.log("Seller congratulatory email sent successfully:", sellerEmailResponse);
        }
      } catch (sellerEmailError) {
        console.error("Error sending seller congratulatory email:", sellerEmailError);
      }
    }

    console.log('=== PURCHASE CONFIRMATION COMPLETE ===');

    return new Response(JSON.stringify({ 
      success: true, 
      customerEmailResponse,
      sellerEmailResponse,
      newAccountCreated: !userHasAccount,
      newUserId: newlyCreatedUser?.id,
      message: 'Emails de confirmação enviados com sucesso',
      customerEmail: customerEmail,
      sellerEmail: sellerProfile?.email,
      sellerNotified: !!sellerEmailResponse,
      isFirstSale: isFirstSale,
      salesCount: newSalesCount,
      accountCreated: !userHasAccount ? 'Conta criada automaticamente e email de configuração de senha enviado' : 'Cliente já possui conta'
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
