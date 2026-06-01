const supabase = require('./supabase');

async function verificarConexion() {
    console.log("Verificando conectividad con Supabase...");

    const { data, error } = await supabase.auth.getSession();

    if (error) {
        console.error("Fallo en la conexión o en la autorización:");
        console.error(error.message);
    } else {
        console.log("Conexión verificada. La clave pública fue aceptada por Supabase.");
        console.log("Respuesta de sesión:", data);
    }
}

verificarConexion();