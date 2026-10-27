/**
*    Project     : Bibliotech
*    Author      : Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
*    License     : http://www.gnu.org/licenses/gpl.txt  GNU GPL 3.0
*    Date        : Marzo 2026
*/

// Configuración base de la API.
// Se usa una ruta RELATIVA para no atar el frontend a un host/puerto concreto:
// así el mismo build funciona en localhost:3000, en un puerto distinto o
// detrás de un proxy sin tocar una sola línea de código.
const API_URL = "/api";

// Nombres legibles para los campos que devuelve el backend en `errors[]`.
// El backend usa los nombres del formulario (firstName, birthDate, ...); el
// usuario final ve la etiqueta en español.
const FIELD_LABELS = {
    username: 'Usuario',
    password: 'Contraseña',
    confirmPassword: 'Repetir contraseña',
    currentPassword: 'Contraseña actual',
    newPassword: 'Nueva contraseña',
    firstName: 'Nombre',
    lastName: 'Apellido',
    dni: 'DNI',
    email: 'Email',
    phone: 'Teléfono',
    birthDate: 'Fecha de nacimiento',
    careerId: 'Carrera'
};

// Mensajes de respaldo cuando el servidor no devuelve un JSON con `message`
// (por ejemplo, un proxy que responde HTML o un error de infraestructura).
const HTTP_ERROR_MESSAGES = {
    400: 'La solicitud contiene datos inválidos.',
    401: 'Tu sesión expiró. Iniciá sesión nuevamente.',
    403: 'No tenés permisos para realizar esta acción.',
    404: 'No se encontró el recurso solicitado.',
    409: 'El registro ya existe o entra en conflicto con otro.',
    429: 'Demasiados intentos. Esperá unos minutos antes de volver a intentar.',
    500: 'Error interno del servidor. Intentá nuevamente más tarde.'
};

const NETWORK_ERROR_MESSAGE = 'No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.';
const LOGIN_ERROR_MESSAGE = 'Usuario o contraseña incorrectos.';

const apiService = {
    // Función centralizada para peticiones Fetch
    async request(endpoint, method = 'GET', data = null, isFormData = false) {
        // Usamos el helper en lugar de acceder directo a localStorage o sessionStorage
        const token = authHelper.getToken();

        const headers = {};
        if (!isFormData) headers['Content-Type'] = 'application/json';
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const config = { method, headers };
        if (data) {
            // Si es FormData (para archivos), no se stringifica
            config.body = isFormData ? data : JSON.stringify(data);
        }

        let response;
        try {
            response = await fetch(`${API_URL}${endpoint}`, config);
        } catch (networkError) {
            const error = new Error(NETWORK_ERROR_MESSAGE);
            error.status = 0;
            error.errors = [];
            throw error;
        }

        // Puede no ser JSON (HTML de un proxy, respuesta vacía, etc.).
        let result = null;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            try {
                result = await response.json();
            } catch (parseError) {
                result = null;
            }
        }

        // Un 401 en el login significa "usuario o contraseña incorrectos", NO una
        // sesión vencida: si se hiciera logout se recargaría la página y el mensaje
        // de error nunca se vería. En el resto de los endpoints, el 401 sí invalida
        // la sesión.
        if (response.status === 401 && token && endpoint !== '/auth/login') {
            authHelper.logout();
        }

        if (!response.ok) {
            const fallbackMessage = response.status === 401 && endpoint === '/auth/login'
                ? LOGIN_ERROR_MESSAGE
                : HTTP_ERROR_MESSAGES[response.status];
            const error = new Error(
                (result && result.message)
                || fallbackMessage
                || `Error en la petición (${response.status}).`
            );
            error.errors = result ? result.errors : undefined;
            error.status = response.status;
            throw error;
        }

        if (result === null) {
            const error = new Error('La respuesta del servidor no es válida. Intentá nuevamente.');
            error.status = response.status;
            error.errors = [];
            throw error;
        }

        return result;
    },

    formatErrors(errors) {
        if (!errors || !errors.length) return '';
        return '\n\n' + errors.map((error) => {
            const label = FIELD_LABELS[error.field] || error.field || 'Campo';
            return `• ${label}: ${error.message}`;
        }).join('\n');
    }
};
