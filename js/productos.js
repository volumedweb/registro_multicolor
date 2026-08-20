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

// ---------- UI: alta y listado en productos.html ----------
// Este script también se carga en realizar-envio.html (para reutilizar
// listarProductos), donde no existe "form-producto" — por eso el bloque
// de abajo se sale temprano si no encuentra ese formulario.

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-producto");
  if (!form) return;

  cargarTablaProductos();
  form.addEventListener("submit", manejarAltaProducto);
});

async function cargarTablaProductos() {
  const productos = await listarProductos();
  pintarTablaProductos(productos);
}

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
