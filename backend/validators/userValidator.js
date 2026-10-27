/**
 * @file validators/userValidator.js
 * @brief Validador del alta de alumnos: compone las reglas en el ValidationHandler.
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
const BirthDate = require('./rules/birthDate');
const CareerId = require('./rules/careerId');
const MaxLength = require('./rules/maxLength');

const STUDENT_REQUIRED_FIELDS = [
    'username', 'password', 'confirmPassword', 'firstName', 'lastName', 'dni', 'email', 'phone', 'birthDate', 'careerId'
];

// Limites de las columnas de `users` en init.sql. Validarlos aca evita que
// MariaDB corte con ER_DATA_TOO_LONG (1406) y el usuario reciba un 500.
const STUDENT_MAX_LENGTHS = [
    ['username', 50],
    ['firstName', 80],
    ['lastName', 80],
    ['dni', 30],
    ['email', 150],
    ['phone', 40]
];

function validateStudent(target, language) {
    const handler = new ValidationHandler()
        .with(new RequiredFields(STUDENT_REQUIRED_FIELDS))
        .with(new Email())
        .with(new Password())
        .with(new PasswordConfirmation('password', 'confirmPassword'))
        .with(new BirthDate())
        .with(new CareerId());

    for (const [field, max] of STUDENT_MAX_LENGTHS) {
        handler.with(new MaxLength(field, max));
    }

    return handler.validate(target, language);
}

module.exports = { validateStudent };
