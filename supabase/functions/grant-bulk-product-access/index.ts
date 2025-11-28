import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkAccessRequest {
  source_product_id: string;
  target_product_ids: string[]; // Array para múltiplos produtos de destino
}

interface ProcessResult {
  customer_email: string;
  customer_name: string;
  success: boolean;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { source_product_id, target_product_ids }: BulkAccessRequest = await req.json();

    if (!source_product_id || !target_product_ids || !Array.isArray(target_product_ids) || target_product_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'source_product_id and target_product_ids array are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    console.log('🔍 Validating products...');
    
    // Validar que o produto de origem existe
    const { data: sourceProduct, error: sourceError } = await supabase
      .from('products')
      .select('id, name, user_id')
      .eq('id', source_product_id)
      .single();

    if (sourceError || !sourceProduct) {
      return new Response(
        JSON.stringify({ error: 'Source product not found', details: sourceError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar todos os produtos de destino
    const { data: targetProducts, error: targetError } = await supabase
      .from('products')
      .select('id, name, user_id, access_duration_type, access_duration_value')
      .in('id', target_product_ids);

    if (targetError || !targetProducts || targetProducts.length !== target_product_ids.length) {
      return new Response(
        JSON.stringify({ error: 'One or more target products not found', details: targetError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Products validated:
      - Source: "${sourceProduct.name}" (${source_product_id})
      - Targets: ${targetProducts.map(p => `"${p.name}"`).join(', ')}`);

    // Buscar todos os clientes com acesso ao produto de origem
    const { data: sourceAccess, error: accessError } = await supabase
      .from('customer_access')
      .select('customer_email, customer_name')
      .eq('product_id', source_product_id)
      .eq('is_active', true);

    if (accessError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch source product access', details: accessError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Found ${sourceAccess?.length || 0} customers with access to source product`);

    if (!sourceAccess || sourceAccess.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No customers found with access to source product',
          processed: 0,
          results: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processar cada produto de destino
    const allResults: any[] = [];
    const timestamp = new Date().getTime();
    const bulkOrderId = `bulk_access_from_${source_product_id}_${timestamp}`;

    console.log('🚀 Starting bulk access grant for multiple products...');

    for (const targetProduct of targetProducts) {
      console.log(`\n📦 Processing target product: "${targetProduct.name}" (${targetProduct.id})`);

      // Buscar área de membros associada ao produto
      const { data: memberAreas } = await supabase
        .from('member_areas')
        .select('id, name, url')
        .eq('user_id', targetProduct.user_id);

      const memberArea = memberAreas && memberAreas.length > 0 ? memberAreas[0] : null;
      console.log(`📚 Member area: ${memberArea ? memberArea.name : 'N/A'}`);

      // Buscar "Turma A" (turma padrão) para esta área de membros
      let defaultCohort = null;
      if (memberArea) {
        const { data: cohorts } = await supabase
          .from('member_area_cohorts')
          .select('id, name')
          .eq('member_area_id', memberArea.id)
          .eq('status', 'active')
          .eq('name', 'Turma A')
          .limit(1);

        defaultCohort = cohorts && cohorts.length > 0 ? cohorts[0] : null;
        console.log(`🎓 Default cohort: ${defaultCohort ? defaultCohort.name : 'N/A'}`);

      // Buscar quem já tem acesso a este produto específico
      const { data: existingAccess, error: existingError } = await supabase
        .from('customer_access')
        .select('customer_email')
        .eq('product_id', targetProduct.id);

      if (existingError) {
        console.error('Error checking existing access:', existingError);
      }

      const existingEmails = new Set(existingAccess?.map(a => a.customer_email.toLowerCase()) || []);
      console.log(`📋 ${existingEmails.size} customers already have access to "${targetProduct.name}"`);

      // Filtrar clientes que precisam receber acesso a este produto
      const customersNeedingAccess = sourceAccess.filter(
        customer => !existingEmails.has(customer.customer_email.toLowerCase())
      );

      console.log(`🎯 ${customersNeedingAccess.length} customers need access to "${targetProduct.name}"`);

      if (customersNeedingAccess.length === 0) {
        console.log(`✅ All customers already have access to "${targetProduct.name}"`);
        continue;
      }

      // Calcular data de expiração baseada nas configurações do produto
      let accessExpiresAt = null;
      if (targetProduct.access_duration_type && targetProduct.access_duration_type !== 'lifetime') {
        const now = new Date();
        const value = targetProduct.access_duration_value || 0;
        
        switch (targetProduct.access_duration_type) {
          case 'days':
            accessExpiresAt = new Date(now.getTime() + value * 24 * 60 * 60 * 1000).toISOString();
            break;
          case 'months':
            accessExpiresAt = new Date(now.setMonth(now.getMonth() + value)).toISOString();
            break;
          case 'years':
            accessExpiresAt = new Date(now.setFullYear(now.getFullYear() + value)).toISOString();
            break;
        }
      }

      // Processar cada cliente para este produto
      const productResults: ProcessResult[] = [];

      for (const customer of customersNeedingAccess) {
        try {
          const { error: insertError } = await supabase
            .from('customer_access')
            .insert({
              customer_email: customer.customer_email.toLowerCase().trim(),
              customer_name: customer.customer_name,
              product_id: targetProduct.id,
              order_id: bulkOrderId,
              is_active: true,
              access_granted_at: new Date().toISOString(),
              access_expires_at: accessExpiresAt
            });

          if (insertError) {
            console.error(`❌ Failed for ${customer.customer_email} on "${targetProduct.name}":`, insertError);
            productResults.push({
              customer_email: customer.customer_email,
              customer_name: customer.customer_name,
              success: false,
              error: insertError.message
            });
          } else {
            console.log(`✅ Access granted to ${customer.customer_email} for "${targetProduct.name}"`);

            // Adicionar à área de membros se existir
            if (memberArea) {
              const studentData: any = {
                member_area_id: memberArea.id,
                student_email: customer.customer_email.toLowerCase().trim(),
                student_name: customer.customer_name,
                access_granted_at: new Date().toISOString()
              };

              // Adicionar cohort_id se houver Turma A
              if (defaultCohort) {
                studentData.cohort_id = defaultCohort.id;
              }

              const { error: studentError } = await supabase
                .from('member_area_students')
                .upsert(studentData, {
                  onConflict: 'member_area_id,student_email',
                  ignoreDuplicates: false
                });

              if (studentError) {
                console.error(`⚠️ Failed to add ${customer.customer_email} to member area:`, studentError);
              } else {
                console.log(`📚 Added ${customer.customer_email} to "${memberArea.name}"${defaultCohort ? ` (${defaultCohort.name})` : ''}`);
              }
            }

            // Enviar email de confirmação
            try {
              const emailHtml = `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <style>
                      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                      .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                      .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                      .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <h1>🎉 Novo Acesso Liberado!</h1>
                      </div>
                      <div class="content">
                        <p>Olá, <strong>${customer.customer_name}</strong>!</p>
                        <p>Temos uma ótima notícia! Você recebeu acesso ao produto:</p>
                        <h2 style="color: #667eea; margin: 20px 0;">${targetProduct.name}</h2>
                        <p>Este acesso foi liberado manualmente e já está disponível para você.</p>
                        ${memberArea ? `
                          <p>Acesse sua área de membros agora:</p>
                          <a href="https://app.kambafy.com/area/${memberArea.url}" class="button">Acessar Área de Membros</a>
                        ` : ''}
                        <p>Aproveite todo o conteúdo disponível!</p>
                      </div>
                      <div class="footer">
                        <p>Esta é uma mensagem automática da Kambafy</p>
                        <p>© ${new Date().getFullYear()} Kambafy - Todos os direitos reservados</p>
                      </div>
                    </div>
                  </body>
                </html>
              `;

              await resend.emails.send({
                from: 'Kambafy <noreply@kambafy.com>',
                to: [customer.customer_email],
                subject: `🎉 Novo acesso liberado: ${targetProduct.name}`,
                html: emailHtml
              });

              console.log(`📧 Email sent to ${customer.customer_email}`);
            } catch (emailError) {
              console.error(`⚠️ Failed to send email to ${customer.customer_email}:`, emailError);
            }

            productResults.push({
              customer_email: customer.customer_email,
              customer_name: customer.customer_name,
              success: true
            });
          }
        } catch (error) {
          console.error(`❌ Exception for ${customer.customer_email}:`, error);
          productResults.push({
            customer_email: customer.customer_email,
            customer_name: customer.customer_name,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = productResults.filter(r => r.success).length;
      const failureCount = productResults.filter(r => !r.success).length;

      // Atualizar contador da turma com o número correto de alunos
      if (defaultCohort) {
        const { count } = await supabase
          .from('member_area_students')
          .select('*', { count: 'exact', head: true })
          .eq('member_area_id', memberArea.id)
          .eq('cohort_id', defaultCohort.id);

        if (count !== null) {
          await supabase
            .from('member_area_cohorts')
            .update({ current_students: count })
            .eq('id', defaultCohort.id);
          
          console.log(`📊 Updated cohort "${defaultCohort.name}" count to ${count}`);
        }
      }

      allResults.push({
        product_id: targetProduct.id,
        product_name: targetProduct.name,
        total_customers_with_source_access: sourceAccess.length,
        already_had_target_access: existingEmails.size,
        granted_access: successCount,
        failed: failureCount,
        results: productResults
      });

      console.log(`✨ Completed "${targetProduct.name}": ${successCount} success, ${failureCount} failed`);
    }

    const totalSuccess = allResults.reduce((sum, r) => sum + r.granted_access, 0);
    const totalFailed = allResults.reduce((sum, r) => sum + r.failed, 0);

    console.log(`\n✨ Bulk access grant completed for all products:
      - Products processed: ${targetProducts.length}
      - Total success: ${totalSuccess}
      - Total failed: ${totalFailed}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${targetProducts.length} target products`,
        source_product: {
          id: source_product_id,
          name: sourceProduct.name
        },
        target_products: targetProducts.map(p => ({
          id: p.id,
          name: p.name
        })),
        bulk_order_id: bulkOrderId,
        results_by_product: allResults,
        summary: {
          total_target_products: targetProducts.length,
          total_granted: totalSuccess,
          total_failed: totalFailed
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in grant-bulk-product-access:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
