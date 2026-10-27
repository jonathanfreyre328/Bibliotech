/**
 * @file validators/rules/maxLength.js
 * @brief Regla de longitud maxima para campos de texto.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const Validation = require('../validation');
const i18n = require('../../utils/i18n/i18n');

class MaxLength extends Validation {
    constructor(field, max) {
        super();
        this.field = field;
        this.max = max;
    }

    validate(target, language) {
        const value = target[this.field];

        // Los campos ausentes o vacios los reporta RequiredFields.
        if (typeof value !== 'string' || value.length <= this.max) return [];

        return [{
            field: this.field,
            message: i18n.format('CT_VALIDATION_MAX_LENGTH', language, [this.max])
        }];
    }
}

module.exports = MaxLength;
