require('dotenv').config();
const express = require('express');
const supabase = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Permite recibir y parsear cuerpos JSON en las solicitudes entrantes.
app.use(express.json());

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

// Inicia el servidor y expone el endpoint de autenticación.
app.listen(PORT, () => {
    console.log(`Servidor HTTP activo y escuchando en el puerto ${PORT}`);
    console.log(`Ruta de autenticación disponible en: http://localhost:${PORT}/api/auth/login`);
});