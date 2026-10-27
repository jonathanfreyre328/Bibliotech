/**
 * @file config/sessionContext.js
 * @brief Identificador del arranque actual del proceso.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const { randomUUID } = require('crypto');

/**
 * Identificador unico del arranque actual. Se genera una sola vez por proceso;
 * al reiniciar el backend cambia, por lo que los JWT emitidos por el proceso
 * anterior quedan invalidos aunque su firma y fecha de expiracion sigan siendo
 * validas.
 */
const BOOT_ID = randomUUID();

module.exports = Object.freeze({ BOOT_ID });
