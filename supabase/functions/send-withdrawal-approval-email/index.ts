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
    const withdrawalAmount = withdrawalData.amount; // Valor líquido já com desconto aplicado
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
    const emailSubject = 'Saque Aprovado - Kambafy';
    
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Saque Aprovado</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; }
          .header { background-color: #ffffff; padding: 32px 32px 24px; border-bottom: 1px solid #e5e7eb; }
          .header h1 { margin: 0 0 8px; font-size: 24px; color: #1f2937; font-weight: 600; }
          .header p { margin: 0; color: #6b7280; font-size: 14px; }
          .content { padding: 32px; }
          .content p { margin: 0 0 16px; color: #374151; }
          .amount-box { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 24px; margin: 24px 0; text-align: center; }
          .amount-box .label { font-size: 14px; color: #6b7280; margin-bottom: 8px; }
          .amount-box .value { font-size: 32px; font-weight: 700; color: #059669; }
          .info-box { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0; }
          .info-box h3 { margin: 0 0 16px; font-size: 16px; color: #1f2937; font-weight: 600; }
          .info-row { margin-bottom: 12px; }
          .info-row:last-child { margin-bottom: 0; }
          .info-label { display: inline-block; color: #6b7280; font-size: 14px; min-width: 140px; }
          .info-value { color: #1f2937; font-size: 14px; font-weight: 500; }
          .steps { margin: 20px 0; }
          .steps ul { margin: 8px 0; padding-left: 20px; }
          .steps li { margin-bottom: 8px; color: #374151; font-size: 14px; }
          .footer { background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
          .footer p { margin: 4px 0; font-size: 13px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Saque Aprovado</h1>
            <p>Sua solicitação foi processada com sucesso</p>
          </div>
          
          <div class="content">
            <p>Olá <strong>${sellerName}</strong>,</p>
            
            <p>Sua solicitação de saque foi aprovada e será processada em breve.</p>
            
            <div class="amount-box">
              <div class="label">Valor a Receber</div>
              <div class="value">${Number(withdrawalAmount).toLocaleString('pt-AO')} KZ</div>
            </div>
            
            <div class="info-box">
              <h3>Detalhes da Transferência</h3>
              <div class="info-row">
                <span class="info-label">Conta Destino:</span>
                <span class="info-value">${iban || 'Não informado'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Titular:</span>
                <span class="info-value">${accountHolder || sellerName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Data da Solicitação:</span>
                <span class="info-value">${new Date(withdrawalData.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              ${notes ? `<div class="info-row"><span class="info-label">Observações:</span><span class="info-value">${notes}</span></div>` : ''}
            </div>
            
            <div class="steps">
              <h3 style="font-size: 16px; color: #1f2937; font-weight: 600; margin: 0 0 12px;">Próximos Passos</h3>
              <ul>
                <li>A transferência foi efetuada e irá refletir em sua conta em até 3 dias úteis</li>
                <li>Em caso de dúvidas, entre em contato com nosso suporte</li>
              </ul>
            </div>
            
            <p>Parabéns pelo seu sucesso na plataforma!</p>
          </div>
          
          <div class="footer">
            <p><strong>Kambafy</strong></p>
            <p>suporte@kambafy.com</p>
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
