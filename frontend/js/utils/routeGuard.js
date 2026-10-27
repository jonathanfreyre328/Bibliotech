const RouteGuard = (function() {
    // '/' tambien sirve login.html (ver viewRoutes.js), asi que es publico
    const publicPaths = ['/', '/login', '/register'];
    const rolePaths = {
        student: ['/student-dashboard'],
        professor: ['/professor-dashboard'],
        admin: ['/admin-dashboard']
    };

    function getCurrentPath() {
        return window.location.pathname;
    }

    function getUserRole() {
        return authHelper.getRole();
    }

    function getToken() {
        return authHelper.getToken();
    }

    // Una sola validacion por carga de pagina: `init()` y
    // `handleRedirectAfterLogin()` pueden necesitarla al mismo tiempo.
    let validationPromise = null;

    function isAuthenticated() {
        return !!getToken();
    }

    function hasRole(allowedRoles) {
        const userRole = getUserRole();
        if (!userRole) return false;
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        return roles.includes(userRole);
    }

    function requireAuth(allowedRoles) {
        if (!isAuthenticated()) {
            redirectToLogin();
            return false;
        }

        if (allowedRoles && !hasRole(allowedRoles)) {
            const userRole = getUserRole();
            redirectToDashboard(userRole);
            return false;
        }

        return true;
    }

    function redirectToLogin() {
        const currentPath = getCurrentPath();
        if (!publicPaths.includes(currentPath)) {
            sessionStorage.setItem('redirectAfterLogin', currentPath);
        }
        window.location.href = '/login';
    }

    function redirectToDashboard(role) {
        const dashboards = {
            student: '/student-dashboard',
            professor: '/professor-dashboard',
            admin: '/admin-dashboard'
        };
        window.location.href = dashboards[role] || '/login';
    }

    /**
     * Valida contra el backend que el token guardado siga siendo aceptado.
     * Es asincrona porque un token puede existir en localStorage y, aun asi,
     * haber quedado invalidado por un reinicio del servidor.
     * @returns {Promise<boolean>} true si la sesion sigue activa.
     */
    async function validateSession() {
        if (!isAuthenticated()) return false;
        if (validationPromise) return validationPromise;

        validationPromise = apiService.request('/auth/me')
            .then(() => true)
            .catch(() => false);
        return validationPromise;
    }

    function handleRedirectAfterLogin() {
        const redirectPath = sessionStorage.getItem('redirectAfterLogin');
        // Solo volver al destino guardado si la sesion sigue siendo valida.
        // Sin esta guarda, un visitante anonimo de /login recibia el salto
        // guardado (loop /\u2194/login) y un token viejo podia abrir el panel.
        if (isAuthenticated() && redirectPath) {
            validateSession().then(valid => {
                if (!valid) return;
                sessionStorage.removeItem('redirectAfterLogin');
                window.location.href = redirectPath;
            });
        }
    }

    function init(allowedRoles) {
        const currentPath = getCurrentPath();

        if (publicPaths.includes(currentPath)) {
            if (isAuthenticated()) {
                const role = getUserRole();
                if (role && rolePaths[role]) {
                    // No redirigir solo por tener un token guardado: si el
                    // backend se reinicio, el token viejo debe producir 401 y
                    // el usuario debe quedarse en el login (sin pasar por el
                    // panel). La validacion es asincrona a proposito.
                    const redirectPath = sessionStorage.getItem('redirectAfterLogin');
                    validateSession().then(valid => {
                        if (!valid) return;
                        if (redirectPath) {
                            sessionStorage.removeItem('redirectAfterLogin');
                            window.location.href = redirectPath;
                        } else {
                            redirectToDashboard(role);
                        }
                    });
                } else {
                    // Token sin rol valido (sesion corrupta): limpiar y quedarse en la pagina publica
                    authHelper.storage.clear();
                }
            }
            return true;
        }

        return requireAuth(allowedRoles);
    }

    return {
        requireAuth,
        redirectToLogin,
        redirectToDashboard,
        handleRedirectAfterLogin,
        validateSession,
        init,
        isAuthenticated,
        hasRole,
        getUserRole,
        getToken
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    RouteGuard.handleRedirectAfterLogin();
});