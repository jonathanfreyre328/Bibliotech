/**
 * @file repositories/materialRepo.js
 * @brief Acceso a datos de materiales y su relacion con las clases.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const db = require('../config/db');
const businessError = require('../utils/i18n/businessError');

function materialClassesError() {
    const error = businessError('No se pudo asignar ninguna clase: las clases seleccionadas no existen, están inactivas o no son tuyas.', 'CT_MATERIAL_CLASSES_INVALID');
    error.statusCode = 400;
    return error;
}

function materialClassRequiredError() {
    const error = businessError('Debes seleccionar al menos una clase.', 'CT_MATERIAL_CLASS_REQUIRED');
    error.statusCode = 400;
    return error;
}

async function associateClasses(connection, materialId, classIds, userId, isAdmin) {
    let insertedCount = 0;
    for (const classId of classIds) {
        const condition = isAdmin ? 'id = ? AND active = TRUE' : 'id = ? AND professor_id = ? AND active = TRUE';
        const params = isAdmin ? [materialId, classId] : [materialId, classId, userId];
        const [result] = await connection.execute(
            `INSERT INTO material_classes (material_id, class_id)
             SELECT ?, id FROM classes WHERE ${condition}`,
            params
        );
        if (result.affectedRows > 0) insertedCount++;
    }
    if (insertedCount === 0) throw materialClassesError();
}

async function attachClasses(rows) {
    if (!rows.length) return rows;

    const materialIds = rows.map(r => r.id);
    const placeholders = materialIds.map(() => '?').join(',');
    const [classRows] = await db.execute(
        `SELECT mc.material_id, cl.id AS class_id, c.name AS career, s.id AS subject_id, s.año, s.name AS subject
         FROM material_classes mc
         JOIN classes cl ON cl.id = mc.class_id
         JOIN subjects s ON s.id = cl.subject_id
         JOIN careers c ON c.id = s.career_id
         WHERE mc.material_id IN (${placeholders})
         ORDER BY s.name, cl.id`,
        materialIds
    );
    const classesByMaterial = {};
    for (const cr of classRows) {
        if (!classesByMaterial[cr.material_id]) classesByMaterial[cr.material_id] = [];
        classesByMaterial[cr.material_id].push({
            class_id: cr.class_id,
            career: cr.career,
            año: cr.año,
            subject: cr.subject,
            subject_id: cr.subject_id
        });
    }
    for (const row of rows) {
        row.classes = classesByMaterial[row.id] || [];
    }
    return rows;
}

class MaterialRepository {
    async create(data, classIds, isAdmin = false) {
        if (!Array.isArray(classIds) || classIds.length === 0) throw materialClassRequiredError();

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [result] = await connection.execute(
                `INSERT INTO materials (title, description, original_filename, author, file_path, uploaded_by)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [data.title, data.description || null, data.originalFilename, data.author || null, data.filePath, data.uploadedBy]
            );
            await associateClasses(connection, result.insertId, classIds, data.uploadedBy, isAdmin);
            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async accessibleByStudent(studentId) {
        const [rows] = await db.execute(
            `SELECT DISTINCT m.id, m.title, m.description, m.original_filename, m.author,
                    m.file_path, m.uploaded_by, m.created_at,
                    CONCAT(u.first_name, ' ', u.last_name) AS professor
             FROM materials m
             JOIN material_classes mc ON mc.material_id = m.id
             JOIN student_subject_requests r ON r.class_id = mc.class_id AND r.status = 'approved'
             JOIN users u ON u.id = m.uploaded_by
             WHERE r.student_id = ? AND m.active = TRUE
             ORDER BY m.created_at DESC`,
            [studentId]
        );
        return attachClasses(rows);
    }

    async fileForUser(materialId, userId, role) {
        const [rows] = await db.execute(
            `SELECT DISTINCT m.file_path, m.original_filename
             FROM materials m
             LEFT JOIN material_classes mc ON mc.material_id = m.id
             LEFT JOIN student_subject_requests r ON r.class_id = mc.class_id
             WHERE m.id = ? AND m.active = TRUE
               AND (m.uploaded_by = ? OR (? = 'admin') OR (r.student_id = ? AND r.status = 'approved'))`,
            [materialId, userId, role, userId]
        );
        return rows[0];
    }

    async ownedByProfessor(userId) {
        const condition = userId === null ? 'm.active = TRUE' : 'm.uploaded_by = ? AND m.active = TRUE';
        const params = userId === null ? [] : [userId];
        const [rows] = await db.execute(
            `SELECT m.* FROM materials m WHERE ${condition} ORDER BY m.created_at DESC`, params
        );
        return attachClasses(rows);
    }

    async update(materialId, userId, data, classIds, isAdmin = false) {
        if (!Array.isArray(classIds) || classIds.length === 0) throw materialClassRequiredError();

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const condition = isAdmin ? 'active = TRUE' : 'uploaded_by = ? AND active = TRUE';
            const params = isAdmin ? [materialId] : [materialId, userId];
            const [existing] = await connection.execute(
                `SELECT id FROM materials WHERE id = ? AND ${condition} FOR UPDATE`,
                params
            );
            if (!existing[0]) {
                await connection.rollback();
                return false;
            }

            await connection.execute(
                'UPDATE materials SET title = ?, description = ?, author = ? WHERE id = ?',
                [data.title, data.description || null, data.author || null, materialId]
            );
            await connection.execute('DELETE FROM material_classes WHERE material_id = ?', [materialId]);
            await associateClasses(connection, materialId, classIds, userId, isAdmin);
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async remove(materialId, userId, isAdmin = false) {
        const condition = isAdmin ? 'id = ?' : 'id = ? AND uploaded_by = ?';
        const params = isAdmin ? [materialId] : [materialId, userId];
        const [rows] = await db.execute(`SELECT file_path FROM materials WHERE ${condition}`, params);
        if (!rows[0]) return null;
        await db.execute(`DELETE FROM materials WHERE ${condition}`, params);
        return rows[0].file_path;
    }
}

module.exports = new MaterialRepository();