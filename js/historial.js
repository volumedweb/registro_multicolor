// ============================================================
// Lógica de Historial
// ============================================================
// Responsable de: listar los envíos como filas clicables con
// badge de estado, abrir el detalle en un modal y gestionar
// las acciones de estado: Editar, Marcar entregado, Cancelar.
//
// Reutiliza pintarFactura() / pintarFilas() / obtenerEnvioCompleto()
// de js/factura.js para no duplicar la lógica de la nota.

// ---------- SECCIÓN: Estado ----------
let historialCache = [];
let envioIdEnModal = null;
let estadoEnModal = null;

// ---------- SECCIÓN: Arranque de la página ----------
document.addEventListener("DOMContentLoaded", () => {
  cargarHistorial();

  document
    .getElementById("btn-buscar-historial")
    .addEventListener("click", filtrarHistorial);
  document
    .getElementById("buscador-historial")
    .addEventListener("keydown", (evento) => {
      if (evento.key === "Enter") filtrarHistorial();
    });
  document
    .getElementById("btn-cerrar-modal")
    .addEventListener("click", cerrarModalFactura);
  document
    .getElementById("modal-factura")
    .addEventListener("click", (evento) => {
      if (evento.target.id === "modal-factura") cerrarModalFactura();
    });

  // Menú desplegable "Descargar PDF"
  const btnDescargar = document.getElementById("btn-descargar-pdf");
  const menuDescargarOpciones = document.getElementById("menu-descargar-opciones");

  btnDescargar.addEventListener("click", (evento) => {
    evento.stopPropagation();
    menuDescargarOpciones.hidden = !menuDescargarOpciones.hidden;
  });

  menuDescargarOpciones.querySelectorAll("button[data-modo]").forEach((boton) => {
    boton.addEventListener("click", () => {
      menuDescargarOpciones.hidden = true;
      descargarFacturaPdf(boton.dataset.modo);
    });
  });

  document.addEventListener("click", () => {
    menuDescargarOpciones.hidden = true;
  });

  document
    .getElementById("btn-eliminar-envio")
    .addEventListener("click", manejarEliminarEnvio);

  // Botones de acción de estado
  document
    .getElementById("btn-editar-historial")
    .addEventListener("click", manejarEditar);
  document
    .getElementById("btn-marcar-entregado")
    .addEventListener("click", manejarEntregado);
  document
    .getElementById("btn-marcar-cancelado")
    .addEventListener("click", manejarCancelado);
});

// ---------- SECCIÓN: Listado ----------

/** Trae los envíos y refresca la lista en pantalla. */
async function cargarHistorial() {
  historialCache = (await listarHistorial()) || [];
  pintarHistorial(historialCache);
}

/** Consulta Supabase con estado incluido y arma un resumen por envío. */
async function listarHistorial() {
  const { data: envios, error } = await supabaseClient
    .from("envios")
    .select(
      "id, numero_envio, creado_en, estado, clientes(nombre), envio_productos(cantidad), envio_empaques(cantidad)"
    )
    .order("creado_en", { ascending: false });

  if (error) {
    mostrarMensaje("No se pudo cargar el historial: " + error.message, "error");
    return [];
  }

  return (envios || []).map((envio) => {
    const totalProductos = (envio.envio_productos || []).length;
    const totalEmpaques  = (envio.envio_empaques  || []).length;
    const partes = [];
    if (totalProductos > 0)
      partes.push(`${totalProductos} producto${totalProductos === 1 ? "" : "s"}`);
    if (totalEmpaques > 0)
      partes.push(`${totalEmpaques} empaque${totalEmpaques === 1 ? "" : "s"}`);

    return {
      id: envio.id,
      numero_envio: envio.numero_envio,
      estado: envio.estado || "activo",
      cliente_nombre: envio.clientes ? envio.clientes.nombre : "—",
      descripcion: partes.join(" · ") || "Sin detalle",
    };
  });
}

