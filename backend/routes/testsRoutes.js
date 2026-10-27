/**
 * @file routes/testsRoutes.js
 * @brief Ruta del laboratorio de pruebas, activa solo con NODE_ENV=testing.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const express = require('express');
const router = express.Router();
/**
 * Módulo/Biblioteca para el manejo de rutas:
 */
const path = require('path');

// --- Rutas de Navegación del Frontend HTML ---

// Al entrar a http://localhost:3000/ cargamos el html de los tests
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/html/tests.html'));
});

module.exports = router;