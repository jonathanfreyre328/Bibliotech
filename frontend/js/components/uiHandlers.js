/**
*    Project     : Bibliotech
*    Author      : Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
*    License     : http://www.gnu.org/licenses/gpl.txt  GNU GPL 3.0
*    Date        : Marzo 2026
*/

/**
 * Componente UI para manejar notificaciones modales
 * Inyecta el HTML necesario si no existe y lo muestra.
 */
 function showModal(title, message) {
    let modal = document.getElementById('msgModal');

    // Si el modal no existe, lo creamos dinámicamente sin innerHTML
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'msgModal';
        modal.className = 'w3-modal';

        const content = document.createElement('div');
        content.className = 'w3-modal-content w3-card-4 w3-animate-zoom vault-card';
        content.style.maxWidth = '400px';

        const header = document.createElement('header');
        header.className = 'w3-container w3-border-bottom';

        const titleElem = document.createElement('h3');
        titleElem.id = 'modalTitle';
        header.appendChild(titleElem);

        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'w3-container w3-padding';

        const msgElem = document.createElement('p');
        msgElem.id = 'modalBody';
        
        const btnClose = document.createElement('button');
        btnClose.className = 'w3-button w3-right w3-yellow w3-margin-bottom';
        btnClose.textContent = 'Cerrar';
        // Evento nativo para cerrar
        btnClose.addEventListener('click', () => modal.style.display = 'none');

        bodyDiv.appendChild(msgElem);
        bodyDiv.appendChild(btnClose);
        content.appendChild(header);
        content.appendChild(bodyDiv);
        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    // Actualizar contenido y mostrar
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').textContent = message;
    modal.style.display = 'block';
}

/**
 * @brief Muestra el mensaje de un error de API con el formato comun.
 * @param {Error} error - Error lanzado por apiService.
 * @param {string} [title='Error'] - Titulo del modal.
 */
function showApiError(error, title = 'Error') {
    const message = error && error.message ? error.message : 'Ocurrió un error inesperado.';
    const details = error && error.errors ? apiService.formatErrors(error.errors) : '';
    showModal(title, message + details);
}