/** Filtra historialCache en memoria por lo tipeado en el buscador. */
function filtrarHistorial() {
  const texto = document
    .getElementById("buscador-historial")
    .value.trim()
    .toLowerCase();

  if (!texto) {
    pintarHistorial(historialCache);
    return;
  }

  const filtrados = historialCache.filter(
    (envio) =>
      envio.cliente_nombre.toLowerCase().includes(texto) ||
      envio.numero_envio.toLowerCase().includes(texto) ||
      (envio.descripcion || "").toLowerCase().includes(texto)
  );
  pintarHistorial(filtrados);
}

/** Texto del badge según el estado del envío. */
function estadoTexto(estado) {
  if (estado === "entregado") return "✔ Entregado";
  if (estado === "cancelado") return "✕ Cancelado";
  return "● Activo";
}

/** Dibuja la lista de filas con badge de estado y engancha el click. */
function pintarHistorial(items) {
  const contenedor = document.getElementById("historial-lista");

  if (!items || items.length === 0) {
    contenedor.innerHTML = `<p class="lista-vacio">Todavía no hay envíos registrados.</p>`;
    return;
  }

  contenedor.innerHTML = items
    .map(
      (envio) => `
        <button type="button" class="historial-fila estado-${envio.estado}" data-envio-id="${envio.id}">
          <span class="historial-cliente">${envio.cliente_nombre}</span>
          <span class="historial-descripcion">${envio.descripcion || ""}</span>
          <span class="historial-codigo">${envio.numero_envio}</span>
          <span class="badge-estado badge-${envio.estado}">${estadoTexto(envio.estado)}</span>
        </button>`
    )
    .join("");

  contenedor.querySelectorAll(".historial-fila").forEach((fila) => {
    fila.addEventListener("click", () => abrirModalFactura(fila.dataset.envioId));
  });
}

// ---------- SECCIÓN: Modal con la nota de envío ----------

/** Carga el detalle del envío, decide qué botones mostrar y abre el modal. */
async function abrirModalFactura(envioId) {
  const envio = await obtenerEnvioCompleto(envioId); // definida en js/factura.js
  if (!envio) {
    mostrarMensaje("No se pudo cargar ese envío.", "error");
    return;
  }

  envioIdEnModal = envioId;

  // Estado desde el caché del listado (obtenerEnvioCompleto no lo devuelve)
  const cacheItem = historialCache.find((e) => e.id === envioId);
  estadoEnModal   = cacheItem ? cacheItem.estado : "activo";

  pintarFactura(envio); // definida en js/factura.js
  mostrarBotonesSegunEstado(estadoEnModal);
  document.getElementById("modal-factura").hidden = false;
}

/** Muestra u oculta las secciones del modal según el estado del envío. */
function mostrarBotonesSegunEstado(estado) {
  const accionesActivo = document.getElementById("acciones-activo");
  const avisoEntregado = document.getElementById("aviso-entregado");
  const avisoCancelado = document.getElementById("aviso-cancelado");

  accionesActivo.hidden = estado !== "activo";
  avisoEntregado.hidden = estado !== "entregado";
  avisoCancelado.hidden = estado !== "cancelado";
}

/** Oculta el modal y limpia su estado interno. */
function cerrarModalFactura() {
  document.getElementById("modal-factura").hidden = true;
  document.getElementById("menu-descargar-opciones").hidden = true;
  aplicarModoDetalle("completo"); // definida en js/factura.js
  envioIdEnModal = null;
  estadoEnModal  = null;
}

// ---------- SECCIÓN: Acciones de estado ----------

/** Redirige a realizar-envio.html con el parámetro ?editar=<id>. */
function manejarEditar() {
  if (!envioIdEnModal) return;
  window.location.href = `realizar-envio.html?editar=${envioIdEnModal}`;
}

