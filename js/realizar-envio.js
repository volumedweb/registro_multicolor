// ============================================================
// Realizar envío — lógica de la pantalla
// ============================================================
// Arma los campos de cliente y producto con autocompletado
// (datalist), agrega/quita líneas de producto y empaque al
// envío, y arma los datos finales antes de guardarlos.
//
// Depende de:
//   - listarClientes() / crearCliente()   (js/clientes.js)
//   - listarProductos()                   (js/productos.js)
//   - listarTiposEmpaque()                (js/empaques.js)
//   - registrarSalida()                   (js/salidas.js)
//   - mostrarMensaje() / esCantidadValida() (js/utils.js)
//
// Flujo de guardado (con previsualización):
//   1. El usuario llena el formulario y hace click en "Realizar envío".
//   2. Se valida que haya al menos un producto o empaque.
//   3. Se abre un modal de previsualización con los datos tal como
//      se van a guardar — sin guardar nada en Supabase todavía.
//   4. Desde el modal el usuario puede:
//      - "← Volver a editar": cierra el modal y vuelve al formulario
//        con todos los campos y listas tal como estaban.
//      - "✔ Confirmar y guardar": recién acá se guarda en Supabase,
//        se muestra el código de envío y la factura queda bloqueada.

// ---------- SECCIÓN: Estado en memoria ----------
// Controla: catálogos cacheados (para el autocompletado) y las líneas
// de producto/empaque que se van agregando al envío que se está
// armando, antes de confirmarlo.
let clientesCache = [];
let productosCache = [];
let tiposEmpaqueCache = [];
let productosEnEnvio = []; // { producto_id, nombre, cantidad }
let empaquesEnEnvio = []; // { tipo_empaque_id, nombre, cantidad }
let envioEnEdicionId = null; // id del envío que se está editando (null = modo nuevo)

// ---------- SECCIÓN: Arranque de la página ----------
// Controla: carga los catálogos, fija la fecha de hoy y engancha
// todos los eventos del formulario y del modal de previsualización.
document.addEventListener("DOMContentLoaded", () => {
  cargarClientes();
  cargarProductos();
  cargarTiposEmpaque();
  fijarFechaDeHoy();

  document
    .getElementById("nombre-cliente")
    .addEventListener("input", manejarSeleccionCliente);
  document
    .getElementById("input-producto")
    .addEventListener("input", manejarSeleccionProducto);
  document
    .getElementById("btn-agregar-producto")
    .addEventListener("click", agregarProductoAlEnvio);
  document
    .getElementById("btn-agregar-empaque")
    .addEventListener("click", agregarEmpaqueAlEnvio);
  document
    .getElementById("form-envio")
    .addEventListener("submit", manejarEnvioFormulario);

  // Botones del modal de previsualización
  document
    .getElementById("btn-confirmar-envio")
    .addEventListener("click", confirmarGuardarEnvio);
  document
    .getElementById("btn-editar-envio")
    .addEventListener("click", cerrarModalPreview);
  // Cerrar el modal haciendo click fuera del contenido
  document
    .getElementById("modal-preview-envio")
    .addEventListener("click", (evento) => {
      if (evento.target.id === "modal-preview-envio") cerrarModalPreview();
    });

  iniciarModoEdicion();
});

// ---------- SECCIÓN: Fecha — siempre la de hoy, no se edita a mano ----------

function fijarFechaDeHoy() {
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, "0");
  const dd = String(hoy.getDate()).padStart(2, "0");
  document.getElementById("fecha-envio").value = `${yyyy}-${mm}-${dd}`;
}

// ---------- SECCIÓN: Carga de catálogos ----------
// Controla: trae clientes/productos/tipos de empaque y llena los
// <datalist>/<select> que alimentan el autocompletado del formulario.

/** Carga los clientes y arma el <datalist> para autocompletar el nombre. */
async function cargarClientes() {
  clientesCache = (await listarClientes()) || [];
  const datalist = document.getElementById("lista-clientes");
  datalist.innerHTML = clientesCache
    .map((c) => `<option value="${c.nombre}"></option>`)
    .join("");
}

/** Carga los productos y arma el <datalist> para autocompletar el nombre. */
async function cargarProductos() {
  productosCache = (await listarProductos()) || [];
  const datalist = document.getElementById("lista-productos-disponibles");
  datalist.innerHTML = productosCache
    .map((p) => `<option value="${p.nombre}"></option>`)
    .join("");
}

