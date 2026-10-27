/**
 * @file middleware/globalErrorMiddleware.js
 * @brief Manejador global de errores: traduce errores tecnicos a JSON { message, errors? }.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const i18n = require('../utils/i18n/i18n');

/**
 * Manejador global de errores.
 *
 * En Express, un middleware de manejo de errores se reconoce por tener
 * CUATRO argumentos (err, req, res, next). Esa cualidad especial le indica
 * a Express que no es un middleware de flujo normal, sino una "red de
 * seguridad" que solo se ejecuta cuando otro componente llama next(error)
 * o lanza una excepción no capturada.
 *
 * Objetivo: traducir contingencias técnicas (códigos del driver MySQL,
 * errores de Multer) a respuestas HTTP_AMIGABLES y estandarizadas, sin
 * filtrar detalles internos del servidor hacia el cliente en producción.
 * Los mensajes salen del modulo i18n segun `req.language`.
 */

/**
 * Traducción de los códigos de error del driver MySQL/MariaDB a un
 * código HTTP y una clave de mensaje comprensible para el usuario final.
 */
const DRIVER_ERRORS = {
// indica que una solicitud no se puede completar porque hay un conflicto con el estado actual del recurso en el servidor    
    ER_DUP_ENTRY: { status: 409, key: 'CT_ERROR_DUPLICATE' },
    ER_ROW_IS_REFERENCED_2: { status: 409, key: 'CT_ERROR_ROW_REFERENCED' },
    ER_NO_REFERENCED_ROW_2: { status: 400, key: 'CT_ERROR_NO_REFERENCED' }, //error en la sintaxis, un formato inválido o datos dañados en el lado del cliente
    ER_BAD_NULL_ERROR: { status: 400, key: 'CT_ERROR_MISSING_DATA' },
    ER_DATA_TOO_LONG: { status: 400, key: 'CT_ERROR_DATA_TOO_LONG' },
    ER_TRUNCATED_WRONG_VALUE: { status: 400, key: 'CT_ERROR_INVALID_VALUE' },
    ER_ACCESS_DENIED_ERROR: { status: 500, key: 'CT_ERROR_DB_ACCESS' },// fallo inesperado
    ECONNREFUSED: { status: 500, key: 'CT_ERROR_DB_UNAVAILABLE' },
    ETIMEDOUT: { status: 500, key: 'CT_ERROR_DB_TIMEOUT' }
};

/**
 * Claves de los mensajes específicos para los errores conocidos de Multer.
 */
const MULTER_ERRORS = {
    LIMIT_FILE_SIZE: 'CT_ERROR_FILE_TOO_LARGE',
    LIMIT_UNEXPECTED_FILE: 'CT_ERROR_FILE_UNEXPECTED',
    LIMIT_FILE_COUNT: 'CT_ERROR_FILE_COUNT'
};

/**
 * @brief Traduce un error de Multer a un mensaje legible.
 * @param {Error} err - Error capturado por Express.
 * @param {string} [language] - Idioma de la respuesta.
 * @returns {string} Mensaje comprensible para el usuario.
 */
function translateMulterError(err, language) {
    if (err.code && MULTER_ERRORS[err.code]) return i18n.getMessage(MULTER_ERRORS[err.code], language);
    if (err.message && err.message.includes('Solo se permiten archivos PDF')) {
        return i18n.getMessage('CT_ERROR_FILE_TYPE', language);
    }
    return i18n.getMessage('CT_ERROR_FILE_UPLOAD', language);
}

/**
 * @brief Middleware global de manejo de errores.
 * @param {Error} err - Error capturado (lanzado o delegado con next(error)).
 * @param {Object} req - Petición HTTP en curso.
 * @param {Object} res - Respuesta HTTP.
 * @param {Function} next - Función de delegación (usada solo si la respuesta ya se envió).
 * @returns {Object} Respuesta JSON con el código HTTP correspondiente.
 */
function globalErrorMiddleware(err, req, res, next) {
    const language = req.language;

    // Registro del detalle técnico para auditoría y depuración del servidor.
    console.error(`[ErrorHandler] ${req.method} ${req.originalUrl} ->`, err.stack || err);

    // Si la respuesta ya se empezó a enviar no se puede reescribir el status:
    // se delega al handler por defecto de Express, que corta la conexión.
    if (res.headersSent) return next(err);

    // --- 1. Errores de la librería de carga de archivos (Multer) ---
    if (err.name === 'MulterError') {
        return res.status(400).json({ message: translateMulterError(err, language) });
    }
    if (err.message && err.message.includes('Solo se permiten archivos PDF')) {
        return res.status(400).json({ message: translateMulterError(err, language) });
    }

    // --- 2. Errores del driver de base de datos (MySQL / MariaDB) ---
    if (err.code && DRIVER_ERRORS[err.code]) {
        const { status, key } = DRIVER_ERRORS[err.code];
        return res.status(status).json({ message: i18n.getMessage(key, language) });
    }

    // --- 3. Errores de negocio que ya traen su propio código HTTP ---
    const businessStatus = err.statusCode || err.status;
    if (businessStatus >= 400 && businessStatus < 600) {
        return res.status(businessStatus).json({
            message: i18n.translateError(err, language) || i18n.getMessage('CT_ERROR_OPERATION', language),
            errors: err.errors
        });
    }

    // --- 4. Contingencia interna genérica ---
    /**
     * @note Seguridad en producción: el stack trace revela la estructura interna
     * del servidor, por lo que solo se expone en modo desarrollo.
     */
    const payload = { message: i18n.getMessage('CT_ERROR_INTERNAL', language) };
    if (process.env.NODE_ENV === 'development') {
        payload.error = err.stack || err.message;
        payload.details = err.message;
    }
    return res.status(500).json(payload);
}

module.exports = globalErrorMiddleware;
