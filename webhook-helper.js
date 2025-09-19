// Helper pour envoyer des webhooks sécurisés via Edge Function Supabase
class WebhookHelper {
    constructor() {
        // URL de l'Edge Function Supabase (sécurisée)
        this.edgeFunctionUrl = `${window.ENV?.SUPABASE_URL}/functions/v1/send-webhook`;

        // Fallback URLs directes pour debug (si nécessaire)
        this.fallbackMode = false;
        this.webhookUrls = {
            calculator: 'https://hook.eu1.make.com/2fh4mnmxx3sfi3bc7ozebhu54x91yj7v',
            contact: 'https://hook.eu1.make.com/2fh4mnmxx3sfi3bc7ozebhu54x91yj7v',
            chatbot: 'https://hook.eu1.make.com/16iycniehsxgvovrkfhisp2i8ih947bd'
        };
    }

    async sendWebhook(type, data) {
        try {
            if (!this.edgeFunctionUrl) {
                throw new Error('Configuration Supabase manquante');
            }

            console.log(`🔒 Envoi webhook ${type} via Edge Function sécurisée`);

            // Envoyer via Edge Function Supabase (sécurisé)
            const response = await fetch(this.edgeFunctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.ENV?.SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    type: type,
                    data: data
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Edge Function error: ${response.status} - ${errorData.error}`);
            }

            const result = await response.json();

            if (result.success) {
                console.log(`✅ Webhook ${type} envoyé avec succès via Edge Function`);
                return result.makeResponse;
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error(`❌ Erreur webhook ${type}:`, error);

            // En cas d'erreur Edge Function, essayer le fallback (optionnel)
            if (this.fallbackMode) {
                console.warn(`⚠️ Tentative fallback direct pour ${type}`);
                return this.sendWebhookDirect(type, data);
            }

            throw error;
        }
    }

    // Méthode fallback directe (garde l'ancienne logique)
    async sendWebhookDirect(type, data) {
        try {
            const webhookUrl = this.webhookUrls[type];
            if (!webhookUrl) {
                throw new Error(`Type de webhook inconnu: ${type}`);
            }

            console.warn(`⚠️ Envoi direct webhook ${type} (mode fallback)`);

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                    // Pas d'API Key en mode fallback (non sécurisé)
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
            }

            return await response.text();

        } catch (error) {
            console.error(`❌ Erreur webhook direct ${type}:`, error);
            throw error;
        }
    }

    // Méthodes spécifiques pour chaque type
    async sendCalculator(data) {
        return this.sendWebhook('calculator', data);
    }

    async sendContact(data) {
        return this.sendWebhook('contact', data);
    }

    async sendChatbot(data) {
        return this.sendWebhook('chatbot', data);
    }
}

// Instance globale
window.webhookHelper = new WebhookHelper();