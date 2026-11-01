// Control de sesión compartido por todas las pantallas internas.
// Debe cargarse antes que el script propio de cada página.

(function () {
    const usuario = sessionStorage.getItem('usuarioActivo');

    if (!usuario) {
        window.location.replace('login.html');
        return;
    }

    window.cerrarSesion = function () {
        sessionStorage.removeItem('usuarioActivo');
        sessionStorage.removeItem('ventaParaEditar');
        window.location.href = 'login.html';
    };

    document.addEventListener('DOMContentLoaded', function () {
        const boton = document.getElementById('logoutBtn');
        if (!boton) return;

        boton.addEventListener('click', function (evento) {
            evento.preventDefault();
            if (confirm('¿Seguro que deseas cerrar sesión?')) {
                window.cerrarSesion();
            }
        });
    });
})();
