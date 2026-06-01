require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Error: faltan las credenciales de administrador en el entorno.");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function aprovisionarUsuario(email, password) {
    console.log(`Aprovisionando usuario administrativo: ${email}`);

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (error) {
        console.error("Error en la creación administrativa del usuario:");
        console.error(`Código: ${error.status} | Mensaje: ${error.message}`);
        return;
    }

    console.log("Usuario administrado creado correctamente.");
    console.log(`UUID de usuario: ${data.user.id}`);
}

// Replace the example credentials with valid values for your test environment.
aprovisionarUsuario("cruzmaciasenrique0@gmail.com", "CredencialIT_Segura_2026!");