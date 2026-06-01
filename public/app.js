// Adquisición de punteros a los nodos del DOM
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

// Validación de estado de sesión existente
if (localStorage.getItem('access_token')) {
    window.location.href = '/chat.html'; // Redirección si el token ya está en memoria
}

// Registro de la Rutina de Servicio de Interrupción (ISR)
loginForm.addEventListener('submit', async (evento) => {
    // Prevención de la recarga del buffer de la página
    evento.preventDefault();

    // Extracción de datos de los nodos
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // Transmisión asíncrona hacia nuestro endpoint local
        const respuesta = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(datos.error || "Fallo en la validación criptográfica.");
        }

        // Escritura del token en la memoria persistente del cliente
        localStorage.setItem('access_token', datos.access_token);
        localStorage.setItem('user_id', datos.user_id);

        // Modificación del contador de programa (Redirección de interfaz)
        window.location.href = '/chat.html';

    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    }
});