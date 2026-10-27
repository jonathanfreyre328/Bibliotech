const adminController = (function() {
    let allUsers = [];
    let allCareers = [];
    let allSubjects = [];
    let allClasses = [];

    function getStatusBadge(active) {
        return active 
            ? '<span class="w3-tag w3-green">Activo</span>' 
            : '<span class="w3-tag w3-red">Inactivo</span>';
    }

    function getRoleBadge(role) {
        const badges = {
            admin: 'w3-red',
            professor: 'w3-blue',
            student: 'w3-green'
        };
        return `<span class="w3-tag ${badges[role] || 'w3-grey'}">${Table.escapeHtml(role)}</span>`;
    }

    function getProfessorOptions() {
        return allUsers
            .filter(u => u.role === 'professor' && u.active)
            .map(p => ({
                value: p.id,
                label: `${p.username} (${p.first_name} ${p.last_name})`
            }));
    }

    function getCareerOptions(activeOnly = false) {
        const careers = activeOnly ? allCareers.filter(c => c.active) : allCareers;
        return careers.map(c => ({
            value: c.id,
            label: c.name
        }));
    }

    function fillSelectOptions(select, options) {
        if (!select) return;
        select.replaceChildren();
        options.forEach(({ value, label }) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            select.appendChild(option);
        });
    }

    function fillYearSelect(careerId, selectName = 'año') {
        fillSelectOptions(document.querySelector(`[name="${selectName}"]`), getYearOptions(careerId));
    }

    async function fillSubjectSelect(careerId, año, selectName = 'subjectId') {
        const select = document.querySelector(`[name="${selectName}"]`);
        if (!select) return [];
        try {
            const subjects = await apiService.request(`/admin/subjects?careerId=${careerId}&año=${año}`, 'GET');
            fillSelectOptions(select, subjects.map(s => ({ value: s.id, label: s.name })));
            select.disabled = subjects.length === 0;
            return subjects;
        } catch (error) {
            showApiError(error);
            select.disabled = true;
            return [];
        }
    }

    async function init() {
        await loadUsers();
    }

    async function loadUsers() {
        try {
            allUsers = await apiService.request('/admin/users', 'GET');
            renderUsersTable(allUsers);
        } catch (error) {
            showApiError(error, 'Acceso denegado');
            window.location.href = '/login';
        }
    }

    function renderUsersTable(users) {
        Table.render('usersTable', [
            { key: 'id', label: 'ID', filterable: false },
            { key: 'username', label: 'Username', filterable: false },
            {
                key: 'first_name',
                label: 'Nombre',
                filterable: false,
                sortValue: (u) => `${u.first_name} ${u.last_name}`,
                searchValue: (u) => `${u.first_name} ${u.last_name}`,
                render: (u) => `${u.first_name} ${u.last_name}`
            },
            { key: 'email', label: 'Email', filterable: false },
            {
                key: 'role',
                label: 'Rol',
                html: true,
                searchValue: (u) => u.role,
                filterValue: (u) => u.role,
                filterLabel: (u) => u.role,
                render: (u) => getRoleBadge(u.role)
            },
            { key: 'career_name', label: 'Carrera', filterable: false },
            {
                key: 'active',
                label: 'Estado',
                html: true,
                filterable: false,
                searchValue: (u) => u.active ? 'Activo' : 'Inactivo',
                sortValue: (u) => u.active ? 'Activo' : 'Inactivo',
                render: (u) => getStatusBadge(u.active)
            }
        ], users, {
            actions: [
                {
                    label: (u) => u.active ? 'Desactivar' : 'Activar',
                    class: (u) => u.active ? 'w3-red' : 'w3-green',
                    handler: (u) => toggleUserActive(u.id, u.active)
                },
                {
                    label: 'Cambiar carrera',
                    class: 'w3-orange',
                    visible: (u) => u.role === 'student',
                    handler: (u) => openChangeCareerModal(u)
                },
                {
                    label: 'Eliminar',
                    class: 'w3-red',
                    visible: (u) => u.role !== 'admin',
                    handler: (u) => deleteUser(u)
                }
            ],
            emptyMessage: 'No hay usuarios registrados.'
        });
    }

    async function toggleUserActive(id, active) {
        const action = active ? 'Desactivar' : 'Activar';
        Modal.confirm(
            `${action} usuario`,
            `¿${action} este usuario?`,
            async () => {
                try {
                    await apiService.request(`/admin/users/${id}/active`, 'PATCH', { active: !active });
                    showModal('Éxito', `Usuario ${active ? 'desactivado' : 'activado'} correctamente.`);
                    await loadUsers();
                } catch (error) {
                    showApiError(error);
                }
            }
        );
    }

    async function deleteUser(user) {
        const detalle = user.role === 'professor'
            ? 'Solo se permite si no dicta clases ni tiene materiales subidos.'
            : 'Se eliminarán también sus solicitudes de acceso a materiales.';
        Modal.confirm(
            'Eliminar usuario',
            `¿Eliminar a ${user.first_name} ${user.last_name} (${user.username})? Esta acción es permanente. ${detalle}`,
            async () => {
                try {
                    await apiService.request(`/admin/users/${user.id}`, 'DELETE');
                    showModal('Éxito', 'Usuario eliminado correctamente.');
                    await loadUsers();
                } catch (error) {
                    showApiError(error);
                }
            }
        );
    }

    function openEditProfessorModal(professor) {
        Modal.form(
            'Editar profesor',
            [
                { name: 'firstName', label: 'Nombre', type: 'text', required: true, value: professor.first_name },
                { name: 'lastName', label: 'Apellido', type: 'text', required: true, value: professor.last_name },
                { name: 'phone', label: 'Teléfono', type: 'tel', value: professor.phone || '' },
                { name: 'password', label: 'Nueva contraseña', type: 'password', placeholder: 'Dejar vacío para conservarla' }
            ],
            async (data) => {
                if (!data.password) delete data.password;
                try {
                    await apiService.request(`/admin/professors/${professor.id}`, 'PATCH', data);
                    showModal('Éxito', 'Profesor actualizado correctamente.');
                    await loadProfessors();
                    await loadUsers();
                } catch (error) {
                    showApiError(error);
                }
            },
            'Guardar'
        );
    }

    // PROFESORES
    async function loadProfessors() {
        try {
            const users = await apiService.request('/admin/users', 'GET');
            const professors = users.filter(u => u.role === 'professor');
            renderProfessorsTable(professors);
        } catch (error) {
            showApiError(error);
        }
    }

    function renderProfessorsTable(professors) {
        Table.render('professorsTable', [
            { key: 'id', label: 'ID', filterable: false },
            { key: 'username', label: 'Username', filterable: false },
            {
                key: 'first_name',
                label: 'Nombre',
                filterable: false,
                sortValue: (p) => `${p.first_name} ${p.last_name}`,
                searchValue: (p) => `${p.first_name} ${p.last_name}`,
                render: (p) => `${p.first_name} ${p.last_name}`
            },
            { key: 'email', label: 'Email', filterable: false },
            { key: 'dni', label: 'DNI', filterable: false },
            {
                key: 'active',
                label: 'Estado',
                html: true,
                searchValue: (p) => p.active ? 'Activo' : 'Inactivo',
                filterValue: (p) => p.active,
                filterLabel: (p) => p.active ? 'Activo' : 'Inactivo',
                sortValue: (p) => p.active ? 'Activo' : 'Inactivo',
                render: (p) => getStatusBadge(p.active)
            }
        ], professors, {
            actions: [
                {
                    label: (p) => p.active ? 'Desactivar' : 'Activar',
                    class: (p) => p.active ? 'w3-red' : 'w3-green',
                    handler: (p) => toggleUserActive(p.id, p.active)
                },
                { label: 'Editar', class: 'w3-blue', handler: (p) => openEditProfessorModal(p) }
            ],
            emptyMessage: 'No hay profesores registrados.'
        });
    }

    function openCreateProfessorModal() {
        Modal.form(
            'Crear profesor',
            [
                { name: 'username', label: 'Usuario', type: 'text', required: true },
                { name: 'password', label: 'Contraseña', type: 'password', required: true, placeholder: 'Mín. 8 chars, letra y número' },
                { name: 'firstName', label: 'Nombre', type: 'text', required: true },
                { name: 'lastName', label: 'Apellido', type: 'text', required: true },
                { name: 'dni', label: 'DNI', type: 'text', required: true },
                { name: 'email', label: 'Email', type: 'email', required: true },
                { name: 'phone', label: 'Teléfono', type: 'tel' },
                { name: 'birthDate', label: 'Fecha de nacimiento', type: 'date', required: true }
            ],
            async (data) => {
                try {
                    await apiService.request('/admin/professors', 'POST', data);
                    showModal('Éxito', 'Profesor creado correctamente.');
                    await loadProfessors();
                    await loadUsers();
                } catch (error) {
                    showApiError(error);
                }
            },
            'Crear',
            '500px'
        );
    }

    // CARRERAS
    async function loadCareers() {
        try {
            allCareers = await apiService.request('/admin/careers', 'GET');
            renderCareersTable(allCareers);
        } catch (error) {
            showApiError(error);
        }
    }

    function renderCareersTable(careers) {
        Table.render('careersTable', [
            { key: 'id', label: 'ID', filterable: false },
            { key: 'name', label: 'Nombre', filterable: false },
            { key: 'duracion_años', label: 'Duración (años)', filterable: false, render: (c) => c.duracion_años || 5 },
            {
                key: 'active',
                label: 'Estado',
                filterable: false,
                html: true,
                searchValue: (c) => c.active ? 'Activo' : 'Inactivo',
                sortValue: (c) => c.active ? 'Activo' : 'Inactivo',
                render: (c) => getStatusBadge(c.active)
            }
        ], careers, {
            actions: [
                {
                    label: (c) => c.active ? 'Desactivar' : 'Activar',
                    class: (c) => c.active ? 'w3-red' : 'w3-green',
                    handler: (c) => toggleCareerActive(c.id, c.active)
                },
                { label: 'Editar', class: 'w3-blue', handler: (c) => openEditCareerModal(c) },
                { label: 'Eliminar', class: 'w3-red', handler: (c) => deleteCareer(c.id) }
            ],
            emptyMessage: 'No hay carreras registradas.'
        });
    }

    async function toggleCareerActive(id, active) {
        try {
            await apiService.request(`/admin/careers/${id}/active`, 'PATCH', { active: !active });
            showModal('Éxito', `Carrera ${active ? 'desactivada' : 'activada'}.`);
            await loadCareers();
        } catch (error) {
            showApiError(error);
        }
    }

    async function deleteCareer(id) {
        Modal.confirm(
            'Eliminar carrera',
            '¿Eliminar esta carrera permanentemente? Solo se permite si no tiene materias ni alumnos asociados.',
            async () => {
                try {
                    await apiService.request(`/admin/careers/${id}`, 'DELETE');
                    showModal('Éxito', 'Carrera eliminada correctamente.');
                    await loadCareers();
                } catch (error) {
                    showApiError(error);
                }
            }
        );
    }

    function openCreateCareerModal() {
        Modal.form(
            'Crear carrera',
            [
                { name: 'name', label: 'Nombre de la carrera', type: 'text', required: true, placeholder: 'Ej: Ingeniería en Sistemas' },
                { name: 'duracionAños', label: 'Duración (años)', type: 'number', required: true, min: 1, max: 10, value: 5 }
            ],
            async (data) => {
                data.duracionAños = parseInt(data.duracionAños);
                try {
                    await apiService.request('/admin/careers', 'POST', data);
                    showModal('Éxito', 'Carrera creada correctamente.');
                    await loadCareers();
                } catch (error) {
                    showApiError(error);
                }
            },
            'Crear'
        );
    }

    function openEditCareerModal(career) {
        Modal.form(
            'Editar carrera',
            [
                { name: 'name', label: 'Nombre de la carrera', type: 'text', required: true, value: career.name },
                { name: 'duracionAños', label: 'Duración (años)', type: 'number', required: true, min: 1, max: 10, value: career.duracion_años }
            ],
            async (data) => {
                data.duracionAños = parseInt(data.duracionAños);
                try {
                    await apiService.request(`/admin/careers/${career.id}`, 'PATCH', data);
                    showModal('Éxito', 'Carrera actualizada correctamente.');
                    await loadCareers();
                } catch (error) {
                    showApiError(error);
                }
            },
            'Guardar'
        );
    }

    // MATERIAS
    async function loadSubjects() {
        try {
            allSubjects = await apiService.request('/admin/subjects?includeInactive=true', 'GET');
            renderSubjectsTable(allSubjects);
        } catch (error) {
            showApiError(error);
        }
    }

    function renderSubjectsTable(subjects) {
        Table.render('subjectsTable', [
            { key: 'id', label: 'ID', filterable: false },
            { key: 'career_name', label: 'Carrera', filterValue: (s) => s.career_name },
            {
                key: 'año',
                label: 'Año',
                filterable: false,
                sortValue: (s) => s.año,
                render: (s) => s.año ? `${s.año}º año` : '-'
            },
            { key: 'name', label: 'Materia', filterable: false },
            {
                key: 'active',
                label: 'Estado',
                html: true,
                filterable: false,
                searchValue: (s) => s.active ? 'Activo' : 'Inactivo',
                sortValue: (s) => s.active ? 'Activo' : 'Inactivo',
                render: (s) => getStatusBadge(s.active)
            }
        ], subjects, {
            actions: [
                {
                    label: (s) => s.active ? 'Desactivar' : 'Activar',
                    class: (s) => s.active ? 'w3-red' : 'w3-green',
                    handler: (s) => toggleSubjectActive(s.id, s.active)
                },
                { label: 'Editar', class: 'w3-blue', handler: (s) => openEditSubjectModal(s) },
                { label: 'Eliminar', class: 'w3-red', handler: (s) => deleteSubject(s.id) }
            ],
            emptyMessage: 'No hay materias registradas.'
        });
    }

    async function toggleSubjectActive(id, active) {
        try {
            await apiService.request(`/admin/subjects/${id}/active`, 'PATCH', { active: !active });
            showModal('Éxito', `Materia ${active ? 'desactivada' : 'activada'}.`);
            await loadSubjects();
        } catch (error) {
            showApiError(error);
        }
    }

    async function deleteSubject(id) {
        Modal.confirm(
            'Eliminar materia',
            '¿Eliminar esta materia permanentemente? Solo se permite si no tiene clases creadas.',
            async () => {
                try {
                    await apiService.request(`/admin/subjects/${id}`, 'DELETE');
                    showModal('Éxito', 'Materia eliminada correctamente.');
                    await loadSubjects();
                } catch (error) {
                    showApiError(error);
                }
            }
        );
    }

    async function openCreateSubjectModal() {
        // La lista de carreras se carga al abrir su pestaña: se pide si falta.
        if (allCareers.length === 0) {
            await loadCareers();
        }
        if (allCareers.length === 0) {
            showModal('Sin carreras', 'Creá una carrera antes de crear materias.');
            return;
        }
        const careerOptions = getCareerOptions();
        
        Modal.form(
            'Crear materia',
            [
                { 
                    name: 'careerId', 
                    label: 'Carrera', 
                    type: 'select', 
                    required: true, 
                    options: careerOptions,
                    onChange: (careerId) => fillYearSelect(careerId)
                },
                { name: 'año', label: 'Año', type: 'select', required: true, options: getYearOptions(careerOptions[0]?.value) },
                { name: 'name', label: 'Nombre de la materia', type: 'text', required: true, placeholder: 'Ej: Matemática' }
            ],
            async (data) => {
                data.careerId = parseInt(data.careerId);
                data.año = parseInt(data.año);
                try {
                    await apiService.request('/admin/subjects', 'POST', data);
                    showModal('Éxito', 'Materia creada correctamente.');
                    await loadSubjects();
                } catch (error) {
                    showApiError(error);
                }
            },
            'Crear'
        );
    }

    function getYearOptions(careerId) {
        const career = allCareers.find(c => c.id == careerId);
        if (!career) return [];
        return Array.from({ length: career.duracion_años }, (_, index) => ({
            value: index + 1,
            label: `${index + 1}º año`
        }));
    }

    async function openEditSubjectModal(subject) {
        // Sin las carreras no se pueden calcular los años ni preseleccionar la
        // carrera actual (la pestaña Materias no las carga por su cuenta).
        if (allCareers.length === 0) {
            await loadCareers();
        }
        Modal.form(
            'Editar materia',
            [
                {
                    name: 'careerId',
                    label: 'Carrera',
                    type: 'select',
                    required: true,
                    options: getCareerOptions(true),
                    value: subject.career_id,
                    onChange: (careerId) => fillYearSelect(careerId)
                },
                {
                    name: 'año',
                    label: 'Año',
                    type: 'select',
                    required: true,
                    options: getYearOptions(subject.career_id),
                    value: subject.año
                },
                { name: 'name', label: 'Nombre de la materia', type: 'text', required: true, value: subject.name }
            ],
            async (data) => {
                data.careerId = parseInt(data.careerId);
                data.año = parseInt(data.año);
                try {
                    await apiService.request(`/admin/subjects/${subject.id}`, 'PATCH', data);
                    showModal('Éxito', 'Materia actualizada correctamente.');
                    await loadSubjects();
                    await loadClasses();
                } catch (error) {
                    showApiError(error);
                }
            },
            'Guardar'
        );
    }

    // CLASES
    async function loadClasses() {
        try {
            allClasses = await apiService.request('/admin/classes', 'GET');
            renderClassesTable(allClasses);
        } catch (error) {
            showApiError(error);
        }
    }

    function renderClassesTable(classes) {
        Table.render('classesTable', [
            { key: 'class_id', label: 'ID', filterable: false },
            { key: 'career', label: 'Carrera', filterValue: (c) => c.career },
            {
                key: 'año',
                label: 'Año',
                filterable: false,
                sortValue: (c) => c.año,
                render: (c) => c.año ? `${c.año}º año` : '-'
            },
            { key: 'subject', label: 'Materia', filterable: false },
            {
                key: 'professor',
                label: 'Profesor',
                filterable: false,
                searchValue: (c) => c.professor || '',
                render: (c) => c.professor || 'Sin asignar'
            },
            {
                key: 'active',
                label: 'Estado',
                html: true,
                filterable: false,
                searchValue: (c) => c.active ? 'Activo' : 'Inactivo',
                sortValue: (c) => c.active ? 'Activo' : 'Inactivo',
                render: (c) => getStatusBadge(c.active)
            }
        ], classes, {
            actions: [
                {
                    label: (c) => c.active ? 'Desactivar' : 'Activar',
                    class: (c) => c.active ? 'w3-red' : 'w3-green',
                    handler: (c) => toggleClassActive(c.class_id, c.active)
                },
                { label: 'Editar', class: 'w3-blue', handler: (c) => openEditClassModal(c) },
                { label: 'Asignar alumno', class: 'w3-blue', handler: (c) => openAssignStudentModal(c.class_id) },
                { label: 'Eliminar', class: 'w3-red', handler: (c) => deleteClass(c.class_id) }
            ],
            emptyMessage: 'No hay clases creadas.'
        });
    }

    async function toggleClassActive(id, active) {
        try {
            await apiService.request(`/admin/classes/${id}/active`, 'PATCH', { active: !active });
            showModal('Éxito', `Clase ${active ? 'desactivada' : 'activada'}.`);
            await loadClasses();
        } catch (error) {
            showApiError(error);
        }
    }

    async function deleteClass(id) {
        Modal.confirm(
            'Eliminar clase',
            '¿Eliminar esta clase permanentemente? Se borrarán sus relaciones con materiales y solicitudes de alumnos.',
            async () => {
                try {
                    await apiService.request(`/admin/classes/${id}`, 'DELETE');
                    showModal('Éxito', 'Clase eliminada correctamente.');
                    await loadClasses();
                } catch (error) {
                    showApiError(error);
                }
            }
        );
    }

    async function openCreateClassModal() {
        if (allUsers.length === 0) {
            await loadUsers();
        }
        if (allCareers.length === 0) {
            await loadCareers();
        }
        try {
            const professorOptions = getProfessorOptions();

            const classOptions = allClasses.map(s => ({
                value: s.class_id,
                label: `${s.career} - ${s.año}º año - ${s.subject} (Prof: ${s.professor || 'Sin asignar'})`
            }));

            const careerOptions = getCareerOptions(true);

            if (careerOptions.length === 0) {
                showModal('Sin carreras activas', 'Creá o reactivá una carrera antes de crear clases.');
                return;
            }
            if (professorOptions.length === 0) {
                showModal('Sin profesores activos', 'Creá o activá un profesor antes de crear clases.');
                return;
            }

            Modal.form(
                'Crear clase',
                [
                    {
                        name: 'careerId',
                        label: 'Carrera',
                        type: 'select',
                        required: true,
                        options: careerOptions,
                        onChange: (careerId) => actualizarAniosYMaterias(careerId)
                    },
                    { name: 'año', label: 'Año', type: 'select', required: true, options: [], disabled: true },
                    { name: 'subjectId', label: 'Materia', type: 'select', required: true, options: [], disabled: true },
                    { name: 'professorId', label: 'Profesor', type: 'select', required: true, options: professorOptions },
                    { 
                        name: 'copyFromClassId', 
                        label: 'Heredar PDFs de clase anterior (opcional)', 
                        type: 'select', 
                        options: [{ value: '', label: 'No heredar' }, ...classOptions] 
                    }
                ],
                async (data) => {
                    if (!data.copyFromClassId) delete data.copyFromClassId;
                    else data.copyFromClassId = parseInt(data.copyFromClassId);
                    data.professorId = parseInt(data.professorId);
                    data.subjectId = parseInt(data.subjectId);
                    data.año = parseInt(data.año);
                    try {
                        await apiService.request('/admin/classes', 'POST', data);
                        showModal('Éxito', 'Clase creada correctamente.');
                        await loadClasses();
                    } catch (error) {
                        showApiError(error);
                    }
                },
                'Crear',
                '600px'
            );

            // El onChange de la carrera no se dispara al abrir el modal: se
            // completan el año y la materia iniciales para que el formulario
            // se pueda enviar sin tener que cambiar la carrera y volver.
            await actualizarAniosYMaterias(careerOptions[0].value);
        } catch (error) {
            showApiError(error);
        }
    }

    async function actualizarAniosYMaterias(careerId) {
        const career = allCareers.find(c => c.id == careerId);
        if (!career) return;

        const añoSelect = document.querySelector('[name="año"]');
        const subjectSelect = document.querySelector('[name="subjectId"]');
        if (!añoSelect || !subjectSelect) return;

        fillYearSelect(careerId);
        añoSelect.disabled = false;
        subjectSelect.disabled = true;
        subjectSelect.replaceChildren();

        añoSelect.onchange = async () => {
            if (!añoSelect.value) {
                subjectSelect.disabled = true;
                subjectSelect.replaceChildren();
                return;
            }
            await fillSubjectSelect(careerId, añoSelect.value);
        };

        if (añoSelect.value) await fillSubjectSelect(careerId, añoSelect.value);
    }

    async function openEditClassModal(classData) {
        try {
            if (allUsers.length === 0) {
                await loadUsers();
            }
            if (allCareers.length === 0) {
                await loadCareers();
            }
            if (allSubjects.length === 0) {
                await loadSubjects();
            }

            const currentSubject = allSubjects.find(s => s.id === classData.subject_id);
            if (!currentSubject) {
                showModal('Error', 'No se pudo encontrar la materia actual de la clase.');
                return;
            }

            const professorOptions = getProfessorOptions();
            const careerOptions = getCareerOptions(true);

            const currentCareerId = currentSubject.career_id;
            const currentAño = currentSubject.año;
            const añoOptions = getYearOptions(currentCareerId);
            const subjectOptions = allSubjects
                .filter(s => s.active && s.career_id === currentCareerId && s.año === currentAño)
                .map(s => ({ value: s.id, label: s.name }));

            Modal.form(
                'Editar clase',
                [
                    {
                        name: 'careerId',
                        label: 'Carrera',
                        type: 'select',
                        required: true,
                        options: careerOptions,
                        value: currentCareerId,
                        onChange: (careerId) => actualizarAniosYMaterias(careerId)
                    },
                    {
                        name: 'año',
                        label: 'Año',
                        type: 'select',
                        required: true,
                        options: añoOptions,
                        value: currentAño
                    },
                    {
                        name: 'subjectId',
                        label: 'Materia',
                        type: 'select',
                        required: true,
                        options: subjectOptions,
                        value: classData.subject_id
                    },
                    {
                        name: 'professorId',
                        label: 'Profesor',
                        type: 'select',
                        required: true,
                        options: professorOptions,
                        value: classData.professor_id
                    }
                ],
                async (data) => {
                    data.subjectId = parseInt(data.subjectId);
                    data.professorId = parseInt(data.professorId);
                    try {
                        await apiService.request(`/admin/classes/${classData.class_id}`, 'PATCH', data);
                        showModal('Éxito', 'Clase actualizada correctamente.');
                        await loadClasses();
                    } catch (error) {
                        showApiError(error);
                    }
                },
                'Guardar'
            );

            const añoSelect = document.querySelector('[name="año"]');
            if (añoSelect) {
                añoSelect.onchange = () => {
                    const careerId = document.querySelector('[name="careerId"]').value;
                    if (!careerId || !añoSelect.value) return;
                    return fillSubjectSelect(careerId, añoSelect.value);
                };
            }
        } catch (error) {
            showApiError(error);
        }
    }

    // ASIGNACIÓN DIRECTA
    async function openAssignStudentModal(preSelectedClassId = null) {
        if (allUsers.length === 0) {
            await loadUsers();
        }
        if (allClasses.length === 0) {
            await loadClasses();
        }

        // Solo clases activas: el backend rechaza las inactivas.
        const classOptions = allClasses
            .filter(c => c.active)
            .map(c => ({
                value: c.class_id,
                label: `${c.career} - ${c.año ? `${c.año}º año` : 'sin año'} - ${c.subject}`
            }));

        // Solo alumnos activos (la API ya los devuelve ordenados por apellido).
        const studentOptions = allUsers
            .filter(u => u.role === 'student' && u.active)
            .map(u => ({
                value: u.id,
                label: `${u.last_name}, ${u.first_name} (${u.username})`
            }));

        if (classOptions.length === 0) {
            showModal('Sin clases activas', 'Creá o reactivá una clase antes de asignar alumnos.');
            return;
        }
        if (studentOptions.length === 0) {
            showModal('Sin alumnos activos', 'No hay alumnos activos registrados para asignar.');
            return;
        }

        // Si la clase sobre la que se hizo clic no esta entre las activas, no se
        // preselecciona nada (antes se ignoraba el parametro y quedaba la primera).
        const claseSeleccionada = classOptions.some(c => String(c.value) === String(preSelectedClassId))
            ? preSelectedClassId
            : '';

        Modal.form(
            'Asignar alumno a clase',
            [
                {
                    name: 'classId',
                    label: 'Clase',
                    type: 'select',
                    required: true,
                    searchable: true,
                    placeholder: 'Seleccioná una clase',
                    options: classOptions,
                    value: claseSeleccionada
                },
                {
                    name: 'studentId',
                    label: 'Alumno',
                    type: 'select',
                    required: true,
                    searchable: true,
                    searchPlaceholder: 'Buscar por apellido, nombre o usuario...',
                    placeholder: 'Seleccioná un alumno',
                    options: studentOptions
                }
            ],
            async (data) => {
                const classId = parseInt(data.classId);
                const studentId = parseInt(data.studentId);
                try {
                    await apiService.request(`/admin/classes/${classId}/students`, 'POST', { studentId });
                    const clase = classOptions.find(c => String(c.value) === String(classId));
                    showModal('Éxito', `Alumno asignado a ${clase ? clase.label : 'la clase'}.`);
                    await loadClasses();
                } catch (error) {
                    showApiError(error);
                }
            },
            'Asignar'
        );
    }

    // CAMBIO DE CARRERA
    async function openChangeCareerModal(preSelectedUser = null) {
        // La lista de carreras se carga al abrir su pestaña: se pide si falta
        if (allCareers.length === 0) {
            await loadCareers();
        }
        if (allUsers.length === 0) {
            await loadUsers();
        }
        const studentOptions = allUsers.filter(u => u.role === 'student' && u.active).map(u => ({
            value: u.id,
            label: `${u.last_name}, ${u.first_name} (${u.username}) - ${u.career_name || 'Sin carrera'}`
        }));
        const careerOptions = getCareerOptions(true);

        if (studentOptions.length === 0) {
            showModal('Sin alumnos activos', 'No hay alumnos activos registrados.');
            return;
        }
        if (careerOptions.length === 0) {
            showModal('Sin carreras activas', 'Creá o reactivá una carrera antes de cambiarla.');
            return;
        }

        Modal.form(
            preSelectedUser ? `Cambiar carrera de ${preSelectedUser.username}` : 'Cambiar carrera de alumno',
            [
                {
                    name: 'userId',
                    label: 'Alumno',
                    type: 'select',
                    required: true,
                    searchable: true,
                    searchPlaceholder: 'Buscar por apellido, nombre o usuario...',
                    placeholder: 'Seleccioná un alumno',
                    options: studentOptions,
                    value: preSelectedUser?.id || ''
                },
                {
                    name: 'careerId',
                    label: 'Nueva carrera',
                    type: 'select',
                    required: true,
                    placeholder: 'Seleccioná una carrera',
                    options: careerOptions
                }
            ],
            async (data) => {
                data.userId = parseInt(data.userId);
                data.careerId = parseInt(data.careerId);
                Modal.confirm(
                    'Confirmar cambio de carrera',
                    '⚠️ ADVERTENCIA: Al cambiar la carrera, se eliminarán TODAS las solicitudes pendientes y aprobadas del alumno. Perderá acceso a todos los materiales de sus clases actuales.\n\n¿Desea continuar?',
                    async () => {
                        try {
                            await apiService.request(`/admin/users/${data.userId}/career`, 'PATCH', { careerId: data.careerId });
                            showModal('Éxito', 'Carrera cambiada correctamente. Las solicitudes académicas del alumno han sido eliminadas.');
                            await loadUsers();
                        } catch (error) {
                            showApiError(error);
                        }
                    }
                );
            },
            'Cambiar carrera'
        );
    }

    return {
        init,
        loadUsers,
        loadProfessors,
        loadCareers,
        loadSubjects,
        loadClasses,
        openCreateProfessorModal,
        openEditProfessorModal,
        openCreateCareerModal,
        openEditCareerModal,
        openCreateSubjectModal,
        openEditSubjectModal,
        openCreateClassModal,
        openEditClassModal,
        openAssignStudentModal,
        openChangeCareerModal
    };
})();

window.adminController = adminController;

// Exponer funciones globalmente para onclick inline
window.openCreateProfessorModal = adminController.openCreateProfessorModal;
window.openCreateCareerModal = adminController.openCreateCareerModal;
window.openCreateSubjectModal = adminController.openCreateSubjectModal;
window.openCreateClassModal = adminController.openCreateClassModal;
window.openAssignStudentModal = adminController.openAssignStudentModal;
window.openChangeCareerModal = adminController.openChangeCareerModal;