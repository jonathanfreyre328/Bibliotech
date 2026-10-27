/**
 * @file tests/adminTests.js
 * @brief Pruebas del panel de administracion desde el laboratorio del navegador.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

/**
 * @brief Inicia sesion con una cuenta demo.
 * @param {string} username - Nombre de usuario.
 * @param {string} password - Contrasena.
 * @returns {Promise<string>} Token JWT.
 */
async function loginDemo(username, password) {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (!response.ok || !data.token) {
        throw new Error(data.message || `No se pudo iniciar sesion como ${username}`);
    }
    return data.token;
}

/**
 * @brief Pide una ruta de la API con el token indicado.
 * @param {string} path - Ruta relativa (ej. /api/admin/classes).
 * @param {string} token - Token JWT.
 * @returns {Promise<{status: number, data: *}>} Estado y cuerpo de la respuesta.
 */
async function pedirApi(path, token) {
    const response = await fetch(path, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
}

/**
 * Test: GET /api/admin/users (requiere login Admin)
 */
testUtils.createTestButton("Test Admin: Listar Usuarios con Login Admin Correcto", async (btn) => {
    try {
        const token = await loginDemo('admin', '12345');
        const { status, data } = await pedirApi('/api/admin/users', token);

        testUtils.log(data);
        if (status === 200) testUtils.setSuccess(btn);
    } catch (err) {
        testUtils.log('Error de ejecución: ' + err.message, true);
    }
});

/**
 * Test: POST /api/admin/classes/:id/students
 *
 * Es idempotente: elige una clase a la que el alumno demo YA tenga acceso
 * (se consulta con su propio token), asi la corrida no crea inscripciones
 * nuevas. Este caso habria detectado el 1054 "Unknown column 'u.role'".
 */
testUtils.createTestButton("Test Admin: Asignar Alumno a Clase (200)", async (btn) => {
    try {
        const adminToken = await loginDemo('admin', '12345');
        const studentToken = await loginDemo('alumno', '12345');

        const [usuarios, clases, misClases] = await Promise.all([
            pedirApi('/api/admin/users', adminToken),
            pedirApi('/api/admin/classes', adminToken),
            pedirApi('/api/academic/my-classes', studentToken)
        ]);

        const alumno = (usuarios.data || []).find(u => u.role === 'student' && u.active);
        const clasesActivas = (clases.data || []).filter(c => c.active);
        const idsAccesibles = new Set((misClases.data || []).map(c => String(c.class_id)));

        // Se prioriza una clase ya asignada para no dejar datos nuevos.
        const clase = clasesActivas.find(c => idsAccesibles.has(String(c.class_id))) || clasesActivas[0];

        if (!alumno || !clase) {
            testUtils.log('No hay alumno o clase activa para probar.', true);
            return;
        }

        const response = await fetch(`/api/admin/classes/${clase.class_id}/students`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ studentId: alumno.id })
        });
        const data = await response.json().catch(() => ({}));

        testUtils.log({
            alumno: alumno.username,
            clase: `${clase.subject} (${clase.año}º año)`,
            yaEstabaAsignado: idsAccesibles.has(String(clase.class_id)),
            status: response.status,
            data
        });

        if (response.status === 200) testUtils.setSuccess(btn);
    } catch (err) {
        testUtils.log('Error de ejecución: ' + err.message, true);
    }
});

/**
 * Test: POST /api/admin/classes/:id/students con un alumno inexistente.
 * Debe responder 400 con un mensaje de negocio (no un 500).
 */
testUtils.createTestButton("Test Admin: Asignar Alumno Inexistente (400)", async (btn) => {
    try {
        const adminToken = await loginDemo('admin', '12345');
        const { data: clases } = await pedirApi('/api/admin/classes', adminToken);
        const clase = (clases || []).find(c => c.active);

        if (!clase) {
            testUtils.log('No hay clases activas para probar.', true);
            return;
        }

        const response = await fetch(`/api/admin/classes/${clase.class_id}/students`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ studentId: 999999 })
        });
        const data = await response.json().catch(() => ({}));

        testUtils.log({ status: response.status, data });

        if (response.status === 400) testUtils.setSuccess(btn);
    } catch (err) {
        testUtils.log('Error de ejecución: ' + err.message, true);
    }
});
