# 🤖 AI Automation Platform

Application web moderne pour l'automatisation intelligente des processus métier avec Make.com et l'IA.

## ✨ Fonctionnalités

- 🧮 **Calculateur d'économies** - Estimation ROI automatisation
- 🛒 **Marketplace Blueprints** - Templates Make.com prêts à l'emploi
- 💬 **Chatbot IA** - Assistant intelligent intégré
- 🔒 **Système sécurisé** - Authentification JWT, CSP, validation input
- 📊 **Interface admin** - Gestion des blueprints et analytics

## 🏗️ Architecture

- **Frontend** : HTML5, CSS3, JavaScript vanilla
- **Backend** : Node.js, Express
- **Database** : Supabase (PostgreSQL)
- **Payments** : Stripe
- **Security** : CSP, CORS, Input validation, XSS protection

## 🔧 Installation

1. **Cloner le projet**
```bash
git clone [votre-repo]
cd ai-automation
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration environnement**
```bash
cp .env.example .env
# Configurer vos variables dans .env
```

4. **Démarrer l'application**
```bash
npm start
```

## ⚙️ Variables d'environnement

Créez un fichier `.env` avec :

```env
# Serveur
PORT=3001
NODE_ENV=production

# Sécurité
JWT_SECRET=votre_secret_jwt_securise
ADMIN_USERNAME=votre_admin
ADMIN_PASSWORD=votre_mot_de_passe_fort

# Supabase
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre_cle_anon
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service

# Stripe (optionnel)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🔒 Sécurité

- ✅ **HTTPS requis** en production
- ✅ **CSP (Content Security Policy)** configuré
- ✅ **Input validation** et sanitization
- ✅ **Authentification JWT**
- ✅ **Protection XSS/CSRF**
- ✅ **Secrets sécurisés** via Supabase Edge Functions

## 📦 Déploiement

1. **Configuration serveur**
   - Node.js 18+
   - PM2 pour la gestion de processus
   - Nginx comme reverse proxy
   - Certificat SSL

2. **Variables d'environnement**
   - Configurer toutes les variables en production
   - Utiliser des secrets forts et uniques

3. **Supabase Edge Functions**
```bash
# Déployer les webhooks sécurisés
supabase functions deploy send-webhook
```

## 🛡️ Bonnes pratiques

- 🔐 **Jamais de secrets** dans le code source
- 🔒 **HTTPS uniquement** en production
- 🧹 **Validation input** stricte
- 📝 **Logs sécurisés** (pas de données sensibles)
- 🔄 **Mise à jour régulière** des dépendances

## 📄 License

Propriétaire - Baptiste Zyed MEDDEB

---

⚠️ **Important** : Ce projet nécessite une configuration sécurisée en production. Consultez la documentation de sécurité avant déploiement.