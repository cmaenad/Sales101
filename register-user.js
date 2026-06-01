const supabase = require('./supabase');

async function registrarNuevoUsuario(email, password) {
    console.log(`Iniciando registro de usuario: ${email}`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });

    if (error) {
        console.error("Error en el registro de usuario:");
        console.error(`Código: ${error.status} | Mensaje: ${error.message}`);
        return;
    }

    console.log("Registro completado con éxito.");
    console.log(`UUID de usuario: ${data.user.id}`);
    console.log(`Confirmación de correo: ${data.user.email_confirmed_at ? 'Confirmado' : 'Pendiente'}`);
    console.log("Verifica la propagación del trigger y los permisos en tu proyecto Supabase.");
}

// Ejemplo de uso: cambia estas credenciales a valores válidos de tu entorno de prueba.
registrarNuevoUsuario("usuario@example.com", "PasswordEstructural123!");