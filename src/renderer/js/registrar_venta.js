// Devuelve la fecha en formato YYYY-MM-DD según la hora LOCAL (no UTC)
function fechaLocalISO(fecha = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Poner la fecha de hoy por defecto (hora local)
    const fechaInput = document.getElementById('fecha');
    fechaInput.value = fechaLocalISO();

    const ventaForm = document.getElementById('ventaForm');

    ventaForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const boton = ventaForm.querySelector('button[type="submit"]');
        boton.disabled = true;

        // 2. Recolectar datos
        const nuevaVenta = {
            descripcion: document.getElementById('descripcion').value,
            cliente: document.getElementById('cliente').value,
            dni: document.getElementById('dni').value,
            monto: parseFloat(document.getElementById('monto').value),
            fecha: document.getElementById('fecha').value
        };

        // 3. Enviar al Main y esperar confirmación real de la base de datos
        try {
            const resultado = await window.api.guardarVenta(nuevaVenta);

            if (!resultado.success) {
                alert('No se pudo registrar la venta: ' + (resultado.message || 'error desconocido'));
                boton.disabled = false;
                return;
            }

            alert('¡Venta registrada con éxito!');
            window.location.href = 'dashboard.html';
        } catch (error) {
            alert('No se pudo registrar la venta: ' + error.message);
            boton.disabled = false;
        }
    });
});
