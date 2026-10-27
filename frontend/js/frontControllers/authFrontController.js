/**
*    Project     : Bibliotech
*    Author      : Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
*    License     : http://www.gnu.org/licenses/gpl.txt  GNU GPL 3.0
*    Date        : Marzo 2026
*/

const loginForm = document.getElementById('loginForm');
if (loginForm) 
{
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evitar que la página se recargue

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try 
        {
            // Llamada al endpoint de login a través de nuestro service
            const data = await apiService.request('/auth/login', 'POST', { username, password });
            
            // Guardar token y rol en localStorage
            authHelper.saveSession(data.token, data.role)

            // Redirigir según el rol
            if (data.role === 'admin') 
            {
                window.location.href = '/admin-dashboard';
            }
            else if (data.role === 'professor')
            {
                window.location.href = '/professor-dashboard';
            }
            else
            {
                window.location.href = '/student-dashboard';
            }

        }
        catch (error)
        {
            // Usar el componente modal para mostrar el error del backend
            showApiError(error, 'Error de Acceso');
        }
    });
}

// Lógica para el formulario de REGISTRO
const registerForm = document.getElementById('registerForm');
if (registerForm) 
{
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fields = ['username', 'password', 'confirmPassword', 'firstName', 'lastName', 'dni', 'email', 'phone', 'birthDate', 'careerId'];
        const payload = Object.fromEntries(fields.map((field) => [field, document.getElementById(field).value]));
        payload.careerId = Number(payload.careerId);

        if (payload.password !== payload.confirmPassword) {
            showModal('Error de Registro', 'Las contraseñas no coinciden.');
            return;
        }

        try 
        {
            await apiService.request('/auth/register', 'POST', payload);
            showModal('¡Éxito!', 'Usuario creado. Ahora puedes iniciar sesión.');
            setTimeout(() => { window.location.href = '/login'; }, 2000);
        }
        catch (error)
        {
            showApiError(error, 'Error de Registro');
        }
    });
}