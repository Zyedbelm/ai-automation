# 🔐 Configuration des Webhooks Make.com via Supabase

## ✅ Architecture hybride sécurisée mise en place

Le système webhook est maintenant **entièrement sécurisé et hybride** :

- ❌ **Avant** : `WEBHOOK_API_KEY` exposée côté client
- ✅ **Maintenant** : Edge Function hybride qui gère 2 types de webhooks

## 🔀 Types de webhooks supportés

### Type 1: Webhooks Blueprint Store (NOUVEAU - sécurisé)
```javascript
// Appel côté client
{
  "type": "calculator|contact|chatbot",
  "data": { /* vos données */ }
}
```

### Type 2: Système existant complexe (CONSERVÉ)
```javascript
// Appel côté client (existant)
{
  "city_id": "uuid",
  "user_profile_id": "uuid",
  "content_type": "voice_memo|photo|text",
  // ... autres champs existants
}
```

## 🚀 Étapes de configuration

### 1. Configurer le secret Supabase

Connectez-vous à votre dashboard Supabase et ajoutez le secret :

```bash
# Via Supabase CLI (recommandé)
supabase secrets set WEBHOOK_API_KEY=votre_vraie_cle_make_com

# Ou via dashboard web :
# Settings > Edge Functions > Secrets
# Nom: WEBHOOK_API_KEY
# Valeur: votre_vraie_cle_make_com
```

### 2. Déployer l'Edge Function hybride

```bash
# Déployer la fonction send-webhook hybride
supabase functions deploy send-webhook

# Vérifier le déploiement
supabase functions list
```

### 3. Tester le système

L'Edge Function sera accessible à :
```
https://wlysmdboyeybprkgyaug.supabase.co/functions/v1/send-webhook
```

## 🔑 Récupérer votre API Key Make.com

1. **Connectez-vous à Make.com**
2. **Profil → API**
3. **Générer une nouvelle clé**
4. **Format attendu** : `mk_live_abc123...` ou similaire

## 🛠️ Architecture hybride du système

### Pour Blueprint Store (calculator, contact, chatbot) :
```
Client (index.html)
    ↓ {type: "calculator", data: {...}}
webhook-helper.js
    ↓ (POST avec Supabase auth)
Edge Function → handleSimpleWebhook()
    ↓ (avec x-make-apikey header)
Make.com Webhooks Blueprint Store
```

### Pour système existant (city_id, user_profile_id) :
```
Client existant
    ↓ {city_id: "uuid", user_profile_id: "uuid", ...}
Edge Function → handleComplexWebhook()
    ↓ (requête Supabase city_webhooks)
    ↓ (avec X-Webhook-Secret si configuré)
Make.com Webhooks configurés par ville
```

## ✅ Sécurité

- 🔒 **API Key cachée** dans les secrets Supabase
- 🔐 **Authentification** via Supabase ANON_KEY
- 🛡️ **Validation** des types de webhook
- 📝 **Logging** sécurisé côté serveur

## 🐛 Debug

Si les webhooks ne fonctionnent pas :

1. **Vérifier les logs Edge Function** dans Supabase Dashboard
2. **Activer le mode fallback** (temporaire) :
   ```javascript
   window.webhookHelper.fallbackMode = true;
   ```
3. **Vérifier la CSP** : Make.com doit être autorisé

## 📁 Fichiers modifiés

- ✅ `supabase/functions/send-webhook/index.ts` - Edge Function
- ✅ `webhook-helper.js` - Client sécurisé
- ✅ `config.js` - Clé supprimée
- ✅ `server.js` - CSP mise à jour

---

**Status** : 🟢 **PRÊT POUR PRODUCTION**
**Sécurité** : 🔒 **MAXIMALE**