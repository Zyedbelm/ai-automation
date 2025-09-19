// 🔐 Utilitaires de sécurité
class SecurityUtils {
    // Sanitise le HTML pour éviter les attaques XSS
    static sanitizeHtml(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    // Escape HTML entities
    static escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Sanitise les URLs
    static sanitizeUrl(url) {
        const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
        try {
            const urlObj = new URL(url);
            if (allowedProtocols.includes(urlObj.protocol)) {
                return url;
            }
        } catch (e) {
            // URL invalide
        }
        return '#';
    }

    // Validation côté client (complémentaire au serveur)
    static validateBlueprint(blueprint) {
        const errors = [];

        // Validation des champs obligatoires
        if (!blueprint.title || blueprint.title.trim().length < 3) {
            errors.push('Le titre doit contenir au moins 3 caractères');
        }

        if (!blueprint.description || blueprint.description.trim().length < 10) {
            errors.push('La description doit contenir au moins 10 caractères');
        }

        if (!blueprint.price || blueprint.price < 0 || blueprint.price > 10000) {
            errors.push('Le prix doit être entre 0 et 10000€');
        }

        // Sanitisation
        blueprint.title = this.escapeHtml(blueprint.title);
        blueprint.description = this.escapeHtml(blueprint.description);

        return { isValid: errors.length === 0, errors, blueprint };
    }

    // Génère un ID sécurisé
    static generateSecureId() {
        return 'bp_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
    }

    // Rate limiting côté client
    static rateLimiter = {
        requests: new Map(),

        check(action, maxRequests = 5, windowMs = 60000) {
            const now = Date.now();
            const windowStart = now - windowMs;

            if (!this.requests.has(action)) {
                this.requests.set(action, []);
            }

            const actionRequests = this.requests.get(action);

            // Nettoie les anciennes requêtes
            const recentRequests = actionRequests.filter(time => time > windowStart);
            this.requests.set(action, recentRequests);

            if (recentRequests.length >= maxRequests) {
                return false; // Limite atteinte
            }

            recentRequests.push(now);
            return true; // OK
        }
    };

    // Détecte les tentatives d'injection
    static detectInjection(input) {
        const suspiciousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /eval\s*\(/i,
            /document\./i,
            /window\./i
        ];

        return suspiciousPatterns.some(pattern => pattern.test(input));
    }

    // Fonction helper pour créer du HTML sécurisé
    static createSafeElement(tag, content, attributes = {}) {
        const element = document.createElement(tag);
        if (content) {
            element.textContent = content;
        }
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, this.escapeHtml(value));
        });
        return element;
    }

    // Créer une liste sécurisée
    static createSafeList(items, listType = 'ul', className = '') {
        const list = document.createElement(listType);
        if (className) list.className = className;

        items.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            list.appendChild(li);
        });

        return list;
    }

    // Remplace innerHTML de manière sécurisée
    static safeSetContent(element, content) {
        // Vide l'élément
        element.innerHTML = '';

        if (typeof content === 'string') {
            element.textContent = content;
        } else if (content instanceof HTMLElement) {
            element.appendChild(content);
        } else if (Array.isArray(content)) {
            content.forEach(item => {
                if (typeof item === 'string') {
                    const span = document.createElement('span');
                    span.textContent = item;
                    element.appendChild(span);
                } else if (item instanceof HTMLElement) {
                    element.appendChild(item);
                }
            });
        }
    }

    // Fonction spécialisée pour créer une carte de blueprint sécurisée
    static createBlueprintCard(blueprint, formatPriceFn = null) {
        const formatPrice = formatPriceFn || (price => price); // Fallback simple
        const card = document.createElement('div');
        card.className = 'blueprint-card';
        card.onclick = () => openModal(blueprint.id);

        // Header
        const header = document.createElement('div');
        header.className = 'blueprint-header';

        const category = document.createElement('div');
        category.className = 'blueprint-category';
        category.textContent = blueprint.category;

        const price = document.createElement('div');
        price.className = 'blueprint-price';
        price.textContent = `${blueprint.price}€`;

        header.appendChild(category);
        header.appendChild(price);

        // Title
        const title = document.createElement('h3');
        title.className = 'blueprint-title';
        title.textContent = blueprint.title;

        // Description
        const description = document.createElement('p');
        description.className = 'blueprint-description';
        description.textContent = blueprint.description;

        // Meta
        const meta = document.createElement('div');
        meta.className = 'blueprint-meta';

        const timeItem = document.createElement('div');
        timeItem.className = 'meta-item';
        timeItem.innerHTML = '<span>⏱️</span><span>' + SecurityUtils.escapeHtml(blueprint.estimated_setup_time) + '</span>';

        const difficultyItem = document.createElement('div');
        difficultyItem.className = 'meta-item';
        difficultyItem.innerHTML = '<span>📊</span><span>' + SecurityUtils.escapeHtml(blueprint.difficulty_level) + '</span>';

        meta.appendChild(timeItem);
        meta.appendChild(difficultyItem);

        // Features (first 4)
        const features = document.createElement('div');
        features.className = 'blueprint-features';

        const featureList = document.createElement('ul');
        blueprint.features.slice(0, 4).forEach(feature => {
            const li = document.createElement('li');
            li.textContent = feature;
            featureList.appendChild(li);
        });

        if (blueprint.features.length > 4) {
            const moreItem = document.createElement('li');
            moreItem.style.color = 'var(--primary)';
            moreItem.textContent = `+ ${blueprint.features.length - 4} autres...`;
            featureList.appendChild(moreItem);
        }

        features.appendChild(featureList);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'blueprint-actions';

        const detailsBtn = document.createElement('button');
        detailsBtn.className = 'btn btn-secondary';
        detailsBtn.textContent = 'Voir détails';
        detailsBtn.onclick = (e) => {
            e.stopPropagation();
            openModal(blueprint.id);
        };

        const purchaseBtn = document.createElement('button');
        purchaseBtn.className = 'btn btn-primary';
        purchaseBtn.textContent = `🛒 ${blueprint.price}€`;
        purchaseBtn.onclick = (e) => {
            e.stopPropagation();
            purchaseBlueprint(blueprint.id);
        };

        actions.appendChild(detailsBtn);
        actions.appendChild(purchaseBtn);

        // Assembly
        card.appendChild(header);
        card.appendChild(title);
        card.appendChild(description);
        card.appendChild(meta);
        card.appendChild(features);
        card.appendChild(actions);

        return card;
    }
}

// Export pour utilisation
window.SecurityUtils = SecurityUtils;