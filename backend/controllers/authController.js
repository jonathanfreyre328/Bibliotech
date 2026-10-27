/**
 * @file controllers/authController.js
 * @brief Controlador de registro, login y perfil del usuario autenticado.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRepo = require('../repositories/userRepo');
const db = require('../config/db');
const { BOOT_ID } = require('../config/sessionContext');
const { validateStudent } = require('../validators/userValidator');
const { validateProfile, validatePasswordChange } = require('../validators/profileValidator');
const i18n = require('../utils/i18n/i18n');

const SECRET_KEY = process.env.JWT_SECRET;

/**
 * Hash bcrypt valido de un valor aleatorio. Se usa cuando el usuario no existe
 * para que `bcrypt.compare` consuma el mismo tiempo que con una cuenta real y no
 * se pueda enumerar usuarios midiendo la latencia del login.
 */
const DUMMY_PASSWORD_HASH = '$2b$12$qM5rAODKkWAdLg4TozG6mOzbQ4DKM1i8DeZc/1WaXnkYTYKObve6a';

/**
 * @brief Proyeccion publica del usuario autenticado (nunca incluye password).
 * @param {Object} user - Fila de userRepo.findById.
 * @returns {Object} Datos aptos para el perfil y /auth/me.
 */
function toProfile(user) {
    return {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        dni: user.dni,
        email: user.email,
        phone: user.phone,
        birth_date: user.birth_date,
        active: Boolean(user.active),
        created_at: user.created_at,
        role: user.role,
        career_id: user.career_id,
        career_name: user.career_name
    };
}

class AuthController {
    async careers(req, res, next) {
        try {
            const [rows] = await db.execute('SELECT id, name FROM careers WHERE active = TRUE ORDER BY name');
            return res.json(rows);
        } catch (error) { return next(error); }
    }

    async register(req, res, next) {
        try {
            const body = req.body || {};
            const validation = validateStudent(body, req.language);
            if (!validation.valid) return res.status(400).json({ message: i18n.getMessage('CT_AUTH_INVALID_DATA', req.language), errors: validation.errors });

            const userId = await userRepo.create({
                ...body,
                password: await bcrypt.hash(body.password, 12)
            });

            return res.status(201).json({ message: i18n.getMessage('CT_AUTH_REGISTERED', req.language), userId });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                const msg = error.sqlMessage || '';
                let field = i18n.getMessage('CT_FIELD_GENERIC', req.language);
                if (msg.includes('username')) field = i18n.getMessage('CT_FIELD_USERNAME', req.language);
                else if (msg.includes('email')) field = i18n.getMessage('CT_FIELD_EMAIL', req.language);
                else if (msg.includes('dni')) field = i18n.getMessage('CT_FIELD_DNI', req.language);
                return res.status(409).json({ message: i18n.format('CT_AUTH_FIELD_TAKEN', req.language, [field]) });
            }
            return next(error);
        }
    }

    async login(req, res, next) {
        try {
            const { username, password } = req.body || {};
            if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
                return res.status(400).json({ message: i18n.getMessage('CT_AUTH_MISSING_CREDENTIALS', req.language) });
            }
            const user = await userRepo.findByUsername(username);
            const storedHash = user && user.password ? user.password : DUMMY_PASSWORD_HASH;
            const passwordMatches = await bcrypt.compare(password, storedHash);
            if (!user || !passwordMatches) {
                return res.status(401).json({ message: i18n.getMessage('CT_AUTH_INVALID_CREDENTIALS', req.language) });
            }
            const token = jwt.sign({ id: user.id, role: user.role, bootId: BOOT_ID }, SECRET_KEY, { expiresIn: '8h' });
            return res.json({ message: i18n.getMessage('CT_AUTH_LOGIN_SUCCESS', req.language), token, role: user.role, userId: user.id });
        } catch (error) {
            return next(error);
        }
    }

    async me(req, res, next) {
        try {
            const user = await userRepo.findById(req.userId);
            if (!user) return res.status(404).json({ message: i18n.getMessage('CT_USER_NOT_FOUND', req.language) });
            return res.json(toProfile(user));
        } catch (error) {
            return next(error);
        }
    }

    async updateProfile(req, res, next) {
        try {
            const body = req.body || {};
            const data = {
                firstName: body.firstName,
                lastName: body.lastName,
                email: body.email,
                phone: body.phone
            };
            const validation = validateProfile(data, req.language);
            if (!validation.valid) {
                return res.status(400).json({
                    message: i18n.getMessage('CT_PROFILE_INVALID_DATA', req.language),
                    errors: validation.errors
                });
            }

            await userRepo.updateProfile(req.userId, data);
            const user = await userRepo.findById(req.userId);
            if (!user) return res.status(404).json({ message: i18n.getMessage('CT_USER_NOT_FOUND', req.language) });

            return res.json({
                message: i18n.getMessage('CT_PROFILE_UPDATED', req.language),
                profile: toProfile(user)
            });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                const message = i18n.format('CT_AUTH_FIELD_TAKEN', req.language, ['email']);
                return res.status(409).json({ message });
            }
            return next(error);
        }
    }

    async changePassword(req, res, next) {
        try {
            const body = req.body || {};
            const validation = validatePasswordChange(body, req.language);
            if (!validation.valid) {
                return res.status(400).json({
                    message: i18n.getMessage('CT_PROFILE_PASSWORD_INVALID_DATA', req.language),
                    errors: validation.errors
                });
            }

            // `RequiredFields` solo exige presencia; bcrypt necesita un string.
            // Un JSON malformado (por ejemplo, un numero) debe responder 400 y no 500.
            if (typeof body.currentPassword !== 'string') {
                return res.status(400).json({ message: i18n.getMessage('CT_PROFILE_CURRENT_PASSWORD_INVALID', req.language) });
            }

            const user = await userRepo.findPasswordById(req.userId);
            if (!user) return res.status(404).json({ message: i18n.getMessage('CT_USER_NOT_FOUND', req.language) });

            const currentMatches = await bcrypt.compare(body.currentPassword, user.password);
            if (!currentMatches) {
                return res.status(400).json({ message: i18n.getMessage('CT_PROFILE_CURRENT_PASSWORD_INVALID', req.language) });
            }

            const repeatsCurrent = await bcrypt.compare(body.newPassword, user.password);
            if (repeatsCurrent) {
                return res.status(400).json({ message: i18n.getMessage('CT_PROFILE_PASSWORD_SAME', req.language) });
            }

            const passwordHash = await bcrypt.hash(body.newPassword, 12);
            await userRepo.updatePassword(req.userId, passwordHash);
            return res.json({ message: i18n.getMessage('CT_PROFILE_PASSWORD_UPDATED', req.language) });
        } catch (error) {
            return next(error);
        }
    }
}

module.exports = new AuthController();
