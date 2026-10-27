/**
 * @file utils/fileHelper.js
 * @brief Resolucion segura de rutas de archivos dentro de backend/uploads.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

/**
 * Node.js fs (File System) es un módulo nativo integrado que permite
 * interactuar con el sistema de archivos del sistema operativo
 * (leer, escribir, crear, borrar directorios y archivos).
 */
const fs = require('fs');

/**
 * El módulo path en Node.js es una utilidad integrada que permite
 * manejar y transformar rutas de archivos y directorios de forma
 * segura y consistente entre diferentes sistemas operativos
 * (Windows, Linux, macOS). Facilita la creación de rutas absolutas
 * y relativas sin preocuparse por los separadores de barras (/ o \).
 */
const path = require('path');

/**
 * Raiz fisica de los archivos subidos.
 * @note Se resuelve contra la raiz del BACKEND (no contra process.cwd()):
 * asi la ruta es la misma sin importar desde donde se lanzo el servidor
 * (`node server.js` en backend/ o `node backend/server.js` en la raiz).
 */
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');

/**
 * Normaliza una ruta relativa de material al formato interno "uploads/archivo".
 * @param {string} relativePath - Ruta almacenada en la base de datos.
 * @returns {string|null} Ruta normalizada o null si el formato no es valido.
 */
function normalizeUploadPath(relativePath) {
    if (!relativePath || typeof relativePath !== 'string') return null;
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized.startsWith('uploads/')) return null;
    const relative = normalized.slice('uploads/'.length);
    return relative ? normalized : null;
}

/**
 * Utilidad para gestionar archivos fisicos
 */
const fileHelper =
{
    /** Carpeta fisica donde se guardan los PDFs subidos. */
    UPLOAD_ROOT,

    /**
     * Resuelve la ruta de un material a una ruta absoluta dentro de la
     * carpeta de subidas.
     * @param {string} relativePath - Ruta guardada en la DB (ej: /uploads/guia.pdf).
     * @returns {string|null} Ruta absoluta, o null si la ruta es invalida o
     *                         intenta salir de la carpeta de subidas.
     */
    resolveUploadPath(relativePath)
    {
        const normalized = normalizeUploadPath(relativePath);
        if (!normalized) return null;

        const relative = normalized.slice('uploads/'.length);
        const absolute = path.resolve(UPLOAD_ROOT, relative);

        /**
         * @note Proteccion contra Path Traversal: path.resolve normaliza los
         * ".." antes de comparar, asi que cualquier intento de salir de la
         * carpeta de subidas queda detectado y se descarta.
         */
        if (absolute !== UPLOAD_ROOT && !absolute.startsWith(UPLOAD_ROOT + path.sep))
        {
            console.warn(`⚠️ Ruta de archivo rechazada (fuera de uploads): ${relativePath}`);
            return null;
        }

        return absolute;
    },

    /**
     * Elimina un archivo del disco duro de forma segura a partir de su ruta relativa.
     * @param {string} relativePath - Ruta parcial guardada en la base de datos (ej: /uploads/doc.pdf).
     * @returns {boolean} True si el archivo fue eliminado con éxito, false en caso contrario.
     */
    deleteUpload(relativePath)
    {
        const absolutePath = this.resolveUploadPath(relativePath);
        if (!absolutePath) return false;

        try
        {
            if (fs.existsSync(absolutePath))
            {
                fs.unlinkSync(absolutePath);
                console.log(`✅ Archivo eliminado: ${relativePath}`);
                return true;
            }
            console.warn(`⚠️ Archivo no encontrado: ${absolutePath}`);
        }
        catch (err)
        {
            console.error(`❌ Error al borrar archivo: ${err.message}`);
        }
        return false;
    },

    /**
     * Elimina un archivo recien subido por Multer (rollback).
     * @description Se usa cuando la operacion se aborta despues de que Multer
     * ya escribio el archivo en disco, para no dejar archivos huerfanos.
     * @param {Object} file - Objeto req.file de Multer.
     * @returns {boolean} True si el archivo fue eliminado.
     */
    deleteUploadedFile(file)
    {
        if (!file || !file.path) return false;

        try
        {
            if (fs.existsSync(file.path))
            {
                fs.unlinkSync(file.path);
                console.log(`✅ Archivo huérfano eliminado: ${file.filename || file.path}`);
                return true;
            }
        }
        catch (err)
        {
            console.error(`❌ Error al borrar el archivo subido: ${err.message}`);
        }
        return false;
    }
};

module.exports = fileHelper;
