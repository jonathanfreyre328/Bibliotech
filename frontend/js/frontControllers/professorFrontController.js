const professorController = (function() {
    let currentRequests = [];

    function getStatusBadge(status) {
        const badges = {
            pending: '<span class="w3-tag w3-orange">Pendiente</span>',
            approved: '<span class="w3-tag w3-green">Aprobado</span>',
            rejected: '<span class="w3-tag w3-red">Rechazado</span>',
            cancelled: '<span class="w3-tag w3-grey">Cancelado</span>',
            removed: '<span class="w3-tag w3-grey">Desasignado</span>'
        };
        return badges[status] || `<span class="w3-tag">${Table.escapeHtml(status)}</span>`;
    }

    function getStatusText(status) {
        const texts = {
            pending: 'Pendiente',
            approved: 'Aprobado',
            rejected: 'Rechazado',
            cancelled: 'Cancelado',
            removed: 'Desasignado'
        };
        return texts[status] || status;
    }

    function getYearLabel(año) {
        return año ? `${año}º año` : '-';
    }

    // NOTA: la tabla de "Mis materiales" del profesor NO se dibuja desde aca.
    // La dibuja `materialsFrontController.js` (funciones globales), que es la
    // unica que el dashboard dispara en el DOMContentLoaded. El codigo que
    // antes vivia aca (loadProfessorMaterials, renderMaterialsTable,
    // openEditMaterialModal, deleteMaterial y loadProfessorClasses) era un
    // duplicado que nunca se ejecutaba.

    async function loadRequests() {
        try {
            currentRequests = await apiService.request('/academic/requests');
            renderRequestsTable();
        } catch (error) {
            showApiError(error);
        }
    }

    function renderRequestsTable() {
        const columns = [
            { key: 'student_name', label: 'Alumno', sortable: true },
            { key: 'career', label: 'Carrera', sortable: true, filterValue: (row) => row.career },
            {
                key: 'academic_year',
                label: 'Año',
                sortable: true,
                filterValue: (row) => row.academic_year,
                filterLabel: (row) => getYearLabel(row.academic_year),
                render: (row) => getYearLabel(row.academic_year)
            },
            { key: 'subject', label: 'Materia', sortable: true, filterValue: (row) => row.subject },
            {
                key: 'status',
                label: 'Estado',
                sortable: true,
                html: true,
                searchValue: (row) => getStatusText(row.status),
                sortValue: (row) => getStatusText(row.status),
                filterValue: (row) => row.status,
                filterLabel: (row) => getStatusText(row.status),
                render: (row) => getStatusBadge(row.status)
            },
            {
                key: 'requested_at',
                label: 'Solicitado',
                sortable: true,
                filterable: false,
                render: (row) => DateHelper.formatDateTime(row.requested_at)
            }
        ];

        const actions = [
            {
                label: 'Aprobar',
                class: 'w3-green',
                visible: (row) => row.status === 'pending',
                handler: (row) => updateRequest(row.id, 'approved')
            },
            {
                label: 'Rechazar',
                class: 'w3-red',
                visible: (row) => row.status === 'pending',
                handler: (row) => updateRequest(row.id, 'rejected')
            },
            {
                label: 'Desasignar',
                class: 'w3-orange',
                visible: (row) => row.status === 'approved',
                handler: (row) => {
                    Modal.confirm(
                        'Desasignar alumno',
                        `¿Desasignar a ${row.student_name} de esta clase? Perderá acceso a los materiales.`,
                        () => updateRequest(row.id, 'removed')
                    );
                }
            }
        ];

        Table.render('requestsTable', columns, currentRequests, {
            actions,
            emptyMessage: 'No hay solicitudes para mostrar.'
        });
    }

    async function updateRequest(requestId, status) {
        try {
            await apiService.request(`/academic/requests/${requestId}`, 'PATCH', { status });
            showModal('Éxito', `Solicitud ${status === 'approved' ? 'aprobada' : status === 'rejected' ? 'rechazada' : 'desasignada'}.`);
            await loadRequests();
        } catch (error) {
            showApiError(error);
        }
    }

    async function loadStudents() {
        try {
            const requests = await apiService.request('/academic/requests');
            const approved = requests.filter(r => r.status === 'approved');

            const rows = approved.map(r => ({
                student_name: r.student_name,
                student_username: r.student_username,
                student_dni: r.student_dni,
                student_email: r.student_email,
                career: r.career,
                academic_year: r.academic_year,
                subject: r.subject,
                class_label: `${r.career} - ${getYearLabel(r.academic_year)} - ${r.subject}`,
                requested_at: r.requested_at
            }));

            Table.render('studentsTable', [
                { key: 'student_name', label: 'Alumno' },
                { key: 'student_username', label: 'Usuario' },
                { key: 'student_dni', label: 'DNI', filterable: false },
                {
                    key: 'student_email',
                    label: 'Email',
                    render: (row) => row.student_email || '-'
                },
                {
                    key: 'class_label',
                    label: 'Clase',
                    filterValue: (row) => row.class_label,
                    filterLabel: (row) => row.class_label
                },
                {
                    key: 'requested_at',
                    label: 'Solicitado',
                    filterable: false,
                    render: (row) => DateHelper.formatDateTime(row.requested_at)
                }
            ], rows, {
                emptyMessage: 'No tienes alumnos asignados.'
            });
        } catch (error) {
            showApiError(error);
        }
    }

    async function loadMyClasses() {
        try {
            const classes = await apiService.request('/academic/classes');
            renderMyClassesTable(classes);
        } catch (error) {
            showApiError(error);
        }
    }

    function renderMyClassesTable(classes) {
        Table.render('myClassesTable', [
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
                key: 'active',
                label: 'Estado',
                html: true,
                searchValue: (c) => c.active ? 'Activa' : 'Inactiva',
                filterValue: (c) => c.active,
                filterLabel: (c) => c.active ? 'Activa' : 'Inactiva',
                sortValue: (c) => c.active ? 'Activa' : 'Inactiva',
                render: (c) => c.active
                    ? '<span class="w3-tag w3-green">Activa</span>'
                    : '<span class="w3-tag w3-red">Inactiva</span>'
            }
        ], classes, {
            emptyMessage: 'No tienes clases asignadas.'
        });
    }

    return {
        loadRequests,
        loadStudents,
        loadMyClasses
    };
})();

window.professorController = professorController;