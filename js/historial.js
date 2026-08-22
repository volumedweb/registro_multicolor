// ============================================================
// Lógica de Historial
// ============================================================
// Responsable de: listar los envíos como filas clicables (cliente,
// resumen, código) con un buscador arriba, y abrir el detalle de
// cada uno en un modal con el mismo diseño de factura.html.
//
// Reutiliza pintarFactura() / pintarFilas() / obtenerEnvioCompleto()
// de js/factura.js (mismo markup, mismos ids, adentro del modal en
// vez de una página aparte) para no duplicar esa lógica.

// ---------- SECCIÓN: Estado ----------
// Controla: guarda en memoria la última lista de envíos traída de la
// base, para poder filtrarla en el buscador sin volver a consultar
// Supabase cada vez que se tipea.
let historialCache = [];

// ---------- SECCIÓN: Arranque de la página ----------
// Controla: carga el historial inicial y engancha todos los eventos
// de la pantalla (buscador, cerrar modal, descargar PDF).
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
  document
    .getElementById("btn-descargar-pdf")
    .addEventListener("click", descargarFacturaPdf);
});

// ---------- SECCIÓN: Listado ----------
// Controla: trae los envíos desde Supabase (con conteo de productos y
// empaques ya armado) y los dibuja como filas clicables.

/** Trae los envíos y refresca la lista en pantalla. */
async function cargarHistorial() {
  historialCache = (await listarHistorial()) || [];
  pintarHistorial(historialCache);
}

/** Consulta Supabase y arma, por cada envío, un resumen legible
 * ("3 productos · 1 empaque") a partir de sus detalles relacionados. */
async function listarHistorial(filtros = {}) {
  const { data: envios, error } = await supabaseClient
    .from("envios")
    .select(
      "id, numero_envio, creado_en, clientes(nombre), envio_productos(cantidad), envio_empaques(cantidad)"
    )
    .order("creado_en", { ascending: false });

  if (error) {
    mostrarMensaje("No se pudo cargar el historial: " + error.message, "error");
    return [];
  }

  return (envios || []).map((envio) => {
    const totalProductos = (envio.envio_productos || []).length;
    const totalEmpaques = (envio.envio_empaques || []).length;
    const partes = [];
    if (totalProductos > 0) {
      partes.push(`${totalProductos} producto${totalProductos === 1 ? "" : "s"}`);
    }
    if (totalEmpaques > 0) {
      partes.push(`${totalEmpaques} empaque${totalEmpaques === 1 ? "" : "s"}`);
    }

    return {
      id: envio.id,
      numero_envio: envio.numero_envio,
      cliente_nombre: envio.clientes ? envio.clientes.nombre : "—",
      descripcion: partes.join(" · ") || "Sin detalle",
    };
  });
}

/** Filtra `historialCache` en memoria por lo tipeado en el buscador
 * (cliente, código de envío o descripción) y repinta la lista. */
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

/** Dibuja la lista de filas de envíos (o el mensaje de "vacío") y les
 * engancha el click para abrir el detalle en el modal. */
function pintarHistorial(items) {
  const contenedor = document.getElementById("historial-lista");

  if (!items || items.length === 0) {
    contenedor.innerHTML = `<p class="lista-vacio">Todavía no hay envíos registrados.</p>`;
    return;
  }

  contenedor.innerHTML = items
    .map(
      (envio) => `
        <button type="button" class="historial-fila" data-envio-id="${envio.id}">
          <span class="historial-cliente">${envio.cliente_nombre}</span>
          <span class="historial-descripcion">${envio.descripcion || ""}</span>
          <span class="historial-codigo">${envio.numero_envio}</span>
        </button>`
    )
    .join("");

  contenedor.querySelectorAll(".historial-fila").forEach((fila) => {
    fila.addEventListener("click", () => abrirModalFactura(fila.dataset.envioId));
  });
}

// ---------- SECCIÓN: Modal con la nota de envío ----------
// Controla: abrir/cerrar el modal que muestra el detalle completo de
// un envío, reutilizando el mismo markup y funciones de js/factura.js.

/** Carga el detalle completo del envío y lo pinta adentro del modal. */
async function abrirModalFactura(envioId) {
  const envio = await obtenerEnvioCompleto(envioId); // definida en js/factura.js
  if (!envio) {
    mostrarMensaje("No se pudo cargar ese envío.", "error");
    return;
  }
  pintarFactura(envio); // definida en js/factura.js, mismo markup que factura.html
  document.getElementById("modal-factura").hidden = false;
}

/** Oculta el modal de detalle. */
function cerrarModalFactura() {
  document.getElementById("modal-factura").hidden = true;
}

// ---------- SECCIÓN: Descarga en PDF (tamaño carta) ----------
// Controla: exporta el contenido del modal a un PDF descargable con
// el nombre "nota-envio-<numero>.pdf", usando la librería html2pdf.

async function descargarFacturaPdf() {
  const elemento = document.getElementById("factura-modal-contenido");
  const numero = document.getElementById("factura-numero").textContent;

  await html2pdf()
    .set({
      margin: 0.4,
      filename: `nota-envio-${numero}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    })
    .from(elemento)
    .save();
}
