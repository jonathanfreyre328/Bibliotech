/**
 * @file validators/rules/requiredFields.js
 * @brief Regla de validacion de presencia de campos obligatorios.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const Validation = require('../validation');
const i18n = require('../../utils/i18n/i18n');

class RequiredFields extends Validation {
    constructor(fields) {
        super();
        this.fields = fields;
    }

    validate(target, language) {
        return this.fields
            .filter((field) => target[field] === undefined || target[field] === null || target[field] === '')
            .map((field) => ({ field, message: i18n.getMessage('CT_VALIDATION_REQUIRED', language) }));
    }
}

module.exports = RequiredFields;
