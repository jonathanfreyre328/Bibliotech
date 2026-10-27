/**
 *    Project     : Bibliotech
 *    Author      : Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 *    License     : http://www.gnu.org/licenses/gpl.txt  GNU GPL 3.0
 *    Date        : Octubre 2026
 */

/**
 * Motor de tablas reutilizable (vanilla JS + W3.CSS).
 *
 * Todas las grillas de los tres paneles se dibujan con este componente.
 * Capacidades (todas opt-in, las tablas existentes no se ven afectadas):
 *
 *  - Busqueda por texto sobre las columnas marcadas como buscables.
 *  - Filtros: por defecto un <select> por columna; con `filterStyle: 'chips'`
 *    se dibujan botones con contador ("Todas (12)", "Practicas II (5)").
 *  - Filtro multi-valor: si la columna define `filterValues`, la fila
 *    coincide con el filtro si coincide con CUALQUIERA de sus valores (un PDF
 *    puede pertenecer a varias clases/materias).
 *  - Orden por columna con indicador en el encabezado y `defaultSort`.
 *  - `sortToggle`: boton que invierte el orden de una columna.
 *  - `groupBy`: agrupa las filas bajo un encabezado de grupo (un PDF con
 *    varias clases aparece una vez en cada grupo al que pertenece).
 *  - Paginacion en el cliente (25 filas por defecto).
 */
