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
// solo aplica a esta página standalone, con el menú de imprimir y
// ?envio_id en la URL) se sale temprano si no encuentra "btn-imprimir".
//
// El botón "Imprimir" es en realidad un menú desplegable con 3
// plantillas de detalle: por producto, por paquete, o completa (la
// que ya existía). Los datos y el código no cambian en nada — es el
// mismo obtenerEnvioCompleto()/pintarFactura() de siempre — lo único
// que cambia es qué bloque de detalle queda visible antes de imprimir.

// ---------- SECCIÓN: Arranque de la página (solo factura.html standalone) ----------
// Controla: lee ?envio_id de la URL, trae el envío, lo pinta y engancha
// el menú de imprimir. Se sale temprano si el script se cargó desde
// historial.html (no hay botón "btn-imprimir" en ese caso, el pintado
// lo dispara historial.js).
document.addEventListener("DOMContentLoaded", async () => {
  const btnImprimir = document.getElementById("btn-imprimir");
  if (!btnImprimir) return; // se cargó desde historial.html, no desde factura.html

  const menuOpciones = document.getElementById("menu-imprimir-opciones");

  // Abre/cierra el menú al hacer click en "Imprimir".
  btnImprimir.addEventListener("click", (evento) => {
    evento.stopPropagation();
    menuOpciones.hidden = !menuOpciones.hidden;
  });

  // Cada opción del menú aplica su plantilla de detalle y manda a
  // imprimir directamente (no hace falta un segundo click).
  menuOpciones.querySelectorAll("button[data-modo]").forEach((boton) => {
    boton.addEventListener("click", () => {
      aplicarModoDetalle(boton.dataset.modo);
      menuOpciones.hidden = true;
      window.print();
    });
  });

  // Cierra el menú si se hace click afuera.
  document.addEventListener("click", () => {
    menuOpciones.hidden = true;
  });

  // Después de imprimir (o de cancelar el diálogo de impresión), la
  // pantalla vuelve a mostrar el detalle completo — la plantilla
  // elegida solo afecta a esa impresión puntual.
  window.addEventListener("afterprint", () => aplicarModoDetalle("completo"));

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

// ---------- SECCIÓN: Plantillas de detalle (solo producto / solo paquete / completo) ----------
// Controla: qué bloque de detalle (productos, empaques, o ambos) queda
// visible en la nota. No toca los datos ni cómo se traen — solo
// muestra u oculta los bloques ya pintados por pintarFactura().

/** Muestra solo el detalle de productos, solo el de empaques, o ambos
 * ("completo"), según la opción elegida en el menú de imprimir. */
function aplicarModoDetalle(modo) {
  const seccionProductos = document.querySelector('[data-seccion="productos"]');
  const seccionEmpaques = document.querySelector('[data-seccion="empaques"]');
  if (!seccionProductos || !seccionEmpaques) return;

  seccionProductos.hidden = modo === "paquete";
  seccionEmpaques.hidden = modo === "producto";
}

// ---------- SECCIÓN: Acceso a datos (Supabase) ----------
// Controla: trae del backend la cabecera del envío junto con sus dos
// detalles independientes (productos y empaques) y los combina en un
// solo objeto listo para pintar. La usan tanto factura.html como el
// modal de historial.html.

/** Trae cabecera + cliente + detalle de productos y de empaques de un
 * envío, combinados en un solo objeto para pintar. */
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

// ---------- SECCIÓN: Pintado del documento ----------
// Controla: rellena todos los campos del markup de la nota de envío
// (cliente, fecha, receptor, ciudad, tablas de detalle, observaciones).
// Estas dos funciones son las que reutiliza js/historial.js dentro del
// modal — mismo markup, mismos ids.

/** Completa todos los campos de texto y las dos tablas de detalle de
 * la nota de envío a partir del objeto armado por obtenerEnvioCompleto(). */
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

/** Dibuja las filas de una tabla de detalle (productos o empaques),
 * o el mensaje de "vacío" si no hay items. Genérica: se usa para
 * ambas tablas. */
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
