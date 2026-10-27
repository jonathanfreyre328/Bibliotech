/**
 * @file middleware/authMiddleware.js
 * @brief Autenticacion JWT y autorizacion por roles.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { BOOT_ID } = require('../config/sessionContext');
const i18n = require('../utils/i18n/i18n');

const SECRET_KEY = process.env.JWT_SECRET;

const authMiddleware = {
    verifyToken: async (req, res, next) => {
        const authHeader = req.headers['authorization'];

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: i18n.getMessage('CT_AUTH_TOKEN_FORMAT', req.language) });
        }

        const pureToken = authHeader.slice('Bearer '.length).trim();
        if (!pureToken) {
            return res.status(401).json({ message: i18n.getMessage('CT_AUTH_TOKEN_FORMAT', req.language) });
        }

        try {
            const decoded = jwt.verify(pureToken, SECRET_KEY, { algorithms: ['HS256'] });

            // Un token firmado por un arranque anterior ya no sirve: al
            // reiniciar el backend se cierran todas las sesiones existentes.
            if (decoded.bootId !== BOOT_ID) {
                return res.status(401).json({ message: i18n.getMessage('CT_AUTH_SESSION_INVALID', req.language) });
            }

            const [users] = await db.execute(
                `SELECT u.id, u.active, r.name AS role
                 FROM users u
                 JOIN users_roles ur ON ur.user_id = u.id
                 JOIN roles r ON r.id = ur.role_id
                 WHERE u.id = ? AND u.active = TRUE`,
                [decoded.id]
            );
            const user = users[0];

            if (!user || user.role !== decoded.role) {
                return res.status(401).json({ message: i18n.getMessage('CT_AUTH_SESSION_INVALID', req.language) });
            }

            req.userId = user.id;
            req.userRole = user.role;
            return next();
        } catch (error) {
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: i18n.getMessage('CT_AUTH_TOKEN_INVALID', req.language) });
            }
            console.error('Authentication lookup failed:', error);
            return res.status(500).json({ message: i18n.getMessage('CT_AUTH_SESSION_CHECK_FAILED', req.language) });
        }
    },

    requireRoles: (...allowedRoles) => (req, res, next) => {
        if (!allowedRoles.includes(req.userRole)) {
            return res.status(403).json({ message: i18n.getMessage('CT_AUTH_FORBIDDEN', req.language) });
        }
        next();
    },

    isAdmin: (req, res, next) => {
        if (req.userRole !== 'admin') {
            return res.status(403).json({
                message: i18n.getMessage('CT_AUTH_ADMIN_REQUIRED', req.language)
            });
        }
        next();
    }
};

module.exports = authMiddleware;
