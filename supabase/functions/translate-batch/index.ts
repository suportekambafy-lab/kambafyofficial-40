import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texts, targetLanguages = ['en', 'es'] } = await req.json();
    
    if (!texts || typeof texts !== 'object') {
      throw new Error('texts object is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Translating ${Object.keys(texts).length} texts to ${targetLanguages.join(', ')}`);

    const translations: Record<string, Record<string, string>> = {};

    for (const lang of targetLanguages) {
      const langName = lang === 'en' ? 'English' : lang === 'es' ? 'Spanish' : lang;
      
      const prompt = `Translate the following JSON object values from Portuguese to ${langName}. 
Keep the keys exactly the same, only translate the values.
Maintain a professional and natural tone appropriate for a digital platform.
Return ONLY the JSON object with translated values, no explanations.

Input:
${JSON.stringify(texts, null, 2)}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'You are a professional translator. Translate text accurately while maintaining natural flow. Return only valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI gateway error for ${lang}:`, response.status, errorText);
        throw new Error(`Translation failed for ${lang}: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error(`No translation content received for ${lang}`);
      }

      // Parse the JSON response, handling potential markdown code blocks
      let translatedTexts: Record<string, string>;
      try {
        let jsonStr = content.trim();
        // Remove markdown code blocks if present
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.slice(7);
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.slice(3);
        }
        if (jsonStr.endsWith('```')) {
          jsonStr = jsonStr.slice(0, -3);
        }
        translatedTexts = JSON.parse(jsonStr.trim());
      } catch (parseError) {
        console.error(`Failed to parse translation for ${lang}:`, content);
        throw new Error(`Invalid JSON response for ${lang}`);
      }

      translations[lang] = translatedTexts;
      console.log(`Successfully translated to ${lang}`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      translations,
      originalCount: Object.keys(texts).length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Translation error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
