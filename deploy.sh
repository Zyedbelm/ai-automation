#!/bin/bash

# 🚀 Script de déploiement Blueprint Store Production
# Utilise ce script pour déployer en production de manière sécurisée

echo "🚀 Déploiement Blueprint Store en production..."

# Vérifications préalables
echo "🔍 Vérifications préalables..."

# Vérifier que NODE_ENV est configuré
if [ -z "$NODE_ENV" ]; then
    echo "⚠️  NODE_ENV n'est pas défini. Configuration en production..."
    export NODE_ENV=production
fi

# Vérifier les variables d'environnement critiques
required_vars=("JWT_SECRET" "ADMIN_USERNAME" "ADMIN_PASSWORD" "SUPABASE_URL" "SUPABASE_ANON_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Variable d'environnement manquante: $var"
        echo "   Veuillez configurer toutes les variables dans .env"
        exit 1
    fi
done

echo "✅ Variables d'environnement configurées"

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install --production

# Vérifier la sécurité des dépendances
echo "🔒 Vérification de sécurité..."
npm audit --audit-level moderate

# Démarrer le serveur avec PM2 (recommandé pour la production)
if command -v pm2 &> /dev/null; then
    echo "🔄 Démarrage avec PM2..."
    pm2 stop blueprint-store 2>/dev/null || true
    pm2 start server.js --name "blueprint-store" --node-args="--max-old-space-size=512"
    pm2 save
    echo "✅ Serveur démarré avec PM2"
else
    echo "⚠️  PM2 non installé. Installation recommandée pour la production:"
    echo "   npm install -g pm2"
    echo "🔄 Démarrage en mode simple..."
    NODE_ENV=production node server.js
fi

echo "🎉 Déploiement terminé!"
echo "📍 Serveur accessible sur le port configuré"
echo "🔐 Interface admin: /admin-login.html"
echo "📊 Monitoring PM2: pm2 monit"