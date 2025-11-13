import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { corsHeaders } from '../_shared/cors.ts';

interface CreateProductPriceRequest {
  productName: string;
  productDescription: string;
  price: number; // Em AOA (vai converter para centavos)
  interval: 'day' | 'week' | 'month' | 'year';
  interval_count: number;
  trial_days?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CREATE-STRIPE-PRODUCT] Iniciando criação de produto...');

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY não configurado');
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

    const { 
      productName, 
      productDescription, 
      price, 
      interval, 
      interval_count,
      trial_days 
    } = await req.json() as CreateProductPriceRequest;

    console.log('[CREATE-STRIPE-PRODUCT] Dados recebidos:', {
      productName,
      price,
      interval,
      interval_count,
      trial_days
    });

    // 1. Criar produto no Stripe
    const stripeProduct = await stripe.products.create({
      name: productName,
      description: productDescription,
      metadata: {
        platform: 'checkout-angola',
        created_via: 'auto-marketplace'
      }
    });

    console.log('[CREATE-STRIPE-PRODUCT] Produto criado no Stripe:', stripeProduct.id);

    // 2. Criar preço recorrente
    // Converter AOA para centavos (Stripe usa minor units)
    const priceInCents = Math.round(price * 100);

    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: priceInCents,
      currency: 'aoa', // Kwanza Angolano
      recurring: {
        interval: interval,
        interval_count: interval_count,
        trial_period_days: trial_days || undefined
      },
      metadata: {
        platform: 'checkout-angola'
      }
    });

    console.log('[CREATE-STRIPE-PRODUCT] Preço criado no Stripe:', stripePrice.id);

    return new Response(
      JSON.stringify({
        success: true,
        stripe_product_id: stripeProduct.id,
        stripe_price_id: stripePrice.id,
        message: 'Produto e preço criados automaticamente no Stripe'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('[CREATE-STRIPE-PRODUCT] ERRO:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
