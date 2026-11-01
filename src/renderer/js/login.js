const loginForm = document.getElementById('loginForm');
const mensajeError = document.getElementById('mensaje-error');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const respuesta = await window.api.login({ username, password });

    if (respuesta.success) {
        // Guardamos el usuario en sessionStorage para saber quién entró
        sessionStorage.setItem('usuarioActivo', respuesta.user);
        window.location.href = 'dashboard.html';
    } else {
        mensajeError.style.display = 'block';
    }
});