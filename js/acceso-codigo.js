// ============================================================
// Ingreso con código — administrador o veedor
// ============================================================
// Un solo campo (el código). El código identifica tanto a la
// persona como a la contraseña de su cuenta real de Supabase Auth
// (ver supabase/migracion_roles_y_codigos.sql: la función
// "login_por_codigo" busca a qué cuenta pertenece ese código sin
// exponer la tabla "perfiles" completa). Con el email encontrado se
// hace un login normal y, según el rol guardado en "perfiles", se
// redirige a la app completa (administrador) o a veedor.html
// (veedor).

document.addEventListener("DOMContentLoaded", async () => {
  // Si ya había sesión iniciada (ej. se volvió a esta pantalla por
  // error), no hace falta pedir el código de nuevo.
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    await redirigirSegunRol();
    return;
  }

  document
    .getElementById("form-codigo")
    .addEventListener("submit", manejarLoginConCodigo);
});

async function manejarLoginConCodigo(evento) {
  evento.preventDefault();

  const codigo = document.getElementById("codigo").value.trim();
  if (!codigo) return;

  const { data: email, error: errorRpc } = await supabaseClient.rpc(
    "login_por_codigo",
    { codigo_ingresado: codigo }
  );

  if (errorRpc || !email) {
    mostrarMensaje("Código inválido o inactivo.", "error");
    return;
  }

  const { error: errorLogin } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: codigo,
  });

  if (errorLogin) {
    mostrarMensaje("Código inválido o inactivo.", "error");
    return;
  }

  await redirigirSegunRol();
}

async function redirigirSegunRol() {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  const { data: perfil, error } = await supabaseClient
    .from("perfiles")
    .select("rol, activo")
    .eq("id", user.id)
    .single();

  if (error || !perfil || !perfil.activo) {
    mostrarMensaje(
      "Tu acceso no está activo. Consultá con quien te dio el código.",
      "error"
    );
    await supabaseClient.auth.signOut();
    return;
  }

  window.location.href = perfil.rol === "veedor" ? "veedor.html" : "index.html";
}
