// ============================================================
// Login — acceso del usuario administrador
// ============================================================
// Usa la autenticación de Supabase (ver js/supabaseClient.js).
// Al loguearse correctamente redirige a index.html.
//
// TODO: una vez conectado Supabase de verdad, revisar también
// que las páginas protegidas (todas menos login.html) redirijan
// acá cuando no haya una sesión activa.

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("form-login").addEventListener("submit", manejarLogin);
});

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