/** Carga los tipos de empaque y arma el <select> correspondiente. */
async function cargarTiposEmpaque() {
  tiposEmpaqueCache = (await listarTiposEmpaque()) || [];
  const select = document.getElementById("select-empaque");
  select.innerHTML =
    '<option value="">Tipo de empaque</option>' +
    tiposEmpaqueCache
      .map((t) => `<option value="${t.id}">${t.nombre}</option>`)
      .join("");
}

// ---------- SECCIÓN: Cliente — autocompletar al coincidir con uno existente ----------

function manejarSeleccionCliente(evento) {
  const nombreTipeado = evento.target.value.trim();
  const clienteIdInput = document.getElementById("cliente-id");
  const telefonoInput = document.getElementById("telefono-cliente");
  const notaTelefono = document.getElementById("nota-telefono");
  const direccionInput = document.getElementById("direccion-cliente");
  const notaDireccion = document.getElementById("nota-direccion");
  const ciudadInput = document.getElementById("ciudad-destino");
  const notaCiudad = document.getElementById("nota-ciudad");

  const coincidencia = clientesCache.find(
    (c) => c.nombre.toLowerCase() === nombreTipeado.toLowerCase()
  );

  if (coincidencia) {
    clienteIdInput.value = coincidencia.id;
    evento.target.classList.add("coincidencia");

    telefonoInput.value = coincidencia.telefono || "";
    notaTelefono.textContent = coincidencia.telefono
      ? "Cargado desde el cliente registrado — se puede editar, no se guarda"
      : "Este cliente no tiene teléfono registrado; podés escribirlo, pero no se guardará";

    direccionInput.value = coincidencia.direccion || "";
    notaDireccion.textContent = coincidencia.direccion
      ? "Cargada desde el cliente registrado — se puede editar, no se guarda"
      : "Este cliente no tiene dirección registrada; podés escribirla, pero no se guardará";

    ciudadInput.value = coincidencia.ciudad || "";
    notaCiudad.textContent = coincidencia.ciudad
      ? "Cargada desde el cliente registrado — se puede editar, se guarda como destino de este envío"
      : "Este cliente no tiene ciudad registrada; se guarda como destino de este envío";
  } else {
    clienteIdInput.value = "";
    evento.target.classList.remove("coincidencia");
    telefonoInput.value = "";
    notaTelefono.textContent = "Se autocompleta si el cliente ya lo tiene registrado";
    direccionInput.value = "";
    notaDireccion.textContent = "Se autocompleta si el cliente ya la tiene registrada";
    ciudadInput.value = "";
    notaCiudad.textContent = "Se autocompleta si el cliente ya la tiene registrada";
  }
}

// ---------- SECCIÓN: Producto — resolver el id cuando el texto coincide ----------

function manejarSeleccionProducto(evento) {
  const nombreTipeado = evento.target.value.trim();
  const idInput = document.getElementById("select-producto");
  const coincidencia = productosCache.find(
    (p) => p.nombre.toLowerCase() === nombreTipeado.toLowerCase()
  );
  idInput.value = coincidencia ? coincidencia.id : "";
}

// ---------- SECCIÓN: Agregar/quitar líneas al envío ----------

/** Valida y agrega la línea de producto seleccionada al envío en curso. */
function agregarProductoAlEnvio() {
  const idInput = document.getElementById("select-producto");
  const nombreInput = document.getElementById("input-producto");
  const cantidadInput = document.getElementById("input-cantidad-producto");

  if (!idInput.value) {
    mostrarMensaje("Elegí un producto de la lista antes de agregarlo.", "error");
    return;
  }
  if (!esCantidadValida(cantidadInput.value)) {
    mostrarMensaje("Ingresá una cantidad válida.", "error");
    return;
  }

  productosEnEnvio.push({
    producto_id: idInput.value,
    nombre: nombreInput.value,
    cantidad: Number(cantidadInput.value),
  });
  pintarListaProductos();

  nombreInput.value = "";
  idInput.value = "";
  cantidadInput.value = "";
}

