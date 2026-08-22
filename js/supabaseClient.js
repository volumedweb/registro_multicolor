// ============================================================
// Conexión a Supabase
// ============================================================
// Datos reales del proyecto (Settings -> API Keys). La publishable
// key es segura de exponer en el frontend porque las políticas de
// Row Level Security (RLS) ya están aplicadas (ver supabase/rls.sql):
// sin sesión iniciada, esta key sola no permite leer ni escribir nada.

// ---------- SECCIÓN: Credenciales del proyecto ----------
// Controla: a qué proyecto de Supabase se conecta la app y con qué
// clave pública. No hay nada más que configurar acá.
const SUPABASE_URL = "https://lvrpptaczxtbivlhkbsy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_H392zh5asyxKPOCwvxz9yQ_Fan1ROgi";

// Requiere incluir el script del SDK de Supabase en el HTML antes de este
// archivo, por ejemplo:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// ---------- SECCIÓN: Cliente global de Supabase ----------
// Controla: crea la instancia única `supabaseClient` que usan TODOS los
// demás archivos .js del proyecto para leer/escribir en la base de datos
// y para manejar la sesión (login/logout). Por eso este script debe ir
// cargado antes que cualquier otro <script> de la página.
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
