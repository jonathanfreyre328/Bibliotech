/**
 * @file repositories/adminRepo.js
 * @brief Acceso a datos del panel de administracion.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const db = require('../config/db');
const businessError = require('../utils/i18n/businessError');

function businessErrorWithStatus(message, key, statusCode = 400) {
    const error = businessError(message, key);
    error.statusCode = statusCode;
    return error;
}

async function assertActiveSubject(connection, subjectId) {
    const [rows] = await connection.execute(
        `SELECT s.id
         FROM subjects s
         JOIN careers c ON c.id = s.career_id
         WHERE s.id = ? AND s.active = TRUE AND c.active = TRUE`,
        [subjectId]
    );
    if (!rows[0]) {
        throw businessErrorWithStatus('Materia no encontrada o inactiva', 'CT_REPO_SUBJECT_INACTIVE');
    }
}

async function assertActiveProfessor(connection, professorId) {
    const [rows] = await connection.execute(
        `SELECT u.id
         FROM users u
         JOIN users_roles ur ON ur.user_id = u.id
         JOIN roles r ON r.id = ur.role_id AND r.name = 'professor'
         WHERE u.id = ? AND u.active = TRUE`,
        [professorId]
    );
    if (!rows[0]) {
        throw businessErrorWithStatus('Profesor no encontrado o inactivo', 'CT_REPO_PROFESSOR_INACTIVE');
    }
}

async function assertActiveStudent(connection, studentId) {
    const [rows] = await connection.execute(
        `SELECT u.id
         FROM users u
         JOIN users_roles ur ON ur.user_id = u.id
         JOIN roles r ON r.id = ur.role_id AND r.name = 'student'
         WHERE u.id = ? AND u.active = TRUE`,
        [studentId]
    );
    if (!rows[0]) {
        throw businessErrorWithStatus('El alumno no existe o está inactivo', 'CT_REPO_STUDENT_INACTIVE');
    }
}

async function assertActiveCareer(connection, careerId) {
    const [rows] = await connection.execute(
        'SELECT id FROM careers WHERE id = ? AND active = TRUE',
        [careerId]
    );
    if (!rows[0]) {
        throw businessErrorWithStatus('Carrera no encontrada o inactiva', 'CT_AUTH_CAREER_INVALID');
    }
}

class AdminRepository {
    async createCareer(name, duracionAños = 5) {
        const [result] = await db.execute(
            'INSERT INTO careers (name, duracion_años) VALUES (?, ?)',
            [name, duracionAños]
        );
        return result.insertId;
    }

    async getAllSubjects(careerId = null, año = null, includeInactive = false) {
        let query = `SELECT s.id, s.career_id, s.año, s.name, s.active,
                            c.name AS career_name, c.duracion_años
                     FROM subjects s
                     JOIN careers c ON c.id = s.career_id
                     WHERE c.active = TRUE`;
        const params = [];

        if (!includeInactive) query += ' AND s.active = TRUE';
        if (careerId) { query += ' AND s.career_id = ?'; params.push(careerId); }
        if (año) { query += ' AND s.año = ?'; params.push(año); }

        query += ' ORDER BY c.name, s.año, s.name';
        const [rows] = await db.execute(query, params);
        return rows;
    }

    async createSubject(careerId, año, name) {
        const [career] = await db.execute(
            'SELECT duracion_años FROM careers WHERE id = ?',
            [careerId]
        );
        if (!career[0] || año < 1 || año > career[0].duracion_años) {
            throw businessError('Año inválido para esta carrera', 'CT_REPO_INVALID_YEAR_CAREER');
        }
        
        const [result] = await db.execute(
            'INSERT INTO subjects (career_id, año, name) VALUES (?, ?, ?)',
            [careerId, año, name]
        );
        return result.insertId;
    }

    async updateCareer(id, data) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [career] = await connection.execute(
                'SELECT duracion_años FROM careers WHERE id = ?',
                [id]
            );
            if (!career[0]) throw businessError('Carrera no encontrada', 'CT_ADMIN_CAREER_NOT_FOUND');

            const currentDuracion = career[0].duracion_años;
            const newDuracion = data.duracionAños ?? currentDuracion;

            if (newDuracion < currentDuracion) {
                const [subjects] = await connection.execute(
                    'SELECT MAX(año) as max_año FROM subjects WHERE career_id = ?',
                    [id]
                );
                const maxAño = subjects[0].max_año || 0;
                if (maxAño > newDuracion) {
                    throw businessError(`No se puede reducir la duración: hay materias en el año ${maxAño}`, 'CT_REPO_DURATION_REDUCTION', [maxAño]);
                }
            }

            const updates = [];
            const params = [];
            if (data.name !== undefined) {
                updates.push('name = ?');
                params.push(data.name);
            }
            if (data.duracionAños !== undefined) {
                updates.push('duracion_años = ?');
                params.push(data.duracionAños);
            }
            if (updates.length > 0) {
                params.push(id);
                await connection.execute(
                    `UPDATE careers SET ${updates.join(', ')} WHERE id = ?`,
                    params
                );
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async updateSubject(id, data) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [subject] = await connection.execute(
                'SELECT career_id, año, name FROM subjects WHERE id = ?',
                [id]
            );
            if (!subject[0]) throw businessError('Materia no encontrada', 'CT_ADMIN_SUBJECT_NOT_FOUND');

            const currentCareerId = subject[0].career_id;
            const currentAño = subject[0].año;
            const currentName = subject[0].name;

            const newCareerId = data.careerId ?? currentCareerId;
            const newAño = data.año ?? currentAño;
            const newName = data.name ?? currentName;

            if (newCareerId !== currentCareerId) {
                const [career] = await connection.execute(
                    'SELECT duracion_años FROM careers WHERE id = ? AND active = TRUE',
                    [newCareerId]
                );
                if (!career[0]) throw businessError('Carrera destino no encontrada o inactiva', 'CT_REPO_DEST_CAREER_NOT_FOUND');
                if (newAño > career[0].duracion_años) {
                    throw businessError('Año inválido para la carrera destino', 'CT_REPO_INVALID_YEAR_DEST');
                }
            } else {
                const [career] = await connection.execute(
                    'SELECT duracion_años FROM careers WHERE id = ? AND active = TRUE',
                    [currentCareerId]
                );
                if (!career[0]) throw businessError('Carrera actual no encontrada o inactiva', 'CT_REPO_CURRENT_CAREER_NOT_FOUND');
                if (newAño > career[0].duracion_años) {
                    throw businessError('Año inválido para esta carrera', 'CT_REPO_INVALID_YEAR_CAREER');
                }
            }

            if (newCareerId !== currentCareerId || newAño !== currentAño || newName !== currentName) {
                const [existing] = await connection.execute(
                    'SELECT id FROM subjects WHERE career_id = ? AND año = ? AND name = ? AND id != ?',
                    [newCareerId, newAño, newName, id]
                );
                if (existing[0]) throw businessError('La materia ya existe en esa carrera y año', 'CT_REPO_SUBJECT_DUPLICATED');
            }

            const updates = [];
            const params = [];
            if (data.careerId !== undefined) {
                updates.push('career_id = ?');
                params.push(data.careerId);
            }
            if (data.año !== undefined) {
                updates.push('año = ?');
                params.push(data.año);
            }
            if (data.name !== undefined) {
                updates.push('name = ?');
                params.push(data.name);
            }
            if (updates.length > 0) {
                params.push(id);
                await connection.execute(
                    `UPDATE subjects SET ${updates.join(', ')} WHERE id = ?`,
                    params
                );
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async updateProfessor(id, data) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [professor] = await connection.execute(
                `SELECT u.id
                 FROM users u
                 JOIN users_roles ur ON ur.user_id = u.id
                 JOIN roles r ON r.id = ur.role_id AND r.name = 'professor'
                 WHERE u.id = ?`,
                [id]
            );
            if (!professor[0]) throw businessError('Profesor no encontrado', 'CT_REPO_PROFESSOR_NOT_FOUND');

            const bcrypt = require('bcrypt');

            const updates = [];
            const params = [];
            if (data.firstName !== undefined) {
                updates.push('first_name = ?');
                params.push(data.firstName);
            }
            if (data.lastName !== undefined) {
                updates.push('last_name = ?');
                params.push(data.lastName);
            }
            if (data.phone !== undefined) {
                updates.push('phone = ?');
                params.push(data.phone);
            }
            if (data.password !== undefined && data.password !== '') {
                updates.push('password = ?');
                params.push(await bcrypt.hash(data.password, 12));
            }

            if (updates.length > 0) {
                params.push(id);
                await connection.execute(
                    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
                    params
                );
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async updateClass(id, data) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [classRow] = await connection.execute(
                'SELECT id FROM classes WHERE id = ? FOR UPDATE',
                [id]
            );
            if (!classRow[0]) {
                throw businessErrorWithStatus('Clase no encontrada', 'CT_ADMIN_CLASS_NOT_FOUND', 404);
            }

            if (data.subjectId !== undefined) await assertActiveSubject(connection, data.subjectId);
            if (data.professorId !== undefined) await assertActiveProfessor(connection, data.professorId);

            const updates = [];
            const params = [];
            if (data.subjectId !== undefined) {
                updates.push('subject_id = ?');
                params.push(data.subjectId);
            }
            if (data.professorId !== undefined) {
                updates.push('professor_id = ?');
                params.push(data.professorId);
            }

            if (updates.length > 0) {
                params.push(id);
                await connection.execute(
                    `UPDATE classes SET ${updates.join(', ')} WHERE id = ?`,
                    params
                );
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async createClass(subjectId, professorId, copyFromClassId = null) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await assertActiveSubject(connection, subjectId);
            await assertActiveProfessor(connection, professorId);
            const [result] = await connection.execute(
                'INSERT INTO classes (subject_id, professor_id) VALUES (?, ?)',
                [subjectId, professorId]
            );
            if (copyFromClassId) {
                await connection.execute(
                    `INSERT INTO material_classes (material_id, class_id)
                     SELECT material_id, ? FROM material_classes WHERE class_id = ?`,
                    [result.insertId, copyFromClassId]
                );
            }
            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async setClassActive(classId, active) {
        await db.execute('UPDATE classes SET active = ? WHERE id = ?', [active, classId]);
    }

    async setSubjectActive(subjectId, active) {
        await db.execute('UPDATE subjects SET active = ? WHERE id = ?', [active, subjectId]);
    }

    /**
     * Asigna un alumno a una clase creando (o aprobando) su solicitud.
     *
     * @note El rol NO es una columna de `users`: vive en `users_roles` + `roles`.
     * Una version anterior filtraba con `users.role`, lo que producia
     * `ER_BAD_FIELD_ERROR (1054) Unknown column 'u.role'` y un 500 siempre.
     *
     * @param {number} classId - Id de la clase destino.
     * @param {number} studentId - Id del alumno a asignar.
     */
    async assignStudent(classId, studentId) {
        await assertActiveStudent(db, studentId);

        const [targetClass] = await db.execute(
            `SELECT cl.id
             FROM classes cl
             JOIN subjects s ON s.id = cl.subject_id AND s.active = TRUE
             JOIN careers c ON c.id = s.career_id AND c.active = TRUE
             WHERE cl.id = ? AND cl.active = TRUE`,
            [classId]
        );
        if (!targetClass[0]) {
            const error = businessError('La clase no existe o está inactiva', 'CT_REPO_CLASS_INACTIVE');
            error.statusCode = 400;
            throw error;
        }

        await db.execute(
            `INSERT INTO student_subject_requests (student_id, class_id, status, reviewed_at)
             VALUES (?, ?, 'approved', CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE status = 'approved', reviewed_at = CURRENT_TIMESTAMP`,
            [studentId, classId]
        );
    }

    async changeCareer(studentId, careerId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await assertActiveStudent(connection, studentId);
            await assertActiveCareer(connection, careerId);
            await connection.execute('UPDATE users SET career_id = ? WHERE id = ?', [careerId, studentId]);
            await connection.execute(
                `UPDATE student_subject_requests SET status = 'removed', reviewed_at = CURRENT_TIMESTAMP
                 WHERE student_id = ? AND status IN ('pending', 'approved')`,
                [studentId]
            );
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async deleteClass(classId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute('DELETE FROM material_classes WHERE class_id = ?', [classId]);
            await connection.execute('DELETE FROM student_subject_requests WHERE class_id = ?', [classId]);
            const [result] = await connection.execute('DELETE FROM classes WHERE id = ?', [classId]);
            await connection.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async deleteCareer(id) {
        const [subjects] = await db.execute(
            'SELECT COUNT(*) AS total FROM subjects WHERE career_id = ?',
            [id]
        );
        const [students] = await db.execute(
            'SELECT COUNT(*) AS total FROM users WHERE career_id = ?',
            [id]
        );
        const totalSubjects = Number(subjects[0]?.total ?? 0);
        const totalStudents = Number(students[0]?.total ?? 0);
        if (totalSubjects > 0 || totalStudents > 0) {
            throw businessError(`No se puede eliminar: la carrera tiene ${totalSubjects} materias y ${totalStudents} alumnos asociados`, 'CT_REPO_DELETE_CAREER_DEPS', [totalSubjects, totalStudents]);
        }
        const [result] = await db.execute('DELETE FROM careers WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }

    async deleteSubject(id) {
        const [classes] = await db.execute(
            'SELECT COUNT(*) AS total FROM classes WHERE subject_id = ?',
            [id]
        );
        const totalClasses = Number(classes[0]?.total ?? 0);
        if (totalClasses > 0) {
            throw businessError(`No se puede eliminar: la materia tiene ${totalClasses} clases creadas`, 'CT_REPO_DELETE_SUBJECT_DEPS', [totalClasses]);
        }
        const [result] = await db.execute('DELETE FROM subjects WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }

    async deleteUser(id) {
        const [user] = await db.execute(
            `SELECT u.id, r.name AS role
             FROM users u
             JOIN users_roles ur ON ur.user_id = u.id
             JOIN roles r ON r.id = ur.role_id
             WHERE u.id = ?`,
            [id]
        );
        if (!user[0]) throw businessError('Usuario no encontrado', 'CT_USER_NOT_FOUND');
        const role = user[0].role;

        if (role === 'admin') {
            throw businessError('No se puede eliminar una cuenta de administrador', 'CT_REPO_DELETE_ADMIN');
        }

        if (role === 'professor') {
            const [classes] = await db.execute(
                'SELECT COUNT(*) AS total FROM classes WHERE professor_id = ?',
                [id]
            );
            const [materials] = await db.execute(
                'SELECT COUNT(*) AS total FROM materials WHERE uploaded_by = ?',
                [id]
            );
            const totalClasses = Number(classes[0]?.total ?? 0);
            const totalMaterials = Number(materials[0]?.total ?? 0);
            if (totalClasses > 0 || totalMaterials > 0) {
                throw businessError(`No se puede eliminar: el profesor dicta ${totalClasses} clases y tiene ${totalMaterials} materiales subidos`, 'CT_REPO_DELETE_PROFESSOR_DEPS', [totalClasses, totalMaterials]);
            }
        }

        // Alumnos: sus solicitudes caen por FK ON DELETE CASCADE
        const [result] = await db.execute('DELETE FROM users WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
}

module.exports = new AdminRepository();