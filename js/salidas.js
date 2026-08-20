// ============================================================
// Lógica de Registro de Salidas (envíos)
// ============================================================
// Responsable de: registrar un envío completo, combinando la
// información de producto/stock y tipo de empaque como dos
// detalles independientes que cuelgan de la misma cabecera,
// sin mezclar la información propia de cada aspecto.
//
// TODO: implementar junto con las tablas `envios`,
// `envio_productos` y `envio_empaques` en Supabase
// (ver supabase/schema.sql).

async function registrarSalida(datosSalida) {
  // datosSalida esperado:
  // {
  //   cliente_id, ciudad_destino, fecha, observaciones,
  //   productos: [{ producto_id, cantidad }, ...],
  //   empaques:  [{ tipo_empaque_id, cantidad }, ...],
  //   nota_telefono, nota_direccion,  // NO son columnas de "envios":
  //     solo se usan para imprimir la nota de envío (el detalle),
  //     no se guardan en la base de datos.
  // }
  // TODO:
  //  1. INSERT INTO envios (cliente_id, ciudad_destino, ...) RETURNING id,
  //     numero_envio (el trigger genera el folio automáticamente)
  //  2. INSERT INTO envio_productos (envio_id, producto_id, cantidad) por
  //     cada línea de datosSalida.productos
  //     (el trigger descuenta el stock automáticamente)
  //  3. INSERT INTO envio_empaques (envio_id, tipo_empaque_id, cantidad) por
  //     cada línea de datosSalida.empaques
  //
  // Devuelve { id, numero_envio } del envío creado — js/realizar-envio.js
  // lo usa para completar "Código de envío" y armar el link a
  // factura.html?envio_id=<id> (nota_telefono y nota_direccion no se
  // insertan en ninguna tabla, solo se usan para imprimir esa nota).
}
