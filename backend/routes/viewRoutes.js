/**
 * @file routes/viewRoutes.js
 * @brief Rutas de navegacion que sirven las paginas HTML segun el rol.
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

// Al entrar a http://localhost:3000/ cargamos login
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/html/login.html'));
});

// Rutas amigables para las pantallas:
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/html/login.html'));
});

router.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/html/register.html'));
});

router.get('/professor-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/html/professor-dashboard.html'));
});

router.get('/student-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/html/student-dashboard.html'));
});

router.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/html/admin-dashboard.html'));
});

/**
 * @refactoring poner condición para cuando pide un archivo y no una uri
 * Captura de rutas inexistentes (404)
 * Si el usuario intenta acceder a una ruta que no existe,
 * se lo redirige automáticamente al login por seguridad y UX.
 */

router.use((req, res) => {
    // Si la petición pide un archivo (tiene extensión), mejor devolver un 404 seco
    // para no romper el debug de scripts/estilos.
    if (req.path.includes('.')) {
        return res.status(404).send('Recurso no encontrado');
    }

    // Si es una ruta de navegación (ej: /loquesea), servimos el login
    res.status(404).sendFile(path.join(__dirname, '../../frontend/html/login.html'));
});

module.exports = router;
