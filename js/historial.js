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
//
// TODO: implementar junto con las tablas `envios`, `envio_productos`,
// `envio_empaques` y `clientes` en Supabase (ver supabase/schema.sql).

let historialCache = [];

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

// ---------- Listado ----------

async function cargarHistorial() {
  historialCache = (await listarHistorial()) || [];
  pintarHistorial(historialCache);
}

async function listarHistorial(filtros = {}) {
  // TODO: SELECT envios + JOIN clientes (nombre) + un resumen del
  // detalle (ej. "3 productos, 2 empaques"), ORDER BY fecha DESC.
  // Cada fila esperada: { id, numero_envio, cliente_nombre, descripcion }
  // aplicando los filtros recibidos (texto de búsqueda, fecha, etc.)
}

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

// ---------- Modal con la nota de envío ----------

async function abrirModalFactura(envioId) {
  const envio = await obtenerEnvioCompleto(envioId); // definida en js/factura.js
  if (!envio) {
    mostrarMensaje("No se pudo cargar ese envío.", "error");
    return;
  }
  pintarFactura(envio); // definida en js/factura.js, mismo markup que factura.html
  document.getElementById("modal-factura").hidden = false;
}

function cerrarModalFactura() {
  document.getElementById("modal-factura").hidden = true;
}

// ---------- Descarga en PDF (tamaño carta) ----------

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
