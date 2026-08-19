// ============================================================
// Conexión a Supabase
// ============================================================
// TODO: reemplazar con los datos reales del proyecto de Supabase
// (Project Settings -> API). La "anon key" es segura de exponer
// en el frontend siempre que las políticas de Row Level Security
// (RLS) estén correctamente configuradas en las tablas.

const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
const SUPABASE_ANON_KEY = "TU-ANON-KEY";

// Requiere incluir el script del SDK de Supabase en el HTML antes de este
// archivo, por ejemplo:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
