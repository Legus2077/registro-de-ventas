document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('editForm');
    
    // 1. Recuperar los datos que guardamos en sessionStorage al hacer clic en 'Editar'
    const ventaData = JSON.parse(sessionStorage.getItem('ventaParaEditar'));

    if (ventaData) {
        document.getElementById('venta_id').value = ventaData.id;
        document.getElementById('descripcion').value = ventaData.descripcion;
        document.getElementById('cliente').value = ventaData.cliente;
        document.getElementById('dni').value = ventaData.dni;
        document.getElementById('monto').value = ventaData.monto;
        document.getElementById('fecha').value = ventaData.fecha;
    }

    // 2. Manejar el envío del formulario
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const ventaActualizada = {
            id: document.getElementById('venta_id').value,
            descripcion: document.getElementById('descripcion').value,
            cliente: document.getElementById('cliente').value,
            dni: document.getElementById('dni').value,
            monto: parseFloat(document.getElementById('monto').value),
            fecha: document.getElementById('fecha').value
        };

        // Llamamos a la función que ya creamos en el Main de Electron
        const resultado = await window.api.actualizarVenta(ventaActualizada);

        if (!resultado.success) {
            alert('No se pudo actualizar el registro: ' + (resultado.message || 'error desconocido'));
            return;
        }

        sessionStorage.removeItem('ventaParaEditar');
        alert('Registro actualizado correctamente');
        window.location.href = 'ver_ventas.html';
    });
});