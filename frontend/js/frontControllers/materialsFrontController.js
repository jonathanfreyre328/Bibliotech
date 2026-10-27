/**
 *    Project     : Bibliotech
 *    Author      : Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 *    License     : http://www.gnu.org/licenses/gpl.txt  GNU GPL 3.0
 *    Date        : Octubre 2026
 */

/**
 * Front controller de los materiales (PDFs).
 *
 * Lo usan los dos paneles que muestran PDFs:
 *  - Alumno: "Mis materiales" (los PDFs de las clases aprobadas).
 *  - Profesor: "Mis materiales" (los PDFs que cargo).
 *
 * Ambos comparten el mismo diseno:
 *  - Filtro por MATERIA en forma de chips con contador (no por clase).
 *  - Agrupacion por CLASE: los PDF se repiten en cada clase a la que
 *    pertenecen y cada grupo arranca con un encabezado.
 *  - Orden cronologico explicito (mas recientes primero por defecto) con la
 *    fecha y la hora visibles y un boton para invertirlo.
 */

function getYearLabel(año) {
    return año ? `${año}º año` : '-';
}

/**
 * @brief Recorta un texto largo para mostrarlo en una celda.
 * @param {string} text - Texto original.
 * @param {number} max - Cantidad maxima de caracteres.
 * @returns {string} Texto recortado.
 */
function truncateText(text, max) {
    const value = String(text || '').trim();
    if (value.length <= max) return value;
    return `${value.slice(0, max - 1)}…`;
}

/**
 * @brief Indexa las clases y las materias de un conjunto de materiales.
 * @details Las claves se guardan como texto para que el indice se pueda
 * consultar tanto con el id numerico de la BD como con el identificador de
 * grupo (que es un string).
 * @param {Array} materials - Materiales con su array `classes`.
 * @returns {{classes: Map, subjects: Map}} Indices por class_id y por subject_id.
 */
function buildMaterialsIndex(materials) {
    const classes = new Map();
    const subjects = new Map();

    (materials || []).forEach(material => {
        (material.classes || []).forEach(c => {
            if (c.class_id !== undefined && c.class_id !== null && !classes.has(String(c.class_id))) {
                classes.set(String(c.class_id), c);
            }
            if (c.subject_id !== undefined && c.subject_id !== null && !subjects.has(String(c.subject_id))) {
                subjects.set(String(c.subject_id), c);
            }
        });
    });

    return { classes, subjects };
}

/**
 * @brief Etiqueta de una clase para los encabezados de grupo.
 * @param {Object} clase - Clase con subject, año y career.
 * @returns {string} Texto legible.
 */
function buildClassLabel(clase) {
    if (!clase) return 'Clase';
    const partes = [clase.subject, getYearLabel(clase.año)];
    if (clase.career) partes.push(clase.career);
    return partes.filter(Boolean).join(' · ');
}

/**
 * @brief Etiqueta de una materia para los chips de filtro.
 * @param {Object} materia - Materia con subject y año.
 * @returns {string} Texto legible.
 */
function buildSubjectLabel(materia) {
    if (!materia) return 'Sin materia';
    return materia.año ? `${materia.subject} (${getYearLabel(materia.año)})` : materia.subject;
}

/**
 * @brief Linea de resumen de la tabla de materiales.
 * @param {Array} materials - Materiales de la tabla.
 * @returns {string} Resumen del conjunto.
 */
function buildMaterialsInfo(materials) {
    const total = (materials || []).length;
    if (total === 0) return 'Sin materiales para mostrar.';

    const { subjects } = buildMaterialsIndex(materials);
    const ultimo = materials.reduce((acc, m) =>
        (!acc || DateHelper.timestamp(m.created_at) > DateHelper.timestamp(acc.created_at)) ? m : acc, null);

    const partes = [
        `${total} PDF${total === 1 ? '' : 's'}`,
        `en ${subjects.size} materia${subjects.size === 1 ? '' : 's'}`
    ];
    if (ultimo) partes.push(`última subida ${DateHelper.formatDateTime(ultimo.created_at)}`);

    return partes.join(' · ');
}

/**
 * @brief Celda con titulo, autor y descripcion del PDF.
 * @param {Object} row - Material.
 * @returns {string} Markup sanitizable.
 */
