/**
 * @file controllers/academicController.js
 * @brief Controlador academico: catalogo, clases y solicitudes de acceso.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const academicRepo = require('../repositories/academicRepo');
const i18n = require('../utils/i18n/i18n');

/**
 * Controlador de la capa académica (catálogo, clases y solicitudes de acceso).
 * Las contingencias se delegan al manejador global de errores (next(error))
 * para no duplicar la lógica de traducción en cada endpoint.
 */
class AcademicController {
    async catalog(req, res, next) {
        try { return res.json(await academicRepo.catalog()); }
        catch (error) { return next(error); }
    }

    async professorClasses(req, res, next) {
        try { return res.json(await academicRepo.findAllClasses({ professorId: req.userId })); }
        catch (error) { return next(error); }
    }

    async requests(req, res, next) {
        try { return res.json(await academicRepo.requestsForProfessor(req.userId)); }
        catch (error) { return next(error); }
    }

    async studentRequests(req, res, next) {
        try { return res.json(await academicRepo.requestsForStudent(req.userId)); }
        catch (error) { return next(error); }
    }

    async requestClass(req, res, next) {
        try {
            const result = await academicRepo.requestClass(req.userId, req.body.classId);
            if (!result) return res.status(404).json({ message: i18n.getMessage('CT_ACADEMIC_CLASS_UNAVAILABLE', req.language) });
            return res.status(201).json(result);
        } catch (error) { return next(error); }
    }

    async updateRequest(req, res, next) {
        try {
            const status = req.body.status;
            if (!['approved', 'rejected', 'removed'].includes(status)) {
                return res.status(400).json({ message: i18n.getMessage('CT_ACADEMIC_REQUEST_STATUS_INVALID', req.language) });
            }
            const updated = await academicRepo.updateRequest(req.params.id, req.userId, status);
            if (!updated) return res.status(404).json({ message: i18n.getMessage('CT_ACADEMIC_REQUEST_NOT_FOUND', req.language) });
            return res.json({ message: i18n.getMessage('CT_ACADEMIC_REQUEST_UPDATED', req.language) });
        } catch (error) { return next(error); }
    }

    async cancelRequest(req, res, next) {
        try {
            const updated = await academicRepo.cancelRequest(req.params.id, req.userId);
            if (!updated) return res.status(404).json({ message: i18n.getMessage('CT_ACADEMIC_PENDING_NOT_FOUND', req.language) });
            return res.json({ message: i18n.getMessage('CT_ACADEMIC_REQUEST_CANCELLED', req.language) });
        } catch (error) { return next(error); }
    }

    async accessibleClasses(req, res, next) {
        try { return res.json(await academicRepo.accessibleClasses(req.userId)); }
        catch (error) { return next(error); }
    }
}

module.exports = new AcademicController();
