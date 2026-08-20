// ============================================================
// Lógica de Registro de Salidas (envíos)
// ============================================================
// Responsable de: registrar un envío completo, combinando la
// información de producto/stock y tipo de empaque como dos
// detalles independientes que cuelgan de la misma cabecera,
// sin mezclar la información propia de cada aspecto.

async function registrarSalida(datosSalida) {
  // datosSalida esperado:
  // {
  //   cliente_id, ciudad_destino, nombre_receptor, fecha, observaciones,
  //   productos: [{ producto_id, cantidad }, ...],
  //   empaques:  [{ tipo_empaque_id, cantidad }, ...],
  //   nota_telefono, nota_direccion,  // NO son columnas de "envios":
  //     solo se usan para imprimir la nota de envío (el detalle),
  //     no se guardan en la base de datos.
  // }

  const { data: envio, error: errorEnvio } = await supabaseClient
    .from("envios")
    .insert({
      cliente_id: datosSalida.cliente_id,
      ciudad_destino: datosSalida.ciudad_destino,
      nombre_receptor: datosSalida.nombre_receptor,
      fecha: datosSalida.fecha,
      observaciones: datosSalida.observaciones || null,
    })
    .select()
    .single();

  if (errorEnvio) {
    mostrarMensaje("No se pudo registrar el envío: " + errorEnvio.message, "error");
    return null;
  }

  const envioId = envio.id;

  if (datosSalida.productos && datosSalida.productos.length > 0) {
    const filasProductos = datosSalida.productos.map((p) => ({
      envio_id: envioId,
      producto_id: p.producto_id,
      cantidad: p.cantidad,
    }));
    const { error: errorProductos } = await supabaseClient
      .from("envio_productos")
      .insert(filasProductos);
    if (errorProductos) {
      mostrarMensaje(
        "El envío se guardó, pero hubo un problema guardando los productos: " +
          errorProductos.message,
        "error"
      );
    }
  }

  if (datosSalida.empaques && datosSalida.empaques.length > 0) {
    const filasEmpaques = datosSalida.empaques.map((e) => ({
      envio_id: envioId,
      tipo_empaque_id: e.tipo_empaque_id,
      cantidad: e.cantidad,
    }));
    const { error: errorEmpaques } = await supabaseClient
      .from("envio_empaques")
      .insert(filasEmpaques);
    if (errorEmpaques) {
      mostrarMensaje(
        "El envío se guardó, pero hubo un problema guardando los empaques: " +
          errorEmpaques.message,
        "error"
      );
    }
  }

  // Devuelve { id, numero_envio } del envío creado — js/realizar-envio.js
  // lo usa para completar "Código de envío" y armar el link a
  // factura.html?envio_id=<id> (nota_telefono y nota_direccion no se
  // insertan en ninguna tabla, solo se usan para imprimir esa nota).
  return { id: envio.id, numero_envio: envio.numero_envio };
}
