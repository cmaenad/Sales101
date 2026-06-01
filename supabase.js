require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Error: SUPABASE_URL o SUPABASE_ANON_KEY no definidas.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
module.exports = supabase;