/** Valida y agrega la línea de empaque seleccionada al envío en curso. */
function agregarEmpaqueAlEnvio() {
  const select = document.getElementById("select-empaque");
  const cantidadInput = document.getElementById("input-cantidad-empaque");

  if (!select.value) {
    mostrarMensaje("Elegí un tipo de empaque antes de agregarlo.", "error");
    return;
  }
  if (!esCantidadValida(cantidadInput.value)) {
    mostrarMensaje("Ingresá una cantidad válida.", "error");
    return;
  }

  empaquesEnEnvio.push({
    tipo_empaque_id: select.value,
    nombre: select.options[select.selectedIndex].text,
    cantidad: Number(cantidadInput.value),
  });
  pintarListaEmpaques();

  select.value = "";
  cantidadInput.value = "";
}

/** Repinta la lista visible de productos agregados al envío. */
function pintarListaProductos() {
  pintarLista(
    "lista-productos",
    productosEnEnvio,
    "Todavía no agregaste productos a este envío.",
    quitarProducto
  );
}

/** Repinta la lista visible de empaques agregados al envío. */
function pintarListaEmpaques() {
  pintarLista(
    "lista-empaques",
    empaquesEnEnvio,
    "Todavía no agregaste empaques a este envío.",
    quitarEmpaque
  );
}

/** Dibuja una lista genérica de líneas agregadas (con botón "✕" para
 * quitar cada una). La usan tanto la lista de productos como la de
 * empaques. */
function pintarLista(contenedorId, items, textoVacio, alQuitar) {
  const contenedor = document.getElementById(contenedorId);
  if (items.length === 0) {
    contenedor.innerHTML = `<p class="lista-vacio">${textoVacio}</p>`;
    return;
  }
  contenedor.innerHTML = items
    .map(
      (item, indice) => `
        <div class="fila-item">
          <span>${item.nombre}</span>
          <span>x${item.cantidad}</span>
          <button type="button" data-indice="${indice}">✕</button>
        </div>`
    )
    .join("");
  contenedor.querySelectorAll("button[data-indice]").forEach((boton) => {
    boton.addEventListener("click", () => alQuitar(Number(boton.dataset.indice)));
  });
}

/** Quita una línea de producto del envío en curso (por índice). */
function quitarProducto(indice) {
  productosEnEnvio.splice(indice, 1);
  pintarListaProductos();
}

/** Quita una línea de empaque del envío en curso (por índice). */
function quitarEmpaque(indice) {
  empaquesEnEnvio.splice(indice, 1);
  pintarListaEmpaques();
}

// ---------- SECCIÓN: Envío del formulario — abre previsualización ----------
// Controla: valida que haya al menos una línea cargada y abre el
// modal de previsualización. NO guarda nada en Supabase todavía —
// eso ocurre solo cuando el usuario confirma desde el modal.

async function manejarEnvioFormulario(evento) {
  evento.preventDefault();

  if (productosEnEnvio.length === 0 && empaquesEnEnvio.length === 0) {
    mostrarMensaje(
      "Agregá al menos un producto o un empaque antes de confirmar.",
      "error"
    );
    return;
  }

  abrirModalPreview();
}

// ---------- SECCIÓN: Modal de previsualización ----------
// Controla: muestra el detalle completo del envío antes de guardarlo,
// con la opción de volver a editar o confirmar definitivamente.

/** Completa el modal de preview con los datos actuales del formulario
 * y los arrays en memoria, y lo muestra. */
function abrirModalPreview() {
  const nombreCliente = document.getElementById("nombre-cliente").value.trim();
  const receptor = document.getElementById("nombre-receptor").value.trim() || nombreCliente;
  const telefono = document.getElementById("telefono-cliente").value.trim();
  const direccion = document.getElementById("direccion-cliente").value.trim();
  const ciudad = document.getElementById("ciudad-destino").value.trim();
  const fecha = document.getElementById("fecha-envio").value;
  const observaciones = document.getElementById("observaciones").value.trim();

  // Datos del cliente
  document.getElementById("preview-cliente").textContent = nombreCliente || "—";
  document.getElementById("preview-receptor").textContent = receptor || "—";
  document.getElementById("preview-telefono").textContent = telefono || "—";
  document.getElementById("preview-direccion").textContent = direccion || "—";
  document.getElementById("preview-ciudad").textContent = ciudad || "—";
  document.getElementById("preview-fecha").textContent = fecha || "—";

  // Tabla de productos
  const tbodyProductos = document.getElementById("preview-tabla-productos");
  if (productosEnEnvio.length > 0) {
    tbodyProductos.innerHTML = productosEnEnvio
      .map((p) => `<tr><td>${p.nombre}</td><td>${p.cantidad}</td></tr>`)
      .join("");
  } else {
    tbodyProductos.innerHTML = `<tr><td colspan="2" style="color:var(--color-texto-suave);font-style:italic;">Sin productos en este envío.</td></tr>`;
  }

  // Tabla de empaques
  const tbodyEmpaques = document.getElementById("preview-tabla-empaques");
  if (empaquesEnEnvio.length > 0) {
    tbodyEmpaques.innerHTML = empaquesEnEnvio
      .map((e) => `<tr><td>${e.nombre}</td><td>${e.cantidad}</td></tr>`)
      .join("");
  } else {
    tbodyEmpaques.innerHTML = `<tr><td colspan="2" style="color:var(--color-texto-suave);font-style:italic;">Sin empaques en este envío.</td></tr>`;
  }

  // Observaciones
  const obsEl = document.getElementById("preview-observaciones");
  if (observaciones) {
    obsEl.textContent = `Observaciones: ${observaciones}`;
    obsEl.hidden = false;
  } else {
    obsEl.hidden = true;
  }

  document.getElementById("modal-preview-envio").hidden = false;
}

