/**
 * @file repositories/userRepo.js
 * @brief Acceso a datos de usuarios, roles y carrera asignada.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const db = require('../config/db');
const businessError = require('../utils/i18n/businessError');

class UserRepository 
{
    async findByUsername(username)
    {
        const [rows] = await db.execute(
            `SELECT u.*, r.name AS role
             FROM users u
             JOIN users_roles ur ON ur.user_id = u.id
             JOIN roles r ON r.id = ur.role_id
             WHERE u.username = ? AND u.active = TRUE`,
            [username]
        );
        return rows[0];
    }

    async create(userData, role = 'student')
    {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // La carrera del alumno debe existir y estar activa. La FK sola no
            // alcanza: permite asignar una carrera desactivada. Se valida dentro
            // de la transaccion para que no cambie entre el chequeo y el INSERT.
            if (userData.careerId !== undefined && userData.careerId !== null) {
                const [careerRows] = await connection.execute(
                    'SELECT id FROM careers WHERE id = ? AND active = TRUE',
                    [userData.careerId]
                );
                if (!careerRows.length) {
                    const error = businessError('Carrera no encontrada o inactiva', 'CT_AUTH_CAREER_INVALID');
                    error.statusCode = 400;
                    throw error;
                }
            }

            const [result] = await connection.execute(
                `INSERT INTO users
                 (username, password, first_name, last_name, dni, email, phone, birth_date, career_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userData.username, userData.password, userData.firstName, userData.lastName,
                    userData.dni, userData.email, userData.phone, userData.birthDate, userData.careerId]
            );
            const [roleRows] = await connection.execute('SELECT id FROM roles WHERE name = ?', [role]);
            await connection.execute('INSERT INTO users_roles (user_id, role_id) VALUES (?, ?)', [result.insertId, roleRows[0].id]);
            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
    
    async findAll()
    {
        const [rows] = await db.execute(
            `SELECT u.id, u.username, u.first_name, u.last_name, u.dni, u.email,
                    u.phone, u.birth_date, u.active, u.created_at, r.name AS role,
                    c.name AS career_name
             FROM users u
             JOIN users_roles ur ON ur.user_id = u.id
             JOIN roles r ON r.id = ur.role_id
             LEFT JOIN careers c ON c.id = u.career_id
             ORDER BY u.last_name, u.first_name`
        );
        return rows;
    }

    async setActive(id, active)
    {
        await db.execute('UPDATE users SET active = ? WHERE id = ?', [active, id]);
    }

    async findById(id)
    {
        const [rows] = await db.execute(
            `SELECT u.id, u.username, u.first_name, u.last_name, u.dni, u.email,
                    u.phone, u.birth_date, u.active, u.created_at, u.career_id, r.name AS role,
                    c.name AS career_name
             FROM users u
             JOIN users_roles ur ON ur.user_id = u.id
             JOIN roles r ON r.id = ur.role_id
             LEFT JOIN careers c ON c.id = u.career_id
             WHERE u.id = ?`,
            [id]
        );
        return rows[0];
    }

    async updateProfile(id, data)
    {
        // Lista blanca: aunque el controlador ya valida los campos, el repositorio
        // no debe construir SQL con nombres arbitrarios recibidos del cliente.
        const columns = {
            firstName: 'first_name',
            lastName: 'last_name',
            email: 'email',
            phone: 'phone'
        };
        const updates = [];
        const params = [];

        for (const [field, column] of Object.entries(columns)) {
            if (data[field] !== undefined) {
                updates.push(`${column} = ?`);
                params.push(data[field]);
            }
        }

        if (updates.length === 0) return false;

        params.push(id);
        const [result] = await db.execute(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            params
        );
        return result.affectedRows > 0;
    }

    async findPasswordById(id)
    {
        const [rows] = await db.execute(
            'SELECT password FROM users WHERE id = ? AND active = TRUE',
            [id]
        );
        return rows[0];
    }

    async updatePassword(id, passwordHash)
    {
        const [result] = await db.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [passwordHash, id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = new UserRepository();
