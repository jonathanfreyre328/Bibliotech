/**
 * @file repositories/academicRepo.js
 * @brief Acceso a datos academicos: catalogo, clases y solicitudes de acceso.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const db = require('../config/db');

class AcademicRepository {
    async catalog() {
        const [rows] = await db.execute(
            `SELECT c.id AS career_id, c.name AS career, c.duracion_años,
                    s.año,
                    s.id AS subject_id, s.name AS subject, s.active AS subject_active,
                    cl.id AS class_id, cl.professor_id, cl.active,
                    CONCAT(u.first_name, ' ', u.last_name) AS professor
             FROM subjects s
             JOIN careers c ON c.id = s.career_id AND c.active = TRUE
             JOIN classes cl ON cl.subject_id = s.id AND cl.active = TRUE
             JOIN users u ON u.id = cl.professor_id AND u.active = TRUE
             WHERE s.active = TRUE
             ORDER BY c.name, s.año, s.name`
        );
        return rows;
    }

    async findAllClasses(filters = {}) {
        let query = `
            SELECT cl.id AS class_id, c.id AS career_id, c.name AS career, c.duracion_años,
                   s.id AS subject_id, s.año, s.name AS subject,
                   cl.professor_id,
                   CONCAT(u.first_name, ' ', u.last_name) AS professor,
                   cl.active
            FROM classes cl
            JOIN subjects s ON s.id = cl.subject_id AND s.active = TRUE
            JOIN careers c ON c.id = s.career_id AND c.active = TRUE
            JOIN users u ON u.id = cl.professor_id AND u.active = TRUE
        `;
        const params = [];

        if (filters.professorId) {
            query += ' WHERE cl.professor_id = ?';
            params.push(filters.professorId);
        }

        query += ' ORDER BY c.name, s.año, s.name';

        const [rows] = await db.execute(query, params);
        return rows;
    }

    async requestsForProfessor(professorId) {
        const [rows] = await db.execute(
            `SELECT r.id, r.student_id, r.class_id, r.status, r.requested_at,
                    u.first_name, u.last_name,
                    CONCAT(u.first_name, ' ', u.last_name) AS student_name,
                    u.username AS student_username, u.dni AS student_dni, u.email AS student_email,
                    u.dni, u.email,
                    c.name AS career, s.año AS academic_year, s.año, s.name AS subject
             FROM student_subject_requests r
             JOIN users u ON u.id = r.student_id
             JOIN classes cl ON cl.id = r.class_id AND cl.professor_id = ?
             JOIN subjects s ON s.id = cl.subject_id AND s.active = TRUE
             JOIN careers c ON c.id = s.career_id AND c.active = TRUE
             WHERE r.status IN ('pending', 'approved')
             ORDER BY r.status, r.requested_at`,
            [professorId]
        );
        return rows;
    }

    async requestsForStudent(studentId) {
        const [rows] = await db.execute(
            `SELECT r.id, r.class_id, r.status, r.requested_at,
                    c.id AS career_id, c.name AS career, s.año, s.name AS subject,
                    CONCAT(u.first_name, ' ', u.last_name) AS professor
             FROM student_subject_requests r
             JOIN classes cl ON cl.id = r.class_id
             JOIN subjects s ON s.id = cl.subject_id
             JOIN careers c ON c.id = s.career_id
             JOIN users u ON u.id = cl.professor_id
             WHERE r.student_id = ?
             ORDER BY r.requested_at DESC`,
            [studentId]
        );
        return rows;
    }

    async updateRequest(requestId, professorId, status) {
        const [result] = await db.execute(
            `UPDATE student_subject_requests r
             JOIN classes cl ON cl.id = r.class_id
             SET r.status = ?, r.reviewed_at = CURRENT_TIMESTAMP
             WHERE r.id = ? AND cl.professor_id = ? AND r.status IN ('pending', 'approved')`,
            [status, requestId, professorId]
        );
        return result.affectedRows > 0;
    }

    async cancelRequest(requestId, studentId) {
        const [result] = await db.execute(
            `UPDATE student_subject_requests
             SET status = 'cancelled', reviewed_at = CURRENT_TIMESTAMP
             WHERE id = ? AND student_id = ? AND status = 'pending'`,
            [requestId, studentId]
        );
        return result.affectedRows > 0;
    }

    async requestClass(studentId, classId) {
        const [existing] = await db.execute(
            `SELECT id, status FROM student_subject_requests WHERE student_id = ? AND class_id = ?`,
            [studentId, classId]
        );
        if (existing[0] && ['pending', 'approved'].includes(existing[0].status)) return existing[0];
        if (existing[0]) {
            await db.execute(
                `UPDATE student_subject_requests SET status = 'pending', requested_at = CURRENT_TIMESTAMP,
                 reviewed_at = NULL WHERE id = ?`,
                [existing[0].id]
            );
            return { id: existing[0].id, status: 'pending' };
        }
        const [result] = await db.execute(
            `INSERT INTO student_subject_requests (student_id, class_id)
             SELECT ?, cl.id
             FROM classes cl
             JOIN subjects s ON s.id = cl.subject_id AND s.active = TRUE
             JOIN careers c ON c.id = s.career_id AND c.active = TRUE
             WHERE cl.id = ? AND cl.active = TRUE`,
            [studentId, classId]
        );
        return result.affectedRows ? { id: result.insertId, status: 'pending' } : null;
    }

    async accessibleClasses(studentId) {
        const [rows] = await db.execute(
            `SELECT cl.id AS class_id, c.name AS career, s.año AS academic_year,
                    s.año, s.name AS subject, CONCAT(u.first_name, ' ', u.last_name) AS professor
             FROM student_subject_requests r
             JOIN classes cl ON cl.id = r.class_id AND cl.active = TRUE
             JOIN subjects s ON s.id = cl.subject_id AND s.active = TRUE
             JOIN careers c ON c.id = s.career_id AND c.active = TRUE
             JOIN users u ON u.id = cl.professor_id AND u.active = TRUE
             WHERE r.student_id = ? AND r.status = 'approved'`,
            [studentId]
        );
        return rows;
    }
}

module.exports = new AcademicRepository();