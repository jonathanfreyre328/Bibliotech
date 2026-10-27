/**
 * Pruebas del subsistema de materiales (PDFs).
 *
 * Se usan fetch directo (y no apiService) a proposito: apiService dispara un
 * logout automatico ante cualquier 401, y eso impediria verificar los tests
 * de proteccion de rutas.
 *
 * La simulacion de archivos se hace con un Blob en memoria: un objeto Blob
 * con cabecera application/pdf engaña al filtro de Multer, asi que se puede
 * automatizar la prueba de subida sin necesidad de un archivo fisico.
 */

/**
 * @brief Inicia sesion como profesor y devuelve el token JWT.
 * @returns {Promise<string>} Token de acceso.
 */
async function okLoginProfesor() {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'profesor', password: '12345' })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'No se pudo iniciar sesion como profesor.');
    return data.token;
}

/**
 * @brief Obtiene el id de la primera clase activa del profesor.
 * @param {string} token - Token JWT del profesor.
 * @returns {Promise<string>} class_id de la clase activa.
 */
async function getFirstActiveClassId(token) {
    const response = await fetch('/api/academic/classes', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'No se pudieron cargar las clases.');
    const activa = data.find((c) => c.active);
    if (!activa) throw new Error('El profesor no tiene ninguna clase activa.');
    return String(activa.class_id);
}

/**
 * @brief Construye un Blob con cabecera PDF (simulacion de archivo valido).
 * @param {string} contenido - Contenido textual del PDF simulado.
 * @returns {Blob} Blob con tipo MIME application/pdf.
 */
function pdfBlob(contenido) {
    return new Blob([contenido || '%PDF-1.4 Documento simulado para pruebas'], { type: 'application/pdf' });
}

/**
 * @brief Nombre del archivo simulado que usa el laboratorio.
 * @details Sirve para identificar (y borrar) los artefactos que dejan las
 * corridas de prueba.
 * @returns {string} Nombre del archivo de prueba.
 */
function ARCHIVO_PRUEBA() {
    return 'prueba_automatizada.pdf';
}

/**
 * @brief Indica si un material es un artefacto generado por el laboratorio.
 * @param {Object} material - Material devuelto por la API.
 * @returns {boolean} true si es un artefacto de prueba.
 */
function esArtefactoDePrueba(material) {
    if (!material) return false;
    return material.original_filename === ARCHIVO_PRUEBA()
        || material.title === 'PDF de prueba automatizada';
}

/**
 * @brief Elimina un material propio (borra fila, relaciones y archivo fisico).
 * @param {string} token - Token JWT del propietario.
 * @param {number} id - Id del material.
 * @returns {Promise<Object>} Resultado de la peticion.
 */
