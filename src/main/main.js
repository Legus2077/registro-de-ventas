const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { generarExcelVentas } = require('./lib/excel_export');
const { validarBackup, selloFecha } = require('./lib/backup');
const { hashPassword, verificarPassword, esHash } = require('./lib/passwords');

let win;
let db;
const dbPath = path.join(app.getPath('userData'), 'ventas_pro.db');

// INICIALIZACIÓN DE TABLAS
function inicializarTablas() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS Ventas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            descripcion TEXT, cliente TEXT, dni TEXT, monto REAL, fecha TEXT
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS Usuario (
            id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT
        )`);
        db.get("SELECT * FROM Usuario WHERE username = 'administrador'", (err, row) => {
            if (!row) {
                db.run("INSERT INTO Usuario (username, password) VALUES ('administrador', ?)", [hashPassword('13579')]);
            } else if (row.password && !esHash(row.password)) {
                // Migración proactiva: nunca dejamos contraseñas en texto plano
                db.run("UPDATE Usuario SET password=? WHERE id=?", [hashPassword(row.password), row.id]);
            }
        });
    });
}

function abrirDb() {
    db = new sqlite3.Database(dbPath);
    inicializarTablas();
}

function cerrarDb() {
    return new Promise((resolve, reject) => {
        if (!db) return resolve();
        db.close((err) => (err ? reject(err) : resolve()));
    });
}

function consultarFilas(query, params) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
    });
}

function contarVentas() {
    return new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) AS cantidad FROM Ventas', (err, fila) => {
            if (err) reject(err);
            else resolve(fila ? fila.cantidad : 0);
        });
    });
}

function asegurarExtension(rutaArchivo, extension) {
    return rutaArchivo.toLowerCase().endsWith(extension) ? rutaArchivo : rutaArchivo + extension;
}

// Reutilizada por la vista de ventas y por la exportación a Excel
function consultaVentas(filtros = {}) {
    let query = "SELECT * FROM Ventas WHERE 1=1";
    let params = [];
    if (filtros.busqueda) { query += " AND (cliente LIKE ? OR dni LIKE ?)"; params.push(`%${filtros.busqueda}%`, `%${filtros.busqueda}%`); }
    if (filtros.anio) { query += " AND strftime('%Y', fecha) = ?"; params.push(filtros.anio); }
    if (filtros.mes) { query += " AND strftime('%m', fecha) = ?"; params.push(filtros.mes.toString().padStart(2, '0')); }
    query += " ORDER BY fecha DESC";
    return { query, params };
}

abrirDb();


function createWindow() {
    win = new BrowserWindow({
        width: 1200, 
        height: 850,
        icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
        webPreferences: { 
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    win.loadFile(path.join(__dirname, '..', 'renderer', 'pages', 'login.html'));
}

app.whenReady().then(createWindow);

// --- CANALES DE COMUNICACIÓN (IPC) ---

// Login
ipcMain.handle('login', (event, { username, password } = {}) => {
    return new Promise((resolve) => {
        db.get("SELECT * FROM Usuario WHERE username=?", [username], (err, row) => {
            if (err || !row) {
                resolve({ success: false });
                return;
            }

            const resultado = verificarPassword(password, row.password);

            if (!resultado.ok) {
                resolve({ success: false });
                return;
            }

            // Migración transparente: si la contraseña estaba en texto plano,
            // la reemplazamos por su hash y no volvemos a guardarla así.
            if (resultado.necesitaMigracion) {
                db.run("UPDATE Usuario SET password=? WHERE id=?", [hashPassword(password), row.id]);
            }

            resolve({ success: true, user: row.username });
        });
    });
});

// Cambio de contraseña
ipcMain.handle('cambiarPassword', (event, datos = {}) => {
    return new Promise((resolve) => {
        const { username, actual, nueva } = datos;

        if (!username || !actual || !nueva) {
            resolve({ success: false, message: 'Completá todos los campos.' });
            return;
        }

        if (nueva.length < 8) {
            resolve({ success: false, message: 'La nueva contraseña debe tener al menos 8 caracteres.' });
            return;
        }

        if (nueva === actual) {
            resolve({ success: false, message: 'La nueva contraseña debe ser distinta de la actual.' });
            return;
        }

        db.get("SELECT * FROM Usuario WHERE username=?", [username], (err, row) => {
            if (err || !row) {
                resolve({ success: false, message: 'No se encontró el usuario.' });
                return;
            }

            const resultado = verificarPassword(actual, row.password);

            if (!resultado.ok) {
                resolve({ success: false, message: 'La contraseña actual no es correcta.' });
                return;
            }

            db.run("UPDATE Usuario SET password=? WHERE id=?", [hashPassword(nueva), row.id], function (errActualizacion) {
                if (errActualizacion) {
                    resolve({ success: false, message: 'No se pudo actualizar la contraseña: ' + errActualizacion.message });
                    return;
                }

                resolve({ success: true });
            });
        });
    });
});

// Dashboard Stats
ipcMain.handle('obtenerStatsDashboard', () => {
    return new Promise(res => {
        db.get("SELECT SUM(monto) as total, COUNT(*) as cantidad FROM Ventas", (err, row) => {
            db.all("SELECT strftime('%Y', fecha) as anio, strftime('%m', fecha) as mes, SUM(monto) as ganancia FROM Ventas GROUP BY anio, mes ORDER BY anio, mes", (err, rows) => {
                res({ total: row.total || 0, cantidad: row.cantidad || 0, historico: rows || [] });
            });
        });
    });
});

// Guardar Venta
ipcMain.handle('guardarVenta', (event, v = {}) => {
    return new Promise((resolve) => {
        const monto = Number(v.monto);

        if (!v.descripcion || !v.cliente || !v.fecha || !Number.isFinite(monto) || monto < 0) {
            resolve({ success: false, message: 'Los datos de la venta están incompletos o no son válidos.' });
            return;
        }

        db.run(
            "INSERT INTO Ventas (descripcion, cliente, dni, monto, fecha) VALUES (?,?,?,?,?)",
            [v.descripcion, v.cliente, v.dni, monto, v.fecha],
            function (err) {
                if (err) resolve({ success: false, message: err.message });
                else resolve({ success: true, id: this.lastID });
            }
        );
    });
});

// Ver/Filtrar Ventas
ipcMain.handle('obtenerVentas', (event, filtros = {}) => {
    const { query, params } = consultaVentas(filtros);
    return consultarFilas(query, params);
});

// Eliminar y Actualizar
ipcMain.handle('eliminarVenta', (e, id) => new Promise(res => db.run("DELETE FROM Ventas WHERE id=?", [id], () => res(true))));
ipcMain.handle('actualizarVenta', (e, v) => {
    return new Promise((resolve) => {
        db.run("UPDATE Ventas SET descripcion=?, cliente=?, dni=?, monto=?, fecha=? WHERE id=?",
        [v.descripcion, v.cliente, v.dni, v.monto, v.fecha, v.id], function (err) {
            if (err) resolve({ success: false, message: err.message });
            else resolve({ success: true, cambios: this.changes });
        });
    });
});

// RANKING DE CLIENTES (Traducción de tu lógica SQL Server a SQLite)
ipcMain.handle('obtenerRanking', (event, f) => {
    let query = `
        SELECT 
            cliente, dni, 
            COUNT(*) as compras, 
            SUM(monto) as total, 
            MAX(fecha) as ultima_compra 
        FROM Ventas 
        WHERE 1=1`;
    let params = [];
    if (f.desde) { query += " AND fecha >= ?"; params.push(f.desde); }
    if (f.hasta) { query += " AND fecha <= ?"; params.push(f.hasta); }
    query += " GROUP BY cliente, dni ORDER BY total DESC LIMIT ?";
    params.push(parseInt(f.top) || 20);
    
    return new Promise(res => db.all(query, params, (err, rows) => res(rows || [])));
});

// --- EXPORTACIÓN A EXCEL ---

ipcMain.handle('exportarVentas', async (event, filtros = {}) => {
    try {
        const { query, params } = consultaVentas(filtros);
        const ventas = await consultarFilas(query, params);

        if (!ventas.length) {
            return { success: false, message: 'No hay ventas para exportar con los filtros actuales.' };
        }

        const { canceled, filePath } = await dialog.showSaveDialog(win, {
            title: 'Exportar ventas a Excel',
            defaultPath: path.join(app.getPath('documents'), `Ventas_${selloFecha()}.xlsx`),
            filters: [{ name: 'Libro de Excel', extensions: ['xlsx'] }],
        });

        if (canceled || !filePath) return { success: false, canceled: true };

        const destino = asegurarExtension(filePath, '.xlsx');
        const { cantidad, total } = await generarExcelVentas(destino, ventas, filtros);

        return { success: true, path: destino, count: cantidad, total };
    } catch (error) {
        return { success: false, message: 'No se pudo exportar: ' + error.message };
    }
});

// --- RESPALDO Y RESTAURACIÓN ---

ipcMain.handle('crearBackup', async () => {
    try {
        const { canceled, filePath } = await dialog.showSaveDialog(win, {
            title: 'Guardar copia de seguridad',
            defaultPath: path.join(app.getPath('documents'), `backup_ventas_${selloFecha()}.db`),
            filters: [{ name: 'Base de datos SQLite', extensions: ['db'] }],
        });

        if (canceled || !filePath) return { success: false, canceled: true };

        const destino = asegurarExtension(filePath, '.db');

        await new Promise((resolve, reject) => {
            const backup = db.backup(destino);

            // El callback de db.backup solo confirma la inicialización:
            // hay que copiar las páginas (step) y finalizar explícitamente.
            backup.step(-1, (err) => {
                if (err) {
                    backup.finish(() => reject(err));
                    return;
                }

                backup.finish((errFin) => (errFin ? reject(errFin) : resolve()));
            });
        });

        return { success: true, path: destino, bytes: fs.statSync(destino).size };
    } catch (error) {
        return { success: false, message: 'No se pudo crear la copia: ' + error.message };
    }
});

ipcMain.handle('restaurarBackup', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        title: 'Seleccionar copia de seguridad',
        properties: ['openFile'],
        filters: [{ name: 'Base de datos SQLite', extensions: ['db'] }],
    });

    if (canceled || !filePaths.length) return { success: false, canceled: true };

    const origen = filePaths[0];

    if (path.resolve(origen) === path.resolve(dbPath)) {
        return { success: false, message: 'Ese archivo es la base de datos que está en uso. Elegí otra copia.' };
    }

    if (!(await validarBackup(origen))) {
        return { success: false, message: 'El archivo seleccionado no es una copia de seguridad válida de la aplicación.' };
    }

    const respaldoPrevio = `${dbPath}.antes-de-restaurar-${Date.now()}.db`;

    try {
        await cerrarDb();
    } catch (error) {
        abrirDb();
        return { success: false, message: 'No se pudo cerrar la base de datos: ' + error.message };
    }

    try {
        // Guardamos el estado actual por si algo falla durante la restauración
        fs.copyFileSync(dbPath, respaldoPrevio);
        fs.copyFileSync(origen, dbPath);

        abrirDb();
        const cantidad = await contarVentas();

        return { success: true, cantidad, respaldoPrevio };
    } catch (error) {
        try {
            await cerrarDb();
            if (fs.existsSync(respaldoPrevio)) fs.copyFileSync(respaldoPrevio, dbPath);
        } catch (_) {
            // Si el rollback falla, al menos reabrimos la base para no dejar la app inutilizable
        }

        abrirDb();
        return { success: false, message: 'No se pudo restaurar la copia: ' + error.message };
    }
});