function renderPdfCell(row) {
    const titulo = Table.escapeHtml(row.title || '');
    const autor = row.author
        ? `<small class="w3-text-grey">${Table.escapeHtml(row.author)}</small>`
        : '';
    const descripcion = row.description
        ? `<small class="w3-text-grey">${Table.escapeHtml(truncateText(row.description, 90))}</small>`
        : '';

    let html = `<strong>${titulo}</strong>`;
    if (autor) html += `<br>${autor}`;
    if (descripcion) html += `<br>${descripcion}`;
    return html;
}

/**
 * @brief Celda con las clases del PDF (la del grupo actual se destaca).
 * @param {Object} row - Material.
 * @param {Object} ctx - Contexto de render (ctx.group = class_id del grupo).
 * @returns {string} Markup sanitizable.
 */
function renderClassCell(row, ctx) {
    const clases = row.classes || [];
    if (clases.length === 0) return '<span class="w3-text-grey">Sin clase</span>';

    return clases.map(c => {
        const actual = ctx && ctx.group !== null && ctx.group !== undefined
            && String(ctx.group) === String(c.class_id);
        const clase = actual ? 'w3-tag w3-yellow' : 'w3-tag w3-dark-grey';
        const detalle = `${c.career} · ${getYearLabel(c.año)}`;
        return `<span class="${clase}">${Table.escapeHtml(c.subject)}</span>`
            + `<small class="w3-text-grey">${Table.escapeHtml(detalle)}</small>`;
    }).join(' ');
}

/**
 * @brief Celda con la fecha de subida (absoluta y relativa).
 * @param {Object} row - Material.
 * @returns {string} Markup sanitizable.
 */
function renderUploadedCell(row) {
    const fecha = Table.escapeHtml(DateHelper.formatDateTime(row.created_at));
    const relativo = Table.escapeHtml(DateHelper.formatRelative(row.created_at));
    return `<span class="w3-nowrap">${fecha}</span><br><small class="w3-text-grey">${relativo}</small>`;
}

function buildUploadedColumn() {
    return {
        key: 'created_at',
        label: 'Subido',
        sortable: true,
        filterable: false,
        html: true,
        searchValue: (row) => DateHelper.formatDateTime(row.created_at),
        sortValue: (row) => DateHelper.timestamp(row.created_at),
        render: (row) => renderUploadedCell(row)
    };
}

function buildViewDownloadActions() {
    return [
        {
            label: 'Ver online',
            class: 'w3-blue',
            handler: (row) => viewMaterialOnline(row)
        },
        {
            label: 'Descargar',
            class: 'w3-yellow',
            handler: (row) => downloadMaterial(row)
        }
    ];
}

/**
 * @brief Columnas compartidas por las tablas de materiales.
 * @param {Map} subjects - Indice de materias por subject_id.
 * @returns {Array} Columnas de la tabla.
 */
function buildMaterialsColumns(subjects) {
    return [
        {
            key: 'title',
            label: 'PDF',
            sortable: true,
            filterable: false,
            // El render devuelve markup (strong/small): sin `html: true` el
            // motor lo imprimiria como texto plano.
            html: true,
            searchValue: (row) => `${row.title || ''} ${row.author || ''} ${row.description || ''}`,
            sortValue: (row) => row.title || '',
            render: (row) => renderPdfCell(row)
        },
        {
            key: 'classes',
            label: 'Clase',
            sortable: true,
            html: true,
            // El filtro de esta columna es por MATERIA (chips), no por clase.
            filterTitle: 'Materia',
            filterValues: (row) => (row.classes || []).map(c => c.subject_id),
            filterLabel: (row, subjectId) => buildSubjectLabel(subjects.get(String(subjectId))),
            searchValue: (row) => (row.classes || [])
                .map(c => `${c.subject || ''} ${c.año || ''} ${c.career || ''} ${row.professor || ''}`)
                .join(' '),
            sortValue: (row) => (row.classes || [])
                .map(c => `${c.subject || ''} ${c.año || ''}`)
                .join(' · '),
            render: (row, ctx) => renderClassCell(row, ctx)
        }
    ];
}

/**
 * @brief Opciones compartidas por las tablas de materiales.
 * @param {Map} classes - Indice de clases por class_id.
 * @returns {Object} Opciones para Table.render.
 */
