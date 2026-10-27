const studentController = (function() {
    let currentCatalog = [];
    let currentRequests = [];
    let currentStudentCareerId = null;
    let listenersAttached = false;

    function getYearLabel(año) {
        return año ? `${año}º año` : '-';
    }

    function getRequestStatusText(status) {
        const labels = {
            pending: 'Pendiente',
            approved: 'Aprobada',
            rejected: 'Rechazada',
            cancelled: 'Cancelada',
            removed: 'Desasignada'
        };
        return labels[status] || status;
    }

    function getRequestStatusBadge(status) {
        const labels = {
            pending: ['Pendiente', 'w3-orange'],
            approved: ['Aprobada', 'w3-green'],
            rejected: ['Rechazada', 'w3-red'],
            cancelled: ['Cancelada', 'w3-grey'],
            removed: ['Desasignada', 'w3-grey']
        };
        const [label, color] = labels[status] || [Table.escapeHtml(status), 'w3-grey'];
        return `<span class="w3-tag ${color}">${label}</span>`;
    }

    async function loadRequests() {
        try {
            [currentCatalog, currentRequests] = await Promise.all([
                apiService.request('/academic/catalog'),
                apiService.request('/academic/my-requests')
            ]);
            
            const user = await apiService.request('/auth/me');
            currentStudentCareerId = user.career_id;

            const careers = [...new Map(currentCatalog.map(c => [c.career_id, {id: c.career_id, name: c.career}])).values()];
            const careerSelect = document.getElementById('prefCareer');
            careerSelect.replaceChildren();
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Seleccionar carrera';
            placeholder.disabled = true;
            placeholder.selected = true;
            careerSelect.appendChild(placeholder);
            careers.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name;
                if (currentStudentCareerId && c.id === currentStudentCareerId) opt.selected = true;
                careerSelect.appendChild(opt);
            });

            if (currentStudentCareerId) {
                careerSelect.disabled = true;
                updateYearsForCareer(currentStudentCareerId);
            }

            if (!listenersAttached) {
                listenersAttached = true;

                careerSelect.addEventListener('change', (e) => {
                    const careerId = parseInt(e.target.value);
                    if (careerId) {
                        updateYearsForCareer(careerId);
                    } else {
                        resetYearAndSubject();
                    }
                });

                document.getElementById('prefYear').addEventListener('change', (e) => {
                    const year = parseInt(e.target.value);
                    const careerId = parseInt(document.getElementById('prefCareer').value);
                    if (year && careerId) {
                        updateSubjectsForCareerAndYear(careerId, year);
                    } else {
                        resetSubject();
                    }
                });

                document.getElementById('prefSubject').addEventListener('change', updateRequestButtonState);

                document.getElementById('btnRequestClass').addEventListener('click', requestClassFromPreferences);
            }

            await loadCurrentPreferences();

        } catch (error) {
            showApiError(error);
        }
    }

    function updateYearsForCareer(careerId) {
        const career = currentCatalog.find(c => c.career_id === careerId);
        if (!career) return;

        const yearSelect = document.getElementById('prefYear');
        yearSelect.replaceChildren();
        yearSelect.disabled = false;

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Seleccionar año';
        placeholder.disabled = true;
        placeholder.selected = true;
        yearSelect.appendChild(placeholder);

        const maxYear = career.duracion_años || 5;
        for (let i = 1; i <= maxYear; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `${i}º año`;
            yearSelect.appendChild(opt);
        }

        resetSubject();
        updateRequestButtonState();
    }

    function updateSubjectsForCareerAndYear(careerId, year) {
        const subjectSelect = document.getElementById('prefSubject');
        subjectSelect.replaceChildren();
        subjectSelect.disabled = false;

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Seleccionar materia';
        placeholder.disabled = true;
        placeholder.selected = true;
        subjectSelect.appendChild(placeholder);

        const subjects = [...new Map(
            currentCatalog
                .filter(c => c.career_id === careerId && c.año === year)
                .map(c => [c.subject_id, { id: c.subject_id, name: c.subject }])
        ).values()].sort((a, b) => a.name.localeCompare(b.name));

        subjects.forEach(subject => {
            const opt = document.createElement('option');
            opt.value = subject.id;
            opt.textContent = subject.name;
            subjectSelect.appendChild(opt);
        });

        updateRequestButtonState();
    }

    function resetYearAndSubject() {
        const yearSelect = document.getElementById('prefYear');
        yearSelect.replaceChildren();
        yearSelect.disabled = true;
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Seleccionar año';
        placeholder.disabled = true;
        placeholder.selected = true;
        yearSelect.appendChild(placeholder);
        resetSubject();
        updateRequestButtonState();
    }

    function resetSubject() {
        const subjectSelect = document.getElementById('prefSubject');
        subjectSelect.replaceChildren();
        subjectSelect.disabled = true;
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Seleccionar materia';
        placeholder.disabled = true;
        placeholder.selected = true;
        subjectSelect.appendChild(placeholder);
        updateRequestButtonState();
    }

    function updateRequestButtonState() {
        const career = document.getElementById('prefCareer').value;
        const year = document.getElementById('prefYear').value;
        const subjectId = parseInt(document.getElementById('prefSubject').value);
        const btn = document.getElementById('btnRequestClass');
        btn.disabled = !(career && year && subjectId);
    }

    async function requestClassFromPreferences() {
        const careerId = parseInt(document.getElementById('prefCareer').value);
        const year = parseInt(document.getElementById('prefYear').value);
        const subjectId = parseInt(document.getElementById('prefSubject').value);

        if (!careerId || !year || !subjectId) {
            showModal('Atención', 'Debes seleccionar carrera, año y materia.');
            return;
        }

        const cls = currentCatalog.find(c =>
            c.career_id === careerId && c.año === year && c.subject_id === subjectId
        );

        if (!cls) {
            showModal('Error', 'No se encontró la clase seleccionada.');
            return;
        }

        if (!cls.active) {
            showModal('Error', 'La clase seleccionada está inactiva y no se puede solicitar.');
            return;
        }

        try {
            const existing = currentRequests.find(r => r.class_id === cls.class_id);
            if (existing && ['pending', 'approved'].includes(existing.status)) {
                showModal('Atención', `Ya tienes una solicitud ${existing.status === 'approved' ? 'aprobada' : 'pendiente'} para esta clase.`);
                return;
            }
            await apiService.request('/academic/requests', 'POST', { classId: cls.class_id });
            showModal('Éxito', 'Solicitud enviada correctamente. Espera la aprobación del profesor.');
            await loadCurrentPreferences();
        } catch (error) {
            showApiError(error);
        }
    }

    async function loadCurrentPreferences() {
        try {
            const savedPrefs = await apiService.request('/academic/my-requests');
            
            const infoDiv = document.getElementById('preferencesInfo');
            
            if (!savedPrefs || savedPrefs.length === 0) {
                infoDiv.textContent = 'No tienes solicitudes actuales.';
                infoDiv.style.display = 'block';
            } else {
                const approved = savedPrefs.filter(item => item.status === 'approved').length;
                const pending = savedPrefs.filter(item => item.status === 'pending').length;
                infoDiv.textContent = `Solicitudes: ${pending} pendiente(s), ${approved} aprobada(s).`;
                infoDiv.style.display = 'block';
            }

            renderCurrentRequestsTable(savedPrefs);
        } catch (error) {
            showApiError(error);
        }
    }

    function renderCurrentRequestsTable(classes) {
        Table.render('currentRequestsTable', [
            { key: 'subject', label: 'Materia', filterValue: (c) => c.subject },
            { key: 'career', label: 'Carrera', filterValue: (c) => c.career },
            {
                key: 'año',
                label: 'Año',
                filterValue: (c) => c.año,
                filterLabel: (c) => getYearLabel(c.año),
                sortValue: (c) => c.año,
                render: (c) => getYearLabel(c.año)
            },
            {
                key: 'professor',
                label: 'Profesor',
                searchValue: (c) => c.professor || '',
                filterValue: (c) => c.professor || '',
                render: (c) => c.professor || 'Sin asignar'
            },
            {
                key: 'status',
                label: 'Estado',
                html: true,
                searchValue: (c) => getRequestStatusText(c.status),
                sortValue: (c) => getRequestStatusText(c.status),
                filterValue: (c) => c.status,
                filterLabel: (c) => getRequestStatusText(c.status),
                render: (c) => getRequestStatusBadge(c.status)
            }
        ], classes, {
            emptyMessage: 'No tienes solicitudes actuales.',
            actions: [
                {
                    label: 'Cancelar',
                    class: 'w3-red',
                    visible: (c) => c.status === 'pending',
                    handler: (c) => {
                        Modal.confirm(
                            'Cancelar solicitud',
                            `¿Estás seguro de cancelar la solicitud para "${c.subject}"?`,
                            () => cancelRequest(c.id)
                        );
                    }
                }
            ]
        });
    }

    async function cancelRequest(requestId) {
        try {
            await apiService.request(`/academic/requests/${requestId}`, 'DELETE');
            showModal('Éxito', 'Solicitud cancelada correctamente.');
            await loadRequests();
        } catch (error) {
            showApiError(error);
        }
    }

    return {
        loadRequests
    };
})();

window.studentController = studentController;