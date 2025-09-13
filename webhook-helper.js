// Helper pour envoyer des webhooks sécurisés avec API Key
class WebhookHelper {
    constructor() {
        // URLs des webhooks Make.com - ATTENTION: Vérifier si ces URLs sont actives
        this.webhookUrls = {
            calculator: 'https://hook.eu1.make.com/2fh4mnmxx3sfi3bc7ozebhu54x91yj7v',
            contact: 'https://hook.eu1.make.com/2fh4mnmxx3sfi3bc7ozebhu54x91yj7v',
            chatbot: 'https://hook.eu1.make.com/16iycniehsxgvovrkfhisp2i8ih947bd'
        };

        // URLs de test alternatives (webhook.site pour debug)
        this.testUrls = {
            calculator: 'https://webhook.site/unique-id-1',
            contact: 'https://webhook.site/unique-id-2',
            chatbot: 'https://webhook.site/unique-id-3'
        };
    }

    async sendWebhook(type, data) {
        try {
            const webhookUrl = this.webhookUrls[type];
            if (!webhookUrl) {
                throw new Error(`Type de webhook inconnu: ${type}`);
            }

            // Récupérer l'API Key depuis la configuration
            const apiKey = window.ENV?.WEBHOOK_API_KEY;
            if (!apiKey || apiKey === 'YOUR_WEBHOOK_API_KEY') {
                console.warn('⚠️ API Key webhook manquante, envoi sans authentification');
            }

            const headers = {
                'Content-Type': 'application/json'
            };

            // API Key Make.com - Header officiel x-make-apikey
            if (apiKey && apiKey !== 'YOUR_WEBHOOK_API_KEY') {
                // Make.com utilise EXACTEMENT le header 'x-make-apikey'
                headers['x-make-apikey'] = apiKey;
                console.log('🔑 Webhook Make.com envoyé avec header x-make-apikey');
            } else {
                console.warn('⚠️ API Key manquante - webhook envoyé sans authentification');
            }

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
            }

            return await response.text();

        } catch (error) {
            console.error(`❌ Erreur webhook ${type}:`, error);
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