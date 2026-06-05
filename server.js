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

// Subrutina de transmisión que maneja la expiración silenciosa del token
async function ejecutarLlamadaSalesforce(mensajeUsuario, idVendedor) {
    // Inicialización perezosa (Lazy Loading) del token
    if (!sfCache.accessToken) {
        await autenticarM2MSalesforce();
    }

    // ADVERTENCIA: Esta URL debe coincidir con la clase Apex REST que definas en Salesforce.
    // Por convención usaremos '/services/apexrest/AgenteVentas' como marcador de posición.
    const endpointSalesforce = `${sfCache.instanceUrl}/services/apexrest/AgenteVentas`;

    let opcionesPeticion = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${sfCache.accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            vendedorId: idVendedor,
            mensaje: mensajeUsuario 
        })
    };

    let respuesta = await fetch(endpointSalesforce, opcionesPeticion);

    // Si el token expiró (HTTP 401), invalidamos caché, renegociamos y reintentamos.
    if (respuesta.status === 401) {
        console.log("[Sistema] Vector M2M expirado. Limpiando memoria y renegociando...");
        sfCache.accessToken = null;
        await autenticarM2MSalesforce();
        
        // Actualizamos la cabecera con el nuevo token y disparamos la petición nuevamente
        opcionesPeticion.headers['Authorization'] = `Bearer ${sfCache.accessToken}`;
        respuesta = await fetch(endpointSalesforce, opcionesPeticion);
    }

    if (!respuesta.ok) {
        const errorText = await respuesta.text();
        throw new Error(`Excepción en capa Apex. HTTP ${respuesta.status}: ${errorText}`);
    }

    return await respuesta.json();
}

// ------------------------------------------------------------------
// BLOQUE 2: RUTINAS DE SERVICIO WEB (ENDPOINTS)
// ------------------------------------------------------------------

// Middleware de Autenticación Criptográfica para clientes web (Supabase)
const autenticarTokenLocal = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Cabecera de autorización ausente o malformada." });
    }
    const token = authHeader.split(' ')[1];
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
        return res.status(401).json({ error: "Token JWT local inválido." });
    }
    req.user = data.user;
    next();
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