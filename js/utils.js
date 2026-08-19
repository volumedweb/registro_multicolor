// ============================================================
// Funciones utilitarias comunes
// ============================================================

/** Formatea una fecha ISO a formato local legible (dd/mm/aaaa hh:mm). */
function formatearFecha(fechaIso) {
  const fecha = new Date(fechaIso);
  return fecha.toLocaleString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Muestra un mensaje simple de éxito o error en pantalla. */
function mostrarMensaje(texto, tipo = "exito") {
  console.log(`[${tipo}] ${texto}`);
  // TODO: reemplazar por un componente visual (toast/alerta) cuando se
  // defina el diseño final de la interfaz.
  alert(texto);
}

/** Valida que un valor numérico sea mayor a cero. */
function esCantidadValida(valor) {
  const numero = Number(valor);
  return !Number.isNaN(numero) && numero > 0;
}
