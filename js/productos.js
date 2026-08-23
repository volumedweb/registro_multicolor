// ============================================================
// Lógica de Productos y Stock
// ============================================================
// Responsable de: alta/edición de productos, consulta y
// actualización de la cantidad disponible (stock) de cada uno.
//
// La tabla `productos` (ver supabase/schema.sql) exige un `codigo`
// único (SKU) que el formulario de productos.html no pide — se
// genera automáticamente a partir del nombre para no complicar la
// pantalla con un campo que el usuario no necesita completar a mano.

// ---------- SECCIÓN: Acceso a datos (Supabase) ----------
// Controla: leer, crear productos y actualizar su stock en la tabla
// "productos". No toca el DOM; estas funciones las reutilizan tanto
// productos.html como realizar-envio.html.

async function listarProductos() {
  const { data, error } = await supabaseClient
    .from("productos")
    .select("*")
    .order("nombre");

  if (error) {
    mostrarMensaje("No se pudieron cargar los productos: " + error.message, "error");
    return [];
  }
  return data;
}

async function crearProducto(datosProducto) {
  // datosProducto esperado: { nombre, stock }
  const { data, error } = await supabaseClient
    .from("productos")
    .insert({
      nombre: datosProducto.nombre,
      stock: datosProducto.stock,
      codigo: generarCodigoProducto(datosProducto.nombre),
    })
    .select()
    .single();

  if (error) {
    mostrarMensaje("No se pudo guardar el producto: " + error.message, "error");
    return null;
  }
  return data;
}

async function actualizarStock(productoId, nuevaCantidad) {
  const { data, error } = await supabaseClient
    .from("productos")
    .update({ stock: nuevaCantidad })
    .eq("id", productoId)
    .select()
    .single();

  if (error) {
    mostrarMensaje("No se pudo actualizar el stock: " + error.message, "error");
    return null;
  }
  return data;
}

// ---------- SECCIÓN: Generación de SKU ----------
// Controla: arma el código interno (SKU) automáticamente para que el
// usuario no tenga que inventarlo a mano en el formulario.

/** Arma un código interno único a partir del nombre, para el `codigo`
 * (SKU) que exige la tabla `productos` pero que el formulario de
 * productos.html no pide de forma manual. */
function generarCodigoProducto(nombre) {
  const base =
    (nombre || "PROD")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // saca tildes
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 4) || "PROD";
  const sufijo = Date.now().toString(36).toUpperCase();
  return `${base}-${sufijo}`;
}

// ---------- SECCIÓN: Interfaz — alta y listado en productos.html ----------
// Controla: la tabla de productos (con su stock) y el formulario de alta.
// Este script también se carga en realizar-envio.html (para reutilizar
// listarProductos), donde no existe "form-producto" — por eso el bloque
// de abajo se sale temprano si no encuentra ese formulario.

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-producto");
  if (!form) return;

  cargarTablaProductos();
  form.addEventListener("submit", manejarAltaProducto);
  configurarModalStock();
});

// Último listado de productos traído de la base — lo usa el modal de
// ajuste de stock para buscar por nombre y calcular el nuevo total sin
// tener que volver a consultar Supabase en cada paso.
let productosCacheLocal = [];

/** Trae los productos de la base y refresca la tabla en pantalla. */
async function cargarTablaProductos() {
  productosCacheLocal = (await listarProductos()) || [];
  pintarTablaProductos(productosCacheLocal);
}

/** Dibuja las filas de la tabla de productos con su stock (o el
 * mensaje de "vacío"). El ajuste de stock se hace aparte, desde el
 * botón "Agregar o quitar stock" (ver configurarModalStock()). */
function pintarTablaProductos(productos) {
  const tbody = document.querySelector("#tabla-productos tbody");
  if (!productos || productos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2">Todavía no hay productos registrados.</td></tr>`;
    return;
  }
  tbody.innerHTML = productos
    .map((p) => `<tr><td>${p.nombre}</td><td>${p.stock}</td></tr>`)
    .join("");
}

/** Valida y guarda el formulario de alta de producto (nombre + stock inicial). */
async function manejarAltaProducto(evento) {
  evento.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const stock = document.getElementById("stock").value;

  if (!nombre) {
    mostrarMensaje("Ingresá el nombre del producto.", "error");
    return;
  }

  const creado = await crearProducto({ nombre, stock: Number(stock) || 0 });
  if (!creado) return; // crearProducto ya mostró el error

  mostrarMensaje("Producto guardado correctamente.");
  evento.target.reset();
  cargarTablaProductos();
}

