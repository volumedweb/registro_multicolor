// ============================================================
// Lógica de Clientes / Destinatarios
// ============================================================
// Responsable de: catálogo reutilizable de clientes (nombre,
// teléfono, dirección y ciudad "de base" del cliente). Estos
// datos se usan para autocompletar el formulario de "Realizar
// envío", donde se pueden editar sin que eso modifique este
// registro (ver notas de ese formulario y supabase/schema.sql).
// El nombre de quien recibe y la ciudad de destino de cada envío
// puntual se cargan en el envío, no acá — pueden variar aunque
// el cliente sea el mismo (ej. sucursales distintas).
//
// TODO: implementar junto con la tabla `clientes` en Supabase.

async function listarClientes() {
  // TODO: SELECT * FROM clientes ORDER BY nombre
}

async function crearCliente(datosCliente) {
  // datosCliente esperado: { nombre, telefono, direccion, ciudad }
  // Se usa tanto desde clientes.html (alta manual) como desde
  // "Realizar envío" cuando se escribe un nombre que no coincide con
  // ningún cliente ya cargado.
  // TODO: INSERT INTO clientes (...) RETURNING *
}
