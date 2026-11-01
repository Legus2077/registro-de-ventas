const sqlite3 = require('sqlite3');

const TABLAS_REQUERIDAS = {
    Ventas: ['id', 'descripcion', 'cliente', 'dni', 'monto', 'fecha'],
    Usuario: ['id', 'username', 'password'],
};

function abrirDb(archivo, modo) {
    return new Promise((resolve, reject) => {
        const conexion = new sqlite3.Database(archivo, modo, (error) => {
            if (error) reject(error);
            else resolve(conexion);
        });
    });
}

function consultarTodo(conexion, sql, parametros = []) {
    return new Promise((resolve, reject) => {
        conexion.all(sql, parametros, (error, filas) => {
            if (error) reject(error);
            else resolve(filas || []);
        });
    });
}

function cerrarDb(conexion) {
    return new Promise((resolve) => conexion.close(() => resolve()));
}

function selloFecha(fecha = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
}

/**
 * Comprueba que un archivo sea una base SQLite de esta aplicación:
 * debe abrirse, tener las tablas Ventas y Usuario y las columnas esperadas.
 * @param {string} archivo
 * @returns {Promise<boolean>}
 */
async function validarBackup(archivo) {
    let conexion;

    try {
        conexion = await abrirDb(archivo, sqlite3.OPEN_READONLY);

        const tablas = new Set(
            (await consultarTodo(conexion, "SELECT name FROM sqlite_master WHERE type = 'table'")).map((fila) => fila.name)
        );

        for (const [tabla, columnasEsperadas] of Object.entries(TABLAS_REQUERIDAS)) {
            if (!tablas.has(tabla)) return false;

            const columnas = new Set(
                (await consultarTodo(conexion, `PRAGMA table_info(${tabla})`)).map((fila) => fila.name)
            );

            if (!columnasEsperadas.every((columna) => columnas.has(columna))) return false;
        }

        await consultarTodo(conexion, 'SELECT COUNT(*) AS cantidad FROM Ventas');
        return true;
    } catch (error) {
        return false;
    } finally {
        if (conexion) await cerrarDb(conexion);
    }
}

module.exports = { validarBackup, selloFecha };
