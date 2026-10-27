/**
 * @file config/multerConfig.js
 * @brief Configuracion de Multer para la carga de PDFs: disco, filtro MIME y limite de tamano.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

/**
 * Importación del módulo multer
 * Multer es un middleware de Node.js diseñado para Express, 
 * esencial para manejar la carga de archivos (imágenes, documentos, etc.)
 * enviados en formato multipart/form-data. Simplifica la gestión 
 * de archivos al permitir configuraciones de almacenamiento en disco 
 * o memoria, filtrado de tipos y límites de tamaño, añadiendo un objeto
 * file o files al objeto request.
 */
const fs = require('fs');
const multer = require('multer');
const fileHelper = require('../utils/fileHelper');

// 1. Definimos la ruta absoluta al directorio de subidas.
// La ruta es relativa al backend y no depende del directorio desde el que se inicia Node.
const uploadDir = fileHelper.UPLOAD_ROOT;

// 2. Comprobación y creación de directorio en tiempo de inicialización
// Esto se ejecuta UNA SOLA VEZ cuando el servidor arranca.
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`📁 Directorio creado automáticamente: ${uploadDir}`);
}

// Configuración de almacenamiento de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Carpeta donde se guardarán físicamente
    },
    filename: (req, file, cb) => {
        // Renombramos el archivo: timestamp + nombre original para que sea único
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// El dominio almacena únicamente documentos PDF de hasta 50 MB.
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf')
    {
        cb(null, true);
    }
    else
    {
        cb(new Error('Solo se permiten archivos PDF.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 }
});

module.exports = upload.single('pdfFile');