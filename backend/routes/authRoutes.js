/**
 * @file routes/authRoutes.js
 * @brief Rutas publicas de autenticacion y registro.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/rateLimitMiddleware');

/**
 * Login: se cuentan solo los fallos (400/401) por IP + usuario. Un login exitoso
 * reinicia el contador, asi que quien se equivoca y luego acierta no queda
 * bloqueado.
 */
const loginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    countFailuresOnly: true,
    keyGenerator: (req) => {
        const username = req.body && req.body.username ? String(req.body.username) : '';
        return `${req.ip}|${username.trim().toLowerCase()}`;
    }
});

/**
 * Registro: se cuentan todos los intentos por IP para frenar la creacion masiva
 * de cuentas.
 */
const registerLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    keyGenerator: (req) => req.ip
});

router.post('/register', registerLimiter, authController.register);
router.get('/careers', authController.careers);
router.post('/login', loginLimiter, authController.login);
router.get('/me', verifyToken, authController.me);
router.patch('/profile', verifyToken, authController.updateProfile);
router.patch('/password', verifyToken, authController.changePassword);

module.exports = router;