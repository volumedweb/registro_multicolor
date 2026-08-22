// ============================================================
// Lógica de Tipos de Empaque
// ============================================================
// Responsable de: alta/edición de los tipos de empaque
// disponibles (baldes, cajas, paquetes 4x1, otros).

// ---------- SECCIÓN: Acceso a datos (Supabase) ----------
// Controla: leer y crear filas en la tabla "tipos_empaque". No toca el
// DOM; estas funciones las reutilizan tanto empaques.html como
// realizar-envio.html.

async function listarTiposEmpaque() {
  const { data, error } = await supabaseClient
    .from("tipos_empaque")
    .select("*")
    .order("nombre");

  if (error) {
    mostrarMensaje("No se pudieron cargar los tipos de empaque: " + error.message, "error");
    return [];
  }
  return data;
}

async function crearTipoEmpaque(datosEmpaque) {
  const { data, error } = await supabaseClient
    .from("tipos_empaque")
    .insert({ nombre: datosEmpaque.nombre })
    .select()
    .single();

  if (error) {
    mostrarMensaje("No se pudo guardar el tipo de empaque: " + error.message, "error");
    return null;
  }
  return data;
}

// ---------- SECCIÓN: Interfaz — alta y listado en empaques.html ----------
// Controla: la tabla de tipos de empaque y el formulario de alta.
// Este script también se carga en realizar-envio.html (para reutilizar
// listarTiposEmpaque), donde no existe "form-empaque" — por eso el
// bloque de abajo se sale temprano si no encuentra ese formulario.

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-empaque");
  if (!form) return;

  cargarTablaEmpaques();
  form.addEventListener("submit", manejarAltaEmpaque);
});

/** Trae los tipos de empaque de la base y refresca la tabla en pantalla. */
async function cargarTablaEmpaques() {
  const tipos = await listarTiposEmpaque();
  pintarTablaEmpaques(tipos);
}

/** Dibuja las filas de la tabla de tipos de empaque (o el mensaje de "vacío"). */
function pintarTablaEmpaques(tipos) {
  const tbody = document.querySelector("#tabla-empaques tbody");
  if (!tipos || tipos.length === 0) {
    tbody.innerHTML = `<tr><td>Todavía no hay tipos de empaque registrados.</td></tr>`;
    return;
  }
  tbody.innerHTML = tipos.map((t) => `<tr><td>${t.nombre}</td></tr>`).join("");
}

/** Valida y guarda el formulario de alta de tipo de empaque. */
async function manejarAltaEmpaque(evento) {
  evento.preventDefault();

  const nombre = document.getElementById("nombre-empaque").value.trim();

  if (!nombre) {
    mostrarMensaje("Ingresá el nombre del tipo de empaque.", "error");
    return;
  }

  const creado = await crearTipoEmpaque({ nombre });
  if (!creado) return; // crearTipoEmpaque ya mostró el error

  mostrarMensaje("Tipo de empaque guardado correctamente.");
  evento.target.reset();
  cargarTablaEmpaques();
}
