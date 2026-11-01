document.addEventListener('DOMContentLoaded', async () => {
    // 1. Mostrar nombre de usuario desde sessionStorage
    const usuario = sessionStorage.getItem('usuarioActivo') || 'Usuario';
    document.getElementById('nombreUsuario').innerText = usuario;

    // 2. Pedir datos al Main
    const stats = await window.api.obtenerStatsDashboard();

    // 3. Inyectar datos en las tarjetas
    document.getElementById('gananciaTotal').innerText = stats.total.toLocaleString('en-US', { minimumFractionDigits: 2 });
    document.getElementById('totalVentas').innerText = stats.cantidad;

    // 4. Preparar Gráfico
    const labels = stats.historico.map(item => `${item.mes}/${item.anio}`);
    const dataValues = stats.historico.map(item => item.ganancia);

    const ctx = document.getElementById('monthlyChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ganancia Mensual (S/)',
                data: dataValues,
                backgroundColor: 'rgba(168, 85, 247, 0.6)',
                borderColor: '#a855f7',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            },
            plugins: { legend: { labels: { color: 'white' } } }
        }
    });

    // Respaldo y exportación
    const mensajeRespaldo = document.getElementById('mensajeRespaldo');

    function mostrarMensajeRespaldo(texto, clase = 'text-info') {
        mensajeRespaldo.className = `small mt-3 ${clase}`;
        mensajeRespaldo.textContent = texto;
    }

    document.getElementById('btnExportarDashboard').addEventListener('click', async () => {
        const boton = document.getElementById('btnExportarDashboard');
        boton.disabled = true;

        try {
            const resultado = await window.api.exportarVentas({});

            if (resultado.success) {
                mostrarMensajeRespaldo(`Se exportaron ${resultado.count} ventas a: ${resultado.path}`, 'text-success');
            } else if (!resultado.canceled) {
                mostrarMensajeRespaldo(resultado.message || 'No se pudo exportar.', 'text-danger');
            }
        } catch (error) {
            mostrarMensajeRespaldo('Error al exportar: ' + error.message, 'text-danger');
        } finally {
            boton.disabled = false;
        }
    });

    document.getElementById('btnBackup').addEventListener('click', async () => {
        const boton = document.getElementById('btnBackup');
        boton.disabled = true;

        try {
            const resultado = await window.api.crearBackup();

            if (resultado.success) {
                mostrarMensajeRespaldo(`Copia de seguridad guardada en: ${resultado.path}`, 'text-success');
            } else if (!resultado.canceled) {
                mostrarMensajeRespaldo(resultado.message || 'No se pudo crear la copia.', 'text-danger');
            }
        } catch (error) {
            mostrarMensajeRespaldo('Error al crear la copia: ' + error.message, 'text-danger');
        } finally {
            boton.disabled = false;
        }
    });

    document.getElementById('btnRestaurar').addEventListener('click', async () => {
        if (!confirm('Esto reemplazará todas las ventas actuales por las de la copia seleccionada.\n\n¿Deseas continuar?')) return;

        const boton = document.getElementById('btnRestaurar');
        boton.disabled = true;

        try {
            const resultado = await window.api.restaurarBackup();

            if (resultado.success) {
                alert(`Copia restaurada correctamente: ${resultado.cantidad} ventas.\n\nSe guardó un respaldo del estado anterior en:\n${resultado.respaldoPrevio}`);
                window.location.reload();
            } else if (!resultado.canceled) {
                mostrarMensajeRespaldo(resultado.message || 'No se pudo restaurar la copia.', 'text-danger');
            }
        } catch (error) {
            mostrarMensajeRespaldo('Error al restaurar: ' + error.message, 'text-danger');
        } finally {
            boton.disabled = false;
        }
    });

    // Cambio de contraseña
    const passwordForm = document.getElementById('passwordForm');
    const mensajePassword = document.getElementById('mensajePassword');

    function mostrarMensajePassword(texto, clase = 'text-info') {
        mensajePassword.className = `small mt-3 ${clase}`;
        mensajePassword.textContent = texto;
    }

    passwordForm.addEventListener('submit', async (evento) => {
        evento.preventDefault();

        const actual = document.getElementById('passwordActual').value;
        const nueva = document.getElementById('passwordNueva').value;
        const repetir = document.getElementById('passwordRepetir').value;
        const usuario = sessionStorage.getItem('usuarioActivo');

        if (nueva !== repetir) {
            mostrarMensajePassword('Las contraseñas nuevas no coinciden.', 'text-danger');
            return;
        }

        if (nueva.length < 8) {
            mostrarMensajePassword('La nueva contraseña debe tener al menos 8 caracteres.', 'text-danger');
            return;
        }

        const boton = passwordForm.querySelector('button[type="submit"]');
        boton.disabled = true;

        try {
            const resultado = await window.api.cambiarPassword({ username: usuario, actual, nueva });

            if (!resultado.success) {
                mostrarMensajePassword(resultado.message || 'No se pudo cambiar la contraseña.', 'text-danger');
                return;
            }

            alert('Contraseña actualizada correctamente. Iniciá sesión nuevamente.');
            window.cerrarSesion();
        } catch (error) {
            mostrarMensajePassword('Error al cambiar la contraseña: ' + error.message, 'text-danger');
        } finally {
            boton.disabled = false;
        }
    });

    // El cierre de sesión lo maneja session.js en todas las pantallas
});