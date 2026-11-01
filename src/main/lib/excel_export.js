const ExcelJS = require('exceljs');

const COLOR_PRIMARIO = 'FF6366F1';
const COLOR_TEXTO = 'FF1E293B';
const COLOR_ZEBRA = 'FFF8FAFC';
const COLOR_BORDE = 'FFCBD5E1';

function formatearFechaHora(fecha = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(fecha.getDate())}/${pad(fecha.getMonth() + 1)}/${fecha.getFullYear()} ${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
}

// Convierte 'YYYY-MM-DD' en Date (mediodía UTC para evitar corrimientos de zona horaria)
function parsearFecha(fecha) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha || '');
    if (!m) return fecha || '';
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
}

function describirFiltros(filtros = {}) {
    const partes = [];
    if (filtros.busqueda) partes.push(`Cliente/DNI contiene "${filtros.busqueda}"`);
    if (filtros.anio) partes.push(`Año: ${filtros.anio}`);
    if (filtros.mes) partes.push(`Mes: ${String(filtros.mes).padStart(2, '0')}`);
    return partes.length ? partes.join(' · ') : 'Sin filtros (todas las ventas)';
}

function aplicarEstiloEncabezado(fila) {
    fila.height = 22;
    fila.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    fila.alignment = { vertical: 'middle' };
    fila.eachCell((celda) => {
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PRIMARIO } };
        celda.border = {
            bottom: { style: 'thin', color: { argb: COLOR_PRIMARIO } },
        };
    });
}

function crearHojaVentas(libro, ventas) {
    const hoja = libro.addWorksheet('Ventas', {
        views: [{ state: 'frozen', ySplit: 1 }],
        pageSetup: {
            paperSize: 9,
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
        },
    });

    hoja.columns = [
        { header: 'N°', key: 'numero', width: 6 },
        { header: 'Fecha', key: 'fecha', width: 12 },
        { header: 'Descripción', key: 'descripcion', width: 40 },
        { header: 'Cliente', key: 'cliente', width: 28 },
        { header: 'DNI / RUC', key: 'dni', width: 16 },
        { header: 'Monto (S/)', key: 'monto', width: 14 },
    ];

    aplicarEstiloEncabezado(hoja.getRow(1));

    let total = 0;

    ventas.forEach((venta, indice) => {
        const monto = Number(venta.monto) || 0;
        total += monto;

        const fila = hoja.addRow({
            numero: indice + 1,
            fecha: parsearFecha(venta.fecha),
            descripcion: venta.descripcion || '',
            cliente: venta.cliente || '',
            dni: venta.dni || '',
            monto,
        });

        fila.getCell('numero').alignment = { horizontal: 'center' };
        fila.getCell('fecha').numFmt = 'dd/mm/yyyy';
        fila.getCell('monto').numFmt = '#,##0.00';
        fila.getCell('monto').alignment = { horizontal: 'right' };
        fila.font = { color: { argb: COLOR_TEXTO } };

        if (indice % 2 === 1) {
            fila.eachCell((celda) => {
                celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ZEBRA } };
            });
        }

        fila.eachCell((celda) => {
            celda.border = { bottom: { style: 'hair', color: { argb: COLOR_BORDE } } };
        });
    });

    const filaTotal = hoja.addRow({ descripcion: 'TOTAL', monto: total });
    filaTotal.font = { bold: true, color: { argb: COLOR_TEXTO } };
    filaTotal.getCell('descripcion').alignment = { horizontal: 'right' };
    filaTotal.getCell('monto').numFmt = '#,##0.00';
    filaTotal.getCell('monto').alignment = { horizontal: 'right' };
    filaTotal.eachCell((celda) => {
        celda.border = { top: { style: 'double', color: { argb: COLOR_PRIMARIO } } };
    });

    hoja.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 6 },
    };

    return { total, cantidad: ventas.length };
}

function crearHojaResumen(libro, cantidad, total, filtros) {
    const hoja = libro.addWorksheet('Resumen');
    hoja.columns = [{ width: 24 }, { width: 62 }];

    hoja.mergeCells('A1:B1');
    const titulo = hoja.getCell('A1');
    titulo.value = 'REPORTE DE VENTAS';
    titulo.font = { bold: true, size: 16, color: { argb: COLOR_PRIMARIO } };

    hoja.getCell('A3').value = 'Generado el';
    hoja.getCell('B3').value = formatearFechaHora();

    hoja.getCell('A4').value = 'Registros exportados';
    hoja.getCell('B4').value = cantidad;

    hoja.getCell('A5').value = 'Monto total';
    hoja.getCell('B5').value = total;
    hoja.getCell('B5').numFmt = '"S/" #,##0.00';

    hoja.getCell('A6').value = 'Filtros aplicados';
    hoja.getCell('B6').value = describirFiltros(filtros);

    hoja.getCell('A8').value = 'Nota';
    hoja.getCell('B8').value = 'Documento generado automáticamente por Gestor de Ventas.';

    ['A3', 'A4', 'A5', 'A6', 'A8'].forEach((celda) => {
        hoja.getCell(celda).font = { bold: true, color: { argb: COLOR_TEXTO } };
    });
    ['B3', 'B4', 'B5', 'B6', 'B8'].forEach((celda) => {
        hoja.getCell(celda).font = { color: { argb: COLOR_TEXTO } };
    });

    return hoja;
}

/**
 * Genera un libro de Excel con las ventas y una hoja de resumen.
 * @param {string} rutaDestino Ruta completa del archivo .xlsx
 * @param {Array} ventas Filas de la tabla Ventas
 * @param {Object} filtros Filtros usados para la consulta
 * @returns {Promise<{cantidad:number,total:number}>}
 */
async function generarExcelVentas(rutaDestino, ventas, filtros = {}) {
    const libro = new ExcelJS.Workbook();
    libro.creator = 'Gestor de Ventas';
    libro.created = new Date();

    const { cantidad, total } = crearHojaVentas(libro, ventas);
    crearHojaResumen(libro, cantidad, total, filtros);

    await libro.xlsx.writeFile(rutaDestino);

    return { cantidad, total };
}

module.exports = { generarExcelVentas };
