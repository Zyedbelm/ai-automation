// Chargeur de configuration depuis Supabase Edge Function
class ConfigLoader {
    constructor() {
        // URL Supabase récupérée depuis config.js pour éviter l'exposition sur GitHub
        this.baseURL = (window.ENV && window.ENV.SUPABASE_URL) || 'YOUR_SUPABASE_URL';
        this.configURL = `${this.baseURL}/functions/v1/get-config`;
        this.configLoaded = false;
    }

    async loadConfig() {
        try {
            console.log('🔧 Chargement de la configuration...');

            // Clé anon hard-codée pour l'authentification initiale Edge Function
            const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndseXNtZGJvZXllYnBya2d5YXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MTc1MDcsImV4cCI6MjA2NzM5MzUwN30.qi6B7pGd-2l-YivnCJn57AzESiHAGH_MKnd7_DOoAf0';

            const response = await fetch(this.configURL, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${anonKey}`,
                    'apikey': anonKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const config = await response.json();

            // Charger dans window.ENV pour compatibilité avec le code existant
            window.ENV = {
                SUPABASE_URL: config.supabase.url,
                SUPABASE_ANON_KEY: config.supabase.anonKey,
                STRIPE_PUBLISHABLE_KEY: config.stripe.publishableKey,
                STRIPE_PRODUCTS: config.stripe.products,
                WEBHOOK_API_KEY: config.webhooks.apiKey
            };

            this.configLoaded = true;
            console.log('✅ Configuration chargée depuis Supabase');

            return config;

        } catch (error) {
            console.error('❌ Impossible de charger la config depuis Supabase:', error);
            console.warn('⚠️ Utilisation de la configuration de fallback (config.js)');

            // Le config.js avec placeholders est déjà chargé
            // En production, il faudra soit déployer l'Edge Function
            // soit utiliser des variables d'environnement de build
            this.configLoaded = false;

            throw error;
        }
    }

    // Attendre que la config soit chargée avant d'initialiser l'app
    async waitForConfig() {
        if (this.configLoaded) {
            return true;
        }

        try {
            await this.loadConfig();
            return true;
        } catch (error) {
            // Fallback: la config.js est déjà chargée avec des placeholders
            console.warn('⚠️ Configuration en mode fallback');
            return false;
        }
    }
}

// Instance globale
window.configLoader = new ConfigLoader();

// Auto-init quand le DOM est prêt
document.addEventListener('DOMContentLoaded', async () => {
    await window.configLoader.waitForConfig();

    // Déclencher un événement personnalisé quand la config est prête
    document.dispatchEvent(new CustomEvent('configReady'));
});