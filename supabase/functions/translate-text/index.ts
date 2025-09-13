import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, targetLanguage, sourceLanguage = 'auto' } = await req.json();

    if (!text || !targetLanguage) {
      throw new Error('Text and target language are required');
    }

    console.log('🌐 Translate request:', { text, targetLanguage, sourceLanguage });

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create translation prompt based on target language
    let prompt = '';
    switch (targetLanguage) {
      case 'en':
        prompt = `Translate the following text to English. Return ONLY the translated text, no explanations or additional content:\n\n${text}`;
        break;
      case 'es':
        prompt = `Traduce el siguiente texto al español. Devuelve SOLO el texto traducido, sin explicaciones o contenido adicional:\n\n${text}`;
        break;
      case 'pt':
        prompt = `Traduza o seguinte texto para português. Retorne APENAS o texto traduzido, sem explicações ou conteúdo adicional:\n\n${text}`;
        break;
      case 'fr':
        prompt = `Traduisez le texte suivant en français. Retournez SEULEMENT le texte traduit, sans explications ou contenu supplémentaire:\n\n${text}`;
        break;
      default:
        prompt = `Translate the following text to ${targetLanguage}. Return ONLY the translated text, no explanations or additional content:\n\n${text}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate the given text accurately and return only the translated text without any additional explanations, quotes, or formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.choices[0].message.content.trim();
    
    console.log('✅ Translation completed:', { original: text, translated: translatedText });

    return new Response(JSON.stringify({ 
      translatedText,
      originalText: text,
      targetLanguage,
      sourceLanguage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Translation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      translatedText: null 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});