/**
 * @file validators/rules/careerId.js
 * @brief Regla de validacion del identificador de carrera elegido al registrarse.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const Validation = require('../validation');
const i18n = require('../../utils/i18n/i18n');

class CareerId extends Validation {
    constructor(field = 'careerId') {
        super();
        this.field = field;
    }

    validate(target, language) {
        const value = target[this.field];

        // La ausencia se informa con RequiredFields.
        if (value === undefined || value === null || value === '') return [];
        if (typeof value !== 'number' && typeof value !== 'string') return [this._error(language)];

        const parsed = Number(value);
        const isValid = Number.isInteger(parsed) && parsed > 0;
        return isValid ? [] : [this._error(language)];
    }

    _error(language) {
        return {
            field: this.field,
            message: i18n.getMessage('CT_VALIDATION_CAREER', language)
        };
    }
}

module.exports = CareerId;
