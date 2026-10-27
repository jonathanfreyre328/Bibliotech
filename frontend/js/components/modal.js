const Modal = (function() {
    let modalContainer = null;

    function ensureModalContainer() {
        if (modalContainer) return modalContainer;
        modalContainer = document.createElement('div');
        modalContainer.id = 'modalContainer';
        modalContainer.style.position = 'fixed';
        modalContainer.style.top = '0';
        modalContainer.style.left = '0';
        modalContainer.style.width = '100%';
        modalContainer.style.height = '100%';
        modalContainer.style.zIndex = '10000';
        modalContainer.style.pointerEvents = 'none';
        document.body.appendChild(modalContainer);
        return modalContainer;
    }

    function createModalElement(title, bodyContent, footerContent, size = '400px') {
        const modal = document.createElement('div');
        modal.className = 'w3-modal';
        modal.style.pointerEvents = 'auto';
        modal.style.display = 'block';

        const content = document.createElement('div');
        content.className = 'w3-modal-content w3-card-4 w3-animate-zoom vault-card';
        content.style.maxWidth = size;
        content.style.width = '90%';
        content.style.pointerEvents = 'auto';

        const header = document.createElement('header');
        header.className = 'w3-container w3-border-bottom w3-dark-grey';

        const titleElem = document.createElement('h3');
        titleElem.textContent = title;
        header.appendChild(titleElem);

        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'w3-container w3-padding';
        bodyDiv.appendChild(bodyContent);

        const footer = document.createElement('div');
        footer.className = 'w3-container w3-border-top w3-dark-grey w3-padding';
        footer.style.display = 'flex';
        footer.style.justifyContent = 'flex-end';
        footer.style.gap = '8px';
        footer.appendChild(footerContent);

        content.appendChild(header);
        content.appendChild(bodyDiv);
        content.appendChild(footer);
        modal.appendChild(content);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });

        return modal;
    }

    function closeModal(modal) {
        modal.style.display = 'none';
        modal.remove();
    }

    function createButton(text, className, onClick, disabled = false) {
        const btn = document.createElement('button');
        btn.className = `w3-button ${className}`;
        btn.textContent = text;
        btn.disabled = disabled;
        btn.addEventListener('click', onClick);
        return btn;
    }

    /**
     * @brief Normaliza texto para busquedas: minusculas y sin acentos.
     * @details Permite que "Perez" encuentre a "Pérez" y que "GOMEZ"
     * encuentre a "Gómez".
     * @param {*} valor - Texto a normalizar.
     * @returns {string} Texto normalizado.
     */
    function normalizarTexto(valor) {
        return String(valor === null || valor === undefined ? '' : valor)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    /**
     * @brief Crea una opcion de select.
     * @param {*} value - Valor de la opcion.
     * @param {string} label - Texto visible.
     * @returns {HTMLOptionElement} Opcion creada.
     */
    function crearOpcion(value, label) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        return option;
    }

    return {
        confirm(title, message, onConfirm, confirmText = 'Confirmar', cancelText = 'Cancelar', confirmClass = 'w3-red') {
            const container = ensureModalContainer();
            const body = document.createElement('p');
            body.textContent = message;

            const footer = document.createDocumentFragment();
            footer.appendChild(createButton(cancelText, 'w3-button w3-grey', () => closeModal(modal)));
            footer.appendChild(createButton(confirmText, confirmClass, () => {
                closeModal(modal);
                onConfirm();
            }));

            const modal = createModalElement(title, body, footer);
            container.appendChild(modal);
        },

        form(title, fields, onSubmit, submitText = 'Guardar', size = '600px') {
            const container = ensureModalContainer();
            const form = document.createElement('form');
            form.className = 'w3-container';

            fields.forEach(field => {
                const wrapper = document.createElement('div');
                wrapper.className = 'w3-margin-bottom';

                const label = document.createElement('label');
                label.textContent = field.label;
                label.className = 'w3-text-white';
                wrapper.appendChild(label);

                let input;
                let buscador = null;
                let contador = null;

                if (field.type === 'select') {
                    input = document.createElement('select');
                    input.className = 'w3-select w3-border w3-round w3-black w3-text-white';
                    if (field.multiple) input.multiple = true;

                    const opciones = field.options || [];
                    // En un select, `field.placeholder` define una opcion vacia
                    // ("Seleccioná un alumno"): evita que la primera opcion quede
                    // elegida por accidente.
                    const hayPlaceholder = typeof field.placeholder === 'string'
                        && field.placeholder !== ''
                        && !field.multiple;

                    /**
                     * Reconstruye las opciones visibles segun el filtro.
                     * @param {string} filtro - Texto a buscar en las etiquetas.
                     * @returns {number} Cantidad de coincidencias.
                     */
                    const llenarOpciones = (filtro) => {
                        const seleccionPrevia = input.multiple ? '' : input.value;
                        const texto = normalizarTexto(filtro);
                        const visibles = opciones.filter(option => normalizarTexto(option.label).includes(texto));

                        input.replaceChildren();
                        if (hayPlaceholder) input.appendChild(crearOpcion('', field.placeholder));
                        visibles.forEach(option => input.appendChild(crearOpcion(option.value, option.label)));
                        // Solo se avisa "sin coincidencias" cuando hay un filtro
                        // escrito: un select que aun no tiene opciones (se
                        // completa por onChange) debe quedar vacio.
                        if (visibles.length === 0 && texto !== '') {
                            const sinResultados = crearOpcion('', 'Sin coincidencias');
                            sinResultados.disabled = true;
                            input.appendChild(sinResultados);
                        }

                        // La seleccion se conserva mientras siga entre los resultados;
                        // si el filtro la deja afuera, se vuelve al placeholder.
                        if (seleccionPrevia !== '' && visibles.some(option => String(option.value) === seleccionPrevia)) {
                            input.value = seleccionPrevia;
                        } else if (hayPlaceholder) {
                            input.value = '';
                        } else if (visibles.length > 0 && !input.multiple) {
                            input.value = String(visibles[0].value);
                        }

                        return visibles.length;
                    };

                    if (field.searchable && !field.multiple) {
                        buscador = document.createElement('input');
                        buscador.type = 'search';
                        buscador.className = 'w3-input w3-border w3-round w3-black w3-text-white w3-margin-bottom';
                        buscador.placeholder = field.searchPlaceholder || 'Buscar...';
                        buscador.id = `${field.name}Search`;
                        buscador.setAttribute('aria-label', `Buscar ${field.label || field.name}`);

                        contador = document.createElement('small');
                        contador.className = 'w3-text-grey';
                        contador.id = `${field.name}Counter`;

                        const coincidencias = llenarOpciones('');
                        contador.textContent = `Mostrando ${coincidencias} de ${opciones.length}`;

                        buscador.addEventListener('input', () => {
                            const visibles = llenarOpciones(buscador.value);
                            contador.textContent = `Mostrando ${visibles} de ${opciones.length}`;
                        });
                    } else {
                        llenarOpciones('');
                    }
                } else if (field.type === 'textarea') {
                    input = document.createElement('textarea');
                    input.className = 'w3-input w3-border w3-round w3-black w3-text-white';
                    input.rows = field.rows || 4;
                } else {
                    input = document.createElement('input');
                    input.type = field.type || 'text';
                    input.className = 'w3-input w3-border w3-round w3-black w3-text-white';
                }

                input.name = field.name;
                input.id = field.name;
                if (field.required) input.required = true;
                if (field.disabled) input.disabled = true;
                if (field.placeholder && field.type !== 'select') input.placeholder = field.placeholder;
                if (field.value !== undefined) {
                    if (field.type === 'select' && field.multiple) {
                        // En un multiple, asignar `input.value = '1,2'` no marca
                        // nada: hay que seleccionar cada opcion por su valor.
                        const seleccionados = String(field.value).split(',').map(valor => valor.trim());
                        Array.from(input.options).forEach(option => {
                            option.selected = seleccionados.includes(option.value);
                        });
                    } else {
                        input.value = field.value;
                    }
                }
                if (field.min !== undefined) input.min = field.min;
                if (field.max !== undefined) input.max = field.max;
                if (field.maxlength !== undefined && input.tagName === 'INPUT') input.maxLength = field.maxlength;
                if (field.autocomplete && input.tagName === 'INPUT') input.autocomplete = field.autocomplete;
                if (field.onChange) input.addEventListener('change', () => field.onChange(input.value));

                if (buscador) wrapper.appendChild(buscador);
                wrapper.appendChild(input);
                if (contador) wrapper.appendChild(contador);
                form.appendChild(wrapper);
            });

            /**
             * Valida y envia el formulario.
             * @note El boton de envio vive en el footer, FUERA del <form>, asi
             * que el navegador nunca dispara la validacion nativa: se fuerza
             * con reportValidity(). Sin esto, `required` era decorativo y un
             * select vacio enviaba NaN.
             */
            const enviar = () => {
                if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;
                const formData = new FormData(form);
                // `Object.fromEntries` descarta todos los valores menos el ultimo
                // cuando un select es multiple. Se acumulan separados por coma
                // para que los consumidores (por ejemplo `classIds`) reciban la
                // seleccion completa.
                const data = {};
                formData.forEach((value, key) => {
                    data[key] = Object.prototype.hasOwnProperty.call(data, key)
                        ? `${data[key]},${value}`
                        : value;
                });
                closeModal(modal);
                onSubmit(data);
            };

            // Enter dentro de un campo dispara el submit implicito: se captura
            // para que use la misma logica y no recargue la pagina.
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                enviar();
            });

            const footer = document.createDocumentFragment();
            footer.appendChild(createButton('Cancelar', 'w3-button w3-grey', () => closeModal(modal)));
            footer.appendChild(createButton(submitText, 'w3-button w3-yellow', (e) => {
                e.preventDefault();
                enviar();
            }));

            const modal = createModalElement(title, form, footer, size);
            container.appendChild(modal);
        },

        closeAll() {
            if (modalContainer) {
                modalContainer.querySelectorAll('.w3-modal').forEach(m => m.remove());
            }
        }
    };
})();