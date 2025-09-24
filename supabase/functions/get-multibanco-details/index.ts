
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { payment_intent_id } = await req.json();
    console.log('🔍 Received payment_intent_id:', payment_intent_id);

    if (!payment_intent_id) {
      throw new Error('Payment Intent ID é obrigatório');
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Chave secreta do Stripe não configurada');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    console.log('🔍 Buscando payment intent:', payment_intent_id);
    
    // Buscar o Payment Intent com expansões completas
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id, {
      expand: [
        'latest_charge',
        'latest_charge.payment_method_details',
        'payment_method',
        'payment_method.multibanco'
      ]
    });
    
    console.log('✅ Payment Intent encontrado:', {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      payment_method_types: paymentIntent.payment_method_types
    });

    // Verificar se é um pagamento Multibanco
    if (!paymentIntent.payment_method_types.includes('multibanco')) {
      throw new Error('Este pagamento não foi criado para Multibanco');
    }

    let multibancoDetails = null;

    // 1. Verificar next_action primeiro (para pagamentos pendentes)
    if (paymentIntent.next_action?.multibanco_display_details) {
      const details = paymentIntent.next_action.multibanco_display_details;
      console.log('✅ Dados Multibanco encontrados em next_action:', details);
      
      multibancoDetails = {
        entity: details.entity_number?.toString() || details.entity?.toString(),
        reference: details.reference?.toString(),
        amount: (paymentIntent.amount / 100).toFixed(2),
        currency: paymentIntent.currency.toUpperCase()
      };
    }

    // 2. Se não encontrou, buscar no latest_charge
    if (!multibancoDetails && paymentIntent.latest_charge) {
      console.log('🔍 Buscando no latest_charge...');
      
      let charge;
      if (typeof paymentIntent.latest_charge === 'string') {
        charge = await stripe.charges.retrieve(paymentIntent.latest_charge, {
          expand: ['payment_method_details']
        });
      } else {
        charge = paymentIntent.latest_charge;
      }
      
      console.log('🔍 Charge payment_method_details:', charge.payment_method_details);

      if (charge.payment_method_details?.multibanco) {
        const details = charge.payment_method_details.multibanco;
        console.log('✅ Dados Multibanco encontrados no charge:', details);
        
        multibancoDetails = {
          entity: details.entity?.toString(),
          reference: details.reference?.toString(),
          amount: (paymentIntent.amount / 100).toFixed(2),
          currency: paymentIntent.currency.toUpperCase()
        };
      }
    }

    // 3. Se ainda não encontrou, buscar no payment_method
    if (!multibancoDetails && paymentIntent.payment_method) {
      console.log('🔍 Buscando no payment_method...');
      
      let paymentMethod;
      if (typeof paymentIntent.payment_method === 'string') {
        paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
      } else {
        paymentMethod = paymentIntent.payment_method;
      }
      
      console.log('🔍 Payment method details:', paymentMethod);

      if (paymentMethod.type === 'multibanco' && paymentMethod.multibanco) {
        const details = paymentMethod.multibanco;
        console.log('✅ Dados Multibanco encontrados no payment method:', details);
        
        multibancoDetails = {
          entity: details.entity?.toString(),
          reference: details.reference?.toString(),
          amount: (paymentIntent.amount / 100).toFixed(2),
          currency: paymentIntent.currency.toUpperCase()
        };
      }
    }

    // 4. Buscar em todos os charges relacionados
    if (!multibancoDetails) {
      console.log('🔍 Buscando em todos os charges...');
      
      const charges = await stripe.charges.list({
        payment_intent: payment_intent_id,
        limit: 10,
        expand: ['data.payment_method_details']
      });

      for (const charge of charges.data) {
        if (charge.payment_method_details?.multibanco) {
          const details = charge.payment_method_details.multibanco;
          console.log('✅ Dados Multibanco encontrados em charge:', details);
          
          multibancoDetails = {
            entity: details.entity?.toString(),
            reference: details.reference?.toString(),
            amount: (paymentIntent.amount / 100).toFixed(2),
            currency: paymentIntent.currency.toUpperCase()
          };
          break;
        }
      }
    }

    // Verificar se temos dados válidos
    if (multibancoDetails && multibancoDetails.entity && multibancoDetails.reference) {
      console.log('✅ Retornando dados completos do Multibanco:', multibancoDetails);
      
      return new Response(JSON.stringify(multibancoDetails), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Se chegou aqui, não encontrou dados reais
    console.log('❌ DADOS MULTIBANCO NÃO ENCONTRADOS');
    console.log('Payment Intent completo:', JSON.stringify(paymentIntent, null, 2));

    throw new Error(`Dados do Multibanco não encontrados no Payment Intent ${payment_intent_id}. Verifique se o pagamento foi criado corretamente com o método Multibanco.`);

  } catch (error) {
    console.error('❌ Erro ao buscar dados do Multibanco:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Erro interno ao processar dados do Multibanco'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
