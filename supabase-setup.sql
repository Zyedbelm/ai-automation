-- Configuration des tables Supabase pour Blueprint Store
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Table principale des blueprints
CREATE TABLE blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  long_description TEXT,
  price INTEGER NOT NULL, -- Prix en centimes
  currency VARCHAR(3) DEFAULT 'eur',
  category VARCHAR(100),
  difficulty_level VARCHAR(50), -- 'Débutant', 'Intermédiaire', 'Avancé'
  estimated_setup_time VARCHAR(50), -- '30-45 minutes'

  -- Statut et visibilité
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'published', 'archived'

  -- Fichiers et ressources
  blueprint_file_url TEXT, -- URL du fichier JSON dans Supabase Storage
  preview_image_url TEXT,  -- Image de prévisualisation

  -- Métadonnées
  tags TEXT[], -- Array de tags
  prerequisites TEXT[], -- Prérequis techniques
  features TEXT[], -- Liste des fonctionnalités

  -- Analytics
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  rating_average DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID, -- Référence à auth.users si nécessaire
  updated_by UUID
);

-- 2. Table des guides d'installation
CREATE TABLE blueprint_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID REFERENCES blueprints(id) ON DELETE CASCADE,

  -- Contenu du guide
  installation_steps JSONB, -- Structure JSON des étapes
  troubleshooting JSONB,    -- Section dépannage
  best_practices TEXT[],    -- Bonnes pratiques

  -- Prérequis détaillés
  required_make_plan VARCHAR(100),
  required_integrations TEXT[],
  technical_knowledge_level VARCHAR(100),

  -- Support
  video_tutorial_url TEXT,
  documentation_url TEXT,
  support_email VARCHAR(255),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table des achats/transactions
