// ============================================================
// Lógica de Registro de Salidas (envíos)
// ============================================================
// Responsable de: registrar un envío completo, combinando la
// información de producto/stock y tipo de empaque como dos
// detalles independientes que cuelgan de la misma cabecera,
// sin mezclar la información propia de cada aspecto.

// ---------- SECCIÓN: Registro del envío (cabecera + detalle) ----------
// Controla: crea la fila en "envios" (cabecera) y, en dos inserts
// separados, sus líneas de "envio_productos" y "envio_empaques" —
// manteniendo producto/stock y tipo de empaque como aspectos
// independientes que se consultan juntos por compartir el mismo
// envio_id.
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

  // -- Paso 1: cabecera del envío (cliente, ciudad, fecha, etc.) --
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

  // -- Paso 2: detalle de productos (aspecto "producto y stock") --
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

  // -- Paso 3: detalle de empaques (aspecto "tipo de empaque") --
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

// ============================================================
// Cargar envío para editar (con IDs crudos, para pre-llenar
// el formulario de realizar-envio.html en modo ?editar=ID)
// ============================================================
async function cargarEnvioParaEditar(envioId) {
  const { data: envio, error } = await supabaseClient
    .from("envios")
    .select(
      "id, numero_envio, estado, cliente_id, ciudad_destino, nombre_receptor, fecha, observaciones, clientes(nombre, telefono, direccion)"
    )
    .eq("id", envioId)
    .single();

  if (error || !envio) {
    mostrarMensaje("No se pudo cargar el envío para editar.", "error");
    return null;
  }

  const { data: productos } = await supabaseClient
    .from("envio_productos")
    .select("producto_id, cantidad, productos(nombre)")
    .eq("envio_id", envioId);

  const { data: empaques } = await supabaseClient
    .from("envio_empaques")
    .select("tipo_empaque_id, cantidad, tipos_empaque(nombre)")
    .eq("envio_id", envioId);

  return {
    id: envio.id,
    numero_envio: envio.numero_envio,
    estado: envio.estado,
    cliente_id: envio.cliente_id,
    cliente_nombre: envio.clientes ? envio.clientes.nombre : "",
    cliente_telefono: envio.clientes ? (envio.clientes.telefono || "") : "",
    cliente_direccion: envio.clientes ? (envio.clientes.direccion || "") : "",
    ciudad_destino: envio.ciudad_destino || "",
    nombre_receptor: envio.nombre_receptor || "",
    fecha: envio.fecha || "",
    observaciones: envio.observaciones || "",
    productos: (productos || []).map((p) => ({
      producto_id: p.producto_id,
      nombre: p.productos ? p.productos.nombre : "",
      cantidad: p.cantidad,
    })),
    empaques: (empaques || []).map((e) => ({
      tipo_empaque_id: e.tipo_empaque_id,
      nombre: e.tipos_empaque ? e.tipos_empaque.nombre : "",
      cantidad: e.cantidad,
    })),
  };
}

// ============================================================
// Actualizar un envío ya guardado (modo edición)
// ============================================================
// Flujo:
//   1. Lee las líneas de producto viejas y repone su stock
//      (no hay trigger para restaurar al borrar — se hace acá).
//   2. Borra las líneas de producto viejas.
//   3. Actualiza la cabecera (cliente, ciudad, receptor, fecha, obs.).
//   4. Inserta las líneas de producto nuevas → el trigger
//      fn_descontar_stock descuenta el nuevo stock automáticamente.
//   5. Reemplaza las líneas de empaque (borra + inserta).
//
// Devuelve { id, numero_envio } igual que registrarSalida().
// El número de envío (folio) no cambia: el trigger que lo genera
// es BEFORE INSERT — no vuelve a dispararse en un UPDATE.
async function actualizarEnvio(envioId, datosNuevos) {
  // 1. Leer líneas de producto viejas para reponer stock
  const { data: productosViejos } = await supabaseClient
    .from("envio_productos")
    .select("producto_id, cantidad")
    .eq("envio_id", envioId);

  // 2. Reponer stock de cada producto viejo (lectura → suma → escritura)
  for (const p of productosViejos || []) {
    const { data: prod } = await supabaseClient
      .from("productos")
      .select("stock")
      .eq("id", p.producto_id)
      .single();
    if (prod) {
      await supabaseClient
        .from("productos")
        .update({ stock: prod.stock + p.cantidad })
        .eq("id", p.producto_id);
    }
  }

  // 3. Borrar líneas de producto viejas
  await supabaseClient
    .from("envio_productos")
    .delete()
    .eq("envio_id", envioId);

  // 4. Actualizar cabecera del envío
  const { error: errorUpdate } = await supabaseClient
    .from("envios")
    .update({
      cliente_id: datosNuevos.cliente_id,
      ciudad_destino: datosNuevos.ciudad_destino,
      nombre_receptor: datosNuevos.nombre_receptor,
      fecha: datosNuevos.fecha,
      observaciones: datosNuevos.observaciones || null,
    })
    .eq("id", envioId);

  if (errorUpdate) {
    mostrarMensaje("No se pudo actualizar el envío: " + errorUpdate.message, "error");
    return null;
  }

  // 5. Insertar nuevas líneas de producto (el trigger descuenta el nuevo stock)
  if (datosNuevos.productos && datosNuevos.productos.length > 0) {
    const { error: errorProd } = await supabaseClient
      .from("envio_productos")
      .insert(
        datosNuevos.productos.map((p) => ({
          envio_id: envioId,
          producto_id: p.producto_id,
          cantidad: p.cantidad,
        }))
      );
    if (errorProd) {
      mostrarMensaje(
        "Envío actualizado, pero hubo un problema con los productos: " + errorProd.message,
        "error"
      );
    }
  }

  // 6. Reemplazar líneas de empaque (borra + inserta)
  await supabaseClient.from("envio_empaques").delete().eq("envio_id", envioId);
  if (datosNuevos.empaques && datosNuevos.empaques.length > 0) {
    const { error: errorEmp } = await supabaseClient
      .from("envio_empaques")
      .insert(
        datosNuevos.empaques.map((e) => ({
          envio_id: envioId,
          tipo_empaque_id: e.tipo_empaque_id,
          cantidad: e.cantidad,
        }))
      );
    if (errorEmp) {
      mostrarMensaje(
        "Envío actualizado, pero hubo un problema con los empaques: " + errorEmp.message,
        "error"
      );
    }
  }

  // Devuelve { id, numero_envio } — misma forma que registrarSalida()
  const { data: envioActualizado } = await supabaseClient
    .from("envios")
    .select("id, numero_envio")
    .eq("id", envioId)
    .single();

  return envioActualizado || { id: envioId };
}
