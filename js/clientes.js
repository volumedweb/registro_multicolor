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

// ---------- SECCIÓN: Acceso a datos (Supabase) ----------
// Controla: leer y crear filas en la tabla "clientes". No toca el DOM;
// estas funciones las reutilizan tanto clientes.html como
// realizar-envio.html.

async function listarClientes() {
  const { data, error } = await supabaseClient
    .from("clientes")
    .select("*")
    .order("nombre");

  if (error) {
    mostrarMensaje("No se pudieron cargar los clientes: " + error.message, "error");
    return [];
  }
  return data;
}

async function crearCliente(datosCliente) {
  // datosCliente esperado: { nombre, telefono, direccion, ciudad }
  // Se usa tanto desde clientes.html (alta manual) como desde
  // "Realizar envío" cuando se escribe un nombre que no coincide con
  // ningún cliente ya cargado.
  const { data, error } = await supabaseClient
    .from("clientes")
    .insert({
      nombre: datosCliente.nombre,
      telefono: datosCliente.telefono || null,
      direccion: datosCliente.direccion || null,
      ciudad: datosCliente.ciudad || null,
    })
    .select()
    .single();

  if (error) {
    mostrarMensaje("No se pudo guardar el cliente: " + error.message, "error");
    return null;
  }
  return data;
}

/** Borra un cliente ya registrado. Si tiene envíos guardados, la base
 * rechaza el borrado (envios.cliente_id lo referencia) y el error de
 * Supabase se muestra tal cual — no hay borrado en cascada para
 * clientes, a diferencia de un envío y su detalle. */
async function eliminarCliente(id) {
  const { error } = await supabaseClient.from("clientes").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      mostrarMensaje(
        "No se puede eliminar: este cliente ya tiene envíos registrados en el historial. Para borrarlo, primero eliminá o reasigná esos envíos.",
        "error"
      );
    } else {
      mostrarMensaje("No se pudo eliminar el cliente: " + error.message, "error");
    }
    return false;
  }
  return true;
}

/** Actualiza cualquiera de los datos de un cliente ya registrado
 * (nombre, teléfono, dirección, ciudad) desde el modal "Editar
 * cliente". Ojo: esto SÍ modifica el registro del cliente — a
 * diferencia de "Realizar envío", donde editar esos mismos campos
 * solo afecta a la nota de ese envío puntual (ver [[diseno_base_datos]]). */
async function actualizarCliente(id, datosCliente) {
  const { data, error } = await supabaseClient
    .from("clientes")
    .update({
      nombre: datosCliente.nombre,
      telefono: datosCliente.telefono || null,
      direccion: datosCliente.direccion || null,
      ciudad: datosCliente.ciudad || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    mostrarMensaje("No se pudo actualizar el cliente: " + error.message, "error");
    return null;
  }
  return data;
}

// ---------- SECCIÓN: Interfaz — alta y listado en clientes.html ----------
// Controla: la tabla de clientes y el formulario de alta manual.
// Este script también se carga en realizar-envio.html (para reutilizar
// listarClientes/crearCliente), donde no existe "form-cliente" — por
// eso el bloque de abajo se sale temprano si no encuentra ese formulario.

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-cliente");
  if (!form) return;

  cargarTablaClientes();
  form.addEventListener("submit", manejarAltaCliente);
  configurarModalEditarCliente();
});

// Último listado de clientes traído de la base — lo usa el modal
// "Editar cliente" para buscar por nombre sin volver a consultar
// Supabase en cada tecla.
let clientesCacheLocal = [];

/** Trae los clientes de la base y refresca la tabla en pantalla. */
async function cargarTablaClientes() {
  clientesCacheLocal = (await listarClientes()) || [];
  pintarTablaClientes(clientesCacheLocal);
}

/** Dibuja las filas de la tabla de clientes (o el mensaje de "vacío"),
 * con un botón para eliminar cada uno ya guardado. */
function pintarTablaClientes(clientes) {
  const tbody = document.querySelector("#tabla-clientes tbody");
  if (!clientes || clientes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">Todavía no hay clientes registrados.</td></tr>`;
    return;
  }
  tbody.innerHTML = clientes
    .map(
      (c) => `
        <tr>
          <td>${c.nombre}</td>
          <td>${c.telefono || "—"}</td>
          <td>${c.direccion || "—"}</td>
          <td>${c.ciudad || "—"}</td>
          <td>
            <button type="button" class="btn-eliminar" data-id="${c.id}" data-nombre="${c.nombre}">
              Eliminar
            </button>
          </td>
        </tr>`
    )
    .join("");

  tbody.querySelectorAll(".btn-eliminar").forEach((boton) => {
    boton.addEventListener("click", () => manejarEliminarCliente(boton));
  });
}

