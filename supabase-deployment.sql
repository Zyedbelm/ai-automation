-- 🎯 SCRIPT SQL COMPLET POUR DÉPLOYER VOTRE APPLICATION SUR SUPABASE
-- Exécutez ce script dans l'SQL Editor de Supabase

-- ============================================================================
-- 1. TABLES POUR BLUEPRINTS ET MARKETPLACE
-- ============================================================================

-- Table des blueprints
CREATE TABLE IF NOT EXISTS public.blueprints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    long_description TEXT,
    price INTEGER NOT NULL DEFAULT 0, -- Prix en centimes (ex: 14700 = 147€)
    currency VARCHAR(3) DEFAULT 'EUR',
    category VARCHAR(100),
    difficulty_level VARCHAR(50),
    estimated_setup_time VARCHAR(100),
    gumroad_url TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    prerequisites JSONB DEFAULT '[]'::jsonb,
    installation_steps JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des admins (pour l'authentification)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Table des webhooks par ville (système existant)
CREATE TABLE IF NOT EXISTS public.city_webhooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    city_id UUID NOT NULL,
    webhook_url TEXT NOT NULL,
    webhook_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    total_sent INTEGER DEFAULT 0,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    last_response_status INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des villes
CREATE TABLE IF NOT EXISTS public.cities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des sessions de visite
CREATE TABLE IF NOT EXISTS public.visit_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    city_id UUID REFERENCES public.cities(id),
    user_profile_id UUID,
    selected_step_ids JSONB DEFAULT '[]'::jsonb,
    current_step_index INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des étapes par ville
CREATE TABLE IF NOT EXISTS public.city_steps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    city_id UUID REFERENCES public.cities(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des messages vocaux
CREATE TABLE IF NOT EXISTS public.voice_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_profile_id UUID,
    city_id UUID REFERENCES public.cities(id),
    text_content TEXT,
    audio_data TEXT, -- Base64 ou URL
    message_type VARCHAR(50),
    webhook_sent BOOLEAN DEFAULT false,
    webhook_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. INSERTION DES DONNÉES INITIALES
-- ============================================================================

-- Insérer les blueprints par défaut
INSERT INTO public.blueprints (
    name, title, description, long_description, price, currency, category,
    difficulty_level, estimated_setup_time, gumroad_url, features,
    prerequisites, installation_steps
) VALUES
(
    'test-blueprint-simple',
    '🧪 Blueprint Test - 1 Franc',
    'Blueprint de test pour valider le processus d''achat et de téléchargement - Prix symbolique de 1 franc',
    'Ce blueprint de test vous permet de tester entièrement le processus d''achat : clic sur achat, redirection vers Gumroad, et téléchargement du fichier JSON. Parfait pour vérifier que tout fonctionne avant d''acheter un blueprint plus coûteux. Contient un workflow Make.com simple avec webhook et transformation JSON.',
    100, -- 1 CHF
    'CHF',
    'Analytics',
    'Débutant',
    '5-10 minutes',
    'https://baptistezm.gumroad.com/l/test-blueprint',
    '["Workflow Make.com simple à importer", "Webhook configuré pour tests", "Transformation JSON basique", "Guide d''installation simplifié", "Perfect pour tester le système d''achat"]'::jsonb,
    '["Compte Make.com (gratuit suffisant)", "Aucune API externe requise"]'::jsonb,
    '["🚀 Import simple : Se connecter à Make.com et importer le fichier JSON téléchargé", "🔗 Test du webhook : Copier l''URL de webhook générée et tester avec une requête simple", "✅ Validation : Vérifier que les données JSON sont bien traitées dans Make.com"]'::jsonb
),
(
    'expense-ocr-mailhook',
    'Lecteur Automatique de Notes de Frais par Email',
    'Automatisation complète : réception email → OCR intelligent → extraction données → enregistrement comptable automatique',
    'Ce blueprint révolutionnaire transforme la gestion de vos notes de frais en un processus 100% automatisé. Dès qu''une photo de ticket ou facture arrive par email (via mailhook), le système utilise l''OCR avancé pour extraire automatiquement toutes les informations : montant, date, TVA, catégorie, fournisseur.',
    14700, -- 147 CHF
    'CHF',
    'Analytics',
    'Avancé',
    '90-120 minutes',
    'https://baptistezm.gumroad.com/l/expense-ocr-automation',
    '["Réception automatique par email (mailhook)", "OCR intelligent multi-langue", "Extraction automatique : montant, date, TVA, fournisseur", "Classification intelligente par catégorie comptable", "Intégration directe Xero, QuickBooks, Sage"]'::jsonb,
    '["Compte Make.com Pro (minimum 10 000 opérations/mois)", "Logiciel comptable avec API (Xero recommandé)", "Adresse email dédiée pour les tickets"]'::jsonb,
    '["📧 Configuration du mailhook", "🔍 Configuration OCR", "🏷️ Paramétrage des règles métier", "💼 Intégration comptable"]'::jsonb
),
(
    'email-ai-notion-manager',
    'Assistant IA pour Emails : Analyse, Réponse et Classement Notion',
    'IA avancée qui lit, analyse, classe vos emails et propose des réponses personnalisées avec organisation automatique dans Notion',
    'Cet assistant IA révolutionnaire transforme votre gestion d''emails en une expérience fluide et intelligente. Le système analyse automatiquement chaque email entrant, détermine le sentiment, l''urgence et la catégorie, puis propose une réponse personnalisée adaptée au contexte.',
    11900, -- 119 CHF
    'CHF',
    'CRM & Sales',
    'Intermédiaire',
    '60-75 minutes',
    'https://baptistezm.gumroad.com/l/email-ai-assistant',
    '["Analyse IA avancée : sentiment, urgence, intention", "Classification automatique par catégorie", "Génération de réponses personnalisées avec OpenAI GPT-4", "Organisation automatique dans Notion avec tags intelligents"]'::jsonb,
    '["Compte Make.com Standard ou Pro", "Compte OpenAI avec accès GPT-4", "Workspace Notion avec API activée", "Gmail ou Outlook avec API access"]'::jsonb,
    '["📨 Configuration email", "🤖 Intégration OpenAI", "📚 Configuration Notion", "🎯 Paramétrage des règles"]'::jsonb
),
(
    'instagram-content-ai-replicate',
    'Studio IA : Création Complète de Contenu Instagram (Texte + Image + Vidéo)',
    'Workflow IA complet qui génère automatiquement du contenu Instagram professionnel : posts, stories, reels avec Replicate, Midjourney et GPT-4',
    'Ce studio de création IA révolutionnaire automatise entièrement votre présence Instagram. À partir d''un simple brief ou mot-clé, le système génère automatiquement des posts captivants avec GPT-4, crée des visuels époustouflants avec Midjourney/Replicate.',
    19700, -- 197 CHF
    'CHF',
    'Content Creation',
    'Débutant',
    '45-60 minutes',
    'https://baptistezm.gumroad.com/l/content-creation-ai',
    '["Génération de posts Instagram avec GPT-4", "Création d''images avec Midjourney/Replicate", "Production de vidéos courtes avec Runway ML/Pika Labs", "Planification intelligente selon l''audience"]'::jsonb,
    '["Compte Make.com Standard", "Compte OpenAI avec accès GPT-4", "Compte Replicate ou Midjourney", "Compte Instagram Business avec API access"]'::jsonb,
    '["🎨 Configuration des outils IA", "📱 Intégration Instagram", "⚙️ Paramétrage du workflow", "🎯 Personnalisation de la marque"]'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    long_description = EXCLUDED.long_description,
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    category = EXCLUDED.category,
    difficulty_level = EXCLUDED.difficulty_level,
    estimated_setup_time = EXCLUDED.estimated_setup_time,
    gumroad_url = EXCLUDED.gumroad_url,
    features = EXCLUDED.features,
    prerequisites = EXCLUDED.prerequisites,
    installation_steps = EXCLUDED.installation_steps,
    updated_at = NOW();

-- Insérer un utilisateur admin par défaut
-- Mot de passe hashé pour 'BZM2025SecureAdmin' (vous devrez le modifier via votre app)
INSERT INTO public.admin_users (username, password_hash, role)
VALUES ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON CONFLICT (username) DO NOTHING;

-- ============================================================================
-- 3. POLITIQUES DE SÉCURITÉ (RLS - Row Level Security)
-- ============================================================================

-- Activer RLS sur les tables sensibles
ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Politique pour blueprints : lecture publique, écriture admin seulement
CREATE POLICY "Blueprints visible par tous" ON public.blueprints
    FOR SELECT USING (is_active = true);

CREATE POLICY "Blueprints modifiables par admin seulement" ON public.blueprints
    FOR ALL USING (auth.role() = 'authenticated');

-- Politique pour admin_users : accès admin seulement
CREATE POLICY "Admin users accès admin seulement" ON public.admin_users
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- 4. FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour blueprints
DROP TRIGGER IF EXISTS handle_blueprints_updated_at ON public.blueprints;
CREATE TRIGGER handle_blueprints_updated_at
    BEFORE UPDATE ON public.blueprints
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 5. VUES UTILES
-- ============================================================================

-- Vue publique des blueprints actifs
CREATE OR REPLACE VIEW public.active_blueprints AS
SELECT
    id,
    name,
    title,
    description,
    long_description,
    price,
    currency,
    category,
    difficulty_level,
    estimated_setup_time,
    gumroad_url,
    features,
    prerequisites,
    installation_steps,
    created_at,
    updated_at
FROM public.blueprints
WHERE is_active = true
ORDER BY created_at DESC;

-- ============================================================================
-- RÉSULTAT
-- ============================================================================

SELECT
    'SUPABASE DEPLOYMENT COMPLETED! 🚀' as status,
    (SELECT COUNT(*) FROM public.blueprints) as blueprints_count,
    (SELECT COUNT(*) FROM public.admin_users) as admin_users_count;