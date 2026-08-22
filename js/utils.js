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

/** Muestra un mensaje simple de éxito o error en pantalla. */
function mostrarMensaje(texto, tipo = "exito") {
  console.log(`[${tipo}] ${texto}`);
  // TODO: reemplazar por un componente visual (toast/alerta) cuando se
  // defina el diseño final de la interfaz.
  alert(texto);
}

// ---------- SECCIÓN: Validaciones de formulario ----------
// Controla: reglas de validación compartidas por los formularios que
// piden cantidades (productos, empaques) antes de agregarlas a un envío.

/** Valida que un valor numérico sea mayor a cero. */
function esCantidadValida(valor) {
  const numero = Number(valor);
  return !Number.isNaN(numero) && numero > 0;
}
