/**
 * @file frontControllers/profileFrontController.js
 * @brief Pestaña Perfil compartida por los paneles de alumno, profesor y admin.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

const profileController = (function() {
    const ROLE_LABELS = {
        admin: 'Administrador',
        professor: 'Profesor',
        student: 'Alumno'
    };

    let currentUser = null;

    function createButton(text, className, onClick) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `w3-button ${className} w3-round-large`;
        button.textContent = text;
        button.addEventListener('click', onClick);
        return button;
    }

    function pad(value) {
        return String(value).padStart(2, '0');
    }

    /**
     * Formatea una fecha sin hora para mostrarla como dd/mm/aaaa.
     * Se evita `new Date('YYYY-MM-DD')` porque interpreta la fecha en UTC y
     * puede mostrar el dia anterior en zonas horarias negativas.
     */
    function formatDateOnly(value) {
        if (value === null || value === undefined || value === '') return '-';

        if (value instanceof Date) {
            if (isNaN(value.getTime())) return '-';
            return `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()}`;
        }

        const text = String(value).trim();
        const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
        if (match) return `${match[3]}/${match[2]}/${match[1]}`;

        const date = new Date(text.replace(' ', 'T'));
        if (isNaN(date.getTime())) return '-';
        return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
    }

    function formatDateTime(value) {
        if (typeof DateHelper !== 'undefined' && DateHelper.formatDateTime) {
            return DateHelper.formatDateTime(value);
        }
        return formatDateOnly(value);
    }

    function appendRow(container, label, value, options = {}) {
        const row = document.createElement('div');
        row.className = 'w3-row w3-padding-small w3-border-bottom';

        const labelColumn = document.createElement('div');
        labelColumn.className = 'w3-col s4 m3 w3-text-grey';
        const labelText = document.createElement('strong');
        labelText.textContent = label;
        labelColumn.appendChild(labelText);

        const valueColumn = document.createElement('div');
        valueColumn.className = 'w3-col s8 m9 w3-text-white';

        if (options.badgeClass) {
            const badge = document.createElement('span');
            badge.className = `w3-tag ${options.badgeClass}`;
            badge.textContent = value;
            valueColumn.appendChild(badge);
        } else {
            valueColumn.textContent = value === null || value === undefined || value === '' ? '-' : String(value);
        }

        row.appendChild(labelColumn);
        row.appendChild(valueColumn);
        container.appendChild(row);
    }

    function renderProfile(user) {
        const card = document.getElementById('profileCard');
        if (!card) return;

        card.replaceChildren();

        const title = document.createElement('h2');
        title.className = 'w3-text-yellow';
        title.textContent = 'Datos personales';
        card.appendChild(title);

        const subtitle = document.createElement('p');
        subtitle.className = 'w3-text-grey';
        subtitle.textContent = 'Estos son los datos asociados a tu cuenta.';
        card.appendChild(subtitle);

        const details = document.createElement('div');
        details.className = 'w3-margin-top';
        card.appendChild(details);

        appendRow(details, 'Nombre', user.first_name);
        appendRow(details, 'Apellido', user.last_name);
        appendRow(details, 'Usuario', user.username);
        appendRow(details, 'DNI', user.dni);
        appendRow(details, 'Email', user.email);
        appendRow(details, 'Teléfono', user.phone);
        appendRow(details, 'Fecha de nacimiento', formatDateOnly(user.birth_date));
        appendRow(
            details,
            'Carrera',
            user.career_name || (user.role === 'student' ? 'Sin carrera' : 'No aplica')
        );
        appendRow(details, 'Rol', ROLE_LABELS[user.role] || user.role);
        appendRow(details, 'Estado', user.active ? 'Activo' : 'Inactivo', {
            badgeClass: user.active ? 'w3-green' : 'w3-red'
        });
        appendRow(details, 'Fecha de alta', formatDateTime(user.created_at));

        const actions = document.createElement('div');
        actions.className = 'w3-margin-top';
        actions.appendChild(createButton('Editar perfil', 'w3-yellow', openEditProfile));
        actions.appendChild(document.createTextNode(' '));
        actions.appendChild(createButton('Cambiar contraseña', 'w3-blue', openChangePassword));
        card.appendChild(actions);
    }

    async function loadProfile() {
        const card = document.getElementById('profileCard');
        if (!card) return;

        card.replaceChildren();
        const loading = document.createElement('p');
        loading.className = 'w3-text-white';
        loading.textContent = 'Cargando perfil...';
        card.appendChild(loading);

        try {
            currentUser = await apiService.request('/auth/me');
            renderProfile(currentUser);
        } catch (error) {
            currentUser = null;
            card.replaceChildren();
            const message = document.createElement('p');
            message.className = 'w3-text-white';
            message.textContent = 'No se pudo cargar el perfil.';
            card.appendChild(message);
            showApiError(error, 'Error al cargar el perfil');
        }
    }

    function openEditProfile() {
        if (!currentUser) return;

        Modal.form('Editar perfil', [
            {
                name: 'firstName',
                label: 'Nombre',
                value: currentUser.first_name || '',
                required: true,
                maxlength: 80,
                autocomplete: 'given-name'
            },
            {
                name: 'lastName',
                label: 'Apellido',
                value: currentUser.last_name || '',
                required: true,
                maxlength: 80,
                autocomplete: 'family-name'
            },
            {
                name: 'email',
                label: 'Email',
                type: 'email',
                value: currentUser.email || '',
                required: true,
                maxlength: 150,
                autocomplete: 'email'
            },
            {
                name: 'phone',
                label: 'Teléfono',
                type: 'tel',
                value: currentUser.phone || '',
                required: true,
                maxlength: 40,
                autocomplete: 'tel'
            }
        ], async (data) => {
            const payload = {
                firstName: String(data.firstName || '').trim(),
                lastName: String(data.lastName || '').trim(),
                email: String(data.email || '').trim(),
                phone: String(data.phone || '').trim()
            };

            try {
                const result = await apiService.request('/auth/profile', 'PATCH', payload);
                if (result.profile) {
                    currentUser = result.profile;
                    renderProfile(currentUser);
                } else {
                    await loadProfile();
                }
                showModal('Perfil actualizado', result.message || 'Tus datos se actualizaron correctamente.');
            } catch (error) {
                showApiError(error, 'Error al actualizar el perfil');
            }
        }, 'Guardar cambios');
    }

    function openChangePassword() {
        Modal.form('Cambiar contraseña', [
            {
                name: 'currentPassword',
                label: 'Contraseña actual',
                type: 'password',
                required: true,
                maxlength: 72,
                autocomplete: 'current-password'
            },
            {
                name: 'newPassword',
                label: 'Nueva contraseña',
                type: 'password',
                required: true,
                maxlength: 72,
                autocomplete: 'new-password'
            },
            {
                name: 'confirmPassword',
                label: 'Repetir nueva contraseña',
                type: 'password',
                required: true,
                maxlength: 72,
                autocomplete: 'new-password'
            }
        ], async (data) => {
            try {
                const result = await apiService.request('/auth/password', 'PATCH', data);
                showModal('Contraseña actualizada', result.message || 'La contraseña se actualizó correctamente.');
                // Se cierra la sesión para que el usuario vuelva a entrar con la clave nueva.
                setTimeout(() => authHelper.logout(), 1800);
            } catch (error) {
                showApiError(error, 'Error al cambiar la contraseña');
            }
        }, 'Cambiar contraseña');
    }

    return {
        loadProfile,
        renderProfile,
        openEditProfile,
        openChangePassword
    };
})();
