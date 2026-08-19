// ============================================================
// Lógica de Productos y Stock
// ============================================================
// Responsable de: alta/edición de productos, consulta y
// actualización de la cantidad disponible (stock) de cada uno.
//
// TODO: implementar junto con la tabla `productos` en Supabase
// (ver supabase/schema.sql).

async function listarProductos() {
  // TODO: SELECT * FROM productos ORDER BY nombre
}

async function crearProducto(datosProducto) {
  // TODO: INSERT INTO productos (...)
}

async function actualizarStock(productoId, nuevaCantidad) {
  // TODO: UPDATE productos SET stock = nuevaCantidad WHERE id = productoId
}
