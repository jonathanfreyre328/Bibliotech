/**
 * @file validators/rules/email.js
 * @brief Regla de validacion del formato de email.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const Validation = require('../validation');
const i18n = require('../../utils/i18n/i18n');

class Email extends Validation {
    constructor(field = 'email') {
        super();
        this.field = field;
    }

    validate(target, language) {
        const value = target[this.field];

        // La ausencia se informa con RequiredFields; aca solo se valida formato.
        if (value === undefined || value === null || value === '') return [];

        const isValid = /^\S+@\S+\.\S+$/.test(value);
        return isValid ? [] : [{ field: this.field, message: i18n.getMessage('CT_VALIDATION_EMAIL', language) }];
    }
}

module.exports = Email;