/** Elimina el cliente de esa fila (sin ventana de confirmación aparte: el toast avisa el resultado). */
async function manejarEliminarCliente(boton) {
  const id = boton.dataset.id;
  const nombre = boton.dataset.nombre;

  const eliminado = await eliminarCliente(id);
  if (!eliminado) return; // eliminarCliente ya mostró el error

  mostrarMensaje(`Cliente "${nombre}" eliminado.`);
  cargarTablaClientes();
}

/** Valida y guarda el formulario de alta de cliente. */
async function manejarAltaCliente(evento) {
  evento.preventDefault();

  const nombre = document.getElementById("nombre-cliente").value.trim();
  const telefono = document.getElementById("telefono-cliente").value.trim();
  const direccion = document.getElementById("direccion-cliente").value.trim();
  const ciudad = document.getElementById("ciudad-cliente").value.trim();

  if (!nombre) {
    mostrarMensaje("Ingresá el nombre del cliente.", "error");
    return;
  }

  const creado = await crearCliente({ nombre, telefono, direccion, ciudad });
  if (!creado) return; // crearCliente ya mostró el error

  mostrarMensaje("Cliente guardado correctamente.");
  evento.target.reset();
  cargarTablaClientes();
}

// ---------- SECCIÓN: Modal "Editar cliente" ----------
// Controla: el flujo completo del botón "Editar cliente" — buscar el
// cliente por nombre (mismo patrón de datalist que "Realizar envío" y
// el modal de stock de productos.html) y, recién cuando hay una
// coincidencia, mostrar el formulario con sus datos actuales para
// corregir cualquier campo.

function configurarModalEditarCliente() {
  const btnAbrir = document.getElementById("btn-abrir-editar-cliente");
  if (!btnAbrir) return; // por si este archivo se carga en otra pantalla

  const modal = document.getElementById("modal-editar-cliente");
  const btnCerrar = document.getElementById("btn-cerrar-modal-editar-cliente");
  const buscador = document.getElementById("buscador-editar-cliente");
  const datalist = document.getElementById("lista-clientes-editar");
  const formulario = document.getElementById("form-editar-cliente");
  const idInput = document.getElementById("editar-cliente-id");
  const nombreInput = document.getElementById("editar-nombre-cliente");
  const telefonoInput = document.getElementById("editar-telefono-cliente");
  const direccionInput = document.getElementById("editar-direccion-cliente");
  const ciudadInput = document.getElementById("editar-ciudad-cliente");

  btnAbrir.addEventListener("click", () => {
    datalist.innerHTML = clientesCacheLocal
      .map((c) => `<option value="${c.nombre}"></option>`)
      .join("");
    modal.hidden = false;
    buscador.focus();
  });

  btnCerrar.addEventListener("click", cerrarModalEditarCliente);
  modal.addEventListener("click", (evento) => {
    if (evento.target.id === "modal-editar-cliente") cerrarModalEditarCliente();
  });

  function cerrarModalEditarCliente() {
    modal.hidden = true;
    buscador.value = "";
    idInput.value = "";
    formulario.hidden = true;
  }

  // Al tipear, resuelve el cliente igual que en "Realizar envío": si
  // el texto coincide exacto (sin importar mayúsculas) con uno del
  // catálogo, recién ahí aparece el formulario con sus datos.
  buscador.addEventListener("input", () => {
    const nombreTipeado = buscador.value.trim().toLowerCase();
    const coincidencia = clientesCacheLocal.find(
      (c) => c.nombre.toLowerCase() === nombreTipeado
    );

    if (coincidencia) {
      idInput.value = coincidencia.id;
      nombreInput.value = coincidencia.nombre;
      telefonoInput.value = coincidencia.telefono || "";
      direccionInput.value = coincidencia.direccion || "";
      ciudadInput.value = coincidencia.ciudad || "";
      formulario.hidden = false;
    } else {
      idInput.value = "";
      formulario.hidden = true;
    }
  });

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const id = idInput.value;
    if (!id) {
      mostrarMensaje("Buscá y elegí un cliente de la lista.", "error");
      return;
    }

    const nombre = nombreInput.value.trim();
    if (!nombre) {
      mostrarMensaje("El nombre del cliente no puede quedar vacío.", "error");
      return;
    }

    const actualizado = await actualizarCliente(id, {
      nombre,
      telefono: telefonoInput.value.trim(),
      direccion: direccionInput.value.trim(),
      ciudad: ciudadInput.value.trim(),
    });
    if (!actualizado) return; // actualizarCliente ya mostró el error

    mostrarMensaje("Cliente actualizado correctamente.");
    cerrarModalEditarCliente();
    cargarTablaClientes();
  });
}
