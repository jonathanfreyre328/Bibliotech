/**
 * @file utils/i18n/i18n.js
 * @brief Gestor centralizado de internacionalizacion (Singleton) con resolucion por request.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const fs = require('fs');
const path = require('path');

/**
 * @class I18n
 * @brief Carga los diccionarios JSON de `locales/` en memoria y resuelve claves `CT_*`.
 * @details Implementa el patron Singleton: la aplicacion completa comparte una unica
 * instancia, los diccionarios se leen una sola vez al arrancar y las peticiones solo
 * consultan memoria (sin I/O de disco).
 *
 * A diferencia de una traduccion global mutable, `getMessage(key, language)` recibe el
 * idioma como parametro: dos peticiones concurrentes en idiomas distintos no se pisan.
 * El idioma por defecto (`this.language`) solo se usa cuando no se indica uno.
 */
class I18n {
    constructor() {
        if (I18n._instance) {
            return I18n._instance;
        }

        /**
         * Estado mutable del singleton. `Object.freeze(this)` congela las propiedades
         * propias de la instancia, pero no el contenido de `_state`: por eso el setter
         * `language` puede cambiar el idioma por defecto sin lanzar TypeError.
         */
        this._state = { language: process.env.DEFAULT_LANGUAGE || 'es' };
        this._resources = {};
        this._localesPath = path.join(__dirname, 'locales');

        this._loadLocales();
        I18n._instance = this;
        Object.freeze(this);
    }

    /**
     * @brief Lee todos los diccionarios `.json` de `locales/` y los deja en memoria.
     * @details El nombre del archivo (sin extension) es el codigo de idioma.
     */
    _loadLocales() {
        const files = fs.readdirSync(this._localesPath)
            .filter((file) => file.endsWith('.json'));

        for (const file of files) {
            const language = path.basename(file, '.json');
            const content = fs.readFileSync(path.join(this._localesPath, file), 'utf-8');
            this._resources[language] = JSON.parse(content);
        }

        // Si DEFAULT_LANGUAGE no tiene diccionario, se vuelve al espanol.
        if (!this._resources[this._state.language]) {
            this._state.language = 'es';
        }
    }

    /** @brief Codigos de idioma disponibles (derivados de los archivos de `locales/`). */
    get supportedLanguages() {
        return Object.keys(this._resources);
    }

    /** @brief Idioma por defecto de la instancia. */
    get language() {
        return this._state.language;
    }

    /**
     * @brief Cambia el idioma por defecto de la instancia.
     * @param {string} language - Codigo de idioma soportado (ej. 'es', 'en').
     */
    set language(language) {
        if (this._resources[language]) {
            this._state.language = language;
            return;
        }
        console.warn(`[i18n] Idioma no soportado: "${language}". Se mantiene "${this._state.language}".`);
    }

    /**
     * @brief Resuelve el idioma de una peticion a partir de `Accept-Language`.
     * @param {string} acceptLanguage - Encabezado HTTP (ej. 'en-US,en;q=0.9').
     * @returns {string} Codigo de idioma soportado; el idioma por defecto si no hay coincidencia.
     */
    resolve(acceptLanguage) {
        const raw = String(acceptLanguage || '').trim();
        if (!raw) return this._state.language;

        const candidates = raw
            .split(',')
            .map((part) => part.split(';')[0].trim().toLowerCase())
            .filter(Boolean);

        for (const candidate of candidates) {
            if (this._resources[candidate]) return candidate;
            const base = candidate.split('-')[0];
            if (this._resources[base]) return base;
        }

        return this._state.language;
    }

    /**
     * @brief Devuelve el texto asociado a una clave.
     * @param {string} key - Clave `CT_*` del diccionario.
     * @param {string} [language] - Idioma solicitado; por defecto, el de la instancia.
     * @returns {string} Texto traducido. Si la clave no existe en ningun diccionario,
     * devuelve `CT_INVALID_RESOURCE_CONSTANT` (nunca lanza: el gestor de errores no
     * puede fallar mientras responde un error).
     */
    getMessage(key, language = this._state.language) {
        const selected = this._resources[language];
        if (selected && selected[key] !== undefined) return selected[key];

        const fallback = this._resources[this._state.language];
        if (fallback && fallback[key] !== undefined) return fallback[key];

        // Clave inexistente: se avisa en el idioma pedido (si esta disponible).
        return (selected && selected.CT_INVALID_RESOURCE_CONSTANT)
            || (fallback && fallback.CT_INVALID_RESOURCE_CONSTANT)
            || key;
    }

    /**
     * @brief Traduce una clave e interpola sus parametros (`%s`).
     * @param {string} key - Clave `CT_*`.
     * @param {string} [language] - Idioma solicitado.
     * @param {Array<string|number>} [params] - Valores que reemplazan cada `%s`.
     * @returns {string} Texto final.
     */
    format(key, language = this._state.language, params = []) {
        let message = this.getMessage(key, language);
        for (const param of params) {
            message = message.replace('%s', () => String(param));
        }
        return message;
    }

    /**
     * @brief Traduce el mensaje de un error de negocio.
     * @details Los repositorios lanzan `businessError(mensaje, clave, params)`; el
     * mensaje base queda en espanol para logs y para los controles de flujo
     * (`error.message.includes(...)`), mientras que la respuesta al cliente usa la
     * clave traducida.
     * @param {Error} error - Error capturado.
     * @param {string} [language] - Idioma solicitado.
     * @returns {string} Mensaje traducido, o el mensaje original si no tiene clave.
     */
    translateError(error, language = this._state.language) {
        if (!error) return this.getMessage('CT_ERROR_OPERATION', language);
        if (!error.messageKey) return error.message || this.getMessage('CT_ERROR_OPERATION', language);
        return this.format(error.messageKey, language, error.messageParams || []);
    }
}

module.exports = new I18n();
