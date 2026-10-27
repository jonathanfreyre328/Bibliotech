/**
 * @file validators/profileValidator.js
 * @brief Validaciones del perfil propio y del cambio de contrasena.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const ValidationHandler = require('./validationHandler');
const RequiredFields = require('./rules/requiredFields');
const Email = require('./rules/email');
const Password = require('./rules/password');
const PasswordConfirmation = require('./rules/passwordConfirmation');
const MaxLength = require('./rules/maxLength');

const PROFILE_REQUIRED_FIELDS = ['firstName', 'lastName', 'email', 'phone'];

// Limites de las columnas editables de `users` en init.sql.
const PROFILE_MAX_LENGTHS = [
    ['firstName', 80],
    ['lastName', 80],
    ['email', 150],
    ['phone', 40]
];

const PASSWORD_CHANGE_REQUIRED_FIELDS = ['currentPassword', 'newPassword', 'confirmPassword'];

/**
 * @brief Valida los datos editables del perfil.
 * @param {Object} target - { firstName, lastName, email, phone }.
 * @param {string} [language] - Idioma de los mensajes.
 * @returns {{valid: boolean, errors: Array<{field: string, message: string}>}}
 */
function validateProfile(target, language) {
    const handler = new ValidationHandler()
        .with(new RequiredFields(PROFILE_REQUIRED_FIELDS))
        .with(new Email());

    for (const [field, max] of PROFILE_MAX_LENGTHS) {
        handler.with(new MaxLength(field, max));
    }

    return handler.validate(target, language);
}

/**
 * @brief Valida el cambio de contrasena con verificacion de la clave actual.
 * @param {Object} target - { currentPassword, newPassword, confirmPassword }.
 * @param {string} [language] - Idioma de los mensajes.
 * @returns {{valid: boolean, errors: Array<{field: string, message: string}>}}
 */
function validatePasswordChange(target, language) {
    return new ValidationHandler()
        .with(new RequiredFields(PASSWORD_CHANGE_REQUIRED_FIELDS))
        .with(new Password('newPassword'))
        .with(new PasswordConfirmation('newPassword', 'confirmPassword'))
        .validate(target, language);
}

module.exports = { validateProfile, validatePasswordChange };