/** Cierra el modal de previsualización y devuelve el foco al formulario
 * para que el usuario pueda seguir editando. */
function cerrarModalPreview() {
  document.getElementById("modal-preview-envio").hidden = true;
}

// ---------- SECCIÓN: Confirmación definitiva — guarda en Supabase ----------
// Controla: solo se llega acá desde el botón "Confirmar y guardar"
// del modal de previsualización. Crea el cliente si es nuevo, arma
// el objeto final y llama a registrarSalida(). Una vez guardado, ya
// no se puede editar la factura.

async function confirmarGuardarEnvio() {
  const btnConfirmar = document.getElementById("btn-confirmar-envio");
  btnConfirmar.disabled = true;
  btnConfirmar.textContent = "Guardando…";

  let clienteId = document.getElementById("cliente-id").value;
  const telefonoTipeado = document.getElementById("telefono-cliente").value;
  const direccionTipeada = document.getElementById("direccion-cliente").value;

  if (!clienteId) {
    // Nombre nuevo: se crea el cliente en el catálogo.
    const nuevoCliente = await crearCliente({
      nombre: document.getElementById("nombre-cliente").value,
      telefono: telefonoTipeado || null,
      direccion: direccionTipeada || null,
      ciudad: document.getElementById("ciudad-destino").value || null,
    });
    clienteId = nuevoCliente && nuevoCliente.id;
  }

  const receptorTipeado = document.getElementById("nombre-receptor").value.trim();
  const nombreCliente = document.getElementById("nombre-cliente").value;

  const datosSalida = {
    cliente_id: clienteId,
    ciudad_destino: document.getElementById("ciudad-destino").value,
    nombre_receptor: receptorTipeado || nombreCliente,
    fecha: document.getElementById("fecha-envio").value,
    observaciones: document.getElementById("observaciones").value,
    productos: productosEnEnvio,
    empaques: empaquesEnEnvio,
    nota_telefono: telefonoTipeado,
    nota_direccion: direccionTipeada,
  };

  const esModoEdicion = !!envioEnEdicionId;
  let envioCreado;
  if (envioEnEdicionId) {
    envioCreado = await actualizarEnvio(envioEnEdicionId, datosSalida);
    envioEnEdicionId = null;
  } else {
    envioCreado = await registrarSalida(datosSalida);
  }

  // Restaurar botón por si hubo un error y el usuario puede reintentar
  btnConfirmar.disabled = false;
  btnConfirmar.textContent = esModoEdicion ? "✔ Guardar cambios" : "✔ Confirmar y guardar";

  if (envioCreado && envioCreado.numero_envio) {
    cerrarModalPreview();

    document.getElementById("codigo-envio").value = envioCreado.numero_envio;
    const linkFactura = document.getElementById("link-factura");
    linkFactura.href = `factura.html?envio_id=${envioCreado.id}`;
    linkFactura.hidden = false;

    // El stock y el catálogo de clientes cambiaron: se refrescan en
    // memoria para que el próximo envío parta con datos al día.
    cargarProductos();
    cargarClientes();

    mostrarMensaje(
      esModoEdicion ? "Envío actualizado correctamente." : "Envío registrado correctamente.",
      "exito",
      { alCerrar: limpiarFormularioEnvio }
    );
  }
}

