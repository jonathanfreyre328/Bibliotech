/**
 * Pruebas del motor de tablas (Table) en su modo "materiales".
 *
 * Verifican las capacidades nuevas que usa la pestana "Mis materiales":
 *  - Filtro multi-valor por materia (un PDF pertenece a varias clases).
 *  - Chips de filtro con contador.
 *  - Agrupacion por clase, con el PDF repetido en cada clase.
 *  - Orden por defecto descendente por fecha de subida y su boton inversor.
 */

/**
 * Contador para que cada corrida use un id de contenedor distinto. El motor
 * `Table` guarda busqueda, filtros, orden y pagina por id: reutilizar el id
 * entre corridas hacia que un test arrancara con el estado del anterior.
 */
let contadorContenedoresPrueba = 0;

/**
 * @brief Crea un contenedor de pruebas en el DOM con id unico.
 * @param {string} idBase - Prefijo del id.
 * @returns {HTMLElement} Contenedor creado.
 */
function crearContenedorPrueba(idBase) {
    const contenedor = document.createElement('div');
    contenedor.id = `${idBase}_${++contadorContenedoresPrueba}`;
    document.body.appendChild(contenedor);
    return contenedor;
}

/**
 * @brief Arma un conjunto de datos de ejemplo (2 PDF, 2 clases).
 * @returns {Array} Materiales de prueba.
 */
function datosMaterialesPrueba() {
    return [
        {
            id: 1,
            title: 'PDF A',
            created_at: new Date(2026, 9, 21, 14, 32),
            classes: [
                { class_id: 10, career: 'Informatica', año: 5, subject: 'Practicas II', subject_id: 100 },
                { class_id: 20, career: 'Informatica', año: 3, subject: 'Algebra', subject_id: 200 }
            ]
        },
        {
            id: 2,
            title: 'PDF B',
            created_at: new Date(2026, 9, 18, 9, 11),
            classes: [
                { class_id: 10, career: 'Informatica', año: 5, subject: 'Practicas II', subject_id: 100 }
            ]
        }
    ];
}

/**
 * @brief Columnas de prueba (equivalentes a las de "Mis materiales").
 * @details Los indices usan claves TEXT (igual que `buildMaterialsIndex` en
 * `materialsFrontController.js`): el lookup del filtro normaliza con
 * `String(id)`, asi que las claves deben ser strings.
 * @returns {Array} Columnas de la tabla.
 */
function columnasMaterialesPrueba() {
    const subjects = new Map([
        ['100', { subject: 'Practicas II', año: 5 }],
        ['200', { subject: 'Algebra', año: 3 }]
    ]);
    const classes = new Map([
        ['10', { subject: 'Practicas II', año: 5 }],
        ['20', { subject: 'Algebra', año: 3 }]
    ]);

    return {
        columns: [
            { key: 'title', label: 'PDF', sortable: true, filterable: false, sortValue: (row) => row.title },
            {
                key: 'classes',
                label: 'Clase',
                sortable: true,
                filterTitle: 'Materia',
                filterValues: (row) => (row.classes || []).map(c => c.subject_id),
                filterLabel: (row, id) => (subjects.get(String(id)) || {}).subject || '',
                sortValue: (row) => (row.classes || []).map(c => c.subject).join(' · ')
            },
            {
                key: 'created_at',
                label: 'Subido',
                sortable: true,
                filterable: false,
                sortValue: (row) => row.created_at.getTime()
            }
        ],
        options: {
            filterStyle: 'chips',
            defaultSort: { key: 'created_at', dir: 'desc' },
            sortToggle: { key: 'created_at', descLabel: 'Más recientes primero', ascLabel: 'Más antiguos primero' },
            groupBy: {
                key: 'classes',
                value: (row) => (row.classes || []).map(c => String(c.class_id)),
                label: (classId) => (classes.get(String(classId)) || {}).subject || 'Clase',
                meta: (classId, rows) => `${rows.length} PDFs`
            }
        }
    };
}

/**
 * @brief Cuenta las filas de datos (sin los encabezados de grupo).
 * @param {HTMLElement} contenedor - Contenedor de la tabla.
 * @returns {number} Cantidad de filas de datos.
 */
function contarFilasDatos(contenedor) {
    return contenedor.querySelectorAll('tbody tr:not(.vault-group-row)').length;
}

/**
 * @brief Cuenta los encabezados de grupo.
 * @param {HTMLElement} contenedor - Contenedor de la tabla.
 * @returns {number} Cantidad de grupos.
 */
function contarGrupos(contenedor) {
    return contenedor.querySelectorAll('tbody tr.vault-group-row').length;
}

/**
 * @brief Devuelve el texto de los botones de la barra de filtros.
 * @param {HTMLElement} contenedor - Contenedor de la tabla.
 * @returns {Array} Textos de los chips.
 */
