/**
 * @file utils/i18n/businessError.js
 * @brief Fabrica de errores de negocio con clave de traduccion asociada.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

/**
 * @brief Crea un error de negocio traducible.
 * @details El `message` base se conserva en espanol porque los controladores lo usan
 * para decidir el codigo HTTP (`error.message.includes('No se puede eliminar')`).
 * La respuesta al cliente se arma con `i18n.translateError(error, language)`.
 * @param {string} message - Mensaje base (logs y control de flujo).
 * @param {string} messageKey - Clave `CT_*` del diccionario.
 * @param {Array<string|number>} [messageParams] - Valores para los `%s` de la clave.
 * @returns {Error} Error con `messageKey` y `messageParams`.
 */
function businessError(message, messageKey, messageParams = []) {
    const error = new Error(message);
    error.messageKey = messageKey;
    error.messageParams = messageParams;
    return error;
}

module.exports = businessError;
