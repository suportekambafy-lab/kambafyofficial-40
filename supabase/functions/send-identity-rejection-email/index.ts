import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IdentityRejectionRequest {
  verificationId: string;
  rejectionReason: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!resendApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente não configuradas');
    }

    const { verificationId, rejectionReason }: IdentityRejectionRequest = await req.json();
    
    if (!verificationId || !rejectionReason) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'verificationId e rejectionReason são obrigatórios' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar dados da verificação
    const { data: verificationData, error: verificationError } = await supabase
      .from('identity_verification')
      .select('*, profiles!inner(email, full_name)')
      .eq('id', verificationId)
      .single();

    if (verificationError || !verificationData) {
      throw new Error('Verificação não encontrada');
    }

    const userEmail = verificationData.profiles.email;
    const userName = verificationData.profiles.full_name || verificationData.full_name || 'Vendedor';

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #ffffff;
          }
          .container { 
            max-width: 600px; 
            margin: 40px auto; 
            padding: 0 20px;
          }
          .header { 
            text-align: center; 
            padding: 20px 0;
            border-bottom: 2px solid #000;
            margin-bottom: 30px;
          }
          .header h1 { 
            margin: 0; 
            font-size: 24px; 
            font-weight: normal;
          }
          .content { 
            padding: 0;
          }
          .content p { 
            margin: 15px 0;
          }
          .box {
            border: 1px solid #000;
            padding: 20px;
            margin: 20px 0;
          }
          .box h2 {
            margin-top: 0;
            font-size: 18px;
            font-weight: normal;
            border-bottom: 1px solid #000;
            padding-bottom: 10px;
          }
          .reason-box {
            border: 2px solid #000;
            padding: 15px;
            margin: 20px 0;
            background-color: #f5f5f5;
          }
          .footer { 
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #000;
            text-align: center; 
            font-size: 12px; 
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>KAMBAFY</h1>
            <p>Verificação de Identidade - Revisão Necessária</p>
          </div>
          
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <p>Informamos que a sua solicitação de verificação de identidade precisa de <strong>revisão</strong>.</p>
            
            <div class="reason-box">
              <h2>Motivo da Reprovação</h2>
              <p>${rejectionReason}</p>
            </div>
            
            <div class="box">
              <h2>O que fazer agora</h2>
              <p>1. Acesse a sua conta na Kambafy</p>
              <p>2. Vá até a seção de Verificação de Identidade</p>
              <p>3. Revise os documentos conforme o motivo indicado acima</p>
              <p>4. Envie novamente os documentos corrigidos</p>
            </div>
            
            <div class="box">
              <h2>Dicas Importantes</h2>
              <p>• Certifique-se de que as fotos estejam nítidas</p>
              <p>• Todos os dados do documento devem estar visíveis</p>
              <p>• Não envie documentos vencidos</p>
              <p>• Evite reflexos ou sombras nas fotos</p>
            </div>
            
            <p>Nossa equipe está pronta para analisar novamente os seus documentos assim que forem reenviados.</p>
            
            <p>Se tiver dúvidas, entre em contato conosco.</p>
          </div>
          
          <div class="footer">
            <p>KAMBAFY - Plataforma de Vendas Digitais</p>
            <p>suporte@kambafy.com | kambafy.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const resend = new Resend(resendApiKey);
    
    const emailResponse = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: [userEmail],
      subject: "Documentos Reprovados - Revisão Necessária - Kambafy",
      html: emailHTML,
    });

    console.log("✅ Email de reprovação enviado:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email enviado com sucesso',
      recipient: userEmail
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
    
  } catch (error: any) {
    console.error("❌ Erro ao enviar email:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
