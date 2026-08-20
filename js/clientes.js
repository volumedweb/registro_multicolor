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

// ---------- UI: alta y listado en clientes.html ----------
// Este script también se carga en realizar-envio.html (para reutilizar
// listarClientes/crearCliente), donde no existe "form-cliente" — por
// eso el bloque de abajo se sale temprano si no encuentra ese formulario.

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-cliente");
  if (!form) return;

  cargarTablaClientes();
  form.addEventListener("submit", manejarAltaCliente);
});

async function cargarTablaClientes() {
  const clientes = await listarClientes();
  pintarTablaClientes(clientes);
}

function pintarTablaClientes(clientes) {
  const tbody = document.querySelector("#tabla-clientes tbody");
  if (!clientes || clientes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4">Todavía no hay clientes registrados.</td></tr>`;
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
        </tr>`
    )
    .join("");
}

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
