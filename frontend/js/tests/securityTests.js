/**
 * Pruebas de seguridad del frontend.
 *
 * Verifican que el motor de tablas (Table) sanitiza el HTML de las columnas
 * marcadas con `html: true` antes de insertarlo en el DOM, de modo que un
 * dato controlado por el usuario no pueda inyectar markup ni scripts.
 */

/**
 * @brief Indica si el fragmento sanitizado contiene un elemento no permitido.
 * @param {DocumentFragment} fragment - Fragmento ya sanitizado.
 * @param {string} selector - Selector a buscar.
 * @returns {boolean} true si se encontro el selector.
 */
function contiene(fragment, selector) {
    const temp = document.createElement('div');
    temp.appendChild(fragment.cloneNode(true));
    return temp.querySelector(selector) !== null;
}

/**
 * @brief Devuelve el texto plano del fragmento sanitizado.
 * @param {DocumentFragment} fragment - Fragmento ya sanitizado.
 * @returns {string} Texto renderizado.
 */
function textoDe(fragment) {
    const temp = document.createElement('div');
    temp.appendChild(fragment.cloneNode(true));
    return temp.textContent;
}

// 1. escapeHtml escapa los caracteres especiales
testUtils.createTestButton("Test escapeHtml escapa caracteres especiales", async (btn) => {
    const resultado = Table.escapeHtml('<script>alert(1)</script>');
    testUtils.log({ resultado });

    if (!resultado.includes('<') && resultado.includes('&lt;script&gt;')) {
        testUtils.setSuccess(btn);
    }
});

// 2. El sanitizador elimina las etiquetas <script>
testUtils.createTestButton("Test sanitizar elimina <script>", async (btn) => {
    const fragment = Table.sanitizeHtml('<script>alert(1)</script>');
    testUtils.log({ texto: textoDe(fragment) });

    if (!contiene(fragment, 'script')) {
        testUtils.setSuccess(btn);
    }
});

// 3. El sanitizador elimina los manejadores de evento (onerror / onclick)
testUtils.createTestButton("Test sanitizar elimina atributos on*", async (btn) => {
    const fragment = Table.sanitizeHtml('<span class="w3-tag" onerror="alert(1)" onclick="alert(2)">X</span>');
    const temp = document.createElement('div');
    temp.appendChild(fragment.cloneNode(true));
    const span = temp.querySelector('span');
    testUtils.log({ atributos: span ? Array.from(span.attributes).map(a => a.name) : [] });

    if (span && !span.hasAttribute('onerror') && !span.hasAttribute('onclick')) {
        testUtils.setSuccess(btn);
    }
});

// 4. El sanitizador conserva las etiquetas y clases permitidas (no rompe el diseño)
testUtils.createTestButton("Test sanitizar conserva span con clase w3-*", async (btn) => {
    const fragment = Table.sanitizeHtml('<span class="w3-tag w3-green">Activo</span>');
    const temp = document.createElement('div');
    temp.appendChild(fragment.cloneNode(true));
    const span = temp.querySelector('span');
    testUtils.log({ clase: span ? span.className : null, texto: textoDe(fragment) });

    if (span && span.className === 'w3-tag w3-green' && textoDe(fragment) === 'Activo') {
        testUtils.setSuccess(btn);
    }
});

// 5. El sanitizador descarta clases que no son del framework (w3-*)
testUtils.createTestButton("Test sanitizar descarta clases no permitidas", async (btn) => {
    const fragment = Table.sanitizeHtml('<span class="w3-tag evil-class">X</span>');
    const temp = document.createElement('div');
    temp.appendChild(fragment.cloneNode(true));
    const span = temp.querySelector('span');
    testUtils.log({ clase: span ? span.className : null });

    if (span && span.className === 'w3-tag') {
        testUtils.setSuccess(btn);
    }
});

// 6. El sanitizador envuelve las etiquetas no permitidas conservando su texto
testUtils.createTestButton("Test sanitizar desenvuelve etiquetas no permitidas", async (btn) => {
    const fragment = Table.sanitizeHtml('<marquee>texto</marquee>');
    testUtils.log({ texto: textoDe(fragment) });

    if (!contiene(fragment, 'marquee') && textoDe(fragment) === 'texto') {
        testUtils.setSuccess(btn);
    }
});

// 7. Prueba de integracion: una celda con html:true no inyecta scripts
testUtils.createTestButton("Test celda con html:true no inyecta markup", async (btn) => {
    const contenedor = document.createElement('div');
    contenedor.id = 'xssTestTable';
    document.body.appendChild(contenedor);

    try {
        const datos = [{
            titulo: '<img src=x onerror="window.__xss = true">',
            estado: '<span class="w3-tag w3-green">Activo</span>'
        }];
        const columnas = [
            { key: 'titulo', label: 'Titulo', html: true },
            { key: 'estado', label: 'Estado', html: true }
        ];

        Table.render('xssTestTable', columnas, datos);

        const celdas = contenedor.querySelectorAll('td');
        const html = contenedor.innerHTML;
        testUtils.log({ celdas: celdas.length, html });

        const limpio = !html.includes('<img') && !html.includes('onerror') && window.__xss !== true;
        if (celdas.length === 2 && limpio) {
            testUtils.setSuccess(btn);
        }
    } catch (err) {
        testUtils.log('Error de ejecución: ' + err.message, true);
    } finally {
        contenedor.remove();
    }
});
