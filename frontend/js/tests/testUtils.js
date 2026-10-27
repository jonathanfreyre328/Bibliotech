/**
 * Utilidades para la suite de pruebas DOM
 */
 const testUtils = {
    // Referencia al contenedor de resultados
    console: document.getElementById('api-console'),

    // Función para crear botones de test dinámicamente
    createTestButton(label, testFn) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.className = "w3-button w3-block w3-section w3-round w3-grey w3-border w3-border-white w3-left-align";
        
        btn.onclick = async () => {
            btn.className = "w3-button w3-block w3-section w3-round w3-yellow"; // Estado cargando
            try {
                await testFn(btn);
            } catch (err) {
                this.log("Error de ejecución: " + err.message, true);
                btn.className = "w3-button w3-block w3-section w3-round w3-red";
            }
        };

        document.getElementById('test-container').appendChild(btn);
    },

    // Función para escribir en la consola simulada
    log(data, isError = false) {
        const entry = document.createElement('pre');
        entry.style.whiteSpace = "pre-wrap";
        entry.style.color = isError ? "#ff5555" : "#55ff55";
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${JSON.stringify(data, null, 2)}`;
        
        // Limpiar consola y agregar nuevo resultado
        while (this.console.firstChild) this.console.removeChild(this.console.firstChild);
        this.console.appendChild(entry);
    },

    setSuccess(btn) {
        btn.className = "w3-button w3-block w3-section w3-round w3-green";
    }
};