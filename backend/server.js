/**
 * @file server.js
 * @brief Punto de entrada del servidor Express: middlewares, rutas y arranque.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

/**
 * Carga las variables de entorno desde archivo .env 
 * para no exponer claves en el código.
 * Un archivo .env es un archivo de texto plano utilizado 
 * en el desarrollo de software para almacenar variables de entorno 
 * y credenciales sensibles (claves API, credenciales de bases de datos, 
 * tokens) fuera del código fuente. Se sitúa en la raíz del proyecto, 
 * usa pares clave-valor y nunca debe subirse al control de versiones (Git). 
 */
 require('dotenv').config();

/**
 * Express es un framework web minimalista, rápido y flexible para Node.js, 
 * diseñado para facilitar la creación de aplicaciones back-end y APIs. 
 * Proporciona una capa ligera de características fundamentales, \
 * como el enrutamiento y la gestión de middleware, \
 * permitiendo construir servidores web de manera eficiente \
 * sin imponer estructuras rígidas.
 */
const express = require('express');

/**
 * Módulo/Biblioteca que permite peticiones desde el origen del frontend:
 */
const cors = require('cors');

/**
 * Módulo/Biblioteca para el manejo de rutas:
 */
const path = require('path');

/**
 * Importar las rutas definidas arriba (API y Navegación)
 */
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const academicRoutes = require('./routes/academicRoutes');
const materialRoutes = require('./routes/materialRoutes');
const viewRoutes = require('./routes/viewRoutes');
const testsRoutes = require('./routes/testsRoutes');

// Gestor de idiomas y resolucion del idioma por peticion (Accept-Language)
const i18n = require('./utils/i18n/i18n');
const languageMiddleware = require('./middleware/languageMiddleware');

// Manejador global de excepciones (traduce errores técnicos a respuestas amigables)
const globalErrorMiddleware = require('./middleware/globalErrorMiddleware');

const app = express();

// --- Debug middleware ---
app.use((req, res, next) => {
    console.log(`[SERVER] ${req.method} ${req.path}`);
    next();
});

// --- Middlewares ---
// CORS: si CORS_ORIGIN esta definido se permite solo ese origen; si queda vacio
// se conserva el comportamiento abierto de desarrollo (cualquier origen).
app.use(process.env.CORS_ORIGIN ? cors({ origin: process.env.CORS_ORIGIN }) : cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Idioma de la peticion: req.language (es/en) a partir de Accept-Language.
app.use(languageMiddleware);

// --- Registrar rutas de la API (ANTES de static) ---
app.use('/api/auth', authRoutes);

app.use('/api/admin', adminRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/materials', materialRoutes);

// Ninguna petición de API debe caer en el fallback HTML de navegación.
app.use('/api', (req, res) => {
    res.status(404).json({ message: i18n.getMessage('CT_API_NOT_FOUND', req.language) });
});

// --- Servir archivos estáticos del FRONTEND (DESPUÉS de API) ---
// (esto permite que el HTML acceda a ../css y ../js)
app.use(express.static(path.join(__dirname, '../frontend')));

// --- Registrar rutas de Navegación del Frontend ---
// Se coloca al final para que actúe como capturador de rutas de UI (SPA fallback)

/**
 * Usar una variable de entorno NODE_ENV en el .env para usar
 * el modo testing o production.
 */
if (process.env.NODE_ENV === 'testing') 
{
    app.use('/', testsRoutes);
} 
else 
{
    app.use('/', viewRoutes);
}

// --- Manejo de errores global ---
// Red de contención final: traduce las contingencias internas (errores del
// driver MySQL, de Multer, etc.) a respuestas JSON estandarizadas.
// Debe ser ESTRICTAMENTE el último middleware registrado.
app.use(globalErrorMiddleware);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`==========================================`);
    console.log(`🚀 Bibliotech listo en:`);
    console.log(`   Punto de entrada: http://localhost:${PORT}`);
    console.log(`==========================================`);
});