// ============================================================
// Protección de páginas — requiere sesión iniciada
// ============================================================
// Incluir este script en toda página que no sea login.html, justo
// después de js/supabaseClient.js y antes de cualquier otro script
// de la página. Si no hay sesión activa, redirige a login.html.
//
// Mientras se confirma la sesión, el <body> arranca con el atributo
// "hidden" (puesto a mano en el HTML de cada página) para no mostrar
// nada hasta saber si corresponde mostrarlo o mandar al login.

(async function protegerPagina() {
  const { data } = await supabaseClient.auth.getSession();

  if (!data.session) {
    window.location.href = "login.html";
    return;
  }

  document.body.hidden = false;
})();

// Cierra la sesión y vuelve al login. Se usa desde el link
// "Cerrar sesión" del menú de navegación (ver css/styles.css).
async function cerrarSesion() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const link = document.getElementById("cerrar-sesion");
  if (link) {
    link.addEventListener("click", (evento) => {
      evento.preventDefault();
      cerrarSesion();
    });
  }
});