// ---------- SECCIÓN: Limpieza después de confirmar ----------
// Controla: una vez que la notificación de "envío registrado" terminó
// de desaparecer, deja la pantalla lista para cargar el siguiente
// envío. El código de envío y el link a la nota impresa quedan
// visibles para que el usuario todavía pueda abrir/imprimir la nota.
function limpiarFormularioEnvio() {
  productosEnEnvio = [];
  empaquesEnEnvio = [];
  pintarListaProductos();
  pintarListaEmpaques();

  const nombreClienteInput = document.getElementById("nombre-cliente");
  nombreClienteInput.value = "";
  nombreClienteInput.classList.remove("coincidencia");
  document.getElementById("cliente-id").value = "";
  document.getElementById("nombre-receptor").value = "";
  document.getElementById("telefono-cliente").value = "";
  document.getElementById("direccion-cliente").value = "";
  document.getElementById("ciudad-destino").value = "";
  document.getElementById("observaciones").value = "";

  document.getElementById("nota-telefono").textContent =
    "Se autocompleta si el cliente ya lo tiene registrado";
  document.getElementById("nota-direccion").textContent =
    "Se autocompleta si el cliente ya la tiene registrada";
  document.getElementById("nota-ciudad").textContent =
    "Se autocompleta si el cliente ya la tiene registrada";

  fijarFechaDeHoy();

  // Si había un pedido temporal activo, eliminarlo del sidebar
  // (fue confirmado definitivamente, ya no se necesita el borrador)
  if (typeof htEliminarActivo === 'function') htEliminarActivo();

  // Si se estaba editando un envío, quitar el banner y resetear el id
  const bannerEd = document.querySelector(".banner-edicion");
  if (bannerEd) bannerEd.remove();
  envioEnEdicionId = null;

  nombreClienteInput.focus();
}

// ---------- SECCIÓN: Modo edición (cuando llega ?editar=ID en la URL) ----------
// Controla: detecta el parámetro ?editar=<id>, carga el envío existente
// (vía cargarEnvioParaEditar de js/salidas.js), pre-llena el formulario
// y muestra un banner indicando que se está editando un envío ya guardado.

async function iniciarModoEdicion() {
  const params = new URLSearchParams(window.location.search);
  const editarId = params.get("editar");
  if (!editarId) return;

  const datos = await cargarEnvioParaEditar(editarId);
  if (!datos) {
    mostrarMensaje("No se pudo cargar el envío para editar.", "error");
    return;
  }

  if (datos.estado !== "activo") {
    mostrarMensaje(
      "Este envío ya fue marcado como entregado o cancelado — no se puede editar.",
      "error"
    );
    return;
  }

  envioEnEdicionId = editarId;

  // Pre-llenar datos del cliente
  const inputNombre = document.getElementById("nombre-cliente");
  inputNombre.value = datos.cliente_nombre;
  document.getElementById("cliente-id").value = datos.cliente_id || "";
  if (datos.cliente_id) inputNombre.classList.add("coincidencia");

  document.getElementById("nombre-receptor").value = datos.nombre_receptor;
  document.getElementById("telefono-cliente").value = datos.cliente_telefono;
  document.getElementById("direccion-cliente").value = datos.cliente_direccion;
  document.getElementById("ciudad-destino").value = datos.ciudad_destino;
  document.getElementById("fecha-envio").value = datos.fecha;
  document.getElementById("observaciones").value = datos.observaciones;

  // Pre-llenar productos y empaques
  productosEnEnvio.length = 0;
  datos.productos.forEach((p) => productosEnEnvio.push(p));
  pintarListaProductos();

  empaquesEnEnvio.length = 0;
  datos.empaques.forEach((e) => empaquesEnEnvio.push(e));
  pintarListaEmpaques();

  // Cambiar texto del botón confirmar
  const btnConfirmar = document.getElementById("btn-confirmar-envio");
  if (btnConfirmar) btnConfirmar.textContent = "✔ Guardar cambios";

  // Mostrar banner de edición
  const tarjeta = document.querySelector(".tarjeta");
  if (tarjeta) {
    const banner = document.createElement("div");
    banner.className = "banner-edicion";
    banner.textContent = `✏ Editando envío ${datos.numero_envio} — los cambios reemplazan el envío original`;
    tarjeta.insertBefore(banner, tarjeta.firstChild);
  }

  mostrarMensaje(`Cargado envío ${datos.numero_envio} para editar.`, "exito");
}
