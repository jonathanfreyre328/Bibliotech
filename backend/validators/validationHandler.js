/**
 * @file validators/validationHandler.js
 * @brief Acumulador de reglas de validacion y consolidacion de errores.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const Validation = require('./validation');

class ValidationHandler {
    constructor() {
        this.validators = [];
    }

    with(validation) {
        if (!(validation instanceof Validation)) {
            throw new Error('El validador debe implementar la interfaz Validation.');
        }
        this.validators.push(validation);
        return this;
    }

    validate(target, language) {
        const errors = this.validators.flatMap((validator) => validator.validate(target, language));
        return { valid: errors.length === 0, errors };
    }
}

module.exports = ValidationHandler;
