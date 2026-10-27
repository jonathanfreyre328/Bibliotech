/**
 * @file middleware/languageMiddleware.js
 * @brief Resuelve el idioma de cada peticion y lo expone en `req.language`.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const i18n = require('../utils/i18n/i18n');

/**
 * @brief Middleware de negociacion de idioma.
 * @details Orden de precedencia:
 * 1. `?lang=xx` (override explicito, util para pruebas y curl).
 * 2. Encabezado `X-Language`.
 * 3. Encabezado `Accept-Language` (lo envia el navegador automaticamente).
 * 4. Idioma por defecto de la instancia (`DEFAULT_LANGUAGE` o 'es').
 *
 * Setea `req.language` y responde `Content-Language` para que el cliente sepa en
 * que idioma se genero la respuesta.
 */
function languageMiddleware(req, res, next) {
    const requested = req.query.lang
        || req.get('X-Language')
        || req.get('Accept-Language');

    req.language = i18n.resolve(requested);
    res.setHeader('Content-Language', req.language);

    // No pisar el "Vary: Origin" que agrega cors(): se acumulan los valores.
    const vary = res.getHeader('Vary');
    res.setHeader('Vary', vary ? `${vary}, Accept-Language` : 'Accept-Language');
    next();
}

module.exports = languageMiddleware;
