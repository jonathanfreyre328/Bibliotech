/**
 * @file tests/profileTests.js
 * @brief Pruebas seguras de los endpoints del perfil propio.
 *
 * No modifican datos: la actualizacion usa un email invalido (se rechaza antes
 * de llegar al UPDATE) y el cambio de contrasena usa una clave actual erronea.
 *
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

/**
 * Test: GET /api/auth/me devuelve los datos completos del perfil.
 */
testUtils.createTestButton("Test Perfil: Obtener Mis Datos (200)", async (btn) => {
    try {
        const token = await loginDemo('alumno', '12345');
        const { status, data } = await pedirApi('/api/auth/me', token);

        testUtils.log(data);
        if (status === 200 && data.role === 'student' && 'phone' in data && 'birth_date' in data) {
            testUtils.setSuccess(btn);
        }
    } catch (err) {
        testUtils.log('Error de ejecución: ' + err.message, true);
    }
});

/**
 * Test: PATCH /api/auth/profile rechaza un email invalido sin modificar el perfil.
 */
testUtils.createTestButton("Test Perfil: Rechazar Email Invalido (400)", async (btn) => {
    try {
        const token = await loginDemo('alumno', '12345');
        const { data: me } = await pedirApi('/api/auth/me', token);

        const response = await fetch('/api/auth/profile', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                firstName: me.first_name,
                lastName: me.last_name,
                email: 'correo-invalido',
                phone: me.phone
            })
        });
        const data = await response.json();
        testUtils.log(data);

        if (response.status === 400) testUtils.setSuccess(btn);
    } catch (err) {
        testUtils.log('Error de ejecución: ' + err.message, true);
    }
});

/**
 * Test: PATCH /api/auth/password rechaza una contrasena actual incorrecta.
 * El 400 (no 401) evita que apiService cierre la sesion y oculte el mensaje.
 */
testUtils.createTestButton("Test Perfil: Rechazar Contraseña Actual Incorrecta (400)", async (btn) => {
    try {
        const token = await loginDemo('alumno', '12345');
        const response = await fetch('/api/auth/password', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword: 'clave-incorrecta',
                newPassword: 'Nueva1234',
                confirmPassword: 'Nueva1234'
            })
        });
        const data = await response.json();
        testUtils.log(data);

        if (response.status === 400) testUtils.setSuccess(btn);
    } catch (err) {
        testUtils.log('Error de ejecución: ' + err.message, true);
    }
});

/**
 * Test: los endpoints del perfil exigen un token valido.
 */
testUtils.createTestButton("Test Perfil: Rechazar Sin Token (401)", async (btn) => {
    try {
        const response = await fetch('/api/auth/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firstName: 'Ana',
                lastName: 'Gomez',
                email: 'ana@example.com',
                phone: '2235555555'
            })
        });
        const data = await response.json();
        testUtils.log(data);

        if (response.status === 401) testUtils.setSuccess(btn);
    } catch (err) {
        testUtils.log('Error de ejecución: ' + err.message, true);
    }
});
