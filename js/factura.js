// ============================================================
// Nota de envío (factura) — lógica de la pantalla
// ============================================================
// Lee ?envio_id=<id> de la URL, trae el envío completo (cabecera +
// cliente + detalle de productos y de empaques) y completa el
// documento imprimible.
//
// TODO: implementar la consulta real a Supabase una vez conectado.
// obtenerEnvioCompleto() debería resolver algo así:
// {
//   numero_envio, fecha, ciudad_destino, nombre_receptor, observaciones,
//   cliente: { nombre, telefono, direccion },
//   productos: [{ nombre, cantidad }, ...],
//   empaques:  [{ nombre, cantidad }, ...],
// }
// telefono y direccion del cliente son solo para imprimir esta nota —
// no se vuelven a guardar en ningún lado desde acá.
//
// pintarFactura(), pintarFilas() y obtenerEnvioCompleto() son funciones
// reutilizadas por js/historial.js para pintar la misma nota adentro del
// modal (mismo markup, mismos ids) — por eso el bloque de abajo (que
// solo aplica a esta página standalone, con botón de imprimir y
// ?envio_id en la URL) se sale temprano si no encuentra "btn-imprimir".

document.addEventListener("DOMContentLoaded", async () => {
  const btnImprimir = document.getElementById("btn-imprimir");
  if (!btnImprimir) return; // se cargó desde historial.html, no desde factura.html

  btnImprimir.addEventListener("click", () => window.print());

  const parametros = new URLSearchParams(window.location.search);
  const envioId = parametros.get("envio_id");

  if (!envioId) {
    mostrarMensaje("Falta el envío a mostrar (envio_id) en la URL.", "error");
    return;
  }

  const envio = await obtenerEnvioCompleto(envioId);
  if (!envio) {
    mostrarMensaje("No se pudo cargar ese envío.", "error");
    return;
  }

  pintarFactura(envio);
});

async function obtenerEnvioCompleto(envioId) {
  // TODO: traer de Supabase:
  //  - envios (numero_envio, fecha, ciudad_destino, nombre_receptor,
  //    observaciones) por id
  //  - clientes (nombre, telefono, direccion) por envios.cliente_id
  //  - envio_productos + productos (nombre) por envio_id
  //  - envio_empaques + tipos_empaque (nombre) por envio_id
}

function pintarFactura(envio) {
  document.getElementById("factura-numero").textContent = envio.numero_envio;
  document.getElementById("factura-cliente").textContent = envio.cliente.nombre;
  document.getElementById("factura-fecha").textContent = formatearFecha(envio.fecha);
  document.getElementById("factura-receptor").textContent = envio.nombre_receptor;
  document.getElementById("factura-ciudad").textContent = envio.ciudad_destino;
  document.getElementById("factura-telefono").textContent = envio.cliente.telefono || "—";
  document.getElementById("factura-direccion").textContent = envio.cliente.direccion || "—";

  pintarFilas("factura-tabla-productos", envio.productos, "Sin productos en este envío.");
  pintarFilas("factura-tabla-empaques", envio.empaques, "Sin empaques en este envío.");

  const observacionesEl = document.getElementById("factura-observaciones");
  if (envio.observaciones) {
    observacionesEl.textContent = `Observaciones: ${envio.observaciones}`;
    observacionesEl.hidden = false;
  }
}

function pintarFilas(tbodyId, items, textoVacio) {
  const tbody = document.getElementById(tbodyId);
  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2">${textoVacio}</td></tr>`;
    return;
  }
  tbody.innerHTML = items
    .map((item) => `<tr><td>${item.nombre}</td><td>${item.cantidad}</td></tr>`)
    .join("");
}
