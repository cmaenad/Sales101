require('dotenv').config();
const express = require('express');
const supabase = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// ------------------------------------------------------------------
// BLOQUE 1: GESTIÓN DE ESTADO M2M (SALESFORCE CACHE)
// ------------------------------------------------------------------
// Estructura en memoria RAM para evitar latencia de negociación OAuth
let sfCache = {
    accessToken: null,
    instanceUrl: null
};

// Subrutina para negociar el vector de acceso OAuth 2.0
async function autenticarM2MSalesforce() {
    console.log("[Sistema] Iniciando protocolo OAuth Client Credentials contra Salesforce...");
    const tokenUrl = `${process.env.SF_LOGIN_URL}/services/oauth2/token`;
    const payload = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.SF_CLIENT_ID,
        client_secret: process.env.SF_CLIENT_SECRET
    });

    const respuesta = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload
    });

    if (!respuesta.ok) {
        throw new Error(`Fallo de autorización M2M. HTTP ${respuesta.status}`);
    }

    const datos = await respuesta.json();
    // Escritura en la estructura estática en memoria
    sfCache.accessToken = datos.access_token;
    sfCache.instanceUrl = datos.instance_url;
    console.log("[Sistema] Memoria caché de Salesforce actualizada con éxito.");
}

// Tabla Hash para persistir los punteros de sesión del motor de IA
let sesionesActivas = {};
const AGENTE_API_NAME = 'Sales_Operations_Agent';
const AGENTE_ID = '0Xxg5000000t3gPCAQ';// Tabla Hash para persistir los punteros de sesión del motor de IA

async function ejecutarLlamadaSalesforce(mensajeUsuario, idVendedor) {
    if (!sfCache.accessToken) {
        await autenticarM2MSalesforce();
    }

    // Puntero de red hacia la Fachada REST en Apex
    const baseUrl = `${sfCache.instanceUrl}/services/apexrest/AgenteVentas`;
    
    // Extracción del UUID de la sesión de la memoria local, si existe
    const sessionIdLocal = sesionesActivas[idVendedor] || null;

    let resMensaje = await fetch(baseUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${sfCache.accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            vendedorId: idVendedor,
            mensaje: mensajeUsuario,
            sessionId: sessionIdLocal
        })
    });

    if (!resMensaje.ok) {
        const errorText = await resMensaje.text();
        throw new Error(`Excepción en el canal Apex. HTTP ${resMensaje.status}: ${errorText}`);
    }

    const datosRespuesta = await resMensaje.json();
    
    // Escritura del nuevo puntero de sesión retornado por el motor
    if (datosRespuesta.sessionId) {
        sesionesActivas[idVendedor] = datosRespuesta.sessionId;
    }
    
    return { respuesta: datosRespuesta.respuesta };
}
// Endpoint: Inicio de Sesión
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Estructura malformada." });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });

    return res.status(200).json({
        user_id: data.user.id,
        access_token: data.session.access_token
    });
});

// Endpoint Protegido: Proxy hacia Salesforce
app.post('/api/chat', autenticarTokenLocal, async (req, res) => {
    const { mensaje } = req.body;
    if (!mensaje) return res.status(400).json({ error: "El payload requiere 'mensaje'." });

    try {
        // Redirección de la petición hacia el motor de Salesforce
        const respuestaSalesforce = await ejecutarLlamadaSalesforce(mensaje, req.user.id);
        
        // Asumimos que la clase Apex devuelve un JSON con el atributo 'respuesta'
        res.status(200).json({ respuesta: respuestaSalesforce.respuesta });
    } catch (error) {
        console.error(error.message);
        res.status(502).json({ error: "Fallo de comunicación en el clúster de Salesforce." });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor HTTP activo en el puerto TCP ${PORT}`);
});