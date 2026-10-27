/**
 * @file controllers/adminController.js
 * @brief Controlador del panel de administracion (usuarios, carreras, materias y clases).
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const userRepo = require('../repositories/userRepo');
const db = require('../config/db');
const adminRepo = require('../repositories/adminRepo');
const academicRepo = require('../repositories/academicRepo');
const i18n = require('../utils/i18n/i18n');

/**
 * Controlador del panel de administración.
 *
 * Las contingencias técnicas se delegan al manejador global de errores con
 * next(error). Se conservan como respuestas explícitas únicamente los casos
 * de negocio con semántica propia (reglas de integridad con mensaje claro),
 * que son los que el usuario necesita leer tal cual.
 */
class AdminController {
    async getAllUsers(req, res, next) {
        try { return res.json(await userRepo.findAll()); }
        catch (error) { return next(error); }
    }

    async setUserActive(req, res, next) {
        try {
            if (Number(req.params.id) === req.userId) return res.status(400).json({ message: i18n.getMessage('CT_ADMIN_CANNOT_DEACTIVATE_SELF', req.language) });
            await userRepo.setActive(req.params.id, req.body.active !== false);
            return res.json({ message: i18n.getMessage('CT_ADMIN_USER_STATUS_UPDATED', req.language) });
        } catch (error) { return next(error); }
    }

    async careers(req, res, next) {
        try {
            const [rows] = await db.execute('SELECT * FROM careers ORDER BY name');
            return res.json(rows);
        } catch (error) { return next(error); }
    }

