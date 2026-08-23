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

/** Suma `cantidad` al stock actual de un producto (reposición manual
 * desde el listado de productos.html). Parte del último valor traído
 * en `productosCacheLocal` para no tener que volver a consultar la
 * base antes de calcular el nuevo total. */
async function incrementarStock(productoId, cantidad) {
  const producto = productosCacheLocal.find(
    (p) => String(p.id) === String(productoId)
  );
  const stockActual = producto ? producto.stock : 0;
  return actualizarStock(productoId, stockActual + cantidad);
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
});

// Último listado de productos traído de la base — lo usa
// incrementarStock() para calcular el nuevo total sin tener que
// volver a consultar Supabase antes de sumar.
let productosCacheLocal = [];

/** Trae los productos de la base y refresca la tabla en pantalla. */
async function cargarTablaProductos() {
  productosCacheLocal = (await listarProductos()) || [];
  pintarTablaProductos(productosCacheLocal);
}

/** Dibuja las filas de la tabla de productos con su stock (o el mensaje
 * de "vacío"), más un campo por fila para reponer stock sin tener que
 * abrir ningún formulario aparte. */
function pintarTablaProductos(productos) {
  const tbody = document.querySelector("#tabla-productos tbody");
  if (!productos || productos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3">Todavía no hay productos registrados.</td></tr>`;
    return;
  }
  tbody.innerHTML = productos
    .map(
      (p) => `
        <tr>
          <td>${p.nombre}</td>
          <td>${p.stock}</td>
          <td>
            <div class="fila-reponer-stock">
              <input
                type="number"
                min="1"
                placeholder="Cant."
                class="input-reponer-stock"
                data-id="${p.id}"
              />
              <button type="button" class="btn-reponer-stock" data-id="${p.id}">+ Stock</button>
            </div>
          </td>
        </tr>`
    )
    .join("");

  tbody.querySelectorAll(".btn-reponer-stock").forEach((boton) => {
    boton.addEventListener("click", () => manejarReponerStock(boton.dataset.id));
  });
}

/** Valida y suma la cantidad tipeada al stock del producto de esa fila. */
async function manejarReponerStock(productoId) {
  const input = document.querySelector(
    `.input-reponer-stock[data-id="${productoId}"]`
  );
  const cantidad = input.value;

  if (!esCantidadValida(cantidad)) {
    mostrarMensaje("Ingresá una cantidad válida para reponer.", "error");
    return;
  }

  const actualizado = await incrementarStock(productoId, Number(cantidad));
  if (!actualizado) return; // incrementarStock ya mostró el error

  mostrarMensaje(
    `Se sumaron ${Number(cantidad)} unidades. Stock actual: ${actualizado.stock}.`
  );
  cargarTablaProductos();
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
