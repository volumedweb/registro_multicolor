// ============================================================
// Historial temporal — pedidos guardados durante la sesión
// ============================================================
// Guarda el estado del formulario en sessionStorage (se borra
// al cerrar la pestaña o al cerrar sesión con el botón).
// Permite trabajar varios pedidos en paralelo sin perder datos.
//
// Depende de (variables globales expuestas por realizar-envio.js):
//   - productosEnEnvio   → array con las líneas de producto
//   - empaquesEnEnvio    → array con las líneas de empaque
//   - pintarListaProductos()
//   - pintarListaEmpaques()
//   - mostrarMensaje()
//
// Estructura de cada entrada guardada en sessionStorage:
// {
//   id           : 'pt_1234567890'  (timestamp único)
//   timestamp    : '2024-01-01T10:32:00'
//   nombreCliente: 'Distribuidora López'
//   clienteId    : 'uuid-o-vacío'
//   receptor     : ''
//   telefono     : '+591 70012345'
//   direccion    : 'Av. América #456'
//   ciudad       : 'Cochabamba'
//   observaciones: ''
//   productos    : [{ producto_id, nombre, cantidad }]
//   empaques     : [{ tipo_empaque_id, nombre, cantidad }]
// }

const HT_KEY = 'ht-pedidos';

// id del pedido que está actualmente "cargado" en el formulario
let htActivo = null;

// ---------- Arranque ----------

document.addEventListener('DOMContentLoaded', () => {
  document
    .getElementById('btn-guardar-temporal')
    .addEventListener('click', guardarTemporal);

  // Limpiar el historial al cerrar sesión
  const btnCerrar = document.getElementById('cerrar-sesion');
  if (btnCerrar) {
    btnCerrar.addEventListener('click', () => {
      sessionStorage.removeItem(HT_KEY);
    }, { capture: true });
  }

  renderizarSidebar();
});

// ---------- Leer / escribir sessionStorage ----------

function htLeer() {
  try {
    return JSON.parse(sessionStorage.getItem(HT_KEY) || '[]');
  } catch {
    return [];
  }
}

function htEscribir(lista) {
  sessionStorage.setItem(HT_KEY, JSON.stringify(lista));
}

// ---------- Capturar estado actual del formulario ----------

function capturarEstado() {
  const nombreCliente = document.getElementById('nombre-cliente').value.trim();

  if (
    !nombreCliente &&
    productosEnEnvio.length === 0 &&
    empaquesEnEnvio.length === 0
  ) {
    mostrarMensaje(
      'El formulario está vacío. Completá al menos el nombre del cliente antes de guardar.',
      'error'
    );
    return null;
  }

  return {
    // Si ya había un borrador activo lo actualizamos (mismo id),
    // si no, creamos uno nuevo con el timestamp actual
    id: htActivo || ('pt_' + Date.now()),
    timestamp: new Date().toISOString(),
    nombreCliente,
    clienteId : document.getElementById('cliente-id').value,
    receptor  : document.getElementById('nombre-receptor').value.trim(),
    telefono  : document.getElementById('telefono-cliente').value.trim(),
    direccion : document.getElementById('direccion-cliente').value.trim(),
    ciudad    : document.getElementById('ciudad-destino').value.trim(),
    observaciones: document.getElementById('observaciones').value.trim(),
    // Copia profunda de los arrays de realizar-envio.js
    productos : JSON.parse(JSON.stringify(productosEnEnvio)),
    empaques  : JSON.parse(JSON.stringify(empaquesEnEnvio)),
  };
}

// ---------- Guardar en temporal ----------

function guardarTemporal() {
  const estado = capturarEstado();
  if (!estado) return;

  // Reemplaza si ya existe un borrador con el mismo id, si no inserta al inicio
  const lista = htLeer().filter(p => p.id !== estado.id);
  lista.unshift(estado);
  htEscribir(lista);

  // No marcamos htActivo acá para que el próximo "Guardar"
  // genere un id nuevo y apile en vez de reemplazar.
  // htActivo solo se setea al hacer "Reanudar" (para actualizar ese borrador).
  htActivo = null;
  renderizarSidebar();
  mostrarMensaje('Guardado en historial temporal.', 'exito');
}

// ---------- Reanudar un pedido guardado ----------