/** Marca el envío como entregado — el stock NO se repone (los bienes ya salieron). */
async function manejarEntregado() {
  if (!envioIdEnModal) return;
  const numero = document.getElementById("factura-numero").textContent;

  const { error } = await supabaseClient
    .from("envios")
    .update({ estado: "entregado" })
    .eq("id", envioIdEnModal);

  if (error) {
    mostrarMensaje("No se pudo marcar como entregado: " + error.message, "error");
    return;
  }

  mostrarMensaje(`Envío ${numero} marcado como entregado.`, "exito");
  cerrarModalFactura();
  cargarHistorial();
}

/** Cancela el envío y repone el stock de cada producto manualmente
 * (no hay trigger automático para restaurar al cancelar). */
async function manejarCancelado() {
  if (!envioIdEnModal) return;
  const numero = document.getElementById("factura-numero").textContent;

  // 1. Obtener líneas de producto para saber cuánto reponer
  const { data: productos, error: errorProd } = await supabaseClient
    .from("envio_productos")
    .select("producto_id, cantidad")
    .eq("envio_id", envioIdEnModal);

  if (errorProd) {
    mostrarMensaje(
      "No se pudo obtener el detalle para reponer el stock: " + errorProd.message,
      "error"
    );
    return;
  }

  // 2. Reponer stock de cada producto (lectura → suma → escritura)
  for (const p of productos || []) {
    const { data: prod } = await supabaseClient
      .from("productos")
      .select("stock")
      .eq("id", p.producto_id)
      .single();
    if (prod) {
      await supabaseClient
        .from("productos")
        .update({ stock: prod.stock + p.cantidad })
        .eq("id", p.producto_id);
    }
  }

  // 3. Marcar el envío como cancelado
  const { error } = await supabaseClient
    .from("envios")
    .update({ estado: "cancelado" })
    .eq("id", envioIdEnModal);

  if (error) {
    mostrarMensaje("No se pudo cancelar el envío: " + error.message, "error");
    return;
  }

  mostrarMensaje(`Envío ${numero} cancelado — el stock fue repuesto.`, "exito");
  cerrarModalFactura();
  cargarHistorial();
}

// ---------- SECCIÓN: Descarga en PDF (tamaño carta) ----------

async function descargarFacturaPdf(modo = "completo") {
  aplicarModoDetalle(modo);

  const elemento = document.getElementById("factura-modal-contenido");
  const numero   = document.getElementById("factura-numero").textContent;
  const sufijo   = modo === "completo" ? "" : `-${modo}`;

  const overlay             = document.getElementById("modal-factura");
  const scrollModalPrevio   = overlay ? overlay.scrollTop : 0;
  const scrollPaginaPrevioX = window.scrollX;
  const scrollPaginaPrevioY = window.scrollY;

  if (overlay) overlay.scrollTop = 0;
  window.scrollTo(0, 0);

  await html2pdf()
    .set({
      margin: 0.4,
      filename: `nota-envio-${numero}${sufijo}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, scrollX: 0, scrollY: 0 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    })
    .from(elemento)
    .save();

  if (overlay) overlay.scrollTop = scrollModalPrevio;
  window.scrollTo(scrollPaginaPrevioX, scrollPaginaPrevioY);

  aplicarModoDetalle("completo");
}

// ---------- SECCIÓN: Eliminar un envío del historial ----------

/** Elimina el envío abierto en el modal (cascada en BD).
 * NO repone stock — para eso está "Cancelar envío". */
async function manejarEliminarEnvio() {
  if (!envioIdEnModal) return;

  const numero = document.getElementById("factura-numero").textContent;

  const { error } = await supabaseClient
    .from("envios")
    .delete()
    .eq("id", envioIdEnModal);

  if (error) {
    mostrarMensaje("No se pudo eliminar el envío: " + error.message, "error");
    return;
  }

  mostrarMensaje(`Envío ${numero} eliminado del historial (no repone el stock descontado).`);
  cerrarModalFactura();
  cargarHistorial();
}
