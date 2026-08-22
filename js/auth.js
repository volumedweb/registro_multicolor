// ============================================================
// Protección de páginas — requiere sesión iniciada + rol válido
// ============================================================
// Incluir este script en toda página que no sea login.html ni
// acceso-codigo.html, justo después de js/supabaseClient.js y antes
// de cualquier otro script de la página. Si no hay sesión activa,
// redirige a login.html.
//
// Además de la sesión, ahora se consulta la tabla "perfiles" (ver
// supabase/schema.sql y supabase/migracion_roles_y_codigos.sql) para
// saber el rol de quien inició sesión (dueno / administrador /
// veedor). El veedor solo puede ver veedor.html — si entra por URL a
// cualquier otra página se lo manda para allá. El resto de roles no
// tiene nada que hacer en veedor.html, así que se los manda a
// index.html. Las páginas administrativas no necesitan marcar nada
// especial; veedor.html se identifica agregando
// data-pagina-veedor="true" en su <body>.
//
// Mientras se confirma la sesión, el <body> arranca con el atributo
// "hidden" (puesto a mano en el HTML de cada página) para no mostrar
// nada hasta saber si corresponde mostrarlo o mandar al login.

// ---------- SECCIÓN: Estado global del perfil logueado ----------
// Controla: guarda el perfil (rol, nombre, activo) de quien inició
// sesión para que el resto de la página lo pueda leer vía
// `window.perfilActual` sin volver a consultarlo.
let perfilActual = null;

// ---------- SECCIÓN: Guardia de acceso (se ejecuta al cargar la página) ----------
// Controla: si no hay sesión, o el perfil no existe/está desactivado,
// manda al login. Si el rol no coincide con el tipo de página
// (veedor vs. resto), redirige a donde sí corresponde. Recién si todo
// está en orden, muestra el <body> (que arranca oculto con `hidden`).
(async function protegerPagina() {
  const { data } = await supabaseClient.auth.getSession();

  if (!data.session) {
    window.location.href = "login.html";
    return;
  }

  const { data: perfil, error } = await supabaseClient
    .from("perfiles")
    .select("rol, nombre, activo")
    .eq("id", data.session.user.id)
    .single();

  // Sin perfil (o desactivado por el dueño/administrador) = no entra,
  // aunque la sesión de Supabase siga técnicamente vigente.
  if (error || !perfil || !perfil.activo) {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
    return;
  }

  perfilActual = perfil;
  window.perfilActual = perfil;

  const esPaginaVeedor = document.body.dataset.paginaVeedor === "true";

  if (perfil.rol === "veedor" && !esPaginaVeedor) {
    window.location.href = "veedor.html";
    return;
  }

  if (perfil.rol !== "veedor" && esPaginaVeedor) {
    window.location.href = "index.html";
    return;
  }

  mostrarBadgeRol(perfil);
  document.body.hidden = false;
})();

// ---------- SECCIÓN: Etiqueta visual del rol ----------
// Controla: el texto y el badge que muestran, junto al nombre de la
// app, con qué rol se está trabajando (Dueño / Administrador / Veedor).

/** Texto legible para cada valor de "perfiles.rol". */
function nombreRol(rol) {
  if (rol === "dueno") return "Dueño";
  if (rol === "administrador") return "Administrador";
  if (rol === "veedor") return "Veedor";
  return rol;
}

/** Agrega la etiqueta de rol (ej. "Administrador") junto al nombre de
 * la app en el header, para que siempre quede claro con qué sesión se
 * está trabajando. No hace nada si la página no tiene ese header. */
function mostrarBadgeRol(perfil) {
  const marca = document.querySelector("header.app-header strong");
  if (!marca) return;
  const badge = document.createElement("span");
  badge.className = "badge-rol";
  badge.textContent = nombreRol(perfil.rol);
  marca.insertAdjacentElement("afterend", badge);
}

// ---------- SECCIÓN: Cerrar sesión ----------
// Controla: cerrar la sesión de Supabase y volver al login. Se
// engancha al link "Cerrar sesión" del menú (ver css/styles.css).

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
