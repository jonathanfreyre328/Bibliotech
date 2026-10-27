/**
 * @file routes/adminRoutes.js
 * @brief Rutas del panel de administracion, protegidas con verifyToken + isAdmin.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

/**
 * Cadena de seguridad aplicada a todas las rutas del panel:
 * 1. ¿Quién sos? (verifyToken)
 * 2. ¿Tenés permiso? (isAdmin)
 */
router.use(verifyToken, isAdmin);

router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/active', adminController.setUserActive);
router.post('/professors', adminController.createProfessor);
router.get('/careers', adminController.careers);
router.post('/careers', adminController.createCareer);
router.patch('/careers/:id', adminController.updateCareer);
router.post('/subjects', adminController.createSubject);
router.get('/subjects', adminController.subjects);
router.patch('/subjects/:id', adminController.updateSubject);
router.patch('/subjects/:id/active', adminController.setSubjectActive);
router.get('/classes', adminController.getAllClasses);
router.post('/classes', adminController.createClass);
router.patch('/classes/:id', adminController.updateClass);
router.patch('/classes/:id/active', adminController.setClassActive);
router.delete('/classes/:id', adminController.deleteClass);
router.delete('/careers/:id', adminController.deleteCareer);
router.delete('/subjects/:id', adminController.deleteSubject);
router.delete('/users/:id', adminController.deleteUser);
router.post('/classes/:id/students', adminController.assignStudent);
router.patch('/users/:id/career', adminController.changeCareer);
router.patch('/professors/:id', adminController.updateProfessor);

module.exports = router;