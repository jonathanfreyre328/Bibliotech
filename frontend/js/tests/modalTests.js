/**
 * @file tests/modalTests.js
 * @brief Pruebas del componente Modal: buscador de selects, placeholder,
 *        validacion de required, preseleccion y envio de selects multiples.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

/**
 * @brief Abre un modal de prueba con un select de alumnos buscable.
 * @returns {{select: HTMLSelectElement, buscador: HTMLInputElement, contador: HTMLElement}}
 *          Referencias a los controles generados.
 */
function abrirModalDeAlumnos() {
    Modal.form(
        'Prueba de buscador',
        [
            {
                name: 'alumno',
                label: 'Alumno',
                type: 'select',
                required: true,
                searchable: true,
                placeholder: 'Seleccioná un alumno',
                options: [
                    { value: '1', label: 'Gómez, Ana (agomez)' },
                    { value: '2', label: 'Pérez, Juan (jperez)' },
                    { value: '3', label: 'Gutiérrez, Luis (lgutierrez)' }
                ]
            }
        ],
        () => { },
        'Aceptar'
    );

    return {
        select: document.getElementById('alumno'),
        buscador: document.getElementById('alumnoSearch'),
        contador: document.getElementById('alumnoCounter')
    };
}

/**
 * @brief Escribe en el buscador y dispara el evento que filtra.
 * @param {HTMLInputElement} buscador - Input de busqueda.
 * @param {string} texto - Texto a escribir.
 */
function escribirEnBuscador(buscador, texto) {
    buscador.value = texto;
    buscador.dispatchEvent(new Event('input'));
}

/**
 * @brief Devuelve las etiquetas visibles del select.
 * @param {HTMLSelectElement} select - Select a inspeccionar.
 * @returns {string[]} Textos de las opciones.
 */
function etiquetasDeOpciones(select) {
    return Array.from(select.options).map(option => option.textContent);
}

// 1. El buscador filtra las opciones ignorando mayusculas y acentos.
testUtils.createTestButton('Test Modal: buscador filtra y normaliza acentos', async (btn) => {
    Modal.closeAll();
    const { select, buscador } = abrirModalDeAlumnos();

    escribirEnBuscador(buscador, 'PEREZ');
    const etiquetas = etiquetasDeOpciones(select);
    testUtils.log({ buscado: 'PEREZ', opciones: etiquetas });

    const ok = etiquetas.length === 2
        && etiquetas[0] === 'Seleccioná un alumno'
        && etiquetas[1] === 'Pérez, Juan (jperez)';

    if (ok) testUtils.setSuccess(btn);
    else testUtils.log('Se esperaba el placeholder y solo la opcion de Pérez.', true);

    Modal.closeAll();
});

// 2. El contador informa cuantas opciones quedan visibles.
testUtils.createTestButton('Test Modal: contador de coincidencias', async (btn) => {
    Modal.closeAll();
    const { buscador, contador } = abrirModalDeAlumnos();

    const inicial = contador.textContent;
    escribirEnBuscador(buscador, 'gomez');
    const filtrado = contador.textContent;
    testUtils.log({ inicial, filtrado });

    if (inicial === 'Mostrando 3 de 3' && filtrado === 'Mostrando 1 de 3') {
        testUtils.setSuccess(btn);
    }

    Modal.closeAll();
});

// 3. La seleccion se conserva si sigue visible y se limpia si el filtro la oculta.
testUtils.createTestButton('Test Modal: conserva o limpia la seleccion al filtrar', async (btn) => {
    Modal.closeAll();
    const { select, buscador } = abrirModalDeAlumnos();

    select.value = '1'; // Gómez
    escribirEnBuscador(buscador, 'gomez');
    const conservada = select.value;

    escribirEnBuscador(buscador, 'perez');
    const limpiada = select.value;

    testUtils.log({ conservada, limpiada });

    if (conservada === '1' && limpiada === '') testUtils.setSuccess(btn);

    Modal.closeAll();
});

// 4. El placeholder deja el select vacio y required lo marca invalido hasta elegir.
testUtils.createTestButton('Test Modal: placeholder + validacion required', async (btn) => {
    Modal.closeAll();
    const { select } = abrirModalDeAlumnos();

    const vacio = select.value;
    const invalidoSinElegir = select.checkValidity() === false;

    select.value = '2';
    const validoConSeleccion = select.checkValidity() === true;

    testUtils.log({ vacio, invalidoSinElegir, validoConSeleccion });

    if (vacio === '' && invalidoSinElegir && validoConSeleccion) testUtils.setSuccess(btn);

    Modal.closeAll();
});

// 5. Un select multiple preselecciona las opciones indicadas (lista separada por comas).
testUtils.createTestButton('Test Modal: preseleccion de select multiple', async (btn) => {
    Modal.closeAll();
    Modal.form(
        'Prueba multiple',
        [
            {
                name: 'clases',
                label: 'Clases',
                type: 'select',
                multiple: true,
                options: [
                    { value: '1', label: 'Clase 1' },
                    { value: '2', label: 'Clase 2' },
                    { value: '3', label: 'Clase 3' }
                ],
                value: '1,3'
            }
        ],
        () => { },
        'Aceptar'
    );

    const seleccionadas = Array.from(document.getElementById('clases').selectedOptions).map(option => option.value);
    testUtils.log({ seleccionadas });

    if (seleccionadas.length === 2 && seleccionadas.includes('1') && seleccionadas.includes('3')) {
        testUtils.setSuccess(btn);
    }

    Modal.closeAll();
});

// 6. Un filtro sin coincidencias muestra una opcion deshabilitada.
testUtils.createTestButton('Test Modal: aviso de sin coincidencias', async (btn) => {
    Modal.closeAll();
    const { select, buscador } = abrirModalDeAlumnos();

    escribirEnBuscador(buscador, 'zzzz');
    const etiquetas = etiquetasDeOpciones(select);
    const aviso = select.options[select.options.length - 1];

    testUtils.log({ opciones: etiquetas, deshabilitada: aviso.disabled });

    if (etiquetas.includes('Sin coincidencias') && aviso.disabled) testUtils.setSuccess(btn);

    Modal.closeAll();
});

// 7. Al enviar un select multiple se conservan TODOS los valores elegidos.
testUtils.createTestButton('Test Modal: envia todos los valores de un select multiple', async (btn) => {
    Modal.closeAll();
    let enviado = null;

    Modal.form(
        'Prueba multiple',
        [
            {
                name: 'clases',
                label: 'Clases',
                type: 'select',
                multiple: true,
                required: true,
                options: [
                    { value: '1', label: 'Clase 1' },
                    { value: '2', label: 'Clase 2' },
                    { value: '3', label: 'Clase 3' }
                ],
                value: '1,3'
            }
        ],
        (data) => { enviado = data; },
        'Aceptar'
    );

    const boton = Array.from(document.querySelectorAll('.w3-modal button'))
        .find(elemento => elemento.textContent === 'Aceptar');
    if (boton) boton.click();

    testUtils.log({ enviado: enviado && enviado.clases });

    if (enviado && enviado.clases === '1,3') testUtils.setSuccess(btn);
    else testUtils.log('Se esperaba "1,3" y se recibio otro valor.', true);

    Modal.closeAll();
});
