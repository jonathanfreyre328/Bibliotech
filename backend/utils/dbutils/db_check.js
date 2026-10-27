/**
 * @file utils/dbutils/db_check.js
 * @brief Diagnostico CLI de la base de datos: conexion, tablas y usuarios.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

/**
 * Script CLI de diagnóstico de la base de datos.
 *
 * Ejecuta una batería de pruebas progresivas para detectar rápidamente
 * dónde está el problema de conexión: variables de entorno, servicio
 * levantado, existencia de la base y de las tablas.
 *
 * Uso: node utils/dbutils/db_check.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const { header, describeError, rootConnectionConfig } = require('./cliUtils');

/**
 * @brief Ejecuta el diagnóstico completo de conectividad.
 */
async function test() {
    header('🔍 DIAGNÓSTICO DE BASE DE DATOS');

    console.log('Configuración del .env:');
    console.log(`- HOST: ${process.env.DB_HOST}`);
    console.log(`- USER: ${process.env.DB_USER}`);
    console.log(`- PASS: ${process.env.DB_PASS ? '****' : '(vacío)'}`);
    console.log(`- NAME: ${process.env.DB_NAME}`);
    console.log('-------------------------------------------------');

    // --- 1. Prueba con las credenciales de la aplicación ---
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });
        console.log('✅ CONEXIÓN EXITOSA: la aplicación puede conectarse con el .env.');

        const [tables] = await connection.query(
            `SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
            [process.env.DB_NAME]
        );
        console.log(`🗂️  Tablas detectadas (${tables.length}): ${tables.map(t => t.name).join(', ')}`);

        const [users] = await connection.query(
            `SELECT u.username, r.name AS role, u.active
             FROM users u
             JOIN users_roles ur ON ur.user_id = u.id
             JOIN roles r ON r.id = ur.role_id
             ORDER BY u.id`
        );
        console.log(`👥 Usuarios registrados (${users.length}):`);
        users.forEach(u => console.log(`   - ${u.username} [${u.role}]${u.active ? '' : ' (inactivo)'}`));

        await connection.end();
        console.log('');
        console.log('🎉 Todo listo. Podés iniciar el servidor con: npm start');
        return;
    } catch (err) {
        console.error(`❌ ERROR con las credenciales del .env: ${describeError(err)}`);
    }

    // --- 2. Diagnóstico alternativo con las credenciales root del .env ---
    const rootConfig = rootConnectionConfig();
    console.log('');
    console.log(`Probando diagnóstico alternativo con el usuario ${rootConfig.user}...`);
    try {
        const rootConnection = await mysql.createConnection(rootConfig);
        console.log('✅ CONEXIÓN COMO ROOT EXITOSA!');

        const dbName = process.env.DB_NAME || 'bibliotech';
        const [dbRows] = await rootConnection.query('SHOW DATABASES LIKE ?', [dbName]);
        if (dbRows.length === 0) {
            console.error(`❌ La base de datos "${dbName}" NO existe.`);
            console.log('   Solución: ejecutá  npm run db:setup  (o importá backend/config/init.sql).');
        } else {
            console.log(`✅ La base de datos "${dbName}" existe.`);
            await rootConnection.query(`USE \`${dbName}\``);
            try {
                const [userRows] = await rootConnection.query('SELECT username FROM users ORDER BY id');
                console.log(`👥 Usuarios en "${dbName}": ${userRows.map(u => u.username).join(', ')}`);
            } catch (dbErr) {
                console.error(`❌ La base existe pero la tabla 'users' no está creada: ${describeError(dbErr)}`);
                console.log('   Solución: ejecutá  npm run db:setup');
            }
        }
        await rootConnection.end();
    } catch (rootErr) {
        console.error(`❌ Falló la conexión alternativa como root: ${describeError(rootErr)}`);
        console.log('');
        console.log('👉 Asegurate de que el servicio de MariaDB/MySQL esté activo:');
        console.log('   - Linux:   sudo service mariadb start');
        console.log('   - Windows: net start MariaDB   (o desde el panel de XAMPP/Laragon)');
    }
}

test();
