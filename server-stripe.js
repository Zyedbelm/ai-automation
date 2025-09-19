const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_demo_key');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from current directory

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
const payments = new Map();
const blueprints = new Map();

// Sample blueprint data
const sampleBlueprints = {
  'lead-generation-system': {
    id: 'lead-generation-system',
    title: 'Système de Génération de Leads',
    description: 'Automatisation complète pour capturer, qualifier et nourrir vos prospects automatiquement',
    price: 97,
    currency: 'eur',
    features: [
      'Capture automatique des leads',
      'Qualification intelligente par scoring',
      'Séquences email personnalisées',
      'Intégration CRM native',
      'Rapports et analytics détaillés',
      'Support et mises à jour inclus'
    ],
    file_url: null // Will be set when file is uploaded
  },
  'social-media-automation': {
    id: 'social-media-automation',
    title: 'Automatisation Réseaux Sociaux',
    description: 'Publiez, engagez et analysez vos performances sur tous vos réseaux sociaux automatiquement',
    price: 67,
    currency: 'eur',
    features: [
      'Publication multi-plateformes',
      'Planification intelligente',
      'Réponses automatiques aux mentions',
      'Analyse de sentiment',
      'Rapports de performance',
      'Gestion des hashtags optimisée'
    ],
    file_url: null
  }
};

// Initialize sample data
Object.values(sampleBlueprints).forEach(blueprint => {
  blueprints.set(blueprint.id, blueprint);
});

// Routes

/**
 * Get all available blueprints
 */
app.get('/api/blueprints', async (req, res) => {
  try {
    const blueprintList = Array.from(blueprints.values()).map(bp => ({
      ...bp,
      file_url: undefined // Don't expose file URLs
    }));

    res.json({
      success: true,
      data: blueprintList
    });
  } catch (error) {
    console.error('Error fetching blueprints:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des blueprints'
    });
  }
});

