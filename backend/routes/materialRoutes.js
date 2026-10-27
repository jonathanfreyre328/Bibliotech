/**
 * @file routes/materialRoutes.js
 * @brief Rutas de materiales PDF: lectura para los tres roles y escritura para admin/profesor.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/materialController');
const upload = require('../config/multerConfig');
const { verifyToken, requireRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.get('/', requireRoles('admin', 'professor', 'student'), controller.list);
router.get('/:id/download', requireRoles('admin', 'professor', 'student'), controller.download);
router.get('/:id/view', requireRoles('admin', 'professor', 'student'), controller.view);
router.post('/', requireRoles('admin', 'professor'), upload, controller.upload);
router.patch('/:id', requireRoles('admin', 'professor'), controller.update);
router.delete('/:id', requireRoles('admin', 'professor'), controller.remove);

module.exports = router;