const Table = (function() {
    const searchStates = {};
    const filterStates = {};
    const sortStates = {};
    const pageStates = {};
    // Referencias de la ULTIMA renderizacion de CADA contenedor. No pueden ser
    // globales: con varias tablas montadas (panel admin) los handlers de una
    // tabla terminarian redibujando otra distinta.
    const tableStates = {};

    const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
    const DEFAULT_PAGE_SIZE = 25;

    const NONE_IDENTITY = '__none__';
    const NONE_LABEL = 'Sin asignar';

    /**
     * @brief Vuelve a dibujar una tabla con las ultimas referencias usadas.
     * @param {string} containerId - Id del contenedor de la tabla.
     */
    function rerender(containerId) {
        const state = tableStates[containerId];
        if (!state) return;
        renderTable(containerId, state.columns, state.data, state.options);
    }

    // --- Seguridad: lista blanca de etiquetas y atributos permitidos en las
    // columnas que renderizan HTML (column.html = true). Todo lo que no esté
    // aca se descarta, de modo que un dato controlado por el usuario (por
    // ejemplo el titulo de un PDF) no pueda inyectar markup ni scripts. ---

    const ALLOWED_TAGS = ['SPAN', 'B', 'STRONG', 'I', 'EM', 'SMALL', 'BR'];

    // Etiquetas cuyo contenido se descarta por completo (no se "desenvuelve"),
    // porque su texto no es contenido visible para el usuario.
    const DROPPED_TAGS = ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'BASE', 'FORM'];

    function createElement(tag, className, textContent) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (textContent !== undefined) el.textContent = textContent;
        return el;
    }

    /**
     * Escapa los caracteres especiales de HTML de una cadena de texto.
     * @param {*} value - Valor a escapar.
     * @returns {string} Texto seguro para insertar dentro de una cadena HTML.
     */
    function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Filtra el valor del atributo class dejando solo los tokens del
     * framework de estilos (w3-*), descartando cualquier otra cosa.
     * @param {string} value - Valor original del atributo class.
     * @returns {string} Classes filtradas.
     */
    function sanitizeClass(value) {
        return String(value)
            .split(/\s+/)
            .filter((token) => /^w3-[a-z0-9-]+$/.test(token))
            .join(' ');
    }

    /**
     * Reconstruye un nodo del documento parseado aplicando la lista blanca.
     * @param {Node} node - Nodo origen (proveniente del DOMParser).
     * @returns {Node|null} Nodo seguro para insertar en el documento.
     */
    function sanitizeNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return document.createTextNode(node.textContent);
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return null;

        const tag = node.tagName.toUpperCase();

        // Etiquetas peligrosas: se descartan junto con su contenido.
        if (DROPPED_TAGS.includes(tag)) return null;

        // Etiquetas no permitidas: se "desenvuelven", es decir se conserva
        // el texto de sus hijos (ya sanitizado) pero no la etiqueta en si.
        if (!ALLOWED_TAGS.includes(tag)) {
            const fragment = document.createDocumentFragment();
            node.childNodes.forEach((child) => {
                const clean = sanitizeNode(child);
                if (clean) fragment.appendChild(clean);
            });
            return fragment;
        }

        const clean = document.createElement(tag.toLowerCase());

        // Unico atributo permitido: class (filtrado).
        const classValue = node.getAttribute('class');
        if (classValue !== null) {
            const filtered = sanitizeClass(classValue);
            if (filtered) clean.setAttribute('class', filtered);
        }

        node.childNodes.forEach((child) => {
            const cleanChild = sanitizeNode(child);
            if (cleanChild) clean.appendChild(cleanChild);
        });

        return clean;
    }

    /**
     * Convierte una cadena con HTML en un fragmento seguro.
     * @details No usa innerHTML: el HTML se parsea con DOMParser (que no
     * ejecuta scripts ni carga recursos) y luego se reconstruye nodo a nodo
     * aplicando la lista blanca.
     * @param {*} html - Contenido HTML a sanitizar.
     * @returns {DocumentFragment} Fragmento listo para insertar en el DOM.
     */
    function sanitizeHtml(html) {
        const fragment = document.createDocumentFragment();
        if (html === null || html === undefined) return fragment;

        const parsed = new DOMParser().parseFromString(String(html), 'text/html');
        parsed.body.childNodes.forEach((child) => {
            const clean = sanitizeNode(child);
            if (clean) fragment.appendChild(clean);
        });
        return fragment;
    }

    function getCellValue(row, column, ctx) {
        if (column.render) return column.render(row, ctx);
        return row[column.key];
    }

    function getSortValue(row, column) {
        if (column.sortValue) return column.sortValue(row);
        return row[column.key];
    }

    function getSearchValue(row, column) {
        if (column.searchValue) return column.searchValue(row);
        return getSortValue(row, column);
    }

    /**
     * Devuelve el texto legible de un valor de filtro.
     * @param {Object} row - Fila de la que proviene el valor.
     * @param {Object} column - Columna del filtro.
     * @param {*} value - Valor concreto (undefined si la columna no es multi-valor).
     * @returns {string} Etiqueta del valor.
     * @details `value` es el valor CRUDO que devolvio la columna (puede ser
     * number o string). Si la columna filtra por un id (por ejemplo
     * `subject_id`), el indice donde se busca la etiqueta debe consultarse con
     * la MISMA clave con la que se guardo: lo mas simple es indexar por texto
     * (`map.set(String(id), ...)`) y buscar con `String(value)`.
     */
    function getFilterLabel(row, column, value) {
        if (column.filterLabel) return String(column.filterLabel(row, value));
        if (value === null || value === undefined) return '-';
        return String(value);
    }

    /**
     * Devuelve los valores de filtro de una fila para una columna.
     * @details Soporta filtro multi-valor: si la columna define `filterValues`
     * se devuelve un array (la fila coincide con el filtro si coincide con
     * cualquiera de sus valores).
     * @param {Object} row - Fila de datos.
     * @param {Object} column - Columna del filtro.
     * @returns {Array<{value: string, label: string}>} Identidad y etiqueta de cada valor.
     */
    function getFilterValues(row, column) {
        let raw;
        if (column.filterValues) {
            raw = column.filterValues(row);
        } else if (column.filterValue) {
            raw = column.filterValue(row);
        } else {
            raw = row[column.key];
        }

        const list = Array.isArray(raw) ? raw : [raw];
        return list.map(value => {
            const isEmpty = (value === null || value === undefined || value === '');
            const identity = isEmpty ? NONE_IDENTITY : String(value);
            let label = getFilterLabel(row, column, value);
            if (!label) label = isEmpty ? NONE_LABEL : String(value);
            return { value: identity, label };
        });
    }

    function formatValue(value) {
        if (value === null || value === undefined) return '-';
        if (value instanceof Date) return value.toLocaleDateString();
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }

    function compareValues(a, b) {
        const aNull = a === null || a === undefined;
        const bNull = b === null || b === undefined;
        if (aNull && bNull) return 0;
        if (aNull) return 1;
        if (bNull) return -1;
        if (typeof a === 'number' && typeof b === 'number') return a - b;
        return String(a).localeCompare(String(b), 'es', { numeric: true });
    }

    function restoreFocus(input, wasFocused, caretPos) {
        if (!wasFocused) return;
        input.focus();
        try { input.setSelectionRange(caretPos, caretPos); } catch (e) { /* ignorar */ }
    }

    function getPageState(containerId, options) {
        if (!pageStates[containerId]) {
            pageStates[containerId] = { page: 1, size: (options && options.pageSize) || DEFAULT_PAGE_SIZE };
        }
        return pageStates[containerId];
    }

    function resetPage(containerId) {
        if (pageStates[containerId]) pageStates[containerId].page = 1;
    }

    /**
     * Indica si una columna genera un control de filtro.
     * @param {Object} column - Columna a evaluar.
     * @returns {boolean} true si la columna es filtrable.
     */
    function isFilterableColumn(column) {
        return column.filterable !== false;
    }

    /**
     * Aplica busqueda y filtros a un conjunto de filas.
     * @param {Array} data - Filas a filtrar.
     * @param {Array} columns - Columnas de la tabla.
     * @param {string} searchTerm - Termino de busqueda en minusculas.
     * @param {Object} filters - Filtros activos por clave de columna.
     * @param {string} [exceptKey] - Columna cuyo filtro se ignora (conteo de facetas).
     * @returns {Array} Filas que cumplen la condicion.
     */
    function applyFilters(data, columns, searchTerm, filters, exceptKey) {
        return data.filter(row => {
            if (searchTerm) {
                const matchesSearch = columns.some(col => {
                    if (col.searchable === false) return false;
                    const val = getSearchValue(row, col);
                    if (val === null || val === undefined) return false;
                    return String(val).toLowerCase().includes(searchTerm);
                });
                if (!matchesSearch) return false;
            }
            for (const [key, selected] of Object.entries(filters)) {
                if (!selected) continue;
                if (exceptKey && key === exceptKey) continue;
                const column = columns.find(c => c.key === key);
                if (!column) continue;
                const values = getFilterValues(row, column);
                if (!values.some(v => v.value === selected)) return false;
            }
            return true;
        });
    }

    function createPaginationBar(containerId, totalItems, page, totalPages, size, unit) {
        const bar = createElement('div', 'w3-margin-top');
        bar.style.display = 'flex';
        bar.style.flexWrap = 'wrap';
        bar.style.gap = '10px';
        bar.style.alignItems = 'center';
        bar.style.justifyContent = 'space-between';

        const info = createElement('span', 'w3-small w3-text-white');
        const from = totalItems === 0 ? 0 : (page - 1) * size + 1;
        const to = Math.min(page * size, totalItems);
        info.textContent = `Mostrando ${from}-${to} de ${totalItems} ${unit}`;
        bar.appendChild(info);

        const controls = createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '8px';
        controls.style.alignItems = 'center';

        const prevBtn = createElement('button', 'w3-button w3-small w3-grey w3-round', '‹ Anterior');
        prevBtn.disabled = page <= 1;
        prevBtn.addEventListener('click', () => {
            const table = tableStates[containerId];
            const state = getPageState(containerId, table && table.options);
            state.page = Math.max(1, state.page - 1);
            rerender(containerId);
        });

        const pageInfo = createElement('span', 'w3-small w3-text-white', `Página ${page} de ${totalPages}`);

        const nextBtn = createElement('button', 'w3-button w3-small w3-grey w3-round', 'Siguiente ›');
        nextBtn.disabled = page >= totalPages;
        nextBtn.addEventListener('click', () => {
            const table = tableStates[containerId];
            const state = getPageState(containerId, table && table.options);
            state.page = Math.min(totalPages, state.page + 1);
            rerender(containerId);
        });

        controls.appendChild(prevBtn);
        controls.appendChild(pageInfo);
        controls.appendChild(nextBtn);

        const sizeLabel = createElement('label', 'w3-small w3-text-white', unit === 'grupos' ? 'Clases por página:' : 'Filas por página:');
        const sizeSelect = createElement('select', 'w3-select w3-border w3-round w3-black w3-text-white');
        sizeSelect.style.width = '80px';

        const sizes = PAGE_SIZE_OPTIONS.includes(size) ? PAGE_SIZE_OPTIONS : [...PAGE_SIZE_OPTIONS, size].sort((a, b) => a - b);
        sizes.forEach(optionSize => {
            const opt = createElement('option');
            opt.value = optionSize;
            opt.textContent = optionSize;
            sizeSelect.appendChild(opt);
        });
        sizeSelect.value = size;
        sizeSelect.addEventListener('change', (e) => {
            const table = tableStates[containerId];
            const state = getPageState(containerId, table && table.options);
            state.size = parseInt(e.target.value) || DEFAULT_PAGE_SIZE;
            state.page = 1;
            rerender(containerId);
        });

        controls.appendChild(sizeLabel);
        controls.appendChild(sizeSelect);
        bar.appendChild(controls);
        return bar;
    }

    function createSearchBar(containerId, columns, data, options) {
        const searchWrapper = createElement('div', 'w3-margin-bottom');
        const input = createElement('input', 'w3-input w3-border w3-round w3-black w3-text-white');
        input.type = 'text';
        input.placeholder = options.searchPlaceholder || 'Buscar...';
        input.dataset.searchInput = 'true';
        input.value = searchStates[containerId] || '';
        input.addEventListener('input', (e) => {
            searchStates[containerId] = e.target.value;
            resetPage(containerId);
            rerender(containerId);
        });
        searchWrapper.appendChild(input);
        return { searchWrapper, input };
    }

    function createFilterBar(containerId, columns, data) {
        const states = filterStates[containerId] || (filterStates[containerId] = {});
        const bar = createElement('div');
        bar.style.display = 'flex';
        bar.style.flexWrap = 'wrap';
        bar.style.gap = '8px';
        bar.style.alignItems = 'flex-end';
        bar.style.marginBottom = '10px';

        columns.forEach(column => {
            if (!isFilterableColumn(column)) return;

            const identities = new Map();
            data.forEach(row => {
                getFilterValues(row, column).forEach(v => {
                    if (!identities.has(v.value)) identities.set(v.value, v.label);
                });
            });
            if (identities.size <= 1) return;

            const colDiv = createElement('div');
            colDiv.style.minWidth = '140px';
            colDiv.style.flex = '1';

            const label = createElement('label', 'w3-small w3-text-white', column.label);
            const select = createElement('select', 'w3-select w3-border w3-round w3-black w3-text-white');

            const allOption = createElement('option');
            allOption.value = '';
            allOption.textContent = `${column.label}: Todos`;
            select.appendChild(allOption);

            [...identities.entries()]
                .sort((a, b) => a[1].localeCompare(b[1], 'es', { numeric: true }))
                .forEach(([identity, labelValue]) => {
                    const opt = createElement('option');
                    opt.value = identity;
                    opt.textContent = labelValue;
                    select.appendChild(opt);
                });

            select.value = states[column.key] || '';
            select.addEventListener('change', (e) => {
                states[column.key] = e.target.value;
                resetPage(containerId);
                rerender(containerId);
            });

            colDiv.appendChild(label);
            colDiv.appendChild(select);
            bar.appendChild(colDiv);
        });

        if (bar.children.length === 0) return null;

        const clearBtn = createElement('button', 'w3-button w3-tiny w3-grey w3-round', 'Limpiar filtros');
        clearBtn.addEventListener('click', () => {
            delete filterStates[containerId];
            resetPage(containerId);
            rerender(containerId);
        });
        bar.appendChild(clearBtn);

        return bar;
    }

    /**
     * Crea un boton tipo "chip" para la barra de filtros.
     * @param {string} text - Texto del chip.
     * @param {boolean} isActive - Si el chip representa el filtro activo.
     * @param {Function} onClick - Callback al hacer clic.
     * @returns {HTMLElement} Boton generado.
     */
    function createChip(text, isActive, onClick) {
        const btn = createElement('button', `w3-button w3-small w3-round ${isActive ? 'w3-yellow' : 'w3-dark-grey'}`);
        btn.textContent = text;
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        btn.addEventListener('click', onClick);
        return btn;
    }

    /**
     * Barra de filtros dibujada como botones (chips) con contador.
     * @details El contador de cada chip se calcula sobre las filas que pasan la
     * busqueda actual (y el resto de los filtros), de modo que el usuario puede
     * decidir con informacion cuantos PDFs hay en cada valor.
     * @param {string} containerId - Id del contenedor de la tabla.
     * @param {Array} columns - Columnas de la tabla.
     * @param {Array} data - Filas de la tabla.
     * @param {Object} options - Opciones de render.
     * @returns {HTMLElement|null} Barra generada o null si no hay nada que mostrar.
     */
    function createChipFilterBar(containerId, columns, data, options) {
        const states = filterStates[containerId] || (filterStates[containerId] = {});
        const bar = createElement('div', 'vault-toolbar');
        const searchTerm = (searchStates[containerId] || '').trim().toLowerCase();
        const filters = filterStates[containerId] || {};

        columns.forEach(column => {
            if (!isFilterableColumn(column)) return;

            const identities = new Map();
            data.forEach(row => {
                getFilterValues(row, column).forEach(v => {
                    if (!identities.has(v.value)) identities.set(v.value, v.label);
                });
            });
            if (identities.size <= 1) return;

            const scoped = applyFilters(data, columns, searchTerm, filters, column.key);
            const counts = new Map();
            scoped.forEach(row => {
                getFilterValues(row, column).forEach(v => {
                    counts.set(v.value, (counts.get(v.value) || 0) + 1);
                });
            });

            const group = createElement('div', 'vault-chip-group');
            group.appendChild(createElement('span', 'vault-chip-label', column.filterTitle || column.label));

            const active = states[column.key] || '';

            group.appendChild(createChip(`Todas (${scoped.length})`, active === '', () => {
                states[column.key] = '';
                resetPage(containerId);
                rerender(containerId);
            }));

            [...identities.entries()]
                .sort((a, b) => a[1].localeCompare(b[1], 'es', { numeric: true }))
                .forEach(([identity, labelValue]) => {
                    const count = counts.get(identity) || 0;
                    group.appendChild(createChip(`${labelValue} (${count})`, active === identity, () => {
                        states[column.key] = active === identity ? '' : identity;
                        resetPage(containerId);
                        rerender(containerId);
                    }));
                });

            bar.appendChild(group);
        });

        if (options.sortToggle) {
            const toggle = options.sortToggle;
            const state = sortStates[containerId];
            let currentDir = 'desc';
            if (state && state.key === toggle.key) currentDir = state.dir;
            else if (options.defaultSort && options.defaultSort.key === toggle.key) currentDir = options.defaultSort.dir || 'desc';

            const label = currentDir === 'desc'
                ? (toggle.descLabel || 'Más recientes primero')
                : (toggle.ascLabel || 'Más antiguos primero');

            const btn = createElement('button', 'w3-button w3-small w3-round w3-light-grey');
            btn.textContent = `⇅ ${label}`;
            btn.title = 'Invertir el orden';
            btn.dataset.sortToggle = 'true';
            btn.addEventListener('click', () => {
                sortStates[containerId] = { key: toggle.key, dir: currentDir === 'desc' ? 'asc' : 'desc' };
                rerender(containerId);
            });
            bar.appendChild(btn);
        }

        if (bar.children.length === 0) return null;

        const clearBtn = createElement('button', 'w3-button w3-tiny w3-grey w3-round', 'Limpiar filtros');
        clearBtn.addEventListener('click', () => {
            delete filterStates[containerId];
            resetPage(containerId);
            rerender(containerId);
        });
        bar.appendChild(clearBtn);

        return bar;
    }

    function createSortableHeader(column, containerId, options) {
        const th = createElement('th');
        const wrapper = createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '6px';
        wrapper.style.cursor = 'pointer';

        const label = createElement('span', '', column.label);
        wrapper.appendChild(label);

        const sortable = column.sortable !== false;
        const state = sortStates[containerId];
        const isActive = sortable && state && state.key === column.key;

        if (sortable) {
            const icon = createElement('span', '', isActive ? (state.dir === 'asc' ? '▲' : '▼') : '▼');
            icon.style.fontSize = '10px';
            icon.style.transition = 'transform 0.2s';
            if (isActive) icon.style.opacity = '1';
            else icon.style.opacity = '0.5';
            wrapper.appendChild(icon);
            if (isActive) wrapper.style.fontWeight = 'bold';

            wrapper.addEventListener('click', () => {
                const current = (sortStates[containerId] && sortStates[containerId].key === column.key)
                    ? sortStates[containerId].dir
                    : null;
                const newDir = current === 'asc' ? 'desc' : 'asc';
                sortStates[containerId] = { key: column.key, dir: newDir };

                if (options.onSort) {
                    options.onSort(column.key, newDir);
                } else {
                    rerender(containerId);
                }
            });

            th.dataset.sortKey = column.key;
        }

        th.appendChild(wrapper);
        return th;
    }

    function createActionButtons(actions, row) {
        const td = createElement('td');

        // OJO: la celda NO puede llevar `display: flex` en linea. W3.CSS define
        // `.w3-table td { display: table-cell; }` y el estilo en linea lo pisa:
        // al dejar de ser una celda de tabla, la celda no se estira a la altura
        // de la fila y queda un hueco que muestra el fondo rayado de W3.CSS
        // (un cuadrado casi blanco debajo de los botones). El flex va en un
        // div interno, que es lo correcto.
        const wrapper = createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.gap = '8px';
        wrapper.style.flexWrap = 'wrap';

        actions.forEach(action => {
            if (typeof action.visible === 'function' && !action.visible(row)) return;
            const label = typeof action.label === 'function' ? action.label(row) : action.label;
            const cls = typeof action.class === 'function' ? action.class(row) : action.class;
            const btn = createElement('button', `w3-button w3-tiny ${cls || ''}`, label);
            btn.addEventListener('click', () => action.handler(row));
            wrapper.appendChild(btn);
        });

        td.appendChild(wrapper);
        return td;
    }

    /**
     * Devuelve los valores de grupo de una fila.
     * @param {Object} row - Fila de datos.
     * @param {Object} groupBy - Configuracion de agrupacion.
     * @returns {Array<string>} Identificadores de grupo.
     */
    function getGroupValues(row, groupBy) {
        const raw = groupBy.value(row);
        if (raw === null || raw === undefined) return [];
        const list = Array.isArray(raw) ? raw : [raw];
        return list
            .filter(v => v !== null && v !== undefined)
            .map(v => String(v));
    }

    /**
     * Arma los grupos a partir de las filas filtradas y ordenadas.
     * @details Una fila puede pertenecer a varios grupos (un PDF asignado a
     * varias clases aparece una vez en cada clase). El orden de los grupos es
     * el de aparicion dentro de la lista ya ordenada, asi que con el orden por
     * fecha descendente el grupo con el PDF mas nuevo queda primero.
     * @param {Array} rows - Filas filtradas y ordenadas.
     * @param {Object} groupBy - Configuracion de agrupacion.
     * @returns {Array<Object>} Grupos con sus filas.
     */
    function buildGroups(rows, groupBy) {
        const map = new Map();
        rows.forEach(row => {
            const values = getGroupValues(row, groupBy);
            if (values.length === 0) {
                // Fila sin grupo (por ejemplo, un material sin clase asignada):
                // se agrupa aparte para que no desaparezca de la tabla.
                if (!map.has('')) map.set('', []);
                map.get('').push(row);
                return;
            }
            values.forEach(value => {
                if (!map.has(value)) map.set(value, []);
                map.get(value).push(row);
            });
        });

        return [...map.entries()].map(([value, groupRows]) => ({
            value,
            rows: groupRows,
            label: groupBy.label ? groupBy.label(value, groupRows) : value,
            meta: groupBy.meta ? groupBy.meta(value, groupRows) : ''
        }));
    }

    /**
     * Crea la fila de encabezado de un grupo.
     * @param {Object} group - Grupo a representar.
     * @param {number} colspan - Cantidad de columnas a cubrir.
     * @returns {HTMLElement} Fila generada.
     */
    function createGroupHeaderRow(group, colspan) {
        const tr = createElement('tr', 'vault-group-row');
        const td = createElement('td');
        td.colSpan = colspan;

        const wrapper = createElement('div', 'vault-group-header');
        wrapper.appendChild(createElement('span', 'vault-group-title', group.label));
        if (group.meta) {
            wrapper.appendChild(createElement('span', 'vault-group-meta', group.meta));
        }

        td.appendChild(wrapper);
        tr.appendChild(td);
        return tr;
    }

    function createRow(row, columns, options, groupValue) {
        const tr = createElement('tr');
        if (options.onRowClick) {
            tr.style.cursor = 'pointer';
            tr.addEventListener('click', (e) => {
                if (!e.target.closest('button')) options.onRowClick(row, groupValue);
            });
        }

        const ctx = { group: groupValue };

        columns.forEach(column => {
            const td = createElement('td');
            const value = getCellValue(row, column, ctx);
            if (value instanceof HTMLElement) {
                td.appendChild(value);
            } else if (column.html) {
                // Se sanitiza antes de insertar: el HTML nunca se asigna
                // directamente a innerHTML (evita inyeccion de codigo).
                td.appendChild(sanitizeHtml(value));
            } else {
                td.textContent = formatValue(value);
            }
            tr.appendChild(td);
        });

        if (options.actions && options.actions.length > 0) {
            tr.appendChild(createActionButtons(options.actions, row));
        }

        return tr;
    }

    function renderTable(containerId, columns, data, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Guardar las referencias POR CONTENEDOR. Si fueran globales, al tener
        // varias tablas montadas (panel admin) los handlers de una tabla
        // redibujarian otra distinta con los datos de la ultima renderizada.
        tableStates[containerId] = { columns, data, options };

        // Orden por defecto: se aplica solo si el usuario todavia no ordeno
        // manualmente, de modo que el indicador del encabezado quede visible.
        if (options.defaultSort && !sortStates[containerId]) {
            const defaultColumn = columns.find(c => c.key === options.defaultSort.key);
            if (defaultColumn) {
                sortStates[containerId] = { key: options.defaultSort.key, dir: options.defaultSort.dir || 'asc' };
            }
        }

        const prevInput = container.querySelector('input[data-search-input]');
        const wasFocused = document.activeElement === prevInput;
        const caretPos = wasFocused ? prevInput.selectionStart : null;

        container.replaceChildren();

        if (options.infoLine) {
            const info = createElement('div', 'w3-small w3-text-grey w3-margin-bottom');
            info.textContent = options.infoLine(data);
            container.appendChild(info);
        }

        if (options.showSearch !== false) {
            const { searchWrapper, input } = createSearchBar(containerId, columns, data, options);
            container.appendChild(searchWrapper);
            requestAnimationFrame(() => restoreFocus(input, wasFocused, caretPos));
        }

        if (!data || data.length === 0) {
            const emptyMsg = createElement('div', 'w3-container w3-padding w3-center w3-text-grey');
            emptyMsg.textContent = options.emptyMessage || 'No hay datos para mostrar';
            container.appendChild(emptyMsg);
            return;
        }

        if (options.showFilters !== false) {
            const filterBar = options.filterStyle === 'chips'
                ? createChipFilterBar(containerId, columns, data, options)
                : createFilterBar(containerId, columns, data);
            if (filterBar) container.appendChild(filterBar);
        }

        const searchTerm = (searchStates[containerId] || '').trim().toLowerCase();
        const filters = filterStates[containerId] || {};

        let filteredData = applyFilters(data, columns, searchTerm, filters);

        if (filteredData.length === 0) {
            const emptyMsg = createElement('div', 'w3-container w3-padding w3-center w3-text-grey');
            emptyMsg.textContent = 'Sin resultados para la búsqueda o filtros aplicados.';
            container.appendChild(emptyMsg);
            return;
        }

        const sortState = sortStates[containerId];
        if (sortState) {
            const column = columns.find(c => c.key === sortState.key);
            if (column) {
                const dirFactor = sortState.dir === 'asc' ? 1 : -1;
                filteredData = [...filteredData].sort((a, b) =>
                    compareValues(getSortValue(a, column), getSortValue(b, column)) * dirFactor
                );
            }
        }

        // Agrupacion: si esta activa, la paginacion cuenta grupos (clases).
        const groups = options.groupBy ? buildGroups(filteredData, options.groupBy) : null;

        const pageState = getPageState(containerId, options);
        const unit = groups ? 'grupos' : 'filas';
        const totalItems = groups ? groups.length : filteredData.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageState.size));
        if (pageState.page > totalPages) pageState.page = totalPages;
        if (pageState.page < 1) pageState.page = 1;
        const startIndex = (pageState.page - 1) * pageState.size;

        const pageGroups = groups ? groups.slice(startIndex, startIndex + pageState.size) : null;
        const pageRows = groups ? null : filteredData.slice(startIndex, startIndex + pageState.size);

        const wrapper = createElement('div');
        wrapper.className = 'w3-responsive';

        const table = createElement('table', 'w3-table w3-striped w3-bordered w3-hoverable vault-card');

        const thead = createElement('thead');
        const headerRow = createElement('tr', 'w3-dark-grey');

        columns.forEach(column => {
            headerRow.appendChild(createSortableHeader(column, containerId, options));
        });

        if (options.actions && options.actions.length > 0) {
            const actionsTh = createElement('th', '', 'Acciones');
            actionsTh.dataset.actionsColumn = 'true';
            headerRow.appendChild(actionsTh);
        }

        thead.appendChild(headerRow);

        const tbody = createElement('tbody');
        const colspan = columns.length + (options.actions && options.actions.length > 0 ? 1 : 0);

        if (pageGroups) {
            pageGroups.forEach(group => {
                tbody.appendChild(createGroupHeaderRow(group, colspan));
                group.rows.forEach(row => tbody.appendChild(createRow(row, columns, options, group.value)));
            });
        } else {
            pageRows.forEach(row => tbody.appendChild(createRow(row, columns, options, null)));
        }

        table.appendChild(thead);
        table.appendChild(tbody);
        wrapper.appendChild(table);
        container.appendChild(wrapper);

        if (options.showPagination !== false && totalItems > pageState.size) {
            container.appendChild(createPaginationBar(containerId, totalItems, pageState.page, totalPages, pageState.size, unit));
        }
    }

    return {
        render: renderTable,
        escapeHtml,
        sanitizeHtml
    };
})();
