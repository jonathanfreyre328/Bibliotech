/**
 * @file utils/dbutils/db_setup.js
 * @brief Bootstrap de la base de datos desde init.sql usando las credenciales root.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

/**
 * Script de inicialización automatizada (Bootstrap) de la base de datos.
 *
 * Lee `backend/config/init.sql` y lo ejecuta de forma nativa contra el motor
 * MariaDB/MySQL, sin depender de una herramienta gráfica (phpMyAdmin,
 * MySQL Workbench) ni de copiar y pegar a mano.
 *
 * El script `init.sql` contiene un `DROP DATABASE IF EXISTS bibliotech`,
 * por lo que la operación es DESTRUCTIVA: se pide confirmación explícita
 * antes de ejecutarla (o se pasa el flag `--force` en modo no interactivo).
 *
 * Uso:
 *   node utils/dbutils/db_setup.js           -> pide confirmación interactiva
 *   node utils/dbutils/db_setup.js --force   -> no pide confirmación
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { header, describeError, rootConnectionConfig } = require('./cliUtils');

const DB_NAME = process.env.DB_NAME || 'bibliotech';
const ROOT_CONFIG = rootConnectionConfig();

/**
 * @brief Solicita una confirmación por consola.
 * @param {string} question - Texto de la pregunta.
 * @returns {Promise<boolean>} true si el usuario confirma.
 */
function confirm(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(/^s(i)?$/i.test(answer.trim()));
        });
    });
}

/**
 * @brief Ejecuta el script de inicialización completo.
 */
async function run() {
    header('⚡ Inicializando la base de datos de Bibliotech');

    const sqlPath = path.join(__dirname, '..', '..', 'config', 'init.sql');

    if (!fs.existsSync(sqlPath)) {
        console.error(`❌ No se encontró el script de inicialización en: ${sqlPath}`);
        process.exit(1);
    }

    console.log(`📂 Script: ${sqlPath}`);
    console.log(`🗄️  Base de datos: ${DB_NAME} (host: ${ROOT_CONFIG.host})`);
    console.log(`⚠️  ATENCIÓN: la inicialización BORRA la base "${DB_NAME}" si ya existe.`);

    const force = process.argv.includes('--force');
    if (!force) {
        const ok = await confirm(`¿Continuar con la inicialización? (s/N): `);
        if (!ok) {
            console.log('Operación cancelada. No se modificó la base de datos.');
            return;
        }
    }

    let connection;
    try {
        // Conexión como root: hace falta para crear la base y otorgar permisos
        // al usuario dedicado de la aplicación.
        connection = await mysql.createConnection({
            ...ROOT_CONFIG,
            multipleStatements: true
        });
        console.log('✅ Conexión como root establecida.');

        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        await connection.query(sqlContent);

        console.log(`✅ Base de datos "${DB_NAME}" creada y configurada exitosamente.`);
        console.log('✅ Usuario de aplicación con permisos reducidos configurado.');
        console.log('');
        console.log('Usuarios de prueba: admin / profesor / alumno  (contraseña: 12345)');
    } catch (error) {
        console.error('❌ Error al configurar la base de datos:');
        console.error(`   ${describeError(error)}`);
        console.log('');
        console.log('👉 Verificá que el servicio de MariaDB/MySQL esté activo y que las');
        console.log('   credenciales de root sean correctas. Como alternativa podés');
        console.log('   importar el archivo backend/config/init.sql desde phpMyAdmin.');
        process.exitCode = 1;
    } finally {
        if (connection) await connection.end();
    }
}

run();
