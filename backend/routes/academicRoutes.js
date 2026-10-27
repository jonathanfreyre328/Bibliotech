/**
 * @file routes/academicRoutes.js
 * @brief Rutas academicas: catalogo, solicitudes y clases segun el rol.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/academicController');
const { verifyToken, requireRoles } = require('../middleware/authMiddleware');

router.get('/catalog', verifyToken, controller.catalog);
router.get('/classes', verifyToken, requireRoles('professor'), controller.professorClasses);
router.get('/requests', verifyToken, requireRoles('professor'), controller.requests);
router.get('/my-requests', verifyToken, requireRoles('student'), controller.studentRequests);
router.post('/requests', verifyToken, requireRoles('student'), controller.requestClass);
router.patch('/requests/:id', verifyToken, requireRoles('professor'), controller.updateRequest);
router.delete('/requests/:id', verifyToken, requireRoles('student'), controller.cancelRequest);
router.get('/my-classes', verifyToken, requireRoles('student'), controller.accessibleClasses);

module.exports = router;