function buildMaterialsOptions(classes) {
    return {
        filterStyle: 'chips',
        defaultSort: { key: 'created_at', dir: 'desc' },
        sortToggle: {
            key: 'created_at',
            descLabel: 'Más recientes primero',
            ascLabel: 'Más antiguos primero'
        },
        infoLine: (data) => buildMaterialsInfo(data),
        groupBy: {
            key: 'classes',
            value: (row) => (row.classes || []).map(c => String(c.class_id)),
            label: (classId) => (classId === '' ? 'Sin clase' : buildClassLabel(classes.get(classId))),
            meta: (classId, rows) => {
                const ultimo = rows.reduce((acc, r) =>
                    (!acc || DateHelper.timestamp(r.created_at) > DateHelper.timestamp(acc.created_at)) ? r : acc, null);
                const cantidad = `${rows.length} PDF${rows.length === 1 ? '' : 's'}`;
                return ultimo
                    ? `${cantidad} · última: ${DateHelper.formatDateTime(ultimo.created_at)}`
                    : cantidad;
            }
        }
    };
}

async function loadMaterials(renderTable) {
    try {
        const materials = await apiService.request('/materials');
        renderTable(materials);
    } catch (error) {
        showApiError(error);
    }
}

async function loadProfessorMaterials() {
    return loadMaterials(renderProfessorMaterialsTable);
}

function renderProfessorMaterialsTable(materials) {
    const { classes, subjects } = buildMaterialsIndex(materials);
    const columns = buildMaterialsColumns(subjects);

    columns.push({
        key: 'active',
        label: 'Estado',
        sortable: true,
        filterable: false,
        html: true,
        searchValue: (row) => row.active ? 'Activo' : 'Inactivo',
        sortValue: (row) => row.active ? 'Activo' : 'Inactivo',
        render: (row) => row.active
            ? '<span class="w3-tag w3-green">Activo</span>'
            : '<span class="w3-tag w3-red">Inactivo</span>'
    });

    columns.push(buildUploadedColumn());

    const actions = [
        ...buildViewDownloadActions(),
        {
            label: 'Editar',
            class: 'w3-blue',
            handler: (row) => openEditMaterialModal(row)
        },
        {
            label: 'Eliminar',
            class: 'w3-red',
            handler: (row) => {
                Modal.confirm(
                    'Eliminar material',
                    `¿Eliminar "${row.title}"? Se borrará el archivo y todas las relaciones.`,
                    () => deleteMaterial(row.id)
                );
            }
        }
    ];

    Table.render('materialsTable', columns, materials, {
        ...buildMaterialsOptions(classes),
        actions,
        emptyMessage: 'No tienes materiales cargados.'
    });
}

async function loadProfessorClasses() {
    try {
        const classes = await apiService.request('/academic/classes');
        const select = document.getElementById('classIds');
        if (select) {
            select.replaceChildren();
            classes.forEach((item) => {
                if (!item.active) return;
                const option = document.createElement('option');
                option.value = item.class_id;
                option.textContent = `${item.career} - ${getYearLabel(item.año)} - ${item.subject}`;
                select.appendChild(option);
            });
        }
        return classes;
    } catch (error) {
        showApiError(error);
        return [];
    }
}

async function loadStudentMaterials() {
    return loadMaterials(renderStudentMaterialsTable);
}

function renderStudentMaterialsTable(materials) {
    const { classes, subjects } = buildMaterialsIndex(materials);
    const columns = buildMaterialsColumns(subjects);

    columns.push(buildUploadedColumn());

    Table.render('materialsTable', columns, materials, {
        ...buildMaterialsOptions(classes),
        actions: buildViewDownloadActions(),
        emptyMessage: 'No tienes materiales disponibles. Solicita acceso a clases en la pestaña "Solicitudes".',
        onRowClick: (row) => viewMaterialOnline(row)
    });
}

async function fetchMaterialBlob(material, action, fallbackMessage) {
    const response = await fetch(`/api/materials/${material.id}/${action}`, {
        headers: { Authorization: 'Bearer ' + authHelper.getToken() }
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || fallbackMessage);
    }
    return response.blob();
}

