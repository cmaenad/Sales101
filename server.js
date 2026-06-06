require('dotenv').config();
const express = require('express');
const supabase = require('./supabase'); // Instanciación del cliente de Supabase

const app = express();
const PORT = process.env.PORT || 3000;

// Inicialización de búferes para parseo JSON y servido estático
app.use(express.json());
app.use(express.static('public'));

// ------------------------------------------------------------------
// BLOQUE 1: GESTIÓN DE ESTADO M2M Y CACHÉ
// ------------------------------------------------------------------
let sfCache = {
    accessToken: null,
    instanceUrl: null
};

// Subrutina para negociar y almacenar el vector OAuth 2.0
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
    // Escritura en la estructura estática de memoria RAM
    sfCache.accessToken = datos.access_token;
    sfCache.instanceUrl = datos.instance_url;
    console.log("[Sistema] Memoria caché de Salesforce actualizada con éxito.");
}

// ------------------------------------------------------------------
// BLOQUE 2: ENRUTAMIENTO HACIA SALESFORCE Y GESTIÓN DE SESIÓN
// ------------------------------------------------------------------
// Tabla Hash para persistir los punteros de sesión UUID del motor de IA
let sesionesActivas = {};

async function ejecutarLlamadaSalesforce(mensajeUsuario, idVendedor) {
    if (!sfCache.accessToken) {
        await autenticarM2MSalesforce();
    }

    // Puntero de red hacia la Fachada REST expuesta en la clase Apex
    const baseUrl = `${sfCache.instanceUrl}/services/apexrest/AgenteVentas`;
    
    // Extracción del UUID de sesión de la memoria local
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
        // Manejo de interrupción por expiración del token M2M en el servidor destino
        if (resMensaje.status === 401) {
            console.log("[Sistema] Vector M2M expirado durante transmisión. Renegociando...");
            sfCache.accessToken = null;
            return ejecutarLlamadaSalesforce(mensajeUsuario, idVendedor);
        }
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

// ------------------------------------------------------------------
// BLOQUE 3: MIDDLEWARE DE SEGURIDAD LOCAL
// ------------------------------------------------------------------
// Rutina de intercepción para validación de firmas criptográficas
const autenticarTokenLocal = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Cabecera de autorización ausente o malformada." });
    }

    const token = authHeader.split(' ')[1];
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
        return res.status(401).json({ error: "Token JWT local inválido o expirado." });
    }

    // Inyección de los descriptores del usuario en la estructura de la petición
    req.user = data.user;
    next(); 
};

// ------------------------------------------------------------------
// BLOQUE 4: ENDPOINTS Y MULTIPLEXOR
// ------------------------------------------------------------------
// Endpoint: Negociación inicial y emisión de JWT
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Estructura de entrada malformada." });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });

    return res.status(200).json({
        user_id: data.user.id,
        access_token: data.session.access_token
    });
});

// Endpoint Protegido: Proxy hacia clúster de Salesforce
app.post('/api/chat', autenticarTokenLocal, async (req, res) => {
    const { mensaje } = req.body;
    if (!mensaje) return res.status(400).json({ error: "El payload requiere el atributo 'mensaje'." });

    try {
        const respuestaSalesforce = await ejecutarLlamadaSalesforce(mensaje, req.user.id);
        res.status(200).json({ respuesta: respuestaSalesforce.respuesta });
    } catch (error) {
        console.error(error.message);
        res.status(502).json({ error: "Fallo de comunicación en el clúster de Salesforce." });
    }
});

// Apertura del socket local y escucha de interrupciones
app.listen(PORT, () => {
    console.log(`Servidor HTTP activo en el puerto TCP ${PORT}`);
});