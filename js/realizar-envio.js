// ============================================================
// Realizar envío — lógica de la pantalla
// ============================================================
// Arma los campos de cliente y producto con autocompletado
// (datalist), agrega/quita líneas de producto y empaque al
// envío, y arma los datos finales antes de guardarlos.
//
// Depende de (todavía con TODOs pendientes de conectar a Supabase):
//   - listarClientes() / crearCliente()   (js/clientes.js)
//   - listarProductos()                   (js/productos.js)
//   - listarTiposEmpaque()                (js/empaques.js)
//   - registrarSalida()                   (js/salidas.js)
//   - mostrarMensaje() / esCantidadValida() (js/utils.js)
//
// Al confirmar, si registrarSalida devuelve { id, numero_envio } se
// completa "Código de envío" y aparece el link a la nota de envío
// imprimible (factura.html?envio_id=<id>, ver js/factura.js).

// ---------- SECCIÓN: Estado en memoria ----------
// Controla: catálogos cacheados (para el autocompletado) y las líneas
// de producto/empaque que se van agregando al envío que se está
// armando, antes de confirmarlo.
let clientesCache = [];
let productosCache = [];
let tiposEmpaqueCache = [];
let productosEnEnvio = []; // { producto_id, nombre, cantidad }
let empaquesEnEnvio = []; // { tipo_empaque_id, nombre, cantidad }

// ---------- SECCIÓN: Arranque de la página ----------
// Controla: carga los catálogos, fija la fecha de hoy y engancha
// todos los eventos del formulario (autocompletado, agregar líneas,
// confirmar envío).
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
// Controla: cuando el nombre tipeado coincide con un cliente del
// catálogo, se completa su id y su teléfono (si lo tiene). Si no
// coincide (cliente nuevo o todavía sin terminar de escribir), el
// teléfono/dirección/ciudad quedan editables a mano: esos datos se
// usan para este envío pero no se guardan en el catálogo de clientes
// salvo que el cliente sea nuevo.

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
    // Cliente ya registrado: se autocompletan sus datos de base. Se
    // pueden editar acá nomás para esta pantalla — teléfono y dirección
    // no tienen columna en "envios" (ver supabase/schema.sql), así que
    // lo que se escriba solo se usa para imprimir la nota de este envío
    // y nunca actualiza el registro del cliente. Ciudad sí se guarda
    // como destino de este envío puntual (envios.ciudad_destino), pero
    // tampoco modifica la ciudad "de base" del cliente.
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
// Controla: convierte el nombre tipeado en el <input> del producto a
// su id real, buscándolo en el catálogo cacheado.

function manejarSeleccionProducto(evento) {
  const nombreTipeado = evento.target.value.trim();
  const idInput = document.getElementById("select-producto");
  const coincidencia = productosCache.find(
    (p) => p.nombre.toLowerCase() === nombreTipeado.toLowerCase()
  );
  idInput.value = coincidencia ? coincidencia.id : "";
}

// ---------- SECCIÓN: Agregar/quitar líneas al envío ----------
// Controla: valida y agrega cada línea de producto o empaque a los
// arrays en memoria (productosEnEnvio / empaquesEnEnvio), y repinta
// las listas visibles debajo de cada selector. También permite
// quitar una línea ya agregada.

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

// ---------- SECCIÓN: Confirmación — envío del formulario ----------
// Controla: valida que haya al menos una línea cargada, crea el
// cliente si es nuevo, arma el objeto final y llama a
// registrarSalida() (js/salidas.js) para guardar todo en Supabase.
// Si sale bien, muestra el código de envío y el link a la nota
// imprimible.

async function manejarEnvioFormulario(evento) {
  evento.preventDefault();

  if (productosEnEnvio.length === 0 && empaquesEnEnvio.length === 0) {
    mostrarMensaje(
      "Agregá al menos un producto o un empaque antes de confirmar.",
      "error"
    );
    return;
  }

  let clienteId = document.getElementById("cliente-id").value;
  const telefonoTipeado = document.getElementById("telefono-cliente").value;
  const direccionTipeada = document.getElementById("direccion-cliente").value;

  if (!clienteId) {
    // Nombre nuevo: se crea el cliente en el catálogo con lo que se haya
    // escrito acá (teléfono, dirección, ciudad quedan como su info "de
    // base" para la próxima vez). Si un campo quedó vacío, se guarda así.
    const nuevoCliente = await crearCliente({
      nombre: document.getElementById("nombre-cliente").value,
      telefono: telefonoTipeado || null,
      direccion: direccionTipeada || null,
      ciudad: document.getElementById("ciudad-destino").value || null,
    });
    clienteId = nuevoCliente && nuevoCliente.id;
  }

  // "Nombre de quien recibe" es un campo aparte porque no siempre es
  // el cliente quien recoge el pedido (portería, otra persona
  // autorizada, etc.). Si se deja vacío, se usa el nombre del cliente
  // — así el caso más común (recibe el propio cliente) no obliga a
  // escribirlo dos veces.
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
    // telefono y direccion NO son columnas de "envios": solo viajan acá
    // para imprimir la nota de envío (el detalle), no se guardan en la
    // base de datos. Si el cliente ya estaba registrado, pisar estos
    // valores tampoco actualiza su registro en "clientes".
    nota_telefono: telefonoTipeado,
    nota_direccion: direccionTipeada,
  };

  const envioCreado = await registrarSalida(datosSalida);

  // Una vez guardado, se muestra el folio y el link a la nota de envío
  // imprimible (factura.html).
  if (envioCreado && envioCreado.numero_envio) {
    document.getElementById("codigo-envio").value = envioCreado.numero_envio;
    const linkFactura = document.getElementById("link-factura");
    linkFactura.href = `factura.html?envio_id=${envioCreado.id}`;
    linkFactura.hidden = false;

    // El stock de los productos despachados y el catálogo de clientes
    // (si se creó uno nuevo) cambiaron: se refrescan los catálogos en
    // memoria para que el próximo envío parta con datos al día.
    cargarProductos();
    cargarClientes();

    // Avisa con una notificación que se cierra sola (no bloquea la
    // pantalla) y, recién cuando termina de desaparecer, limpia todos
    // los productos/empaques cargados para que el usuario pueda
    // arrancar el siguiente envío sin tener que borrar nada a mano.
    mostrarMensaje("Envío registrado correctamente.", "exito", {
      alCerrar: limpiarFormularioEnvio,
    });
  }
}

// ---------- SECCIÓN: Limpieza después de confirmar ----------
// Controla: una vez que la notificación de "envío registrado" terminó
// de desaparecer, deja la pantalla lista para cargar el siguiente
// envío — vacía las líneas de producto/empaque agregadas y los datos
// de cliente tipeados. El código de envío y el link a la nota impresa
// quedan visibles (no se borran) para que el usuario todavía pueda
// abrir/imprimir la nota del envío que se acaba de guardar.
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
  nombreClienteInput.focus();
}
