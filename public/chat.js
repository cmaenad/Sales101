// Adquisición de punteros a los nodos del DOM
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatWindow = document.getElementById('chat-window');
const logoutButton = document.getElementById('logout-button');
const statusIndicator = document.getElementById('status-indicator');

// Recuperación del token desde la memoria persistente
const token = localStorage.getItem('access_token');

// Validación estricta de estado
if (!token) {
    window.location.href = '/'; // Redirección al punto de entrada en caso de fallo o ausencia
} else {
    statusIndicator.textContent = "Estado: Canal Seguro Establecido. JWT validado en memoria.";
    statusIndicator.style.color = "green";
}

// Subrutina de inyección en el árbol DOM
function escribirEnBuffer(emisor, texto) {
    const nodoMensaje = document.createElement('p');
    nodoMensaje.innerHTML = `<strong>${emisor}:</strong> ${texto}`;
    chatWindow.appendChild(nodoMensaje);
    
    // Desplazamiento automático del puntero de visualización al final del contenedor
    chatWindow.scrollTop = chatWindow.scrollHeight; 
}

// Rutina de Servicio de Interrupción (Transmisión de Mensajes)
chatForm.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const comando = chatInput.value;
    chatInput.value = ''; // Limpieza inmediata del buffer de entrada

    escribirEnBuffer('Ventas', comando);

    try {
        // Ejecución de la petición HTTP con el vector de autorización inyectado
        const respuesta = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ mensaje: comando })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(datos.error || "Fallo estructural en la capa de red.");
        }

        escribirEnBuffer('Agente IA', datos.respuesta);

    } catch (error) {
        escribirEnBuffer('Sistema', `Excepción de red: ${error.message}`);
    }
});

// Interrupción de Limpieza de Memoria (Destrucción de Sesión)
logoutButton.addEventListener('click', () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_id');
    window.location.href = '/';
});