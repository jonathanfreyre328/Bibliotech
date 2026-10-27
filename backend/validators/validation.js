/**
 * @file validators/validation.js
 * @brief Clase base de las reglas de validacion (contrato validate).
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

class Validation {
    /**
     * @brief Valida un objeto y devuelve los errores encontrados.
     * @param {Object} target - Datos a validar.
     * @param {string} [language] - Idioma de los mensajes ('es'/'en').
     * @returns {Array<{field: string, message: string}>}
     */
    validate(target, language) {
        return [];
    }
}

module.exports = Validation;
