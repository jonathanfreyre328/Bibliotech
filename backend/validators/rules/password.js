/**
 * @file validators/rules/password.js
 * @brief Regla de validacion de la fortaleza de la contrasena.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const Validation = require('../validation');
const i18n = require('../../utils/i18n/i18n');

/**
 * bcrypt solo procesa los primeros 72 bytes de la contrasena. Si se aceptara una
 * mas larga, dos claves distintas con el mismo prefijo serian equivalentes; por
 * eso se rechaza en lugar de truncarla en silencio.
 */
const MAX_PASSWORD_BYTES = 72;

class Password extends Validation {
    constructor(field = 'password') {
        super();
        this.field = field;
    }

    validate(target, language) {
        const value = target[this.field];

        // La ausencia se informa con RequiredFields; aca solo se valida formato.
        if (value === undefined || value === null || value === '') return [];

        const isText = typeof value === 'string';
        const isTooLong = isText && Buffer.byteLength(value, 'utf8') > MAX_PASSWORD_BYTES;
        const isValid = isText
            && value.length >= 8
            && /[A-Za-z]/.test(value)
            && /\d/.test(value)
            && !isTooLong;

        if (isValid) return [];

        const messageKey = isTooLong ? 'CT_VALIDATION_PASSWORD_TOO_LONG' : 'CT_VALIDATION_PASSWORD';
        return [{ field: this.field, message: i18n.getMessage(messageKey, language) }];
    }
}

module.exports = Password;
