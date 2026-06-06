require('dotenv').config();

async function negociarTokenSalesforce() {
    // Construcción del puntero de red hacia el servicio OAuth2 de Salesforce
    const tokenUrl = `${process.env.SF_LOGIN_URL}/services/oauth2/token`;

    // Compilación de la carga útil en formato x-www-form-urlencoded
    const payload = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.SF_CLIENT_ID,
        client_secret: process.env.SF_CLIENT_SECRET
    });

    console.log(`Iniciando protocolo de enlace TLS y autenticación M2M hacia ${tokenUrl}...`);

    try {
        // Ejecución asíncrona del socket de red
        const respuesta = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: payload
        });

        // Parseo de la estructura de datos entrante
        const datos = await respuesta.json();

        // Manejo de rechazo de credenciales o errores de sintaxis
        if (!respuesta.ok) {
            console.error("Fallo en la negociación OAuth. El servidor remoto rechazó la petición:");
            console.error(datos);
            return;
        }

        console.log("--------------------------------------------------");
        console.log("Autenticación M2M exitosa. Transmisión validada.");
        console.log(`URL de Instancia asignada: ${datos.instance_url}`);
        // Imprimimos únicamente los primeros 15 bytes para no exponer el token completo en consola
        console.log(`Vector de acceso (truncado): ${datos.access_token.substring(0, 15)}...`);
        console.log("--------------------------------------------------");

    } catch (error) {
        console.error("Fallo estructural en la capa de red (Capa 4 OSI):");
        console.error(error.message);
    }
}

negociarTokenSalesforce();