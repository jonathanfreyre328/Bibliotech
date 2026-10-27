/**
 * Pruebas del servicio de API del frontend, sin red real.
 *
 * Cubren el manejo de errores que no se puede probar desde Node:
 *  - un 401 del login NO debe cerrar la sesión (si la cerrara, recargaría la
 *    página y el mensaje de credenciales incorrectas nunca se vería);
 *  - un 401 de otro endpoint SÍ cierra la sesión;
 *  - red caída o respuesta no JSON muestran un mensaje comprensible;
 *  - formatErrors traduce los nombres técnicos de los campos.
 */

function jsonResponse(status, body) {
    return {
        status,
        ok: status >= 200 && status < 300,
        headers: { get: () => 'application/json' },
        json: async () => body
    };
}

function htmlResponse(status) {
    return {
        status,
        ok: status >= 200 && status < 300,
        headers: { get: () => 'text/html' },
        json: async () => { throw new SyntaxError('Unexpected token <'); }
    };
}

/**
 * Reemplaza `fetch` y `authHelper` durante la prueba y los restaura siempre.
 */
async function withApiStubs(responseFactory, testFn) {
    const originalFetch = window.fetch;
    const originalAuthHelper = window.authHelper;
    const calls = { logout: 0 };

    window.authHelper = {
        getToken: () => 'token',
        logout: () => { calls.logout += 1; }
    };
    window.fetch = async () => responseFactory();

    try {
        return await testFn(calls);
    } finally {
        window.fetch = originalFetch;
        window.authHelper = originalAuthHelper;
    }
}

testUtils.createTestButton("Test apiService: 401 del login no cierra la sesión", async (btn) => {
    await withApiStubs(
        () => jsonResponse(401, { message: 'Usuario o contraseña incorrectos.' }),
        async (calls) => {
            let thrown = null;
            try {
                await apiService.request('/auth/login', 'POST', { username: 'x', password: 'y' });
            } catch (error) {
                thrown = error;
            }

            testUtils.log({ message: thrown && thrown.message, logoutCalls: calls.logout });
            if (thrown && thrown.message.includes('incorrectos') && calls.logout === 0) {
                testUtils.setSuccess(btn);
            }
        }
    );
});

testUtils.createTestButton("Test apiService: 401 de otro endpoint cierra la sesión", async (btn) => {
    await withApiStubs(
        () => jsonResponse(401, { message: 'Token inválido o expirado.' }),
        async (calls) => {
            let thrown = null;
            try {
                await apiService.request('/materials');
            } catch (error) {
                thrown = error;
            }

            testUtils.log({ message: thrown && thrown.message, logoutCalls: calls.logout });
            if (thrown && calls.logout === 1) {
                testUtils.setSuccess(btn);
            }
        }
    );
});

testUtils.createTestButton("Test apiService: error de red muestra un mensaje claro", async (btn) => {
    await withApiStubs(
        () => { throw new Error('offline'); },
        async () => {
            let thrown = null;
            try {
                await apiService.request('/materials');
            } catch (error) {
                thrown = error;
            }

            testUtils.log({ message: thrown && thrown.message, status: thrown && thrown.status });
            if (thrown && thrown.message.includes('No se pudo conectar') && thrown.status === 0) {
                testUtils.setSuccess(btn);
            }
        }
    );
});

testUtils.createTestButton("Test apiService: respuesta no JSON usa el mensaje por status", async (btn) => {
    await withApiStubs(
        () => htmlResponse(500),
        async () => {
            let thrown = null;
            try {
                await apiService.request('/materials');
            } catch (error) {
                thrown = error;
            }

            testUtils.log({ message: thrown && thrown.message });
            if (thrown && thrown.message.includes('Error interno del servidor')) {
                testUtils.setSuccess(btn);
            }
        }
    );
});

testUtils.createTestButton("Test apiService: formatErrors traduce los campos", async (btn) => {
    const text = apiService.formatErrors([
        { field: 'firstName', message: 'Este campo es obligatorio.' },
        { field: 'birthDate', message: 'La fecha de nacimiento no es válida.' }
    ]);
    const expected = '\n\n• Nombre: Este campo es obligatorio.\n• Fecha de nacimiento: La fecha de nacimiento no es válida.';

    testUtils.log({ text });
    if (text === expected) {
        testUtils.setSuccess(btn);
    }
});
