require('dotenv').config();
const express = require('express');
const supabase = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Permite recibir y parsear cuerpos JSON en las solicitudes entrantes.
app.use(express.json());
// Middleware para despachar archivos estáticos desde el directorio 'public'
app.use(express.static('public'));

// Endpoint que valida credenciales y devuelve un token de acceso para el usuario.
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Estructura malformada: Se requiere email y password." });
    }

    console.log(`Petición de autenticación entrante para: ${email}`);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error(`Fallo de autorización: ${error.message}`);
        return res.status(401).json({ error: error.message });
    }

    const accessToken = data.session.access_token;
    console.log("Autenticación exitosa. Emitiendo JWT de acceso.");

    return res.status(200).json({
        message: "Autenticación exitosa",
        user_id: data.user.id,
        access_token: accessToken
    });
});

// Middleware de Autenticación Criptográfica
const autenticarToken = async (req, res, next) => {
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
        return res.status(401).json({ error: "Token inválido, alterado o expirado." });
    }

    // Inyección de los datos estructurales del usuario en el objeto de la petición
    req.user = data.user;
    next(); // Cede el control a la siguiente rutina
};

// Endpoint Protegido: Proxy del Agente Salesforce
app.post('/api/chat', autenticarToken, async (req, res) => {
    const { mensaje } = req.body;
    
    if (!mensaje) {
        return res.status(400).json({ error: "El payload requiere el atributo 'mensaje'." });
    }

    console.log(`[Proxy] Directiva recibida del UUID ${req.user.id}: ${mensaje}`);

    // SIMULACIÓN: Aquí se implementará la llamada HTTP nativa hacia la API de Salesforce.
    // Introducimos un retraso artificial de 800ms para simular latencia de red corporativa.
    setTimeout(() => {
        res.status(200).json({
            respuesta: `[Salesforce PoC] He recibido su directiva: "${mensaje}". Los datos se encuentran en procesamiento.`
        });
    }, 800);
});

// Inicia el servidor y expone el endpoint de autenticación.
app.listen(PORT, () => {
    console.log(`Servidor HTTP activo y escuchando en el puerto ${PORT}`);
    console.log(`Ruta de autenticación disponible en: http://localhost:${PORT}/api/auth/login`);
});