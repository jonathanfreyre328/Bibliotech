/**
 * @file utils/dbutils/cliUtils.js
 * @brief Utilidades compartidas por los scripts CLI de la base de datos.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

/**
 * @brief Muestra un separador visual en la consola.
 * @param {string} title - Texto a mostrar en el separador.
 */
function header(title) {
    console.log('=================================================');
    console.log(title);
    console.log('=================================================');
}

/**
 * @brief Describe un error de conexión de forma legible.
 * @details Algunos errores del driver llegan con `message` vacío y solo
 * informan el código (por ejemplo ECONNREFUSED cuando el servicio no está
 * levantado), por lo que se muestra cualquiera de los dos.
 * @param {Error} err - Error capturado.
 * @returns {string} Descripción del error.
 */
function describeError(err) {
    return err.message || err.code || 'error desconocido';
}

/**
 * @brief Devuelve la configuración de conexión con las credenciales root.
 * @returns {{host: string, user: string, password: string}} Datos de conexión.
 */
function rootConnectionConfig() {
    return {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_ROOT_USER || 'root',
        password: process.env.DB_ROOT_PASS || ''
    };
}

module.exports = { header, describeError, rootConnectionConfig };