/**
 * Create Stripe checkout session
 */
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { blueprintId } = req.body;

    if (!blueprintId) {
      return res.status(400).json({
        success: false,
        error: 'Blueprint ID requis'
      });
    }

    // Verify blueprint exists
    const blueprint = blueprints.get(blueprintId) || sampleBlueprints[blueprintId];
    if (!blueprint) {
      return res.status(404).json({
        success: false,
        error: 'Blueprint non trouvé'
      });
    }

    // Map blueprint IDs to Stripe Price IDs (chargés depuis .env)
    const stripePriceIds = {
      'test-blueprint-1euro': process.env.STRIPE_PRICE_TEST,
      'expense-ocr-automation': process.env.STRIPE_PRICE_EXPENSE,
      'email-ai-assistant': process.env.STRIPE_PRICE_EMAIL,
      'content-creation-ai': process.env.STRIPE_PRICE_INSTAGRAM
    };

    const priceId = stripePriceIds[blueprintId];
    if (!priceId) {
      return res.status(400).json({
        success: false,
        error: `Prix Stripe non configuré pour le blueprint: ${blueprintId}`
      });
    }

    // Create Stripe checkout session with existing products
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin}/stripe-success.html?blueprint=${blueprintId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/marketplace.html?cancelled=true`,
      metadata: {
        blueprintId: blueprintId,
        blueprintTitle: blueprint.title || blueprintId
      },
    });

    res.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la session de paiement'
    });
  }
});

/**
 * Create a payment intent with Stripe
 */
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { blueprintId, amount, currency = 'eur' } = req.body;

    if (!blueprintId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Blueprint ID et montant requis'
      });
    }

    // Verify blueprint exists and price matches
    const blueprint = blueprints.get(blueprintId);
    if (!blueprint) {
      return res.status(404).json({
        success: false,
        error: 'Blueprint non trouvé'
      });
    }

    if (amount !== blueprint.price * 100) {
      return res.status(400).json({
        success: false,
        error: 'Montant incorrect'
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      metadata: {
        blueprintId: blueprintId,
        blueprintTitle: blueprint.title
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Store payment info temporarily
    payments.set(paymentIntent.id, {
      blueprintId,
      amount,
      currency,
      status: 'pending',
      created: new Date()
    });

    res.json({
      success: true,
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du paiement'
    });
  }
});

/**
 * Verify Stripe checkout session
 */
app.get('/api/verify-checkout-session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID requis'
      });
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const blueprintId = session.metadata.blueprintId;

      res.json({
        success: true,
        payment_status: 'completed',
        blueprint_id: blueprintId,
        session: {
          id: session.id,
          amount_total: session.amount_total,
          currency: session.currency,
          customer_email: session.customer_details?.email
        }
      });
    } else {
      res.json({
        success: false,
        payment_status: session.payment_status || 'pending',
        error: 'Paiement non confirmé'
      });
    }

  } catch (error) {
    console.error('Error verifying checkout session:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification du paiement'
    });
  }
});

/**
 * Confirm payment and grant access
 */
app.post('/confirm-payment', async (req, res) => {
  try {
    const { payment_intent_id } = req.body;

    if (!payment_intent_id) {
      return res.status(400).json({
        success: false,
        error: 'Payment intent ID requis'
      });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status === 'succeeded') {
      // Update local payment status
      const payment = payments.get(payment_intent_id);
      if (payment) {
        payment.status = 'completed';
        payment.completedAt = new Date();

        // Generate access token
        const accessToken = generateAccessToken(payment.blueprintId, payment_intent_id);
        payment.accessToken = accessToken;

        // Store in Supabase for persistence (optional)
        try {
          await supabase
            .from('blueprint_purchases')
            .insert({
              payment_intent_id: payment_intent_id,
              blueprint_id: payment.blueprintId,
              amount: payment.amount,
              currency: payment.currency,
              status: 'completed',
              access_token: accessToken
            });
        } catch (dbError) {
          console.warn('Failed to store in database:', dbError);
          // Continue anyway since payment is successful
        }

        res.json({
          success: true,
          access_token: accessToken,
          blueprint_id: payment.blueprintId
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Paiement non trouvé'
        });
      }
    } else {
      res.status(400).json({
        success: false,
        error: 'Paiement non confirmé'
      });
    }

  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la confirmation du paiement'
    });
  }
});

/**
 * Upload blueprint file to Supabase
 */
app.post('/admin/upload-blueprint/:blueprintId', upload.single('blueprint'), async (req, res) => {
  try {
    const { blueprintId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'Aucun fichier fourni'
      });
    }

    const blueprint = blueprints.get(blueprintId);
    if (!blueprint) {
      return res.status(404).json({
        success: false,
        error: 'Blueprint non trouvé'
      });
    }

    // Validate JSON
    try {
      JSON.parse(file.buffer.toString());
    } catch (jsonError) {
      return res.status(400).json({
        success: false,
        error: 'Fichier JSON invalide'
      });
    }

    // Upload to Supabase Storage
    const fileName = `${blueprintId}-${Date.now()}.json`;
    const { data, error } = await supabase.storage
      .from('blueprints')
      .upload(fileName, file.buffer, {
        contentType: 'application/json',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('blueprints')
      .getPublicUrl(fileName);

    // Update blueprint with file URL
    blueprint.file_url = publicUrl;
    blueprint.file_name = fileName;
    blueprints.set(blueprintId, blueprint);

    res.json({
      success: true,
      message: 'Blueprint uploadé avec succès',
      file_url: publicUrl,
      file_name: fileName
    });

  } catch (error) {
    console.error('Error uploading blueprint:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload du blueprint'
    });
  }
});

/**
 * Download blueprint (requires valid access token)
 */
app.get('/download-blueprint/:blueprintId', async (req, res) => {
  try {
    const { blueprintId } = req.params;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token d\'accès requis'
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    if (!verifyAccessToken(token, blueprintId)) {
      return res.status(403).json({
        success: false,
        error: 'Token d\'accès invalide'
      });
    }

    const blueprint = blueprints.get(blueprintId);
    if (!blueprint || !blueprint.file_url) {
      return res.status(404).json({
        success: false,
        error: 'Blueprint non trouvé ou fichier non disponible'
      });
    }

    // For demo purposes, return a sample JSON
    // In production, you would download from Supabase Storage
    const sampleBlueprint = {
      name: blueprint.title,
      description: blueprint.description,
      version: "1.0.0",
      created: new Date().toISOString(),
      modules: [
        {
          id: "webhook-listener",
          type: "webhook",
          name: "Lead Capture Webhook",
          config: {
            method: "POST",
            path: "/webhook/lead-capture"
          }
        },
        {
          id: "data-processor",
          type: "transformer",
          name: "Data Processing",
          config: {
            fields: ["email", "name", "company", "phone"]
          }
        },
        {
          id: "crm-integration",
          type: "http",
          name: "CRM Integration",
          config: {
            url: "https://api.hubspot.com/crm/v3/objects/contacts",
            method: "POST"
          }
        },
        {
          id: "email-sequence",
          type: "email",
          name: "Welcome Email Sequence",
          config: {
            template: "welcome-sequence",
            delay: "1h"
          }
        }
      ],
      connections: [
        {
          from: "webhook-listener",
          to: "data-processor"
        },
        {
          from: "data-processor",
          to: "crm-integration"
        },
        {
          from: "crm-integration",
          to: "email-sequence"
        }
      ],
      settings: {
        error_handling: "continue",
        max_executions: 1000,
        timeout: 300
      }
    };

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${blueprintId}-blueprint.json"`);

    res.json(sampleBlueprint);

  } catch (error) {
    console.error('Error downloading blueprint:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du téléchargement'
    });
  }
});

