#!/usr/bin/env node
/**
 * Restablece la contraseña de un usuario de Gestor de Ventas.
 *
 * Uso:
 *   node scripts/reset-password.js [usuario] [nuevaContraseña]
 *
 * Ejemplos:
 *   node scripts/reset-password.js
 *   node scripts/reset-password.js administrador MiClaveNueva123
 *
 * Si no se indica contraseña, se genera una aleatoria y se muestra por pantalla.
 * IMPORTANTE: cerrar la aplicación antes de ejecutar este script.
 *
 * Para usar una base distinta (por ejemplo una copia), definí VENTAS_DB_PATH.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('sqlite3');
const { hashPassword } = require('../src/main/lib/passwords');

const rutaDb = process.env.VENTAS_DB_PATH
    || path.join(process.env.APPDATA || '', 'registro-de-ventas', 'ventas_pro.db');

const usuario = process.argv[2] || 'administrador';
const nuevaPassword = process.argv[3] || crypto.randomBytes(8).toString('hex');

if (!rutaDb || !fs.existsSync(rutaDb)) {
    console.error('No se encontró la base de datos en: ' + (rutaDb || '(ruta vacía)'));
    process.exit(1);
}

const db = new sqlite3.Database(rutaDb, (errorApertura) => {
    if (errorApertura) {
        console.error('No se pudo abrir la base de datos: ' + errorApertura.message);
        process.exit(1);
    }

    db.run(
        'UPDATE Usuario SET password = ? WHERE username = ?',
        [hashPassword(nuevaPassword), usuario],
        function (error) {
            if (error) {
                console.error('No se pudo actualizar la contraseña: ' + error.message);
                db.close();
                process.exit(1);
            }

            if (this.changes === 0) {
                console.error(`No existe el usuario "${usuario}" en la base de datos.`);
                db.close();
                process.exit(1);
            }

            console.log(`Contraseña actualizada para el usuario "${usuario}".`);
            console.log(`Nueva contraseña: ${nuevaPassword}`);
            db.close();
        }
    );
});