async function downloadMaterial(material) {
    try {
        const blob = await fetchMaterialBlob(material, 'download', 'No se pudo descargar el PDF.');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = material.original_filename || `material_${material.id}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        showApiError(error);
    }
}

async function viewMaterialOnline(material) {
    let objectUrl;
    try {
        objectUrl = URL.createObjectURL(await fetchMaterialBlob(material, 'view', 'No se pudo visualizar el PDF.'));
    } catch (error) {
        showApiError(error);
        return;
    }

    const modalContainer = document.createElement('div');
    modalContainer.className = 'w3-modal';
    modalContainer.style.display = 'block';
    modalContainer.style.zIndex = '10000';
    modalContainer.style.position = 'fixed';
    modalContainer.style.top = '0';
    modalContainer.style.left = '0';
    modalContainer.style.width = '100%';
    modalContainer.style.height = '100%';
    modalContainer.style.backgroundColor = 'rgba(0,0,0,0.7)';
    modalContainer.style.overflow = 'auto';

    const modalContent = document.createElement('div');
    modalContent.className = 'w3-modal-content w3-card-4 w3-animate-zoom vault-card';
    modalContent.style.width = '100vw';
    modalContent.style.maxWidth = 'none';
    modalContent.style.margin = '0';
    modalContent.style.height = 'calc(100vh - 4px)';
    modalContent.style.display = 'flex';
    modalContent.style.flexDirection = 'column';

    const header = document.createElement('header');
    header.className = 'w3-container w3-border-bottom w3-dark-grey';
    header.style.flexShrink = '0';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const title = document.createElement('h3');
    title.textContent = material.title;
    title.style.margin = '0';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'w3-button w3-red w3-round';
    closeBtn.textContent = 'Cerrar';
    closeBtn.onclick = () => {
        modalContainer.remove();
        if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    header.appendChild(closeBtn);

    const iframeContainer = document.createElement('div');
    iframeContainer.style.flex = '1';
    iframeContainer.style.position = 'relative';
    iframeContainer.style.minHeight = '0';

    const iframe = document.createElement('iframe');
    iframe.src = objectUrl;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '0 0 4px 4px';
    iframe.title = material.title;
    iframeContainer.appendChild(iframe);

    modalContent.appendChild(header);
    modalContent.appendChild(iframeContainer);
    modalContainer.appendChild(modalContent);

    function escClose(e) {
        if (e.key === 'Escape') {
            modalContainer.remove();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            document.removeEventListener('keydown', escClose);
        }
    }
    document.addEventListener('keydown', escClose);

    document.body.appendChild(modalContainer);
}

const professorUploadForm = document.getElementById('uploadForm');
if (professorUploadForm) {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await loadProfessorClasses();
            await loadProfessorMaterials();
        } catch (error) { showApiError(error); }
    });
    professorUploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(professorUploadForm);
        formData.set('classIds', Array.from(document.getElementById('classIds').selectedOptions).map((option) => option.value).join(','));
        try {
            await apiService.request('/materials', 'POST', formData, true);
            professorUploadForm.reset();
            await loadProfessorMaterials();
            showModal('Éxito', 'Material cargado correctamente.');
        } catch (error) { showApiError(error); }
    });
}

if (!professorUploadForm && document.getElementById('materialsTable')) {
    document.addEventListener('DOMContentLoaded', async () => {
        await loadStudentMaterials();
    });
}

async function deleteMaterial(materialId) {
    try {
        await apiService.request(`/materials/${materialId}`, 'DELETE');
        showModal('Éxito', 'Material eliminado correctamente.');
        await loadProfessorMaterials();
    } catch (error) {
        showApiError(error);
    }
}

async function openEditMaterialModal(material) {
    const classes = await loadProfessorClasses();
    const classOptions = classes.filter(c => c.active).map(c => ({
        value: c.class_id,
        label: `${c.career} - ${getYearLabel(c.año)} - ${c.subject}`
    }));

    const selectedClassIds = material.classes ? material.classes.map(c => c.class_id) : [];

    Modal.form(
        `Editar: ${material.title}`,
        [
            { name: 'id', type: 'hidden', value: material.id },
            { name: 'title', label: 'Título', type: 'text', required: true, value: material.title },
            { name: 'description', label: 'Descripción', type: 'textarea', value: material.description || '', rows: 3 },
            { name: 'author', label: 'Autor del material', type: 'text', value: material.author || '' },
            {
                name: 'classIds',
                label: 'Clases con acceso',
                type: 'select',
                multiple: true,
                required: true,
                options: classOptions,
                value: selectedClassIds.join(',')
            }
        ],
        async (data) => {
            const classIds = Array.isArray(data.classIds)
                ? data.classIds
                : String(data.classIds || '').split(',');
            data.classIds = classIds.filter(Boolean).map(Number);
            try {
                await apiService.request(`/materials/${material.id}`, 'PATCH', data);
                showModal('Éxito', 'Material actualizado correctamente.');
                await loadProfessorMaterials();
            } catch (error) {
                showApiError(error);
            }
        },
        'Guardar cambios',
        '600px'
    );
}

window.loadStudentMaterials = loadStudentMaterials;
