import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Headers CORS pour permettre l'accès depuis ton frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  // Gérer les requêtes OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Seulement GET pour récupérer la config
  if (req.method !== 'GET') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    })
  }

  try {
    // Récupérer les variables d'environnement depuis Supabase
    const config = {
      supabase: {
        url: Deno.env.get('SUPABASE_URL'),
        anonKey: Deno.env.get('SUPABASE_ANON_KEY')
      },
      stripe: {
        publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
        products: {
          audit: Deno.env.get('STRIPE_PRODUCTS_AUDIT'),
          quickwin: Deno.env.get('STRIPE_PRODUCTS_QUICKWIN'),
          transformation: Deno.env.get('STRIPE_PRODUCTS_TRANSFORMATION')
        }
      },
      webhooks: {
        apiKey: Deno.env.get('WEBHOOK_API_KEY')
      }
    }

    // Vérifier que les variables essentielles sont présentes
    if (!config.supabase.url || !config.supabase.anonKey) {
      throw new Error('Variables Supabase manquantes')
    }

    return new Response(
      JSON.stringify(config),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('Erreur get-config:', error)

    return new Response(
      JSON.stringify({
        error: 'Configuration non disponible',
        message: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})