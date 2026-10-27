/**
 * @file controllers/materialController.js
 * @brief Controlador de materiales PDF: alta, edicion, baja, visor y descarga.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const fileHelper = require('../utils/fileHelper');
const materialRepo = require('../repositories/materialRepo');
const i18n = require('../utils/i18n/i18n');

function parseClassIds(value) {
    if (Array.isArray(value)) return value.map(Number).filter(Number.isInteger);
    if (typeof value === 'string') return value.split(',').map(Number).filter(Number.isInteger);
    return [];
}

async function resolveMaterialFile(req) {
    const material = await materialRepo.fileForUser(req.params.id, req.userId, req.userRole);
    if (!material) return null;
    const absolutePath = fileHelper.resolveUploadPath(material.file_path);
    if (!absolutePath) return null;
    return { material, absolutePath };
}

function safeDownloadName(name) {
    return String(name || 'documento.pdf').replace(/["\r\n]/g, '_');
}

class MaterialController {
    async upload(req, res, next) {
        try {
            if (!req.file) return res.status(400).json({ message: i18n.getMessage('CT_MATERIAL_FILE_REQUIRED', req.language) });
            if (!req.body.title) {
                fileHelper.deleteUploadedFile(req.file);
                return res.status(400).json({ message: i18n.getMessage('CT_MATERIAL_TITLE_REQUIRED', req.language) });
            }
            const classIds = parseClassIds(req.body.classIds);
            if (!classIds.length) {
                fileHelper.deleteUploadedFile(req.file);
                return res.status(400).json({ message: i18n.getMessage('CT_MATERIAL_CLASS_REQUIRED', req.language) });
            }
            const id = await materialRepo.create({
                title: req.body.title,
                description: req.body.description,
                author: req.body.author,
                originalFilename: req.file.originalname,
                filePath: `/uploads/${req.file.filename}`,
                uploadedBy: req.userId
            }, classIds, req.userRole === 'admin');
            return res.status(201).json({ id, message: i18n.getMessage('CT_MATERIAL_UPLOADED', req.language) });
        } catch (error) {
            // Rollback: si la persistencia falla, el archivo subido queda huérfano en disco.
            fileHelper.deleteUploadedFile(req.file);
            return next(error);
        }
    }

    async list(req, res, next) {
        try {
            const rows = req.userRole === 'student'
                ? await materialRepo.accessibleByStudent(req.userId)
                : req.userRole === 'admin'
                    ? await materialRepo.ownedByProfessor(null)
                    : await materialRepo.ownedByProfessor(req.userId);
            return res.json(rows);
        } catch (error) { return next(error); }
    }

    async update(req, res, next) {
        try {
            if (!req.body.title) return res.status(400).json({ message: i18n.getMessage('CT_MATERIAL_TITLE_REQUIRED', req.language) });
            const classIds = parseClassIds(req.body.classIds);
            if (!classIds.length) return res.status(400).json({ message: i18n.getMessage('CT_MATERIAL_CLASS_REQUIRED', req.language) });
            const updated = await materialRepo.update(req.params.id, req.userId, {
                title: req.body.title, description: req.body.description, author: req.body.author
            }, classIds, req.userRole === 'admin');
            if (!updated) return res.status(404).json({ message: i18n.getMessage('CT_MATERIAL_NOT_FOUND', req.language) });
            return res.json({ message: i18n.getMessage('CT_MATERIAL_UPDATED', req.language) });
        } catch (error) { return next(error); }
    }

    async remove(req, res, next) {
        try {
            const filePath = await materialRepo.remove(req.params.id, req.userId, req.userRole === 'admin');
            if (!filePath) return res.status(404).json({ message: i18n.getMessage('CT_MATERIAL_NOT_FOUND', req.language) });
            fileHelper.deleteUpload(filePath);
            return res.json({ message: i18n.getMessage('CT_MATERIAL_DELETED', req.language) });
        } catch (error) { return next(error); }
    }

    async download(req, res, next) {
        try {
            const file = await resolveMaterialFile(req);
            if (!file) return res.status(404).json({ message: i18n.getMessage('CT_MATERIAL_UNAVAILABLE', req.language) });
            return res.download(file.absolutePath, safeDownloadName(file.material.original_filename));
        } catch (error) { return next(error); }
    }

    async view(req, res, next) {
        try {
            const file = await resolveMaterialFile(req);
            if (!file) return res.status(404).json({ message: i18n.getMessage('CT_MATERIAL_UNAVAILABLE', req.language) });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${safeDownloadName(file.material.original_filename)}"`);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

            return res.sendFile(file.absolutePath);
        } catch (error) { return next(error); }
    }
}

module.exports = new MaterialController();
