// 🌐 Edge Function pour servir votre site web complet sur Supabase
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// Configuration
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/Zyedbelm/ai-automation/main/';

// Mapping des routes vers les fichiers
const routes: { [key: string]: string } = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/marketplace.html': 'marketplace.html',
  '/marketplace': 'marketplace.html',
  '/faq.html': 'faq.html',
  '/faq': 'faq.html',
  '/admin-login.html': 'admin-login.html',
  '/admin-login': 'admin-login.html',
  '/admin.html': 'admin.html',
  '/admin': 'admin.html',
  '/blueprint-store.html': 'blueprint-store.html',
  '/blueprint-store': 'blueprint-store.html',
  '/config.js': 'config.js',
  '/config-loader.js': 'config-loader.js',
  '/webhook-helper.js': 'webhook-helper.js',
  '/security-utils.js': 'security-utils.js'
};

console.log("🌐 Website Edge Function démarrée");

serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // API Routes
    if (path.startsWith('/api/')) {
      return await handleApiRoute(req, path);
    }

    // Static files
    const fileName = routes[path] || routes['/'];

    if (!fileName) {
      return new Response('404 - Page non trouvée', {
        status: 404,
        headers: { 'Content-Type': 'text/plain', ...corsHeaders }
      });
    }

    // Récupérer le fichier depuis GitHub
    const fileUrl = GITHUB_RAW_BASE + fileName;
    const response = await fetch(fileUrl);

    if (!response.ok) {
      console.error(`Erreur lors du chargement de ${fileName}:`, response.status);
      return new Response('500 - Erreur serveur', {
        status: 500,
        headers: { 'Content-Type': 'text/plain', ...corsHeaders }
      });
    }

    let content = await response.text();

    // Remplacer les variables d'environnement dans les fichiers
    if (fileName.endsWith('.js') || fileName.endsWith('.html')) {
      content = replaceEnvVariables(content);
    }

    // Déterminer le Content-Type
    const contentType = getContentType(fileName);

    return new Response(content, {
      headers: {
        'Content-Type': contentType,
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Erreur:', error);
    return new Response('500 - Erreur serveur', {
      status: 500,
      headers: { 'Content-Type': 'text/plain', ...corsHeaders }
    });
  }
});

// Gestion des routes API
async function handleApiRoute(req: Request, path: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Route d'authentification
  if (path === '/api/auth/login' && req.method === 'POST') {
    const { username, password } = await req.json();

    // Pour simplifier, utilisons une authentification basique
    const adminUsername = Deno.env.get('ADMIN_USERNAME') || 'admin';
    const adminPassword = Deno.env.get('ADMIN_PASSWORD') || 'BZM2025SecureAdmin';

    if (username === adminUsername && password === adminPassword) {
      // Générer un token simple (en production, utilisez JWT)
      const token = btoa(`${username}:${Date.now()}`);

      return new Response(JSON.stringify({
        success: true,
        token,
        user: { username, role: 'admin' },
        message: 'Connexion réussie'
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Identifiants invalides'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }

  // Route pour récupérer les blueprints
  if (path === '/api/blueprints' && req.method === 'GET') {
    const { data: blueprints, error } = await supabase
      .from('blueprints')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      blueprints: blueprints || []
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  // Route pour ajouter/modifier un blueprint
  if (path === '/api/blueprints' && req.method === 'POST') {
    // Vérification d'authentification basique
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Token d\'authentification requis'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const blueprintData = await req.json();

    const { data, error } = await supabase
      .from('blueprints')
      .upsert(blueprintData)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      blueprint: data
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  return new Response(JSON.stringify({
    success: false,
    error: 'Route non trouvée'
  }), {
    status: 404,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

// Remplacer les variables d'environnement
function replaceEnvVariables(content: string): string {
  return content
    .replace(/YOUR_SUPABASE_URL/g, Deno.env.get('SUPABASE_URL') || '')
    .replace(/YOUR_SUPABASE_ANON_KEY/g, Deno.env.get('SUPABASE_ANON_KEY') || '')
    .replace(/pk_test_demo/g, Deno.env.get('STRIPE_PUBLISHABLE_KEY') || 'pk_test_demo')
    .replace(/localhost:3001/g, Deno.env.get('SUPABASE_URL')?.replace('https://', '').replace('.supabase.co', '') + '.functions.supabase.co' || 'localhost:3001');
}

// Déterminer le Content-Type
function getContentType(fileName: string): string {
  if (fileName.endsWith('.html')) return 'text/html; charset=utf-8';
  if (fileName.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (fileName.endsWith('.css')) return 'text/css; charset=utf-8';
  if (fileName.endsWith('.json')) return 'application/json; charset=utf-8';
  if (fileName.endsWith('.png')) return 'image/png';
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg';
  if (fileName.endsWith('.svg')) return 'image/svg+xml';
  return 'text/plain; charset=utf-8';
}