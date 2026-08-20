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

let clientesCache = [];
let productosCache = [];
let tiposEmpaqueCache = [];
let productosEnEnvio = []; // { producto_id, nombre, cantidad }
let empaquesEnEnvio = []; // { tipo_empaque_id, nombre, cantidad }

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

// ---------- Fecha: siempre la de hoy, no se edita a mano ----------

function fijarFechaDeHoy() {
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, "0");
  const dd = String(hoy.getDate()).padStart(2, "0");
  document.getElementById("fecha-envio").value = `${yyyy}-${mm}-${dd}`;
}

// ---------- Carga de catálogos ----------

async function cargarClientes() {
  clientesCache = (await listarClientes()) || [];
  const datalist = document.getElementById("lista-clientes");
  datalist.innerHTML = clientesCache
    .map((c) => `<option value="${c.nombre}"></option>`)
    .join("");
}

async function cargarProductos() {
  productosCache = (await listarProductos()) || [];
  const datalist = document.getElementById("lista-productos-disponibles");
  datalist.innerHTML = productosCache
    .map((p) => `<option value="${p.nombre}"></option>`)
    .join("");
}

async function cargarTiposEmpaque() {
  tiposEmpaqueCache = (await listarTiposEmpaque()) || [];
  const select = document.getElementById("select-empaque");
  select.innerHTML =
    '<option value="">Tipo de empaque</option>' +
    tiposEmpaqueCache
      .map((t) => `<option value="${t.id}">${t.nombre}</option>`)
      .join("");
}

// ---------- Cliente: autocompletar al coincidir con uno existente ----------
// Si el nombre tipeado coincide con un cliente del catálogo, se completa
// su id y su teléfono (si lo tiene). Si no coincide (cliente nuevo o
// todavía sin terminar de escribir), el teléfono/dirección/ciudad quedan
// editables a mano: esos datos se usan para este envío pero no se
// guardan en el catálogo de clientes salvo que el cliente sea nuevo.

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

// ---------- Producto: resolver el id cuando el texto coincide ----------

function manejarSeleccionProducto(evento) {
  const nombreTipeado = evento.target.value.trim();
  const idInput = document.getElementById("select-producto");
  const coincidencia = productosCache.find(
    (p) => p.nombre.toLowerCase() === nombreTipeado.toLowerCase()
  );
  idInput.value = coincidencia ? coincidencia.id : "";
}

// ---------- Agregar líneas al envío ----------

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

function pintarListaProductos() {
  pintarLista(
    "lista-productos",
    productosEnEnvio,
    "Todavía no agregaste productos a este envío.",
    quitarProducto
  );
}

function pintarListaEmpaques() {
  pintarLista(
    "lista-empaques",
    empaquesEnEnvio,
    "Todavía no agregaste empaques a este envío.",
    quitarEmpaque
  );
}

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

function quitarProducto(indice) {
  productosEnEnvio.splice(indice, 1);
  pintarListaProductos();
}

function quitarEmpaque(indice) {
  empaquesEnEnvio.splice(indice, 1);
  pintarListaEmpaques();
}

// ---------- Envío del formulario ----------

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

  const datosSalida = {
    cliente_id: clienteId,
    ciudad_destino: document.getElementById("ciudad-destino").value,
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
  // imprimible (factura.html). Todavía depende de que registrarSalida
  // esté implementado de verdad (ver TODO en js/salidas.js).
  if (envioCreado && envioCreado.numero_envio) {
    document.getElementById("codigo-envio").value = envioCreado.numero_envio;
    const linkFactura = document.getElementById("link-factura");
    linkFactura.href = `factura.html?envio_id=${envioCreado.id}`;
    linkFactura.hidden = false;
  }
}
