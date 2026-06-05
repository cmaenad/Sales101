async function simularLoginSalesforce() {
    const targetUrl = 'https://sales101.onrender.com/api/auth/login';
    
    // Credenciales aprovisionadas por TI en el paso anterior
    const credenciales = {
        email: "usuario@example.com",
        password: "CredencialIT_Segura_2026!"
    };

    console.log(`Iniciando transmisión de paquetes hacia ${targetUrl}...`);

    try {
        // Ejecución de la petición HTTP POST
        const respuesta = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credenciales)
        });

        // Parseo de la carga útil (payload) de la respuesta
        const datos = await respuesta.json();

        // Validación de códigos de estado HTTP
        if (!respuesta.ok) {
            console.error(`Fallo del Servidor. Código HTTP: ${respuesta.status}`);
            console.error("Detalles:", datos.error);
            return;
        }

        console.log("--------------------------------------------------");
        console.log("Protocolo de autenticación exitoso (HTTP 200 OK).");
        console.log(`UUID Reconocido: ${datos.user_id}`);
        console.log("\n--- JSON WEB TOKEN (ACCESS TOKEN) ---");
        console.log(datos.access_token);
        console.log("--------------------------------------------------");

    } catch (error) {
        console.error("Error crítico de red. ¿Está el servidor ejecutándose en el puerto 3000?");
        console.error(error.message);
    }
}

simularLoginSalesforce();