const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware - Configuration CORS sécurisée
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://votre-domaine.com'] // Remplacer par votre domaine
    : ['http://localhost:3001', 'http://127.0.0.1:3001'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// HTTPS redirect middleware for production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Advanced logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '🔴' : res.statusCode >= 300 ? '🟡' : '🟢';
    console.log(`${statusColor} ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);

    // Log suspicious requests
    if (req.url.includes('../') || req.url.includes('<script') || req.url.includes('eval(')) {
      console.log(`🚨 SUSPICIOUS REQUEST: ${req.ip} - ${req.method} ${req.url}`);
    }
  });

  next();
});

// Headers de sécurité
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Enhanced CSP for production with Make.com and Stripe support
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.gumroad.com https://*.make.com; " +
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com; " +
    "form-action 'self' https://*.gumroad.com; " +
    "frame-ancestors 'none'"
  );

  // HTTPS enforcement for production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('X-Forwarded-Proto', 'https');
  }

  next();
});

app.use(express.json({ limit: '10mb' })); // Limit request size
app.use(express.static(__dirname)); // Serve static files from current directory

// Basic rate limiting
const requestCounts = new Map();
function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100; // max requests per window

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const ipData = requestCounts.get(ip);
  if (now > ipData.resetTime) {
    ipData.count = 1;
    ipData.resetTime = now + windowMs;
    return next();
  }

  if (ipData.count >= maxRequests) {
    return res.status(429).json({ error: 'Trop de requêtes' });
  }

  ipData.count++;
  next();
}

app.use(rateLimiter);

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_jwt_ultra_securise_a_changer';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Admin users store (in production, use a database)
const adminUsers = new Map();

// Initialize default admin user
const defaultAdminHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
adminUsers.set(process.env.ADMIN_USERNAME || 'admin', {
  username: process.env.ADMIN_USERNAME || 'admin',
  passwordHash: defaultAdminHash,
  role: 'admin',
  createdAt: new Date()
});

// JWT auth middleware for admin routes
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Token d\'authentification requis'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = adminUsers.get(decoded.username);

    if (!user || user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'Token invalide ou utilisateur non autorisé'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('Erreur vérification JWT:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Token invalide ou expiré'
    });
  }
}

// Input validation helpers
function validateBlueprint(blueprint) {
  const required = ['title', 'description', 'price', 'category'];
  const missing = required.filter(field => !blueprint[field]);

  if (missing.length > 0) {
    throw new Error(`Champs manquants: ${missing.join(', ')}`);
  }

  if (typeof blueprint.price !== 'number' || blueprint.price <= 0) {
    throw new Error('Le prix doit être un nombre positif');
  }

  // Sanitize strings
  const stringFields = ['title', 'description', 'category'];
  stringFields.forEach(field => {
    if (typeof blueprint[field] === 'string') {
      blueprint[field] = blueprint[field].trim().substring(0, 1000); // Limit length
    }
  });

  return blueprint;
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers JSON sont autorisés'), false);
    }
  }
});

// In-memory storage for demo purposes (use a real database in production)
const blueprints = new Map();

// Sample blueprint data
const sampleBlueprints = {
  'lead-generation-system': {
    id: 'lead-generation-system',
    title: 'Système de Génération de Leads',
    description: 'Automatisation complète pour capturer, qualifier et nourrir vos prospects automatiquement',
    long_description: 'Ce blueprint révolutionnaire transforme votre processus de génération de leads en une machine automatisée ultra-performante. Fini la perte de prospects, les relances manuelles et les opportunités manquées. Ce système capture chaque visiteur, qualifie automatiquement son potentiel et lance des séquences de nurturing personnalisées selon son profil et comportement.',
    price: 97,
    currency: 'eur',
    category: 'Lead Generation',
    difficulty_level: 'Intermédiaire',
    estimated_setup_time: '60-90 minutes',
    gumroad_url: 'https://gumroad.com/l/lead-generation-system',
    features: [
      'Capture automatique via formulaires web',
      'Qualification intelligente par scoring',
      'Nurturing personnalisé selon profil',
      'Intégration CRM native',
      'Reporting avancé'
    ],
    prerequisites: [
      'Compte Make.com Standard ou Pro',
      'CRM (HubSpot, Salesforce ou Pipedrive)',
      'Email marketing (Mailchimp, ActiveCampaign)',
      'Formulaires web (Typeform, Gravity Forms)'
    ],
    installation_steps: [
      'Vérification des comptes et APIs nécessaires',
      'Import du blueprint dans Make.com',
      'Configuration des connexions',
      'Test et validation du workflow',
      'Formation équipe'
    ]
  },
  'expense-ocr-automation': {
    id: 'expense-ocr-automation',
    title: 'Lecteur Automatique de Notes de Frais par Email',
    description: 'Automatisation complète : réception email → OCR intelligent → extraction données → enregistrement comptable automatique',
    long_description: 'Ce blueprint révolutionnaire transforme la gestion de vos notes de frais en un processus 100% automatisé. Vos collaborateurs envoient simplement leurs reçus par email et le système se charge du reste : lecture OCR, extraction des données, classification comptable et saisie automatique dans votre logiciel. Plus de perte de temps ni d\'erreurs manuelles.',
    price: 147,
    currency: 'eur',
    category: 'Analytics',
    difficulty_level: 'Avancé',
    estimated_setup_time: '90-120 minutes',
    gumroad_url: 'https://gumroad.com/l/expense-ocr-automation',
    features: [
      'Réception automatique par email (mailhook)',
      'OCR intelligent multi-langue',
      'Classification intelligente par catégorie comptable',
      'Validation automatique des montants',
      'Export vers logiciels comptables'
    ],
    prerequisites: [
      'Compte Make.com Pro (minimum 10 000 opérations/mois)',
      'Logiciel comptable avec API (Xero recommandé)',
      'API OCR (Google Vision ou AWS Textract)',
      'Boîte email dédiée aux reçus'
    ],
    installation_steps: [
      'Configuration du mailhook',
      'Configuration OCR',
      'Paramétrage des règles métier',
      'Test avec échantillon',
      'Mise en production'
    ]
  },
  'email-ai-assistant': {
    id: 'email-ai-assistant',
    title: 'Assistant IA pour Emails : Analyse, Réponse et Classement Notion',
    description: 'IA avancée qui lit, analyse, classe vos emails et propose des réponses personnalisées avec organisation automatique dans Notion',
    long_description: 'Cet assistant IA révolutionnaire transforme votre gestion d\'emails en une expérience fluide et intelligente. Il analyse automatiquement chaque email reçu, détecte l\'intention, le sentiment et l\'urgence, puis génère des réponses adaptées à votre style. Tout est automatiquement classé et organisé dans Notion pour un suivi parfait.',
    price: 119,
    currency: 'eur',
    category: 'CRM & Sales',
    difficulty_level: 'Intermédiaire',
    estimated_setup_time: '60-75 minutes',
    gumroad_url: 'https://gumroad.com/l/email-ai-assistant',
    features: [
      'Analyse IA avancée : sentiment, urgence, intention',
      'Génération de réponses personnalisées avec OpenAI GPT-4',
      'Organisation automatique dans Notion',
      'Détection automatique des tâches',
      'Suivi des conversations'
    ],
    prerequisites: [
      'Compte Make.com Standard ou Pro',
      'Compte OpenAI avec accès GPT-4',
      'Workspace Notion avec API activée',
      'Boîte email Gmail ou Outlook'
    ],
    installation_steps: [
      'Configuration email',
      'Intégration OpenAI',
      'Configuration Notion',
      'Paramétrage des templates',
      'Test et ajustements'
    ]
  },
  'content-creation-ai': {
    id: 'content-creation-ai',
    title: 'Studio IA : Création Complète de Contenu Instagram (Texte + Image + Vidéo)',
    description: 'Workflow IA complet qui génère automatiquement du contenu Instagram professionnel : posts, stories, reels avec Replicate, Midjourney et GPT-4',
    long_description: 'Ce studio de création IA révolutionnaire automatise entièrement votre présence Instagram. Définissez votre thème et votre style, le système génère automatiquement des posts engageants, crée des visuels saisissants et produit des vidéos courtes captivantes. Le tout programmé et publié automatiquement selon votre calendrier.',
    price: 197,
    currency: 'eur',
    category: 'Content Creation',
    difficulty_level: 'Débutant',
    estimated_setup_time: '45-60 minutes',
    gumroad_url: 'https://gumroad.com/l/content-creation-ai',
    features: [
      'Génération de posts Instagram avec GPT-4',
      'Création d\'images avec Midjourney/Replicate',
      'Production de vidéos courtes avec Runway ML/Pika Labs',
      'Planification automatique',
      'Analytics de performance'
    ],
    prerequisites: [
      'Compte Make.com Standard',
      'Compte OpenAI avec accès GPT-4',
      'Compte Replicate ou Midjourney',
      'Compte Instagram Business'
    ],
    installation_steps: [
      'Configuration des outils IA',
      'Intégration Instagram',
      'Paramétrage du workflow',
      'Test de génération',
      'Programmation automatique'
    ]
  }
};

// Initialize blueprints in memory
Object.values(sampleBlueprints).forEach(blueprint => {
  blueprints.set(blueprint.id, blueprint);
});

// API Routes

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Nom d\'utilisateur et mot de passe requis'
      });
    }

    const user = adminUsers.get(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Identifiants invalides'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Identifiants invalides'
      });
    }

    const token = jwt.sign(
      {
        username: user.username,
        role: user.role,
        iat: Date.now()
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      user: {
        username: user.username,
        role: user.role
      },
      message: 'Connexion réussie'
    });

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la connexion'
    });
  }
});

app.post('/api/auth/verify', (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token manquant'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = adminUsers.get(decoded.username);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      user: {
        username: user.username,
        role: user.role
      },
      message: 'Token valide'
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Token invalide ou expiré'
    });
  }
});

// Blueprints
app.get('/api/blueprints', async (req, res) => {
  try {
    const allBlueprints = Array.from(blueprints.values());
    res.json({
      success: true,
      blueprints: allBlueprints
    });
  } catch (error) {
    console.error('Erreur récupération blueprints:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération des blueprints'
    });
  }
});

// Get specific blueprint
app.get('/api/blueprints/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const blueprint = blueprints.get(id);

    if (!blueprint) {
      return res.status(404).json({
        success: false,
        error: 'Blueprint non trouvé'
      });
    }

    res.json({
      success: true,
      blueprint
    });
  } catch (error) {
    console.error('Erreur récupération blueprint:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

// Admin routes for blueprint management (protected)
app.post('/api/admin/blueprints', requireAuth, async (req, res) => {
  try {
    const blueprint = validateBlueprint(req.body);
    blueprint.id = blueprint.id || Date.now().toString();

    blueprints.set(blueprint.id, blueprint);

    res.json({
      success: true,
      blueprint,
      message: 'Blueprint créé avec succès'
    });
  } catch (error) {
    console.error('Erreur création blueprint:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du blueprint'
    });
  }
});

app.put('/api/admin/blueprints/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBlueprint = validateBlueprint({ ...req.body, id });

    if (!blueprints.has(id)) {
      return res.status(404).json({
        success: false,
        error: 'Blueprint non trouvé'
      });
    }

    blueprints.set(id, updatedBlueprint);

    res.json({
      success: true,
      blueprint: updatedBlueprint,
      message: 'Blueprint mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur mise à jour blueprint:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du blueprint'
    });
  }
});

app.delete('/api/admin/blueprints/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!blueprints.has(id)) {
      return res.status(404).json({
        success: false,
        error: 'Blueprint non trouvé'
      });
    }

    blueprints.delete(id);

    res.json({
      success: true,
      message: 'Blueprint supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression blueprint:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du blueprint'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Serveur Blueprint Store opérationnel',
    timestamp: new Date().toISOString(),
    mode: 'Gumroad Redirects'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Erreur non gérée:', err);
  res.status(500).json({
    success: false,
    error: 'Erreur interne du serveur'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint non trouvé'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Blueprint Store Server démarré sur le port ${PORT}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🎯 Mode: Gumroad Redirects (Stripe supprimé)`);
  console.log(`📦 Blueprints chargés: ${blueprints.size}`);
});

module.exports = app;