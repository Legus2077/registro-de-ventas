const tablaVentas = document.getElementById('tablaVentas');
const filterForm = document.getElementById('filterForm');
const sumaTotalText = document.getElementById('sumaTotal');

let filtrosActuales = {};

// Función para cargar ventas (con filtros)
async function cargarVentas(filtros = {}) {
    filtrosActuales = filtros;
    const ventas = await window.api.obtenerVentas(filtros);
    tablaVentas.innerHTML = '';
    let total = 0;

    ventas.forEach(v => {
        total += v.monto;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${v.descripcion}</td>
            <td>${v.cliente}</td>
            <td>${v.dni || '-'}</td>
            <td class="fw-bold">S/ ${v.monto.toFixed(2)}</td>
            <td>${v.fecha}</td>
            <td>
                <button class="btn btn-sm btn-warning" onclick="irAEditar(${JSON.stringify(v).replace(/"/g, '&quot;')})">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="eliminarVenta(${v.id})">Eliminar</button>
            </td>
        `;
        tablaVentas.appendChild(tr);
    });
    sumaTotalText.innerText = total.toFixed(2);
}

// Evento de Filtro
filterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const filtros = {
        busqueda: document.getElementById('busqueda').value,
        anio: document.getElementById('anio').value,
        mes: document.getElementById('mes').value
    };
    cargarVentas(filtros);
});

// Exportar el listado actual (respeta los filtros aplicados)
document.getElementById('btnExportar').addEventListener('click', async () => {
    const boton = document.getElementById('btnExportar');
    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Exportando...';

    try {
        const resultado = await window.api.exportarVentas(filtrosActuales);

        if (resultado.success) {
            alert(`Se exportaron ${resultado.count} ventas a Excel.\n\n${resultado.path}`);
        } else if (!resultado.canceled) {
            alert(resultado.message || 'No se pudo exportar.');
        }
    } catch (error) {
        alert('Error al exportar: ' + error.message);
    } finally {
        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
});

// Lógica de Eliminación
async function eliminarVenta(id) {
    if(confirm(`¿Seguro que deseas eliminar la venta #${id}?`)) {
        await window.api.eliminarVenta(id);
        cargarVentas(filtrosActuales); // Recargar tabla manteniendo los filtros
    }
}

function irAEditar(venta) {
    // PASO A: Guardamos toda la información de la venta en la memoria del navegador
    // Es como dejar una nota en el refrigerador para que la otra página la lea.
    sessionStorage.setItem('ventaParaEditar', JSON.stringify(venta));

    // PASO B: Saltamos a la pantalla de edición
    window.location.href = 'editar.html';
}

// Carga inicial
document.addEventListener('DOMContentLoaded', () => cargarVentas());