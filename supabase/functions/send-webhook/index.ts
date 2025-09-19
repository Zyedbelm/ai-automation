// Edge Function hybride : webhooks Make.com sécurisés + système existant
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Structure JSON attendue en réponse de Make.com :
// {
//   "success": true,
//   "ai_response": "Réponse de l'IA à afficher à l'utilisateur",
//   "points_awarded": 15, // optionnel
//   "next_action": "continue" | "next_step" | "end_session", // optionnel
//   "metadata": { // optionnel
//     "emotion": "enthusiastic",
//     "confidence": 0.9
//   }
// }

interface SimpleWebhookRequest {
  type: 'calculator' | 'contact' | 'chatbot'
  data: any
}

interface WebhookUrls {
  [key: string]: string
}

console.log("🚀 Edge Function send-webhook hybride démarrée")

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();

    // 🔥 NOUVEAU : Détection du type de requête
    // Type 1: Webhooks Make.com simples (calculator, contact, chatbot)
    if (requestBody.type && ['calculator', 'contact', 'chatbot'].includes(requestBody.type)) {
      return await handleSimpleWebhook(requestBody as SimpleWebhookRequest);
    }

    // Type 2: Système existant complexe avec city_id, user_profile_id, etc.
    if (requestBody.city_id && requestBody.user_profile_id) {
      return await handleComplexWebhook(requestBody);
    }

    // Type non reconnu
    return new Response(JSON.stringify({
      success: false,
      error: 'Type de requête non reconnu. Utilisez {type: "calculator/contact/chatbot", data: {...}} ou le format existant avec city_id.'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('❌ Erreur Edge Function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});

// 🔒 NOUVEAU : Fonction pour webhooks Make.com sécurisés
async function handleSimpleWebhook(request: SimpleWebhookRequest) {
  try {
    // Récupérer la clé API Make.com depuis les secrets Supabase
    const webhookApiKey = Deno.env.get('WEBHOOK_API_KEY');

    if (!webhookApiKey) {
      console.error('❌ WEBHOOK_API_KEY manquante dans les secrets Supabase');
      return new Response(JSON.stringify({
        success: false,
        error: 'Configuration webhook manquante'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // URLs des webhooks Make.com Blueprint Store
    const webhookUrls: WebhookUrls = {
      calculator: 'https://hook.eu1.make.com/2fh4mnmxx3sfi3bc7ozebhu54x91yj7v',
      contact: 'https://hook.eu1.make.com/2fh4mnmxx3sfi3bc7ozebhu54x91yj7v',
      chatbot: 'https://hook.eu1.make.com/16iycniehsxgvovrkfhisp2i8ih947bd'
    };

    const webhookUrl = webhookUrls[request.type];
    if (!webhookUrl) {
      return new Response(JSON.stringify({
        success: false,
        error: `Type de webhook invalide: ${request.type}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log(`🔑 Envoi webhook ${request.type} vers Make.com avec x-make-apikey`);

    // Envoyer le webhook vers Make.com avec authentification
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-make-apikey': webhookApiKey // Header officiel Make.com
      },
      body: JSON.stringify(request.data)
    });

    const responseStatus = response.status;
    let responseText = '';

    try {
      responseText = await response.text();
    } catch (e) {
      console.log('Impossible de lire la réponse webhook');
    }

    console.log(`✅ Webhook ${request.type} envoyé - Status: ${responseStatus}`);

    // Parser la réponse JSON si possible
    let webhookResponseData = null;
    try {
      if (responseText) {
        webhookResponseData = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.log('Réponse webhook non-JSON:', responseText);
    }

    return new Response(JSON.stringify({
      success: responseStatus >= 200 && responseStatus < 300,
      status: responseStatus,
      message: `Webhook ${request.type} envoyé`,
      makeResponse: responseText,
      ...webhookResponseData // Inclure la réponse du webhook
    }), {
      status: response.ok ? 200 : 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error(`❌ Erreur webhook simple:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// 🔄 EXISTANT : Fonction pour le système complexe (votre code original)
async function handleComplexWebhook(requestBody: any) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const {
    message_id, media_id, city_id, user_profile_id, content_type,
    audio_data, photo_data, media_url, access_token, file_size,
    duration_seconds, session_id
  } = requestBody;

  if (!city_id || !user_profile_id || !content_type) {
    return new Response(JSON.stringify({
      error: 'city_id, user_profile_id et content_type requis'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  // Récupérer le webhook configuré pour cette ville
  console.log('Recherche webhook pour city_id:', city_id);
  const { data: webhook, error: webhookError } = await supabase
    .from('city_webhooks')
    .select('*')
    .eq('city_id', city_id)
    .eq('is_active', true)
    .single();

  console.log('Webhook trouvé:', webhook);
  console.log('Erreur webhook:', webhookError);

  if (!webhook) {
    console.log('Aucun webhook configuré pour cette ville:', city_id);
    return new Response(JSON.stringify({
      success: false,
      message: 'Pas de webhook configuré'
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  // Récupérer les informations de session et d'étapes si session_id fourni
  let sessionInfo = null;
  if (session_id) {
    const { data: session } = await supabase
      .from('visit_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (session) {
      const { data: steps } = await supabase
        .from('city_steps')
        .select('*')
        .in('id', session.selected_step_ids)
        .order('name');

      if (steps && steps.length > 0) {
        const currentIndex = session.current_step_index || 0;
        const currentStep = steps[currentIndex];
        const previousStep = currentIndex > 0 ? steps[currentIndex - 1] : null;
        const nextStep = currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;

        sessionInfo = {
          session_id,
          current_step: currentStep,
          previous_step: previousStep,
          next_step: nextStep,
          current_step_index: currentIndex,
          total_steps: steps.length
        };
      }
    }
  }

  // Préparer le payload pour le webhook
  let webhookPayload: any = {
    message_id: message_id || media_id || `generated-${Date.now()}`,
    city_id,
    user_profile_id,
    content_type,
    timestamp: new Date().toISOString(),
    session_info: sessionInfo
  };

  // Ajouter les données spécifiques selon le type de contenu
  if (media_id) {
    webhookPayload.media_id = media_id;
    webhookPayload.media_url = media_url;
    webhookPayload.access_token = access_token;
    webhookPayload.file_size = file_size;

    if (content_type === 'voice_memo') {
      webhookPayload.user_message = 'Mémo vocal envoyé - accessible via URL sécurisée';
      webhookPayload.duration_seconds = duration_seconds;
    } else if (content_type === 'photo') {
      webhookPayload.user_message = 'Photo envoyée - accessible via URL sécurisée';
    }
  } else if (content_type === 'voice_memo' && audio_data) {
    webhookPayload.audio_data = audio_data;
    webhookPayload.user_message = 'Mémo vocal envoyé';
  } else if (content_type === 'photo' && photo_data) {
    webhookPayload.photo_data = photo_data;
    webhookPayload.user_message = 'Photo envoyée pour analyse';
  } else if (requestBody.user_message) {
    webhookPayload.user_message = requestBody.user_message;
  } else if (message_id) {
    const { data: message } = await supabase
      .from('voice_messages')
      .select('*')
      .eq('id', message_id)
      .single();

    if (message) {
      webhookPayload.user_message = message.text_content || '';
      webhookPayload.audio_data = message.audio_data;
      webhookPayload.message_type = message.message_type;
      webhookPayload.timestamp = message.created_at;
    }
  }

  // Envoyer vers le webhook
  console.log('Envoi webhook vers:', webhook.webhook_url);
  console.log('Payload:', JSON.stringify(webhookPayload, null, 2));

  const webhookResponse = await fetch(webhook.webhook_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...webhook.webhook_secret && { 'X-Webhook-Secret': webhook.webhook_secret }
    },
    body: JSON.stringify(webhookPayload)
  });

  const responseStatus = webhookResponse.status;
  console.log('Status réponse webhook:', responseStatus);

  let responseText = '';
  try {
    responseText = await webhookResponse.text();
    console.log('Réponse webhook:', responseText);
  } catch (e) {
    console.log('Impossible de lire la réponse webhook');
  }

  // Mettre à jour les statistiques du webhook
  await supabase
    .from('city_webhooks')
    .update({
      total_sent: webhook.total_sent + 1,
      last_sent_at: new Date().toISOString(),
      last_response_status: responseStatus
    })
    .eq('id', webhook.id);

  // Marquer le message comme envoyé (si un message_id existe)
  if (message_id) {
    await supabase
      .from('voice_messages')
      .update({
        webhook_sent: true,
        webhook_sent_at: new Date().toISOString()
      })
      .eq('id', message_id);
  }

  // Parser la réponse JSON si possible
  let webhookResponseData = null;
  try {
    if (responseText) {
      webhookResponseData = JSON.parse(responseText);
    }
  } catch (parseError) {
    console.log('Réponse webhook non-JSON:', responseText);
  }

  return new Response(JSON.stringify({
    success: responseStatus >= 200 && responseStatus < 300,
    status: responseStatus,
    ...webhookResponseData // Inclure la réponse du webhook
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}