/**
 * @file validators/rules/passwordConfirmation.js
 * @brief Regla de validacion de coincidencia entre una contrasena y su repeticion.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const Validation = require('../validation');
const i18n = require('../../utils/i18n/i18n');

class PasswordConfirmation extends Validation {
    /**
     * @param {string} [passwordField='password'] - Campo con la contrasena.
     * @param {string} [confirmationField='confirmPassword'] - Campo con la repeticion.
     */
    constructor(passwordField = 'password', confirmationField = 'confirmPassword') {
        super();
        this.passwordField = passwordField;
        this.confirmationField = confirmationField;
    }

    validate(target, language) {
        const password = target[this.passwordField];
        const confirmation = target[this.confirmationField];

        // La ausencia de cualquiera de los dos campos la reporta RequiredFields.
        if (password === undefined || password === null || password === '') return [];
        if (confirmation === undefined || confirmation === null || confirmation === '') return [];

        if (password !== confirmation) {
            return [{
                field: this.confirmationField,
                message: i18n.getMessage('CT_VALIDATION_PASSWORD_MISMATCH', language)
            }];
        }

        return [];
    }
}

module.exports = PasswordConfirmation;
