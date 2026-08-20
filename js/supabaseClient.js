// ============================================================
// Conexión a Supabase
// ============================================================
// Datos reales del proyecto (Settings -> API Keys). La publishable
// key es segura de exponer en el frontend porque las políticas de
// Row Level Security (RLS) ya están aplicadas (ver supabase/rls.sql):
// sin sesión iniciada, esta key sola no permite leer ni escribir nada.

const SUPABASE_URL = "https://lvrpptaczxtbivlhkbsy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_H392zh5asyxKPOCwvxz9yQ_Fan1ROgi";

// Requiere incluir el script del SDK de Supabase en el HTML antes de este
// archivo, por ejemplo:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
