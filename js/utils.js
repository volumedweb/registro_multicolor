// ============================================================
// Funciones utilitarias comunes
// ============================================================

// ---------- SECCIÓN: Formato de fechas ----------
// Controla: cómo se muestran las fechas en toda la app (dd/mm/aaaa,
// con hora solo cuando el dato original la trae).

/** Formatea una fecha a formato local legible (dd/mm/aaaa[ hh:mm]). */
function formatearFecha(fechaIso) {
  // "envios.fecha" es una columna `date` (sin hora), ej. "2026-08-20".
  // Si se pasa tal cual a `new Date(...)`, JS la interpreta como
  // medianoche UTC, y en husos horarios negativos (ej. Bolivia, UTC-4)
  // puede mostrar el día anterior. Para esos casos se arma la fecha a
  // mano, sin pasar por Date ni mostrar una hora que no existe.
  const esSoloFecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaIso);
  if (esSoloFecha) {
    const [anio, mes, dia] = fechaIso.split("-");
    return `${dia}/${mes}/${anio}`;
  }

  const fecha = new Date(fechaIso);
  return fecha.toLocaleString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------- SECCIÓN: Mensajes al usuario ----------
// Controla: el único punto por donde se avisan errores o confirmaciones
// en toda la app (todos los demás archivos llaman a esta función en vez
// de usar alert()/console.log() directamente).
//
// Se muestra como una notificación flotante (toast) que aparece y
// desaparece sola: no bloquea la pantalla ni necesita que el usuario
// haga click en "Aceptar" para seguir usando el formulario.

/** Trae (o crea si todavía no existe) el contenedor fijo donde se
 * apilan las notificaciones flotantes. Se agrega una sola vez por
 * página, la primera vez que se llama a mostrarMensaje(). */
function obtenerContenedorToasts() {
  let contenedor = document.getElementById("toast-contenedor");
  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.id = "toast-contenedor";
    document.body.appendChild(contenedor);
  }
  return contenedor;
}

/** Muestra una notificación flotante de éxito o error que se cierra
 * sola, sin que el usuario tenga que confirmar nada.
 *
 * `opciones.duracion` (ms, por defecto 2600) controla cuánto tiempo
 * queda visible antes de empezar a desaparecer. `opciones.alCerrar`
 * es un callback opcional que se ejecuta recién cuando la
 * notificación terminó de desaparecer de la pantalla — lo usa por
 * ejemplo "Realizar envío" para limpiar el formulario recién
 * después de que el usuario alcanzó a leer el aviso. */
function mostrarMensaje(texto, tipo = "exito", opciones = {}) {
  console.log(`[${tipo}] ${texto}`);

  const duracion = opciones.duracion || 2600;
  const contenedor = obtenerContenedorToasts();

  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.textContent = texto;
  contenedor.appendChild(toast);

  // Se agrega la clase "visible" en el siguiente frame para que la
  // transición de entrada (definida en CSS) se note.
  requestAnimationFrame(() => toast.classList.add("toast-visible"));

  setTimeout(() => {
    toast.classList.remove("toast-visible");
    toast.classList.add("toast-saliendo");
    // Espera a que termine la transición de salida (ver CSS) antes de
    // sacar el elemento del DOM y recién ahí avisar con alCerrar.
    setTimeout(() => {
      toast.remove();
      if (typeof opciones.alCerrar === "function") opciones.alCerrar();
    }, 300);
  }, duracion);
}

// ---------- SECCIÓN: Validaciones de formulario ----------
// Controla: reglas de validación compartidas por los formularios que
// piden cantidades (productos, empaques) antes de agregarlas a un envío.

/** Valida que un valor numérico sea mayor a cero. */
function esCantidadValida(valor) {
  const numero = Number(valor);
  return !Number.isNaN(numero) && numero > 0;
}