CREATE TABLE blueprint_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Références
  blueprint_id UUID REFERENCES blueprints(id),
  customer_email VARCHAR(255) NOT NULL,

  -- Informations de paiement
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  amount INTEGER NOT NULL, -- Prix payé en centimes
  currency VARCHAR(3) DEFAULT 'eur',
  payment_status VARCHAR(50), -- 'pending', 'succeeded', 'failed', 'refunded'

  -- Accès et sécurité
  access_token TEXT,
  download_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 3,

  -- Métadonnées
  customer_data JSONB, -- Informations client additionnelles

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table des évaluations/avis
CREATE TABLE blueprint_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID REFERENCES blueprints(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES blueprint_purchases(id),

  -- Évaluation
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  review_text TEXT,

  -- Métadonnées
  reviewer_email VARCHAR(255),
  is_verified_purchase BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table des catégories
CREATE TABLE blueprint_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(100), -- Nom de l'icône
  color VARCHAR(7), -- Code couleur hex
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Table des variables d'environnement des blueprints
CREATE TABLE blueprint_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID REFERENCES blueprints(id) ON DELETE CASCADE,

  variable_name VARCHAR(255) NOT NULL,
  variable_type VARCHAR(50), -- 'secret', 'string', 'number', 'boolean'
  description TEXT,
  default_value TEXT,
  is_required BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Table de configuration générale
CREATE TABLE site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB,
  description TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX idx_blueprints_status ON blueprints(status);
CREATE INDEX idx_blueprints_category ON blueprints(category);
CREATE INDEX idx_blueprints_is_active ON blueprints(is_active);
CREATE INDEX idx_blueprints_created_at ON blueprints(created_at DESC);
CREATE INDEX idx_purchases_email ON blueprint_purchases(customer_email);
CREATE INDEX idx_purchases_payment_intent ON blueprint_purchases(stripe_payment_intent_id);
CREATE INDEX idx_reviews_blueprint ON blueprint_reviews(blueprint_id);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_blueprints_updated_at
    BEFORE UPDATE ON blueprints
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blueprint_guides_updated_at
    BEFORE UPDATE ON blueprint_guides
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blueprint_purchases_updated_at
    BEFORE UPDATE ON blueprint_purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Politique de sécurité Row Level Security (optionnel)
-- ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE blueprint_guides ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE blueprint_purchases ENABLE ROW LEVEL SECURITY;

-- Données initiales - Catégories
INSERT INTO blueprint_categories (name, slug, description, icon, color) VALUES
('Lead Generation', 'lead-generation', 'Automatisations pour capturer et qualifier vos prospects', '🎯', '#3B82F6'),
('Social Media', 'social-media', 'Gestion automatisée de vos réseaux sociaux', '📱', '#8B5CF6'),
('E-commerce', 'ecommerce', 'Automatisations pour boutiques en ligne', '🛒', '#10B981'),
('CRM & Sales', 'crm-sales', 'Optimisation des processus de vente', '💼', '#F59E0B'),
('Marketing', 'marketing', 'Campagnes marketing automatisées', '📊', '#EF4444'),
('Analytics', 'analytics', 'Reporting et analyse automatisés', '📈', '#6366F1'),
('Customer Support', 'customer-support', 'Support client automatisé', '🎧', '#14B8A6'),
('Content Creation', 'content-creation', 'Création de contenu automatisée', '✍️', '#F97316');

-- Données initiales - Configuration du site
INSERT INTO site_settings (key, value, description) VALUES
('site_name', '"Blueprint Store"', 'Nom du site'),
('site_description', '"Marketplace d\'automatisations Make.com premium"', 'Description du site'),
('contact_email', '"support@blueprint-store.com"', 'Email de contact'),
('stripe_webhook_secret', '""', 'Secret du webhook Stripe'),
('max_downloads_per_purchase', '3', 'Nombre maximum de téléchargements par achat'),
('token_expiry_hours', '24', 'Durée de validité des tokens en heures');

-- Données d'exemple - Blueprints
INSERT INTO blueprints (
  name, title, description, long_description, price, category, difficulty_level,
  estimated_setup_time, is_active, is_featured, status, tags, prerequisites, features
) VALUES (
  'lead-generation-system',
  'Système de Génération de Leads Avancé',
  'Automatisation complète pour capturer, qualifier et nourrir vos prospects automatiquement',
  'Ce blueprint transforme votre processus de génération de leads en une machine bien huilée. Il capture automatiquement les prospects depuis vos formulaires web, les qualifie selon vos critères personnalisés, enrichit leurs données avec des sources externes, et lance des séquences email personnalisées. Le système inclut également un scoring intelligent, une attribution territoriale automatique, et des notifications temps réel pour votre équipe commerciale.',
  9700, -- 97€
  'Lead Generation',
  'Intermédiaire',
  '45-60 minutes',
  true,
  true,
  'published',
  ARRAY['leads', 'crm', 'email-marketing', 'automation', 'scoring'],
  ARRAY['Compte Make.com Pro', 'CRM (HubSpot/Salesforce)', 'Outil email marketing', 'Formulaires web'],
  ARRAY['Capture automatique des leads', 'Qualification intelligente par scoring', 'Enrichissement automatique des données', 'Séquences email personnalisées', 'Attribution territoriale', 'Notifications Slack', 'Rapports analytics détaillés', 'Gestion des doublons']
), (
  'social-media-automation',
  'Automatisation Réseaux Sociaux Pro',
  'Publiez, engagez et analysez vos performances sur tous vos réseaux sociaux automatiquement',
  'Une solution complète pour automatiser votre présence sur les réseaux sociaux. Ce blueprint gère la publication multi-plateformes, la planification intelligente de contenu, les réponses automatiques aux mentions et messages, l\'analyse de sentiment des interactions, et génère des rapports de performance détaillés. Idéal pour les entrepreneurs et agences qui veulent maintenir une présence active sans y passer des heures.',
  6700, -- 67€
  'Social Media',
  'Débutant',
  '30-45 minutes',
  true,
  true,
  'published',
  ARRAY['social-media', 'content', 'automation', 'engagement', 'analytics'],
  ARRAY['Compte Make.com', 'Comptes réseaux sociaux', 'Outil de planification'],
  ARRAY['Publication multi-plateformes', 'Planification intelligente', 'Réponses automatiques aux mentions', 'Analyse de sentiment', 'Rapports de performance', 'Gestion des hashtags optimisée', 'Suivi des KPIs', 'Alertes de mention']
);

-- Insertion des guides d'installation correspondants
INSERT INTO blueprint_guides (blueprint_id, installation_steps, troubleshooting, best_practices, required_make_plan, required_integrations, technical_knowledge_level) VALUES (
  (SELECT id FROM blueprints WHERE name = 'lead-generation-system'),
  '{
    "steps": [
      {
        "step": 1,
        "title": "Prérequis et préparation",
        "description": "Vérification des comptes et APIs nécessaires",
        "tasks": [
          "Vérifier que vous avez un compte Make.com Pro ou supérieur",
          "Créer un token API HubSpot avec les permissions contacts",
          "Configurer un webhook Slack (optionnel)",
          "Préparer une feuille Google Sheets pour les analytics"
        ]
      },
      {
        "step": 2,
        "title": "Import du blueprint",
        "description": "Installation du blueprint dans Make.com",
        "tasks": [
          "Se connecter à Make.com",
          "Cliquer sur Create a new scenario",
          "Sélectionner Import Blueprint",
          "Uploader le fichier JSON téléchargé"
        ]
      }
    ]
  }'::jsonb,
  '{
    "issues": [
      {
        "issue": "Les leads ne sont pas créés dans HubSpot",
        "solutions": ["Vérifier le token API HubSpot", "Contrôler les permissions du token"]
      }
    ]
  }'::jsonb,
  ARRAY['Commencer par tester avec un petit volume', 'Surveiller les logs les premiers jours'],
  'Pro ou supérieur',
  ARRAY['HubSpot CRM', 'Mailchimp', 'Slack'],
  'Intermédiaire - Interface graphique Make.com'
);

COMMIT;