    async createProfessor(req, res, next) {
        try {
            const required = ['username', 'password', 'firstName', 'lastName', 'dni', 'email', 'phone', 'birthDate'];
            if (required.some((field) => !req.body[field])) return res.status(400).json({ message: i18n.getMessage('CT_ADMIN_MISSING_REQUIRED', req.language) });
            const bcrypt = require('bcrypt');
            const id = await userRepo.create({ ...req.body, careerId: null, password: await bcrypt.hash(req.body.password, 12) }, 'professor');
            return res.status(201).json({ id, message: i18n.getMessage('CT_ADMIN_PROFESSOR_CREATED', req.language) });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: i18n.getMessage('CT_ADMIN_USER_DUPLICATED', req.language) });
            return next(error);
        }
    }

    async createCareer(req, res, next) {
        try {
            if (!req.body.name) return res.status(400).json({ message: i18n.getMessage('CT_ADMIN_NAME_REQUIRED', req.language) });
            const duracionAños = parseInt(req.body.duracionAños) || 5;
            if (duracionAños < 1 || duracionAños > 10) {
                return res.status(400).json({ message: i18n.getMessage('CT_ADMIN_DURATION_RANGE', req.language) });
            }
            const id = await adminRepo.createCareer(req.body.name, duracionAños);
            return res.status(201).json({ id, message: i18n.getMessage('CT_ADMIN_CAREER_CREATED', req.language), duracionAños });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: i18n.getMessage('CT_ADMIN_CAREER_INVALID', req.language) });
            return next(error);
        }
    }

    async updateCareer(req, res, next) {
        try {
            const id = req.params.id;
            const { name, duracionAños } = req.body;
            
            if (name === undefined && duracionAños === undefined) {
                return res.status(400).json({ message: i18n.getMessage('CT_ADMIN_UPDATE_EMPTY', req.language) });
            }
            
            const data = {};
            if (name !== undefined) data.name = name;
            if (duracionAños !== undefined) {
                const parsed = parseInt(duracionAños);
                if (isNaN(parsed) || parsed < 1 || parsed > 10) {
                    return res.status(400).json({ message: i18n.getMessage('CT_ADMIN_DURATION_RANGE', req.language) });
                }
                data.duracionAños = parsed;
            }
            
            await adminRepo.updateCareer(id, data);
            return res.json({ message: i18n.getMessage('CT_ADMIN_CAREER_UPDATED', req.language) });
        } catch (error) {
            if (error.message.includes('No se puede reducir')) {
                return res.status(400).json({ message: i18n.translateError(error, req.language) });
            }
            return next(error);
        }
    }

    async updateSubject(req, res, next) {
        try {
            const id = req.params.id;
            const { careerId, año, name } = req.body;
            
            if (careerId === undefined && año === undefined && name === undefined) {
                return res.status(400).json({ message: i18n.getMessage('CT_ADMIN_UPDATE_EMPTY', req.language) });
            }
            
            const data = {};
            if (careerId !== undefined) data.careerId = parseInt(careerId);
            if (año !== undefined) {
                const parsed = parseInt(año);
                if (isNaN(parsed) || parsed < 1) return res.status(400).json({ message: i18n.getMessage('CT_ADMIN_INVALID_YEAR', req.language) });
                data.año = parsed;
            }
            if (name !== undefined) data.name = name;
            
            await adminRepo.updateSubject(id, data);
            return res.json({ message: i18n.getMessage('CT_ADMIN_SUBJECT_UPDATED', req.language) });
        } catch (error) {
            if (error.message.includes('Año inválido') || error.message.includes('ya existe')) {
                return res.status(400).json({ message: i18n.translateError(error, req.language) });
            }
            return next(error);
        }
    }

    async setSubjectActive(req, res, next) {
        try {
            await adminRepo.setSubjectActive(req.params.id, req.body.active === true);
            return res.json({ message: i18n.getMessage('CT_ADMIN_SUBJECT_STATUS_UPDATED', req.language) });
        } catch (error) {
            return next(error);
        }
    }

    async updateProfessor(req, res, next) {
        try {
            const id = req.params.id;
            const { firstName, lastName, phone, password } = req.body;
            
            if (!firstName && !lastName && !phone && (!password || password === '')) {
                return res.status(400).json({ message: i18n.getMessage('CT_ADMIN_UPDATE_EMPTY', req.language) });
            }
            
            const data = {};
            if (firstName !== undefined) data.firstName = firstName;
            if (lastName !== undefined) data.lastName = lastName;
            if (phone !== undefined) data.phone = phone;
            if (password !== undefined && password !== '') data.password = password;
            
            await adminRepo.updateProfessor(id, data);
            return res.json({ message: i18n.getMessage('CT_ADMIN_PROFESSOR_UPDATED', req.language) });
        } catch (error) {
            return next(error);
        }
    }

    async updateClass(req, res, next) {
        try {
            const id = req.params.id;
            const { subjectId, professorId } = req.body;
            
            if (subjectId === undefined && professorId === undefined) {
                return res.status(400).json({ message: i18n.getMessage('CT_ADMIN_UPDATE_EMPTY', req.language) });
            }
            
            const data = {};
            if (subjectId !== undefined) data.subjectId = parseInt(subjectId);
            if (professorId !== undefined) data.professorId = parseInt(professorId);
            
            await adminRepo.updateClass(id, data);
            return res.json({ message: i18n.getMessage('CT_ADMIN_CLASS_UPDATED', req.language) });
        } catch (error) {
            return next(error);
        }
    }

    async createSubject(req, res, next) {
        try {
            if (!req.body.careerId || !req.body.año || !req.body.name) return res.status(400).json({ message: i18n.getMessage('CT_ADMIN_SUBJECT_MISSING', req.language) });
            const año = parseInt(req.body.año);
            if (isNaN(año) || año < 1) return res.status(400).json({ message: i18n.getMessage('CT_ADMIN_INVALID_YEAR', req.language) });
            const id = await adminRepo.createSubject(req.body.careerId, año, req.body.name);
            return res.status(201).json({ id, message: i18n.getMessage('CT_ADMIN_SUBJECT_CREATED', req.language) });
        } catch (error) { 
            if (error.message.includes('Año inválido')) return res.status(400).json({ message: i18n.translateError(error, req.language) });
            if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: i18n.getMessage('CT_ADMIN_SUBJECT_INVALID', req.language) });
            return next(error); 
        }
    }

    async subjects(req, res, next) {
        try {
            const { careerId, año, includeInactive } = req.query;
            const subjects = await adminRepo.getAllSubjects(careerId, año, includeInactive === 'true');
            return res.json(subjects);
        } catch (error) { return next(error); }
    }

    async createClass(req, res, next) {
        try {
            if (!req.body.subjectId || !req.body.professorId) return res.status(400).json({ message: i18n.getMessage('CT_ADMIN_CLASS_MISSING', req.language) });
            return res.status(201).json({ id: await adminRepo.createClass(req.body.subjectId, req.body.professorId, req.body.copyFromClassId || null) });
        } catch (error) {
            return next(error);
        }
    }

    async setClassActive(req, res, next) {
        try {
            await adminRepo.setClassActive(req.params.id, req.body.active === true);
            return res.json({ message: i18n.getMessage('CT_ADMIN_CLASS_STATUS_UPDATED', req.language) });
        } catch (error) { return next(error); }
    }

    async getAllClasses(req, res, next) {
        try {
            const classes = await academicRepo.findAllClasses();
            return res.json(classes);
        } catch (error) { return next(error); }
    }

    async deleteClass(req, res, next) {
        try {
            const deleted = await adminRepo.deleteClass(req.params.id);
            if (!deleted) return res.status(404).json({ message: i18n.getMessage('CT_ADMIN_CLASS_NOT_FOUND', req.language) });
            return res.json({ message: i18n.getMessage('CT_ADMIN_CLASS_DELETED', req.language) });
        } catch (error) { return next(error); }
    }

    async deleteCareer(req, res, next) {
        try {
            const deleted = await adminRepo.deleteCareer(req.params.id);
            if (!deleted) return res.status(404).json({ message: i18n.getMessage('CT_ADMIN_CAREER_NOT_FOUND', req.language) });
            return res.json({ message: i18n.getMessage('CT_ADMIN_CAREER_DELETED', req.language) });
        } catch (error) {
            if (error.message.includes('No se puede eliminar')) {
                return res.status(400).json({ message: i18n.translateError(error, req.language) });
            }
            return next(error);
        }
    }

    async deleteSubject(req, res, next) {
        try {
            const deleted = await adminRepo.deleteSubject(req.params.id);
            if (!deleted) return res.status(404).json({ message: i18n.getMessage('CT_ADMIN_SUBJECT_NOT_FOUND', req.language) });
            return res.json({ message: i18n.getMessage('CT_ADMIN_SUBJECT_DELETED', req.language) });
        } catch (error) {
            if (error.message.includes('No se puede eliminar')) {
                return res.status(400).json({ message: i18n.translateError(error, req.language) });
            }
            return next(error);
        }
    }

    async deleteUser(req, res, next) {
        try {
            if (Number(req.params.id) === req.userId) {
                return res.status(400).json({ message: i18n.getMessage('CT_ADMIN_CANNOT_DELETE_SELF', req.language) });
            }
            const deleted = await adminRepo.deleteUser(req.params.id);
            if (!deleted) return res.status(404).json({ message: i18n.getMessage('CT_USER_NOT_FOUND', req.language) });
            return res.json({ message: i18n.getMessage('CT_ADMIN_USER_DELETED', req.language) });
        } catch (error) {
            if (error.message.includes('No se puede eliminar')) {
                return res.status(400).json({ message: i18n.translateError(error, req.language) });
            }
            if (error.message.includes('no encontrado')) {
                return res.status(404).json({ message: i18n.translateError(error, req.language) });
            }
            return next(error);
        }
    }

    async assignStudent(req, res, next) {
        try {
            await adminRepo.assignStudent(req.params.id, req.body.studentId);
            return res.json({ message: i18n.getMessage('CT_ADMIN_STUDENT_ASSIGNED', req.language) });
        } catch (error) {
            // Los errores de negocio del repositorio ya traen statusCode = 400
            // y el middleware global los traduce a { message, errors? }.
            return next(error);
        }
    }

    async changeCareer(req, res, next) {
        try {
            await adminRepo.changeCareer(req.params.id, req.body.careerId);
            return res.json({ message: i18n.getMessage('CT_ADMIN_CAREER_CHANGED', req.language) });
        } catch (error) {
            return next(error);
        }
    }
}

module.exports = new AdminController();
