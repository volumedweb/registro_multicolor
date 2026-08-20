// ============================================================
// Nota de envío (factura) — lógica de la pantalla
// ============================================================
// Lee ?envio_id=<id> de la URL, trae el envío completo (cabecera +
// cliente + detalle de productos y de empaques) y completa el
// documento imprimible.
//
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
  const { data: envio, error: errorEnvio } = await supabaseClient
    .from("envios")
    .select(
      "numero_envio, fecha, ciudad_destino, nombre_receptor, observaciones, clientes(nombre, telefono, direccion)"
    )
    .eq("id", envioId)
    .single();

  if (errorEnvio || !envio) {
    mostrarMensaje(
      "No se pudo cargar el envío: " + (errorEnvio ? errorEnvio.message : "no encontrado"),
      "error"
    );
    return null;
  }

  const { data: productos, error: errorProductos } = await supabaseClient
    .from("envio_productos")
    .select("cantidad, productos(nombre)")
    .eq("envio_id", envioId);

  if (errorProductos) {
    mostrarMensaje("No se pudo cargar el detalle de productos: " + errorProductos.message, "error");
  }

  const { data: empaques, error: errorEmpaques } = await supabaseClient
    .from("envio_empaques")
    .select("cantidad, tipos_empaque(nombre)")
    .eq("envio_id", envioId);

  if (errorEmpaques) {
    mostrarMensaje("No se pudo cargar el detalle de empaques: " + errorEmpaques.message, "error");
  }

  return {
    numero_envio: envio.numero_envio,
    fecha: envio.fecha,
    ciudad_destino: envio.ciudad_destino,
    nombre_receptor: envio.nombre_receptor,
    observaciones: envio.observaciones,
    cliente: {
      nombre: envio.clientes ? envio.clientes.nombre : "—",
      telefono: envio.clientes ? envio.clientes.telefono : null,
      direccion: envio.clientes ? envio.clientes.direccion : null,
    },
    productos: (productos || []).map((p) => ({
      nombre: p.productos ? p.productos.nombre : "—",
      cantidad: p.cantidad,
    })),
    empaques: (empaques || []).map((e) => ({
      nombre: e.tipos_empaque ? e.tipos_empaque.nombre : "—",
      cantidad: e.cantidad,
    })),
  };
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