function htReanudar(id) {
  const lista = htLeer();
  const pedido = lista.find(p => p.id === id);
  if (!pedido) return;

  // Campos de texto
  const inputNombre = document.getElementById('nombre-cliente');
  inputNombre.value = pedido.nombreCliente;
  document.getElementById('cliente-id').value    = pedido.clienteId;
  document.getElementById('nombre-receptor').value = pedido.receptor;
  document.getElementById('telefono-cliente').value = pedido.telefono;
  document.getElementById('direccion-cliente').value = pedido.direccion;
  document.getElementById('ciudad-destino').value   = pedido.ciudad;
  document.getElementById('observaciones').value    = pedido.observaciones;

  // Marcado visual de "cliente reconocido"
  if (pedido.clienteId) {
    inputNombre.classList.add('coincidencia');
  } else {
    inputNombre.classList.remove('coincidencia');
  }

  // Restaurar arrays en memoria de realizar-envio.js y repintar listas
  productosEnEnvio.length = 0;
  pedido.productos.forEach(p => productosEnEnvio.push(p));
  pintarListaProductos();

  empaquesEnEnvio.length = 0;
  pedido.empaques.forEach(e => empaquesEnEnvio.push(e));
  pintarListaEmpaques();

  htActivo = id;
  renderizarSidebar();

  mostrarMensaje('Pedido cargado en el formulario.', 'exito');
  inputNombre.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- Eliminar un pedido del sidebar ----------

function htEliminar(id) {
  const lista = htLeer().filter(p => p.id !== id);
  htEscribir(lista);
  if (htActivo === id) htActivo = null;
  renderizarSidebar();
  mostrarMensaje('Pedido temporal eliminado.', '');
}

// ---------- Eliminar el pedido activo (llamado desde realizar-envio.js
//            al confirmar un envío definitivamente) ----------

function htEliminarActivo() {
  if (!htActivo) return;
  htEliminar(htActivo);
  htActivo = null;
}

// ---------- Renderizar el sidebar ----------

function renderizarSidebar() {
  const lista = htLeer();
  document.getElementById('sidebar-badge').textContent = lista.length;
  const contenedor = document.getElementById('sidebar-lista');

  if (lista.length === 0) {
    contenedor.innerHTML = `
      <div class="sidebar-vacio">
        <div class="sidebar-vacio-icono">📋</div>
        <p>Sin pedidos guardados</p>
      </div>`;
    return;
  }

  contenedor.innerHTML = lista.map(p => {
    const esActivo = p.id === htActivo;
    return `
      <div class="pedido-temp${esActivo ? ' activo' : ''}" id="ptc-${p.id}">
        <div class="pt-cliente">
          ${escHtml(p.nombreCliente || 'Sin nombre')}
          ${esActivo ? '<span class="chip-activo">editando</span>' : ''}
        </div>
        <div class="pt-detalle">${escHtml(armarResumen(p))}</div>
        <div class="pt-hora">${escHtml(formatearHora(p.timestamp))}</div>
        <div class="pt-acciones">
          <button class="btn-pt-reanudar" onclick="htReanudar('${p.id}')">↩ Reanudar</button>
          <button class="btn-pt-eliminar" onclick="htEliminar('${p.id}')">🗑</button>
        </div>
      </div>`;
  }).join('');
}

// ---------- Helpers ----------

function armarResumen(p) {
  const partes = [];
  if (p.ciudad) partes.push(p.ciudad);
  if (p.productos.length > 0)
    partes.push(p.productos.length === 1 ? '1 producto' : `${p.productos.length} productos`);
  if (p.empaques.length > 0)
    partes.push(p.empaques.length === 1 ? '1 empaque' : `${p.empaques.length} empaques`);
  if (partes.length === 0 && p.receptor)
    partes.push(`Recibe: ${p.receptor}`);
  return partes.join(' · ') || 'Sin detalles';
}

function formatearHora(iso) {
  try {
    const d   = new Date(iso);
    const hoy = new Date();
    const hh  = String(d.getHours()).padStart(2, '0');
    const mm  = String(d.getMinutes()).padStart(2, '0');
    if (d.toDateString() === hoy.toDateString())
      return `Guardado hoy ${hh}:${mm}`;
    // verificar si fue ayer
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);
    if (d.toDateString() === ayer.toDateString())
      return `Guardado ayer ${hh}:${mm}`;
    // fecha más antigua
    const dd   = String(d.getDate()).padStart(2, '0');
    const mes  = String(d.getMonth() + 1).padStart(2, '0');
    return `Guardado ${dd}/${mes} ${hh}:${mm}`;
  } catch {
    return 'Guardado hace un momento';
  }
}

/** Escapar caracteres HTML para evitar XSS al insertar con innerHTML */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
