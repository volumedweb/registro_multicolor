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
// base (para filtrar sin volver a consultar Supabase) y el id del
// envío que está abierto en el modal en este momento (lo necesitan
// tanto la descarga de PDF con nombre de archivo como el borrado).
let historialCache = [];
let envioIdEnModal = null;

// ---------- SECCIÓN: Arranque de la página ----------
// Controla: carga el historial inicial y engancha todos los eventos
// de la pantalla (buscador, cerrar modal, menú de descarga, eliminar).
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

  // "Descargar PDF" es un menú desplegable con las mismas 3
  // plantillas de detalle que "Imprimir" en factura.html (por
  // producto / por paquete / completo) — mismos datos, solo cambia
  // qué tabla queda visible en el PDF exportado.
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
  envioIdEnModal = envioId;
  pintarFactura(envio); // definida en js/factura.js, mismo markup que factura.html
  document.getElementById("modal-factura").hidden = false;
}

/** Oculta el modal de detalle y limpia su estado (menú de descarga
 * abierto, plantilla de detalle elegida, id del envío en memoria). */
function cerrarModalFactura() {
  document.getElementById("modal-factura").hidden = true;
  document.getElementById("menu-descargar-opciones").hidden = true;
  aplicarModoDetalle("completo"); // definida en js/factura.js
  envioIdEnModal = null;
}

// ---------- SECCIÓN: Descarga en PDF (tamaño carta) ----------
// Controla: exporta el contenido del modal a un PDF descargable,
// usando la librería html2pdf. `modo` es la misma plantilla de
// detalle de factura.html ("producto" | "paquete" | "completo",
// por defecto) — aplicarModoDetalle() (js/factura.js) muestra u
// oculta las tablas antes de generar el PDF y se restaura a
// "completo" al terminar, sin tocar los datos ni el resto del diseño.

async function descargarFacturaPdf(modo = "completo") {
  aplicarModoDetalle(modo);

  const elemento = document.getElementById("factura-modal-contenido");
  const numero = document.getElementById("factura-numero").textContent;
  const sufijo = modo === "completo" ? "" : `-${modo}`;

  // html2canvas calcula la región a capturar en base al scroll de la
  // página y del propio modal (que tiene overflow-y: auto). Si el
  // usuario venía con la ventana o el modal desplazados hacia abajo
  // (historial largo, o scrolleó el modal para ver todo el detalle),
  // captura mal y el PDF sale con un hueco en blanco arriba y el
  // contenido cortado a la mitad. Se resetea el scroll del modal y de
  // la página antes de capturar, y se le indica a html2canvas que
  // ignore cualquier desplazamiento restante.
  const overlay = document.getElementById("modal-factura");
  const scrollModalPrevio = overlay ? overlay.scrollTop : 0;
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
// Controla: borra por completo un envío (cabecera + su detalle de
// productos y de empaques, que se van en cascada por la relación
// definida en supabase/schema.sql) después de pedir confirmación.

/** Elimina el envío que está abierto en el modal (sin ventana de confirmación aparte: el toast avisa el resultado). */
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
