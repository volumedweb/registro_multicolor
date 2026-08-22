// ============================================================
// Login — acceso del usuario administrador
// ============================================================
// Usa la autenticación de Supabase (ver js/supabaseClient.js).
// Al loguearse correctamente redirige a index.html. Las demás
// páginas (todas menos esta) se protegen con js/auth.js, que
// redirige para acá si no hay sesión activa.

// ---------- SECCIÓN: Arranque de la página ----------
// Controla: si ya hay sesión activa, salta directo a index.html; si
// no, deja el formulario listo para recibir el submit.
document.addEventListener("DOMContentLoaded", async () => {
  // Si ya había una sesión iniciada (ej. se volvió a esta pantalla
  // por error), no hace falta loguearse de nuevo.
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("form-login").addEventListener("submit", manejarLogin);
});

// ---------- SECCIÓN: Envío del formulario de login ----------
// Controla: manda usuario/contraseña a Supabase Auth; si es correcto
// redirige a index.html, si no muestra un mensaje de error.
async function manejarLogin(evento) {
  evento.preventDefault();

  const usuario = document.getElementById("usuario").value;
  const password = document.getElementById("password").value;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: usuario,
    password: password,
  });

  if (error) {
    mostrarMensaje("Usuario o contraseña incorrectos.", "error");
    return;
  }

  window.location.href = "index.html";
}
