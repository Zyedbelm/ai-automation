# Blueprint Store - Espace d'Achat Make.com

Un espace d'achat moderne et élégant pour vendre des blueprints Make.com avec intégration Stripe et Supabase.

## ✨ Fonctionnalités

### 🛒 Espace Client
- Interface moderne et responsive
- Présentation détaillée des blueprints
- Manuel d'installation intégré pour chaque blueprint
- Paiement sécurisé via Stripe
- Téléchargement conditionnel après paiement validé

### 🔧 Panel Admin
- Upload de blueprints JSON vers Supabase
- Gestion des statuts des blueprints
- Interface intuitive de drag & drop

### 🔐 Sécurité
- Tokens d'accès temporaires pour téléchargements
- Validation des paiements via webhooks Stripe
- Stockage sécurisé dans Supabase

## 📁 Structure du Projet

```
/
├── blueprint-store.html      # Interface client principale
├── admin-upload.html         # Panel d'administration
├── server.js                # Serveur Express avec APIs
├── example-blueprint.json    # Exemple de blueprint détaillé
├── package.json             # Dépendances Node.js
└── .env                     # Configuration (à personnaliser)
```

## 🚀 Installation et Configuration

### 1. Installation des dépendances

```bash
npm install
```

### 2. Configuration des variables d'environnement

Éditez le fichier `.env` avec vos vraies clés :

```bash
# Supabase
SUPABASE_URL=https://votre-project.supabase.co
SUPABASE_ANON_KEY=votre_anon_key
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_votre_cle_publique
STRIPE_SECRET_KEY=sk_live_votre_cle_secrete
STRIPE_WEBHOOK_SECRET=whsec_votre_webhook_secret
```

### 3. Configuration Supabase

Créez la table pour stocker les achats :

```sql
CREATE TABLE blueprint_purchases (
  id SERIAL PRIMARY KEY,
  payment_intent_id TEXT UNIQUE,
  blueprint_id TEXT,
  amount INTEGER,
  currency TEXT,
  status TEXT,
  access_token TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Créez un bucket de stockage pour les blueprints :

```sql
-- Via l'interface Supabase Storage
-- Nom du bucket: "blueprints"
-- Public: false (accès contrôlé)
```

### 4. Configuration Stripe

1. **Créez vos produits** dans le dashboard Stripe
2. **Configurez un webhook** pointant vers `https://votre-domaine.com/webhook/stripe`
3. **Activez les événements** : `payment_intent.succeeded`, `payment_intent.payment_failed`

### 5. Lancement du serveur

```bash
node server.js
```

Le serveur démarre sur le port 3001 :
- **Store client** : http://localhost:3001/blueprint-store.html
- **Admin panel** : http://localhost:3001/admin-upload.html
- **API Health** : http://localhost:3001/health

## 🔄 Flux de Fonctionnement

### Côté Client
1. **Navigation** : Le client browse les blueprints disponibles
2. **Consultation** : Lecture des manuels d'installation détaillés
3. **Achat** : Paiement sécurisé via Stripe
4. **Validation** : Confirmation du paiement côté serveur
5. **Téléchargement** : Accès au fichier JSON via token temporaire

### Côté Admin
1. **Upload** : Upload des fichiers JSON vers Supabase Storage
2. **Gestion** : Suivi des statuts des blueprints
3. **Monitoring** : Vérification des ventes et téléchargements

## 📦 APIs Disponibles

### Publiques
- `GET /api/blueprints` - Liste des blueprints disponibles
- `POST /create-payment-intent` - Création d'un paiement Stripe
- `POST /confirm-payment` - Confirmation d'un paiement
- `GET /download-blueprint/:id` - Téléchargement avec token
- `POST /webhook/stripe` - Webhook Stripe

### Admin
- `POST /admin/upload-blueprint/:id` - Upload d'un blueprint

## 🎨 Personnalisation

### Interface Client
- Modifiez `blueprint-store.html` pour changer le design
- Ajustez les couleurs et fonts dans les styles CSS
- Personnalisez les textes et descriptions

### Blueprints
- Utilisez `example-blueprint.json` comme template
- Incluez des instructions détaillées d'installation
- Ajoutez des prérequis et troubleshooting

### Intégrations
- Ajoutez d'autres moyens de paiement dans le serveur
- Connectez d'autres services de stockage
- Intégrez des outils d'analytics

## 🔧 Modes de Fonctionnement

### Mode Développement
- Clés Stripe en mode test
- Paiements simulés via boutons démo
- Logs détaillés pour débogage

### Mode Production
- Clés Stripe live
- HTTPS requis pour les webhooks
- Monitoring et alertes configurées

## 📊 Exemple de Blueprint

Le fichier `example-blueprint.json` contient un blueprint complet avec :
- ✅ Modules Make.com détaillés
- ✅ Instructions d'installation étape par étape
- ✅ Configuration et personnalisation
- ✅ Troubleshooting et bonnes pratiques
- ✅ Support et documentation

## 🛡️ Sécurité

- **Tokens temporaires** : Accès limité dans le temps
- **Validation côté serveur** : Vérification des paiements
- **Stockage chiffré** : Données sensibles protégées
- **CORS configuré** : Accès contrôlé aux APIs

## 📞 Support

Pour toute question ou personnalisation :
- 📧 **Email** : support@votre-domaine.com
- 📚 **Documentation** : Consultez les commentaires dans le code
- 🐛 **Issues** : Ouvrez une issue GitHub si problème

---

**🚨 Important** : Remplacez toutes les clés demo par vos vraies clés avant la mise en production !
