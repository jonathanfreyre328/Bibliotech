/**
 * @file middleware/rateLimitMiddleware.js
 * @brief Limitador de intentos en memoria para endpoints sensibles.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const i18n = require('../utils/i18n/i18n');

const DEFAULT_MESSAGE_KEY = 'CT_AUTH_TOO_MANY_ATTEMPTS';
const CLEANUP_INTERVAL = 1000;

/**
 * @brief Crea un middleware de Express que limita peticiones por clave.
 * @details El estado vive en un `Map` en memoria: alcanza para una sola instancia
 * y se reinicia con el servidor. Cada clave tiene una ventana (`windowMs`) y un
 * contador; al vencer la ventana el contador se descarta.
 *
 * Con `countFailuresOnly: true` (pensado para el login) solo cuentan las
 * respuestas 400/401 y un 2xx reinicia el contador, de modo que un login exitoso
 * libera al usuario aunque antes se haya equivocado. Con `false` (registro) se
 * cuentan todas las peticiones.
 *
 * @param {Object} options - Configuracion del limitador.
 * @param {number} options.windowMs - Duracion de la ventana en milisegundos.
 * @param {number} options.max - Maximo de eventos permitidos por ventana.
 * @param {Function} [options.keyGenerator] - (req) => string. Por defecto usa `req.ip`.
 * @param {boolean} [options.countFailuresOnly=false] - Contar solo fallos 400/401.
 * @param {string} [options.messageKey] - Clave i18n del mensaje 429.
 * @param {Function} [options.now] - Reloj inyectable (tests).
 * @returns {Function} Middleware de Express.
 */
function createRateLimiter({
    windowMs,
    max,
    keyGenerator,
    countFailuresOnly = false,
    messageKey = DEFAULT_MESSAGE_KEY,
    now = Date.now
}) {
    if (!Number.isFinite(windowMs) || windowMs <= 0) {
        throw new TypeError('rateLimit: windowMs debe ser un numero positivo.');
    }
    if (!Number.isInteger(max) || max <= 0) {
        throw new TypeError('rateLimit: max debe ser un entero positivo.');
    }

    const buckets = new Map();
    let requestsSinceCleanup = 0;

    /**
     * @brief Borra las ventanas vencidas para que el Map no crezca sin control.
     * @param {number} currentTime - Marca de tiempo actual.
     */
    function deleteExpired(currentTime) {
        for (const [key, bucket] of buckets) {
            if (bucket.resetAt <= currentTime) buckets.delete(key);
        }
    }

    /**
     * @brief Registra un fallo para una clave, reiniciando la ventana si vencio.
     * @param {string} key - Clave de la peticion.
     */
    function countFailure(key) {
        const currentTime = now();
        const bucket = buckets.get(key);

        if (!bucket || bucket.resetAt <= currentTime) {
            buckets.set(key, { count: 1, resetAt: currentTime + windowMs });
            return;
        }

        bucket.count += 1;
    }

    return function rateLimiter(req, res, next) {
        const currentTime = now();
        const key = keyGenerator ? keyGenerator(req) : req.ip;
        let bucket = buckets.get(key);

        if (bucket && bucket.resetAt <= currentTime) {
            buckets.delete(key);
            bucket = undefined;
        }

        if (bucket && bucket.count >= max) {
            const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1000));
            res.set('Retry-After', String(retryAfter));
            return res.status(429).json({
                message: i18n.getMessage(messageKey, req.language)
            });
        }

        if (!bucket) {
            bucket = { count: 0, resetAt: currentTime + windowMs };
            buckets.set(key, bucket);
        }

        if (countFailuresOnly) {
            res.on('finish', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    buckets.delete(key);
                } else if (res.statusCode === 400 || res.statusCode === 401) {
                    countFailure(key);
                }
            });
        } else {
            bucket.count += 1;
        }

        requestsSinceCleanup += 1;
        if (requestsSinceCleanup >= CLEANUP_INTERVAL) {
            requestsSinceCleanup = 0;
            deleteExpired(currentTime);
        }

        return next();
    };
}

module.exports = { createRateLimiter };
