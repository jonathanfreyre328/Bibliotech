/**
 *    Project     : Bibliotech
 *    Author      : Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 *    License     : http://www.gnu.org/licenses/gpl.txt  GNU GPL 3.0
 *    Date        : Octubre 2026
 */

/**
 * Utilidades de formato de fechas.
 *
 * La BD guarda los `created_at` como TIMESTAMP; el driver (mysql2) los devuelve
 * como objetos Date, pero el formateador tolera tambien el texto
 * 'YYYY-MM-DD HH:MM:SS' por si el driver llegara a devolverlo como string.
 *
 * Se expone como `DateHelper` (namespace propio) para centralizar el formato
 * de fechas y evitar helpers duplicados entre los front controllers.
 */
const DateHelper = (function() {
    /**
     * @brief Convierte un valor de la BD en un objeto Date.
     * @param {Date|string|number} value - Valor a convertir.
     * @returns {Date|null} Fecha valida o null.
     */
    function toDate(value) {
        if (value === null || value === undefined || value === '') return null;
        if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
        if (typeof value === 'number') {
            const fromNumber = new Date(value);
            return isNaN(fromNumber.getTime()) ? null : fromNumber;
        }
        // 'YYYY-MM-DD HH:MM:SS' -> 'YYYY-MM-DDTHH:MM:SS' (hora local, sin zona).
        const parsed = new Date(String(value).trim().replace(' ', 'T'));
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    /**
     * @brief Agrega ceros a la izquierda.
     * @param {number} number - Numero a formatear.
     * @returns {string} Texto con dos digitos.
     */
    function pad(number) {
        return String(number).padStart(2, '0');
    }

    /**
     * @brief Formatea una fecha como dd/mm/aaaa.
     * @param {Date|string|number} value - Valor a formatear.
     * @returns {string} Fecha legible o '-'.
     */
    function formatDate(value) {
        const date = toDate(value);
        if (!date) return '-';
        return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
    }

    /**
     * @brief Formatea una fecha con hora como dd/mm/aaaa · HH:MM.
     * @param {Date|string|number} value - Valor a formatear.
     * @returns {string} Fecha y hora legibles o '-'.
     */
    function formatDateTime(value) {
        const date = toDate(value);
        if (!date) return '-';
        return `${formatDate(date)} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    /**
     * @brief Formatea una fecha como tiempo relativo ("hace 2 dias").
     * @param {Date|string|number} value - Valor a formatear.
     * @returns {string} Texto relativo o '-'.
     */
    function formatRelative(value) {
        const date = toDate(value);
        if (!date) return '-';

        const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
        if (minutes < 1) return 'recién';
        if (minutes < 60) return `hace ${minutes} min`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `hace ${hours} h`;

        const days = Math.floor(hours / 24);
        if (days === 1) return 'ayer';
        if (days < 30) return `hace ${days} días`;

        const months = Math.floor(days / 30);
        if (months < 12) return months === 1 ? 'hace 1 mes' : `hace ${months} meses`;

        const years = Math.floor(days / 365);
        return years === 1 ? 'hace 1 año' : `hace ${years} años`;
    }

    /**
     * @brief Devuelve el timestamp en milisegundos (para ordenar por fecha).
     * @param {Date|string|number} value - Valor a convertir.
     * @returns {number} Milisegundos desde epoch (0 si no hay fecha).
     */
    function timestamp(value) {
        const date = toDate(value);
        return date ? date.getTime() : 0;
    }

    return {
        toDate,
        formatDate,
        formatDateTime,
        formatRelative,
        timestamp
    };
})();

if (typeof window !== 'undefined') {
    window.DateHelper = DateHelper;
}
