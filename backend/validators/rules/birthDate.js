/**
 * @file validators/rules/birthDate.js
 * @brief Regla de validacion de la fecha de nacimiento (fecha real y no futura).
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const Validation = require('../validation');
const i18n = require('../../utils/i18n/i18n');

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MIN_YEAR = 1900;

class BirthDate extends Validation {
    constructor(field = 'birthDate') {
        super();
        this.field = field;
    }

    validate(target, language) {
        const value = target[this.field];

        // La ausencia se informa con RequiredFields; aca solo se valida formato.
        if (value === undefined || value === null || value === '') return [];

        const parts = typeof value === 'string' ? DATE_PATTERN.exec(value) : null;
        if (!parts) return [this._error(language)];

        const year = Number(parts[1]);
        const month = Number(parts[2]);
        const day = Number(parts[3]);
        const date = new Date(Date.UTC(year, month - 1, day));

        // `Date` normaliza fechas inexistentes (30 de febrero -> 1 de marzo), asi
        // que se comparan los componentes para detectar el desborde.
        const isRealDate = date.getUTCFullYear() === year
            && date.getUTCMonth() === month - 1
            && date.getUTCDate() === day;

        const now = new Date();
        const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        const isFuture = date.getTime() > today;
        const isTooOld = year < MIN_YEAR;

        if (!isRealDate || isFuture || isTooOld) return [this._error(language)];
        return [];
    }

    _error(language) {
        return { field: this.field, message: i18n.getMessage('CT_VALIDATION_BIRTH_DATE', language) };
    }
}

module.exports = BirthDate;