async function borrarMaterial(token, id) {
    const response = await fetch(`/api/materials/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
}

// 1. Listar materiales propios (ruta protegida)
testUtils.createTestButton("Test Listar Mis Materiales (Profesor)", async (btn) => {
    try {
        const token = await okLoginProfesor();
        const response = await fetch('/api/materials', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        testUtils.log(data);

        if (response.ok && Array.isArray(data)) {
            testUtils.setSuccess(btn);
        }
    } catch (err) {
        testUtils.log('Error de ejecución: ' + err.message, true);
    }
});

// 2. Subir un PDF simulado con Blob (ruta protegida + Multer + validacion)
testUtils.createTestButton("Test Subir PDF Simulado (Blob)", async (btn) => {
    const token = await okLoginProfesor();
    let materialId = null;

    try {
        const classId = await getFirstActiveClassId(token);

        const formData = new FormData();
        formData.append('title', 'PDF de prueba automatizada');
        formData.append('description', 'Archivo generado por el laboratorio de pruebas');
        formData.append('author', 'Suite de pruebas');
        formData.append('classIds', classId);
        formData.append('pdfFile', pdfBlob(), ARCHIVO_PRUEBA());

        const response = await fetch('/api/materials', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await response.json();
        materialId = data.id || null;
        testUtils.log(data);

        if (response.status === 201) {
            testUtils.setSuccess(btn);
        }
    } finally {
        // Limpieza: el material de prueba no debe quedar ni en la base ni en
        // la carpeta de subidas (el DELETE borra fila, relaciones y archivo).
        if (materialId) {
            const cleanup = await borrarMaterial(token, materialId);
            testUtils.log({ limpieza: `material ${materialId} eliminado (HTTP ${cleanup.status})` });
        }
    }
});

// 3. Rechazo de un archivo que NO es PDF (debe responder 400)
testUtils.createTestButton("Test Rechazar Archivo No-PDF (400)", async (btn) => {
    try {
        const token = await okLoginProfesor();
        const classId = await getFirstActiveClassId(token);

        const formData = new FormData();
        formData.append('title', 'Archivo que deberia ser rechazado');
        formData.append('classIds', classId);
        // Tipo MIME distinto de application/pdf: el fileFilter de Multer lo rechaza.
        formData.append('pdfFile', new Blob(['esto no es un PDF'], { type: 'text/plain' }), 'no_es_pdf.txt');

        const response = await fetch('/api/materials', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await response.json();
        testUtils.log(data);

        if (response.status === 400) {
            testUtils.setSuccess(btn);
        }
    } catch (err) {
        testUtils.log('Error de ejecución: ' + err.message, true);
    }
});

// 4. Peticion SIN token (proteccion de la ruta)
testUtils.createTestButton("Test Listar Materiales Sin Token (401/403)", async (btn) => {
    try {
        const response = await fetch('/api/materials');
        const data = await response.json();
        testUtils.log(data);

        if (response.status === 401 || response.status === 403) {
            testUtils.setSuccess(btn);
        }
    } catch (err) {
        testUtils.log('Error de ejecución: ' + err.message, true);
    }
});

// 5. Token invalido (firma invalida)
testUtils.createTestButton("Test Listar Materiales con Token Invalido (401)", async (btn) => {
    try {
        const response = await fetch('/api/materials', {
            headers: { 'Authorization': 'Bearer token.invalido.firma' }
        });
        const data = await response.json();
        testUtils.log(data);

        if (response.status === 401) {
            testUtils.setSuccess(btn);
        }
    } catch (err) {
        testUtils.log('Error de ejecución: ' + err.message, true);
    }
});

// 6. Descarga del PDF recien subido (verifica la ruta /download protegida)
testUtils.createTestButton("Test Descargar Material (ruta protegida)", async (btn) => {
    try {
        const token = await okLoginProfesor();

        // Se listan los materiales para obtener el id del primero disponible.
        const listResponse = await fetch('/api/materials', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const materiales = await listResponse.json();
        if (!listResponse.ok || !materiales.length) {
            testUtils.log('No hay materiales para descargar.', true);
            return;
        }

        // Se ignoran los artefactos del laboratorio: son PDFs simulados de
        // 40 bytes y no sirven para comprobar la descarga real.
        const material = materiales.find(m => !esArtefactoDePrueba(m)) || materiales[0];
        const id = material.id;
        const response = await fetch(`/api/materials/${id}/download`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        testUtils.log({
            material: material.title,
            status: response.status,
            contentType: response.headers.get('Content-Type'),
            tamanoBytes: (await response.blob()).size
        });

        if (response.ok) {
            testUtils.setSuccess(btn);
        }
    } catch (err) {
        testUtils.log('Error de ejecución: ' + err.message, true);
    }
});

// 7. Limpieza de los artefactos que dejaron corridas anteriores del laboratorio
testUtils.createTestButton("Test Limpiar materiales de prueba (artefactos)", async (btn) => {
    try {
        const token = await okLoginProfesor();

        const listResponse = await fetch('/api/materials', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const materiales = await listResponse.json();
        if (!listResponse.ok) {
            testUtils.log('No se pudieron listar los materiales.', true);
            return;
        }

        const artefactos = materiales.filter(esArtefactoDePrueba);
        if (artefactos.length === 0) {
            testUtils.log('No hay artefactos de prueba para limpiar.');
            testUtils.setSuccess(btn);
            return;
        }

        const resultados = [];
        for (const artefacto of artefactos) {
            const r = await borrarMaterial(token, artefacto.id);
            resultados.push({ id: artefacto.id, titulo: artefacto.title, status: r.status });
        }

        testUtils.log({ eliminados: resultados });

        if (resultados.every(r => r.status === 200)) {
            testUtils.setSuccess(btn);
        }
    } catch (err) {
        testUtils.log('Error de ejecución: ' + err.message, true);
    }
});