// ---------- SECCIÓN: Modal "Agregar o quitar stock" ----------
// Controla: el flujo completo del botón "Agregar o quitar stock" —
// buscar el producto por nombre (igual que en "Realizar envío": se
// escribe y se resuelve contra la datalist) y, recién cuando hay una
// coincidencia, mostrar la cantidad y los botones "Quitar"/"Adicionar".
// El modal queda abierto después de cada ajuste para poder encadenar
// varios productos sin tener que reabrirlo cada vez.

function configurarModalStock() {
  const btnAbrir = document.getElementById("btn-abrir-stock");
  if (!btnAbrir) return; // por si este archivo se carga en otra pantalla

  const modal = document.getElementById("modal-stock");
  const btnCerrar = document.getElementById("btn-cerrar-modal-stock");
  const buscador = document.getElementById("buscador-stock");
  const datalist = document.getElementById("lista-productos-stock");
  const idInput = document.getElementById("producto-stock-id");
  const detalle = document.getElementById("detalle-producto-stock");
  const stockActualEl = document.getElementById("stock-actual-valor");
  const cantidadInput = document.getElementById("input-cantidad-stock");
  const btnQuitar = document.getElementById("btn-quitar-stock");
  const btnAdicionar = document.getElementById("btn-adicionar-stock");

  btnAbrir.addEventListener("click", () => {
    datalist.innerHTML = productosCacheLocal
      .map((p) => `<option value="${p.nombre}"></option>`)
      .join("");
    modal.hidden = false;
    buscador.focus();
  });

  btnCerrar.addEventListener("click", cerrarModalStock);
  modal.addEventListener("click", (evento) => {
    if (evento.target.id === "modal-stock") cerrarModalStock();
  });

  function cerrarModalStock() {
    modal.hidden = true;
    buscador.value = "";
    idInput.value = "";
    cantidadInput.value = "";
    detalle.hidden = true;
  }

  // Al tipear, resuelve el producto igual que en "Realizar envío": si
  // el texto coincide exacto (sin importar mayúsculas) con uno del
  // catálogo, recién ahí aparecen la cantidad y los botones.
  buscador.addEventListener("input", () => {
    const nombreTipeado = buscador.value.trim().toLowerCase();
    const coincidencia = productosCacheLocal.find(
      (p) => p.nombre.toLowerCase() === nombreTipeado
    );

    if (coincidencia) {
      idInput.value = coincidencia.id;
      stockActualEl.textContent = coincidencia.stock;
      detalle.hidden = false;
    } else {
      idInput.value = "";
      detalle.hidden = true;
    }
  });

  btnAdicionar.addEventListener("click", () => ajustarStockDesdeModal(1));
  btnQuitar.addEventListener("click", () => ajustarStockDesdeModal(-1));

  /** Suma o resta (según `signo`) la cantidad tipeada al stock del
   * producto encontrado, valida que no quede negativo, y deja el
   * modal listo para ajustar otro producto sin cerrarlo. */
  async function ajustarStockDesdeModal(signo) {
    const productoId = idInput.value;
    const cantidad = cantidadInput.value;

    if (!productoId) {
      mostrarMensaje("Buscá y elegí un producto de la lista.", "error");
      return;
    }
    if (!esCantidadValida(cantidad)) {
      mostrarMensaje("Ingresá una cantidad válida.", "error");
      return;
    }

    const numero = Number(cantidad);
    const producto = productosCacheLocal.find(
      (p) => String(p.id) === String(productoId)
    );
    const stockActual = producto ? producto.stock : 0;

    if (signo < 0 && numero > stockActual) {
      mostrarMensaje(
        `No hay suficiente stock: quedan ${stockActual} unidades.`,
        "error"
      );
      return;
    }

    const nuevoStock = stockActual + signo * numero;
    const actualizado = await actualizarStock(productoId, nuevoStock);
    if (!actualizado) return; // actualizarStock ya mostró el error

    mostrarMensaje(
      signo < 0
        ? `Se quitaron ${numero} unidades. Stock actual: ${actualizado.stock}.`
        : `Se agregaron ${numero} unidades. Stock actual: ${actualizado.stock}.`
    );

    stockActualEl.textContent = actualizado.stock;
    cantidadInput.value = "";
    await cargarTablaProductos(); // refresca el listado y el catálogo en memoria
  }
}