/**
 * Stripe webhook handler
 */
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Payment succeeded:', paymentIntent.id);

      // Update payment status
      const payment = payments.get(paymentIntent.id);
      if (payment) {
        payment.status = 'completed';
        payment.completedAt = new Date();

        // Generate access token
        const accessToken = generateAccessToken(payment.blueprintId, paymentIntent.id);
        payment.accessToken = accessToken;

        // Store in database
        try {
          await supabase
            .from('blueprint_purchases')
            .insert({
              payment_intent_id: paymentIntent.id,
              blueprint_id: payment.blueprintId,
              amount: payment.amount,
              currency: payment.currency,
              status: 'completed',
              access_token: accessToken
            });
        } catch (dbError) {
          console.error('Failed to store purchase in database:', dbError);
        }
      }
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.id);

      const failedPaymentData = payments.get(failedPayment.id);
      if (failedPaymentData) {
        failedPaymentData.status = 'failed';
        failedPaymentData.failedAt = new Date();
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Utility functions

/**
 * Generate access token for blueprint download
 */
function generateAccessToken(blueprintId, paymentIntentId) {
  const payload = {
    blueprintId,
    paymentIntentId,
    timestamp: Date.now()
  };

  // In production, use proper JWT signing
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Verify access token
 */
function verifyAccessToken(token, blueprintId) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());

    // Check if token is for the correct blueprint
    if (payload.blueprintId !== blueprintId) {
      return false;
    }

    // Check if token is not expired (24 hours)
    const tokenAge = Date.now() - payload.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (tokenAge > maxAge) {
      return false;
    }

    // Verify payment exists and is completed
    const payment = payments.get(payload.paymentIntentId);
    return payment && payment.status === 'completed';

  } catch (error) {
    return false;
  }
}

// Create blueprints table in Supabase on startup (if it doesn't exist)
async function initializeDatabase() {
  try {
    // Create table for storing blueprint purchases
    const { error } = await supabase
      .from('blueprint_purchases')
      .select('*')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      // Table doesn't exist, but we can't create it via client
      console.log('Note: blueprint_purchases table should be created in Supabase dashboard');
      console.log('SQL: CREATE TABLE blueprint_purchases (id SERIAL PRIMARY KEY, payment_intent_id TEXT UNIQUE, blueprint_id TEXT, amount INTEGER, currency TEXT, status TEXT, access_token TEXT, created_at TIMESTAMP DEFAULT NOW());');
    }
  } catch (error) {
    console.warn('Database initialization check failed:', error.message);
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Fichier trop volumineux (max 10MB)'
      });
    }
  }

  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Erreur serveur interne'
  });
});

// Start server
async function startServer() {
  await initializeDatabase();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Blueprint store: http://localhost:${PORT}/blueprint-store.html`);
    console.log(`🔧 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 API base: http://localhost:${PORT}/api`);
  });
}

startServer().catch(console.error);

module.exports = app;