function textosChips(contenedor) {
    return Array.from(contenedor.querySelectorAll('.vault-chip-group button')).map(b => b.textContent);
}

// 1. La tabla se agrupa por clase y el PDF se repite en cada grupo
testUtils.createTestButton("Test Agrupar por clase (PDF repetido en cada grupo)", async (btn) => {
    const contenedor = crearContenedorPrueba('groupTestTable');
    try {
        const { columns, options } = columnasMaterialesPrueba();
        Table.render(contenedor.id, columns, datosMaterialesPrueba(), options);

        const grupos = contarGrupos(contenedor);
        const filas = contarFilasDatos(contenedor);
        const titulos = Array.from(contenedor.querySelectorAll('tbody tr.vault-group-row'))
            .map(tr => tr.textContent);
        testUtils.log({ grupos, filas, titulos });

        // 2 clases y 3 filas: el PDF A aparece en Practicas II y en Algebra.
        const titulosOk = titulos.some(t => t.includes('Practicas II'))
            && titulos.some(t => t.includes('Algebra'));
        if (grupos === 2 && filas === 3 && titulosOk) {
            testUtils.setSuccess(btn);
        }
    } finally {
        contenedor.remove();
    }
});

// 2. Los chips de filtro muestran el nombre de la materia con su contador
testUtils.createTestButton("Test Chips de materia con contador", async (btn) => {
    const contenedor = crearContenedorPrueba('chipsTestTable');
    try {
        const { columns, options } = columnasMaterialesPrueba();
        Table.render(contenedor.id, columns, datosMaterialesPrueba(), options);

        const chips = textosChips(contenedor);
        testUtils.log({ chips });

        const esperadas = ['Todas (2)', 'Algebra (1)', 'Practicas II (2)'];
        const ok = esperadas.every(t => chips.includes(t));
        if (ok) {
            testUtils.setSuccess(btn);
        }
    } finally {
        contenedor.remove();
    }
});

// 3. El filtro por materia es multi-valor (un PDF de varias clases coincide)
testUtils.createTestButton("Test Filtro por materia multi-valor", async (btn) => {
    const contenedor = crearContenedorPrueba('multiFilterTestTable');
    try {
        const { columns, options } = columnasMaterialesPrueba();
        Table.render(contenedor.id, columns, datosMaterialesPrueba(), options);

        const chips = Array.from(contenedor.querySelectorAll('.vault-chip-group button'));
        const chipAlgebra = chips.find(b => b.textContent.startsWith('Algebra'));
        if (!chipAlgebra) {
            throw new Error(`No se encontro el chip de Algebra. Chips: ${chips.map(c => c.textContent).join(' | ')}`);
        }
        chipAlgebra.click();

        const filas = contarFilasDatos(contenedor);
        const textos = Array.from(contenedor.querySelectorAll('tbody tr:not(.vault-group-row)'))
            .map(tr => tr.textContent);
        testUtils.log({ filas, textos });

        // Solo queda el PDF A (esta en Algebra y en Practicas II): 2 filas
        // porque se repite en los dos grupos de clase.
        const soloPdfA = textos.every(t => t.includes('PDF A') && !t.includes('PDF B'));
        if (filas !== 2 || !soloPdfA) {
            throw new Error(`Se esperaban 2 filas de PDF A; se obtuvieron ${filas}`);
        }
        testUtils.setSuccess(btn);
    } finally {
        contenedor.remove();
    }
});

// 4. El orden por defecto es cronologico descendente y se puede invertir
testUtils.createTestButton("Test Orden cronologico por defecto y boton inversor", async (btn) => {
    const contenedor = crearContenedorPrueba('sortTestTable');
    try {
        const { columns, options } = columnasMaterialesPrueba();
        Table.render(contenedor.id, columns, datosMaterialesPrueba(), options);

        const primera = contenedor.querySelector('tbody tr:not(.vault-group-row)').textContent;
        const flecha = Array.from(contenedor.querySelectorAll('th'))
            .find(th => th.textContent.includes('Subido')).textContent;

        const botonOrden = contenedor.querySelector('[data-sort-toggle="true"]');
        if (!botonOrden) {
            throw new Error('No se encontro el boton inversor de orden');
        }
        botonOrden.click();

        const primeraInvertida = contenedor.querySelector('tbody tr:not(.vault-group-row)').textContent;
        testUtils.log({ primera, flecha, primeraInvertida });

        if (!primera.includes('PDF A') || !flecha.includes('▼') || !primeraInvertida.includes('PDF B')) {
            throw new Error('El orden por defecto o su inversion no coinciden con lo esperado');
        }
        testUtils.setSuccess(btn);
    } finally {
        contenedor.remove();
    }
});
