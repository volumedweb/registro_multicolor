// ============================================================
// Lógica de Registro de Salidas (envíos)
// ============================================================
// Responsable de: registrar una salida de mercadería,
// combinando la información de producto/stock y tipo de
// empaque en un mismo movimiento, sin mezclar la información
// propia de cada aspecto.
//
// TODO: implementar junto con la tabla `salidas` en Supabase
// (ver supabase/schema.sql).

async function registrarSalida(datosSalida) {
  // datosSalida esperado: { producto_id, cantidad, tipo_empaque_id,
  //   cantidad_empaque, observaciones }
  // TODO:
  //  1. INSERT INTO salidas (...)
  //  2. Descontar del stock del producto correspondiente
}
