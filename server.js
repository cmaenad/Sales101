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

async function ejecutarLlamadaSalesforce(mensajeUsuario, idVendedor) {
    if (!sfCache.accessToken) {
        await autenticarM2MSalesforce();
    }

    // Punteros de Red hacia la API REST de Agentforce
    const baseUrl = `https://api.salesforce.com/einstein/ai-agent/v1/agents/${AGENTE_API_NAME}/sessions`;
    
    // 1. Inicialización de Memoria (Negociación de Sesión)
    if (!sesionesActivas[idVendedor]) {
        console.log(`[Sistema] Asignando bloque de memoria para sesión del UUID: ${idVendedor}`);
        
        const resSesion = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${sfCache.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                externalSessionKey: idVendedor,
                instanceConfig: { endpoint: sfCache.instanceUrl } //
            })
        });

        if (!resSesion.ok) {
            if (resSesion.status === 401) {
                console.log("[Sistema] Vector M2M expirado durante negociación de sesión. Renegociando...");
                sfCache.accessToken = null;
                return ejecutarLlamadaSalesforce(mensajeUsuario, idVendedor);
            }
            throw new Error(`Fallo de segmentación en API de Sesión. HTTP ${resSesion.status}`);
        }

        const datosSesion = await resSesion.json();
        // Escritura del descriptor de sesión devuelto por el motor
        sesionesActivas[idVendedor] = datosSesion.sessionId || datosSesion.id;
    }

    // 2. Transmisión del Búfer de Texto
    const sessionId = sesionesActivas[idVendedor];
    const urlMensaje = `${baseUrl}/${sessionId}/messages`;

    let resMensaje = await fetch(urlMensaje, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${sfCache.accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: {
                type: "Text",
                text: mensajeUsuario
            }
        })
    });

    if (!resMensaje.ok) {
        const errorText = await resMensaje.text();
        throw new Error(`Excepción en el canal de Agentforce. HTTP ${resMensaje.status}: ${errorText}`);
    }

    const datosRespuesta = await resMensaje.json();
    
    // Desreferenciación de la cadena resultante de la inferencia
    // ADVERTENCIA: La ruta del nodo JSON de salida depende de la versión de la API de tu org.
    return { respuesta: datosRespuesta.messages[0].text || "Inferencia procesada." };
}
// Middleware de Autenticación Criptográfica para clientes web (Supabase)
const autenticarTokenLocal = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    // Validación de existencia y formato del vector
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Cabecera de autorización ausente o malformada." });
    }

    // Extracción estricta del token
    const token = authHeader.split(' ')[1];

    // Verificación de firma contra el motor GoTrue
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
        return res.status(401).json({ error: "Token JWT local inválido o expirado." });
    }

    // Inyección de los datos estructurales del usuario en el objeto de la petición
    req.user = data.user;
    next(); // Cede el control a la siguiente rutina en el stack de Express
};
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