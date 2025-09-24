import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WithdrawalApprovalRequest {
  requestId: string;
  adminId?: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📧 [EMAIL-FUNCTION] Iniciando função de email...');
    
    // Verificar variáveis de ambiente
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('🔑 [EMAIL-FUNCTION] Verificando variáveis de ambiente:', {
      hasResendKey: !!resendApiKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseServiceKey
    });
    
    if (!resendApiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [EMAIL-FUNCTION] Variáveis de ambiente não configuradas');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Variáveis de ambiente não estão configuradas' 
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Parse do body da requisição
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log('📥 [EMAIL-FUNCTION] Body recebido:', bodyText);
      requestBody = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('❌ [EMAIL-FUNCTION] Erro ao fazer parse do body:', parseError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Erro ao fazer parse do body da requisição' 
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    const { requestId, adminId, notes }: WithdrawalApprovalRequest = requestBody;
    
    console.log('📊 [EMAIL-FUNCTION] Dados extraídos:', { 
      requestId, 
      adminId, 
      notes: notes || 'Sem observações'
    });

    if (!requestId) {
      console.error('❌ [EMAIL-FUNCTION] requestId não fornecido');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'requestId é obrigatório' 
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('🔗 [EMAIL-FUNCTION] Cliente Supabase criado');

    // Buscar dados da solicitação de saque
    console.log('🔍 [EMAIL-FUNCTION] Buscando solicitação:', requestId);
    
    const { data: withdrawalData, error: withdrawalError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (withdrawalError) {
      console.error('❌ [EMAIL-FUNCTION] Erro ao buscar solicitação:', withdrawalError);
      return new Response(JSON.stringify({ 
        success: false,
        error: `Erro ao buscar solicitação: ${withdrawalError.message}` 
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    if (!withdrawalData) {
      console.error('❌ [EMAIL-FUNCTION] Solicitação não encontrada para ID:', requestId);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Solicitação de saque não encontrada' 
      }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    console.log('✅ [EMAIL-FUNCTION] Solicitação encontrada:', {
      id: withdrawalData.id,
      amount: withdrawalData.amount,
      user_id: withdrawalData.user_id,
      status: withdrawalData.status
    });

    // Buscar dados do perfil do vendedor
    console.log('🔍 [EMAIL-FUNCTION] Buscando perfil do vendedor:', withdrawalData.user_id);
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email, iban, account_holder')
      .eq('user_id', withdrawalData.user_id)
      .maybeSingle();

    if (profileError) {
      console.error('❌ [EMAIL-FUNCTION] Erro ao buscar perfil:', profileError);
      return new Response(JSON.stringify({ 
        success: true,
        warning: 'Saque processado, mas erro ao buscar perfil do vendedor',
        message: `Erro ao buscar perfil: ${profileError.message}`,
        userId: withdrawalData.user_id
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    if (!profileData) {
      console.error('❌ [EMAIL-FUNCTION] Perfil não encontrado para user_id:', withdrawalData.user_id);
      
      return new Response(JSON.stringify({ 
        success: true, 
        warning: 'Perfil não encontrado',
        message: 'Saque processado, mas perfil do vendedor não encontrado - email não enviado',
        userId: withdrawalData.user_id
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    console.log('✅ [EMAIL-FUNCTION] Perfil encontrado:', {
      email: profileData.email,
      name: profileData.full_name,
      hasIban: !!profileData.iban
    });

    if (!profileData.email) {
      console.error('❌ [EMAIL-FUNCTION] Email do vendedor não encontrado no perfil');
      
      return new Response(JSON.stringify({ 
        success: true, 
        warning: 'Email não encontrado no perfil',
        message: 'Saque processado, mas email do vendedor não encontrado - email não enviado',
        userId: withdrawalData.user_id
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    const sellerEmail = profileData.email;
    const sellerName = profileData.full_name || 'Vendedor';
    const amount = withdrawalData.amount;
    const iban = profileData.iban;
    const accountHolder = profileData.account_holder;

    // Buscar dados do admin que aprovou (se disponível)
    let adminName = 'Equipe Kambafy';
    if (adminId) {
      console.log('🔍 [EMAIL-FUNCTION] Buscando dados do admin:', adminId);
      try {
        const { data: adminData, error: adminError } = await supabase
          .from('admin_users')
          .select('full_name, email')
          .eq('id', adminId)
          .maybeSingle();
        
        if (adminError) {
          console.warn('⚠️ [EMAIL-FUNCTION] Erro ao buscar admin:', adminError);
        } else if (adminData?.full_name) {
          adminName = adminData.full_name;
          console.log('✅ [EMAIL-FUNCTION] Admin encontrado:', adminName);
        }
      } catch (adminError) {
        console.warn('⚠️ [EMAIL-FUNCTION] Erro ao buscar admin, usando nome padrão:', adminError);
      }
    }

    // Preparar conteúdo do email
    const emailSubject = '✅ Saque Aprovado - Kambafy';
    
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Saque Aprovado</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .highlight { background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
          .amount { font-size: 2em; font-weight: bold; color: #28a745; text-align: center; margin: 20px 0; }
          .details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 0.9em; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Saque Aprovado!</h1>
            <p>Sua solicitação foi processada com sucesso</p>
          </div>
          
          <div class="content">
            <p>Olá <strong>${sellerName}</strong>,</p>
            
            <p>Temos uma excelente notícia! Sua solicitação de saque foi <strong>aprovada</strong> e será processada em breve.</p>
            
            <div class="amount">
              💰 ${Number(amount).toLocaleString('pt-AO')} KZ
            </div>
            
            <div class="highlight">
              <h3>📋 Detalhes do Saque:</h3>
              <div class="details">
                <p><strong>💳 Conta Destino:</strong> ${iban || 'Não informado'}</p>
                <p><strong>👤 Titular:</strong> ${accountHolder || sellerName}</p>
                <p><strong>📅 Data da Solicitação:</strong> ${new Date(withdrawalData.created_at).toLocaleDateString('pt-BR')}</p>
                <p><strong>✅ Aprovado por:</strong> ${adminName}</p>
                ${notes ? `<p><strong>📝 Observações:</strong> ${notes}</p>` : ''}
              </div>
            </div>
            
            <div class="highlight">
              <h3>⏰ Próximos Passos:</h3>
              <ul>
                <li>✅ Saque aprovado e em processamento</li>
                <li>🏦 Transferência será realizada em até 2 dias úteis</li>
                <li>📧 Você receberá uma confirmação quando o pagamento for efetuado</li>
                <li>💼 Continue vendendo para gerar mais receita!</li>
              </ul>
            </div>
            
            <p><strong>Parabéns pelo seu sucesso!</strong> Continue assim e gere ainda mais vendas na nossa plataforma.</p>
            
            <p>Se tiver alguma dúvida, não hesite em entrar em contato conosco.</p>
          </div>
          
          <div class="footer">
            <p><strong>Kambafy</strong> - Plataforma de Vendas Digitais</p>
            <p>📧 suporte@kambafy.com | 🌐 kambafy.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log('📧 [EMAIL-FUNCTION] Preparando envio para:', sellerEmail);
    
    // Inicializar Resend
    const resend = new Resend(resendApiKey);
    
    try {
      const emailResponse = await resend.emails.send({
        from: "noreply@kambafy.com",
        to: [sellerEmail],
        subject: emailSubject,
        html: emailHTML,
      });

      console.log("✅ [EMAIL-FUNCTION] Resposta do Resend:", emailResponse);

      if (emailResponse.error) {
        console.error("❌ [EMAIL-FUNCTION] Erro na resposta do Resend:", emailResponse.error);
        return new Response(JSON.stringify({ 
          success: true,
          warning: 'Erro ao enviar email',
          message: `Saque processado, mas erro no envio do email: ${emailResponse.error.message}`,
          recipient: sellerEmail
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }

      console.log("🎉 [EMAIL-FUNCTION] Email enviado com sucesso! ID:", emailResponse.data?.id);

      return new Response(JSON.stringify({ 
        success: true, 
        emailId: emailResponse.data?.id,
        message: 'Email de aprovação enviado com sucesso',
        recipient: sellerEmail
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    } catch (emailError) {
      console.error("❌ [EMAIL-FUNCTION] Erro ao chamar Resend:", emailError);
      return new Response(JSON.stringify({ 
        success: true,
        warning: 'Erro ao enviar email',
        message: `Saque processado, mas erro ao enviar email: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`,
        recipient: sellerEmail
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }
    
  } catch (error: any) {
    console.error("💥 [EMAIL-FUNCTION] ERRO GERAL:", error);
    console.error("📋 [EMAIL-FUNCTION] Stack trace:", error.stack);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Erro interno do servidor',
      details: error.stack || 'Stack trace não disponível'
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json", 
        ...corsHeaders 
      },
    });
  }
};

serve(handler);
