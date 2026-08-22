# Informe técnico — Lógica del código JavaScript

**Proyecto:** Envíos Multicolor
**Alcance:** los 12 archivos de la carpeta `js/`
**Objetivo de este informe:** explicar bloque por bloque qué hace cada parte del código, de qué depende, qué controla en la pantalla y en la base de datos, y qué tocar si querés personalizarlo (agregar un campo, cambiar una validación, cambiar un texto, etc.).

Este documento no reemplaza los comentarios que ya están en el código — los complementa con más contexto y con "recetas" de personalización para cada bloque.

---

## Cómo está organizado el proyecto (resumen rápido)

La app tiene dos capas bien separadas en casi todos los archivos:

1. **Acceso a datos**: funciones que hablan con Supabase (leer/crear/actualizar filas de una tabla). No tocan el HTML. Son las que reutilizan varias pantallas entre sí.
2. **Interfaz (UI)**: funciones que leen inputs del formulario, arman el HTML de tablas/listas, y enganchan eventos (`click`, `submit`, `input`). Estas sí tocan el DOM.

Separar estas dos capas es lo que permite, por ejemplo, que `js/clientes.js` se use tanto en `clientes.html` (para el alta manual) como en `realizar-envio.html` (para el autocompletado), sin duplicar código.

El orden de carga de scripts en cada página HTML importa: `js/supabaseClient.js` siempre va primero (crea la conexión), después `js/auth.js` (si la página la necesita), y después el/los script(s) propios de esa pantalla.

---

## 1. `js/supabaseClient.js` — Conexión a la base de datos

### Qué hace
Crea la variable global `supabaseClient`, que es el objeto que **todos los demás archivos** usan para leer, escribir y manejar la sesión de usuario. Es literalmente el primer archivo que se ejecuta.

### Bloques

- **Credenciales del proyecto** (`SUPABASE_URL`, `SUPABASE_ANON_KEY`): la dirección de tu proyecto de Supabase y la clave pública. Esta clave es segura de mostrar en el navegador porque las reglas de seguridad (Row Level Security, en `supabase/rls.sql`) son las que realmente deciden qué se puede leer o escribir — sin sesión iniciada, esta clave sola no sirve para nada.
- **Cliente global**: `window.supabase.createClient(...)` arma la conexión real. Requiere que el HTML haya cargado antes el SDK de Supabase vía `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>`.

### Cómo personalizarlo
- Si cambiás de proyecto de Supabase (otra cuenta, otro entorno de pruebas), acá es el único lugar donde tenés que actualizar `SUPABASE_URL` y `SUPABASE_ANON_KEY` (los sacás de Settings → API Keys en el panel de Supabase).
- No agregues lógica de negocio en este archivo — cualquier otra cosa relacionada a datos va en su archivo correspondiente (`productos.js`, `clientes.js`, etc.), para no perder la separación de capas.

---

## 2. `js/utils.js` — Funciones compartidas

### Qué hace
Junta un puñado de funciones chiquitas que usan varios archivos, para no repetir código.

### Bloques

- **Formato de fechas** (`formatearFecha`): convierte una fecha que viene de la base (formato `aaaa-mm-dd`, o con hora) a texto legible `dd/mm/aaaa`. Tiene un detalle importante: si la fecha es *solo fecha* (sin hora), la arma "a mano" en vez de usar `new Date(...)`, porque en husos horarios negativos (como Bolivia, UTC-4) `new Date("2026-08-20")` puede mostrar el 19 en vez del 20. Si algún día ves una fecha "corrida un día", el problema está relacionado con este comportamiento de JavaScript, no con la base de datos.
- **Mensajes al usuario** (`mostrarMensaje`): el único punto por donde se muestran avisos de error o éxito. Hoy usa `alert()` del navegador (hay un TODO explícito para reemplazarlo por un componente visual más lindo, tipo toast). Como todos los archivos llaman a esta función en vez de usar `alert()` directamente, el día que quieras cambiar el estilo de los avisos, **solo tenés que tocar esta función**.
- **Validaciones** (`esCantidadValida`): chequea que un valor sea un número mayor a cero. Se usa antes de agregar una línea de producto o empaque a un envío.

### Cómo personalizarlo
- **Cambiar el estilo de los mensajes**: reemplazá el `alert(texto)` dentro de `mostrarMensaje` por lo que quieras (un `<div>` que aparece y desaparece, una librería de toasts, etc.). No hace falta tocar ningún otro archivo.
- **Cambiar el formato de fecha** (ej. mostrar el nombre del mes, o formato `aaaa-mm-dd`): tocá `formatearFecha`. Ojo con no romper el chequeo `esSoloFecha` si seguís necesitando manejar fechas sin hora.
- **Agregar nuevas validaciones** (ej. validar un teléfono, un email): agregalas acá como funciones nuevas, siguiendo el mismo patrón (`esAlgoValido(valor)` que devuelve `true`/`false`).

---

## 3. `js/auth.js` — Protección de páginas y roles

### Qué hace
Se incluye en **todas las páginas excepto** `login.html` y `acceso-codigo.html`. Antes de mostrar cualquier contenido, verifica que haya una sesión activa y que el rol del usuario tenga permiso para estar en esa página. Si no corresponde, redirige.

### Bloques

- **Estado global del perfil** (`let perfilActual`): guarda los datos del usuario logueado (rol, nombre, activo) para que cualquier otro script de la página los pueda leer sin volver a consultar la base. Se expone también como `window.perfilActual`.
- **Guardia de acceso** (la función autoejecutada `protegerPagina`): esta es la parte más importante del archivo. La secuencia es:
  1. Pregunta a Supabase si hay sesión (`auth.getSession()`). Si no hay, manda a `login.html`.
  2. Si hay sesión, busca el perfil en la tabla `perfiles` (rol, nombre, activo).
  3. Si el perfil no existe o está desactivado (`activo = false`), cierra la sesión y manda al login — aunque la sesión de Supabase siga "técnicamente" vigente, se trata como si no estuviera logueado. Esto es lo que te permite desactivar a alguien sin tener que borrar su cuenta.
  4. Chequea el rol contra el tipo de página: si es `veedor` y la página no es `veedor.html`, lo manda para allá; si NO es veedor y está en `veedor.html`, lo manda a `index.html`.
  5. Si todo está en orden, muestra el badge de rol y recién ahí saca el atributo `hidden` del `<body>` (que arranca oculto a propósito, para no mostrar contenido por una fracción de segundo antes de confirmar el acceso).
- **Etiqueta visual del rol** (`nombreRol`, `mostrarBadgeRol`): arma el texto "Dueño" / "Administrador" / "Veedor" y lo agrega junto al nombre de la app en el header.
- **Cerrar sesión** (`cerrarSesion` + el listener del link `#cerrar-sesion`): cierra la sesión de Supabase y vuelve al login.

### Cómo personalizarlo
- **Agregar un nuevo rol**: tocás `nombreRol` (agregar el texto legible) y la lógica de redirección en `protegerPagina` (decidir a qué página va ese rol). También hay que actualizar `supabase/migracion_roles_y_codigos.sql` y las políticas de RLS del lado de la base — este archivo solo controla el front, no reemplaza la seguridad real que vive en Supabase.
- **Cambiar qué página ve cada rol**: la comparación está en las dos condiciones de `perfil.rol === "veedor"` / `perfil.rol !== "veedor"`. Si mañana agregás más "páginas restringidas" además de `veedor.html`, este bloque va a necesitar una lógica un poco más genérica (por ejemplo, un mapa de rol → páginas permitidas) en vez de la comparación puntual actual.
- **Cambiar el criterio de "cuenta desactivada"**: hoy se basa en la columna `perfiles.activo`. Si agregás otro criterio (ej. fecha de vencimiento), se agrega en el mismo `if (error || !perfil || !perfil.activo)`.

---

## 4. `js/login.js` — Login con usuario y contraseña

### Qué hace
Maneja el formulario de `login.html`: login clásico con email/usuario y contraseña contra Supabase Auth.

### Bloques

- **Arranque de la página**: si ya hay sesión activa (por ejemplo, volviste a esta pantalla por error), salta directo a `index.html` sin pedir nada. Si no, deja el formulario escuchando el `submit`.
- **Envío del formulario** (`manejarLogin`): llama a `supabaseClient.auth.signInWithPassword(...)`. Si hay error, muestra "Usuario o contraseña incorrectos." (mensaje genérico a propósito, para no revelar si el error es el usuario o la contraseña). Si sale bien, redirige a `index.html`.

### Cómo personalizarlo
- **Cambiar el mensaje de error**: es el string dentro de `mostrarMensaje(...)` en el bloque `if (error)`.
- **Redirigir según rol también acá**: hoy este login siempre manda a `index.html` (se asume que quien usa usuario/contraseña es administrador). Si querés que también soporte veedores, podés copiar la lógica de `redirigirSegunRol()` de `acceso-codigo.js` (ver punto 5) y llamarla en vez de redirigir siempre a `index.html`.

---

## 5. `js/acceso-codigo.js` — Login simplificado por código

### Qué hace
Alternativa al login clásico: un solo campo de "código" que identifica a la persona y, por dentro, resuelve automáticamente a qué cuenta de Supabase Auth corresponde.

### Bloques

- **Arranque de la página**: igual que en `login.js` — si ya hay sesión, no vuelve a pedir el código, sino que llama directo a `redirigirSegunRol()`.
- **Envío del formulario** (`manejarLoginConCodigo`): acá está la parte más particular del archivo.
  1. Llama a la función RPC `login_por_codigo` (definida en `supabase/migracion_roles_y_codigos.sql`), pasándole el código tipeado. Esa función busca en la base a qué email corresponde ese código, **sin exponer la tabla `perfiles` completa** al navegador (por seguridad).
  2. Con el email que devuelve, hace un login normal usando `signInWithPassword`, usando **el mismo código como contraseña** (por diseño: la cuenta real de Supabase tiene el código como contraseña).
  3. Si algo falla en cualquiera de los dos pasos, muestra "Código inválido o inactivo." (mensaje genérico también a propósito).
- **Redirección según rol** (`redirigirSegunRol`): busca el perfil del usuario recién logueado y decide: si está desactivado, cierra sesión y avisa; si es `veedor`, va a `veedor.html`; cualquier otro rol va a `index.html`.

### Cómo personalizarlo
- **Agregar un nuevo destino según rol**: el `return` final (`window.location.href = perfil.rol === "veedor" ? "veedor.html" : "index.html"`) es un operador ternario simple. Si aparece un tercer rol con su propia página, conviene cambiarlo por un `if/else if` o un objeto de mapeo `{ veedor: "veedor.html", dueno: "index.html", ... }`.
- **Cambiar el mensaje de "código inválido"**: son los dos `mostrarMensaje("Código inválido o inactivo.", "error")` dentro de `manejarLoginConCodigo`.
- La lógica de "qué código pertenece a qué cuenta" **no está en este archivo** — vive del lado de la base de datos, en la función `login_por_codigo` dentro de `supabase/migracion_roles_y_codigos.sql`. Si querés cambiar cómo se generan o validan los códigos, es ahí donde hay que mirar, no acá.

---

## 6. `js/clientes.js` — Catálogo de clientes

### Qué hace
Maneja el catálogo reutilizable de clientes: nombre, teléfono, dirección y ciudad "de base". Se usa tanto en `clientes.html` (alta manual y listado) como en `realizar-envio.html` (autocompletado).

### Bloques

- **Acceso a datos**:
  - `listarClientes()`: trae todos los clientes ordenados por nombre.
  - `crearCliente(datosCliente)`: inserta un cliente nuevo. Los campos opcionales (`telefono`, `direccion`, `ciudad`) se guardan como `null` si vienen vacíos, en vez de como string vacío — esto es intencional, para que se puedan distinguir de "cliente con el campo cargado pero vacío" en el resto de la app (por ejemplo, en `realizar-envio.js` se usa para decidir qué texto mostrar como ayuda).
- **Interfaz — alta y listado en `clientes.html`**:
  - El listener de `DOMContentLoaded` se sale temprano (`if (!form) return`) si la página no tiene el formulario `#form-cliente` — es lo que le permite a este mismo script cargarse en `realizar-envio.html` sin romper nada, ya que ahí no existe ese formulario.
  - `cargarTablaClientes()` + `pintarTablaClientes()`: traen los datos y arman las filas `<tr>` de la tabla.
  - `manejarAltaCliente()`: lee los inputs del formulario, valida que el nombre no esté vacío, llama a `crearCliente`, y si sale bien limpia el formulario y recarga la tabla.

### Cómo personalizarlo
- **Agregar un campo nuevo al cliente** (ej. "email" o "nota"): hay que tocar en cadena:
  1. La tabla `clientes` en `supabase/schema.sql` (agregar la columna).
  2. `crearCliente()` acá, agregando el campo al objeto que se inserta.
  3. El formulario en `clientes.html` (agregar el `<input>`).
  4. `manejarAltaCliente()`, leyendo el nuevo input.
  5. `pintarTablaClientes()`, agregando la columna a la tabla (y la cabecera `<th>` correspondiente en el HTML).
- **Cambiar las validaciones del alta**: el único chequeo hoy es que el nombre no esté vacío (`if (!nombre)`). Podés agregar más condiciones ahí mismo, antes de llamar a `crearCliente`.
- **Agregar edición o borrado de clientes**: hoy solo hay alta y listado, no hay `actualizarCliente` ni `eliminarCliente`. Si los agregás, seguí el mismo patrón que `actualizarStock` en `productos.js` (ver punto 8) — un `.update()` o `.delete()` de Supabase con manejo de error usando `mostrarMensaje`.

---

## 7. `js/empaques.js` — Tipos de empaque

### Qué hace
Es el archivo más simple del proyecto: maneja el catálogo de tipos de empaque (baldes, cajas, paquetes 4x1, etc.). Estructura idéntica a `clientes.js` pero con un solo campo (`nombre`).

### Bloques

- **Acceso a datos**: `listarTiposEmpaque()` y `crearTipoEmpaque()`, misma lógica que sus equivalentes de clientes pero sin campos opcionales.
- **Interfaz — alta y listado en `empaques.html`**: mismo patrón de "salir temprano si no hay formulario" para poder reutilizarse en `realizar-envio.html`.

### Cómo personalizarlo
- Es el mejor archivo para copiar como plantilla si en algún momento necesitás agregar **otro catálogo simple** (por ejemplo, "tipos de transporte" o "zonas de reparto"): duplicá el archivo, cambiá los nombres de tabla/función/ids del DOM, y ajustá el HTML correspondiente.
- **Agregar más campos al tipo de empaque** (ej. "peso máximo"): mismo procedimiento que el punto anterior de clientes (tabla → `crearTipoEmpaque` → formulario → `manejarAltaEmpaque` → `pintarTablaEmpaques`).

---

## 8. `js/productos.js` — Productos y stock

### Qué hace
Maneja el catálogo de productos y su cantidad disponible (stock).

### Bloques

- **Acceso a datos**:
  - `listarProductos()`: trae todos los productos.
  - `crearProducto(datosProducto)`: inserta un producto nuevo con `nombre`, `stock` y un `codigo` (SKU) generado automáticamente.
  - `actualizarStock(productoId, nuevaCantidad)`: pisa el valor de `stock` de un producto puntual. **Nota importante**: hoy esta función no está conectada a ningún botón de la interfaz — está lista para usarse, pero falta el flujo que la dispare (por ejemplo, un botón "editar stock" en `productos.html`, o que se descuente automáticamente al registrar una salida).
- **Generación de SKU** (`generarCodigoProducto`): arma un código único tipo `PROD-K3J8`, tomando las primeras letras del nombre (sin tildes, en mayúsculas) más un sufijo basado en la hora exacta (`Date.now()` en base 36). Existe para cumplir con la restricción de la tabla `productos` (`codigo` único) sin pedirle ese dato al usuario a mano.
- **Interfaz — alta y listado en `productos.html`**: mismo patrón que los otros catálogos (salir temprano si no hay `#form-producto`, cargar tabla, pintar tabla, manejar alta).

### Cómo personalizarlo
- **Conectar `actualizarStock` a la interfaz**: es probablemente lo primero que vas a querer hacer. Necesitás un botón o input editable en la fila de cada producto (en `pintarTablaProductos`), que al confirmarse llame a `actualizarStock(producto.id, nuevoValor)` y después vuelva a llamar a `cargarTablaProductos()` para refrescar la tabla.
- **Descontar stock automáticamente al registrar un envío**: hoy `registrarSalida()` (en `salidas.js`, punto 9) solo inserta las líneas de detalle, no toca `productos.stock`. Si querés que el stock se descuente solo, hay que agregar ahí (o acá, exportando una función tipo `descontarStock`) una llamada a `actualizarStock` por cada línea de producto del envío, restando la cantidad despachada.
- **Cambiar cómo se arma el SKU**: todo vive en `generarCodigoProducto`. Por ejemplo, si preferís un correlativo numérico en vez de un código basado en el nombre, reemplazás la lógica interna manteniendo la firma de la función (recibe el nombre, devuelve un string único).

---

## 9. `js/salidas.js` — Registro de la salida (envío)

### Qué hace
Es el corazón del sistema: junta lo que se cargó en la pantalla de "Realizar envío" y lo guarda en la base, en tres pasos separados pero relacionados por un mismo `envio_id`.

### Bloques (dentro de `registrarSalida(datosSalida)`)

- **Paso 1 — Cabecera del envío**: inserta una fila en la tabla `envios` con `cliente_id`, `ciudad_destino`, `nombre_receptor`, `fecha` y `observaciones`. Si esto falla, la función corta acá (`return null`) — no tiene sentido seguir si no se pudo crear el envío base.
- **Paso 2 — Detalle de productos**: si vinieron productos, arma un array de filas (`envio_id`, `producto_id`, `cantidad`) y las inserta todas juntas en `envio_productos`. Es el aspecto **"producto y stock"** del envío.
- **Paso 3 — Detalle de empaques**: mismo mecanismo pero contra `envio_empaques`, con `tipo_empaque_id`. Es el aspecto **"tipo de empaque"** del envío.
- Estos dos detalles quedan **independientes entre sí** (tablas separadas) pero relacionados por `envio_id`, que es justo el requisito del enunciado del proyecto: poder consultarlos por separado o juntos según haga falta.
- Si el paso 2 o 3 falla, la función **no revierte** el envío ya creado — solo avisa con `mostrarMensaje` que "el envío se guardó, pero hubo un problema...". Esto significa que puede quedar un envío con cabecera pero sin todo su detalle. Es un punto a tener en cuenta si en algún momento se vuelve crítico que todo se guarde de forma atómica (la solución más robusta sería mover esta lógica a una función de base de datos transaccional en Supabase, en vez de hacer 2-3 inserts separados desde el navegador).
- Al final devuelve `{ id, numero_envio }`, que es lo que usa `realizar-envio.js` para mostrar el código de envío y armar el link a la nota imprimible.

### Cómo personalizarlo
- **Descontar stock al confirmar el envío**: como se mencionó en el punto 8, acá (dentro del Paso 2, después del insert de `envio_productos`) es el lugar más directo para agregar un loop que llame a `actualizarStock` por cada producto despachado.
- **Agregar un campo nuevo a la cabecera del envío** (ej. "transportista"): agregalo al objeto que se inserta en el Paso 1, a la tabla `envios` en `supabase/schema.sql`, y al formulario/objeto `datosSalida` que arma `realizar-envio.js`.
- **Hacer el guardado más robusto (todo o nada)**: si te preocupa que quede un envío "a medias", la forma correcta es crear una función en Supabase (PL/pgSQL) que haga los tres inserts dentro de una transacción, y llamarla acá vía `supabaseClient.rpc(...)` en vez de los tres `.insert()` sueltos actuales.

---

## 10. `js/realizar-envio.js` — Pantalla de registro (la más grande)

### Qué hace
Es el formulario principal de la app: arma un envío completo combinando cliente, productos y empaques, con autocompletado, antes de mandarlo a `registrarSalida()`.

### Bloques

- **Estado en memoria**: cuatro variables (`clientesCache`, `productosCache`, `tiposEmpaqueCache`, `productosEnEnvio`, `empaquesEnEnvio`) que guardan, en memoria del navegador, los catálogos descargados y las líneas que se van agregando al envío en curso. Nada de esto se guarda en la base hasta que se confirma el formulario.
- **Arranque de la página**: carga los tres catálogos, fija la fecha de hoy, y engancha todos los listeners (autocompletado de cliente y producto, botones "agregar", submit del formulario).
- **Fecha**: siempre se fija a la fecha de hoy (`fijarFechaDeHoy`) y no es editable — es una decisión de diseño para que no se puedan cargar envíos con fecha retroactiva o futura por error.
- **Carga de catálogos**: tres funciones casi idénticas que llenan los `<datalist>`/`<select>` a partir de lo que devuelven `listarClientes`, `listarProductos` y `listarTiposEmpaque` (definidas en sus archivos respectivos).
- **Cliente — autocompletado** (`manejarSeleccionCliente`): es uno de los bloques más elaborados. Cada vez que se tipea en el campo de nombre, busca si coincide (sin importar mayúsculas) con algún cliente del catálogo cacheado:
  - Si **coincide**: completa automáticamente `cliente-id` (oculto), teléfono, dirección y ciudad, y agrega la clase CSS `coincidencia` al input (para el estilo visual de "cliente reconocido"). Estos campos igual quedan editables, pero **editarlos acá no actualiza el registro del cliente** — solo afecta este envío puntual (excepto la ciudad, que si se guarda como destino de este envío en `envios.ciudad_destino`).
  - Si **no coincide** (cliente nuevo, o todavía no terminó de escribir): limpia todo y deja los campos en blanco para completar a mano. Si se confirma el envío con un nombre que no coincide, `manejarEnvioFormulario` va a crear un cliente nuevo automáticamente.
- **Producto — resolver el id** (`manejarSeleccionProducto`): versión más simple del mecanismo anterior, solo busca el id del producto que coincide con el texto tipeado.
- **Agregar/quitar líneas al envío**: `agregarProductoAlEnvio` y `agregarEmpaqueAlEnvio` validan (que haya algo seleccionado y que la cantidad sea válida vía `esCantidadValida`, de `utils.js`) y empujan un objeto al array correspondiente (`productosEnEnvio` / `empaquesEnEnvio`). Después llaman a `pintarListaProductos`/`pintarListaEmpaques`, que a su vez usan la función genérica `pintarLista` para dibujar las filas con su botón "✕" de quitar (`quitarProducto`/`quitarEmpaque`, que hacen `splice` sobre el array y repintan).
- **Confirmación — envío del formulario** (`manejarEnvioFormulario`): es el cierre de todo el flujo.
  1. Valida que haya al menos una línea de producto o empaque cargada.
  2. Si el cliente tipeado no coincidió con ninguno existente (`cliente-id` vacío), lo crea llamando a `crearCliente()` (de `clientes.js`) con lo que se haya escrito en el formulario.
  3. Arma el objeto `datosSalida` completo (cliente, ciudad, receptor, fecha, observaciones, arrays de productos/empaques, y los campos `nota_telefono`/`nota_direccion` que **no se guardan en la base**, solo viajan para imprimir la nota de envío).
  4. Llama a `registrarSalida(datosSalida)` (de `salidas.js`).
  5. Si sale bien, muestra el código de envío generado y habilita el link a `factura.html?envio_id=<id>`.

### Cómo personalizarlo
- **Agregar un campo "receptor" distinto del cliente**: hoy `nombre_receptor` se completa automáticamente con el nombre del cliente (hay un comentario explícito sobre esto en el código, línea "No hay un campo separado para 'quien recibe'..."). Si necesitás distinguirlos, agregás un `<input>` nuevo en el HTML y cambiás la línea `nombre_receptor: document.getElementById("nombre-cliente").value` por el id del nuevo input.
- **Cambiar qué pasa cuando el cliente no coincide**: la lógica está en el bloque `else` de `manejarSeleccionCliente`. Por ejemplo, si quisieras mostrar una advertencia tipo "vas a crear un cliente nuevo", este es el lugar.
- **Agregar un límite de stock al agregar un producto** (para no despachar más de lo disponible): en `agregarProductoAlEnvio`, después de validar `esCantidadValida`, podrías comparar contra el stock actual del producto (buscándolo en `productosCache`) y bloquear o avisar si se pasa.
- **Cambiar las validaciones antes de confirmar**: todo el bloque inicial de `manejarEnvioFormulario` (el `if` de productos/empaques vacíos). Ahí es donde agregarías, por ejemplo, "obligar a cargar ciudad" o cualquier otra regla de negocio nueva.

---

## 11. `js/historial.js` — Listado de envíos pasados

### Qué hace
Pantalla de consulta: lista todos los envíos como filas clicables, con un buscador, y abre el detalle completo de cada uno en un modal (reutilizando el mismo markup que `factura.js`, para no duplicar la lógica de pintado).

### Bloques

- **Estado**: `historialCache` guarda en memoria la última lista traída de Supabase, para que el buscador filtre en el navegador sin volver a consultar la base en cada tecla.
- **Arranque de la página**: carga el historial inicial y engancha: click y Enter en el buscador, cerrar modal (por botón y por click afuera del modal), y el botón de descargar PDF.
- **Listado**:
  - `listarHistorial()`: hace una sola consulta a Supabase que trae la cabecera del envío **junto con** sus relaciones (`clientes(nombre)`, `envio_productos(cantidad)`, `envio_empaques(cantidad)`) en un solo viaje, gracias a la sintaxis de "joins" de Supabase. Con eso arma, para cada envío, un resumen de texto tipo "3 productos · 1 empaque".
  - `filtrarHistorial()`: filtra `historialCache` en memoria (no vuelve a pedir a la base) comparando el texto del buscador contra cliente, código de envío y descripción.
  - `pintarHistorial()`: dibuja las filas como botones (`<button class="historial-fila">`) y les engancha el click para abrir el modal.
- **Modal con la nota de envío**: `abrirModalFactura(envioId)` llama a `obtenerEnvioCompleto` y `pintarFactura` — ambas **definidas en `js/factura.js`**, no acá. `cerrarModalFactura` solo oculta el modal.
- **Descarga en PDF**: `descargarFacturaPdf()` usa la librería `html2pdf` para exportar el contenido del modal a un PDF tamaño carta, nombrado `nota-envio-<numero>.pdf`.

### Cómo personalizarlo
- **Agregar más criterios de búsqueda** (ej. buscar por fecha o por ciudad): hay que traer esos campos en la consulta de `listarHistorial` y agregarlos a la condición de `filtrarHistorial`.
- **Agregar filtros por fecha (rango)**: hoy la función acepta un parámetro `filtros` que no se usa todavía (`async function listarHistorial(filtros = {})`) — es un gancho ya preparado para expandir esto sin romper la firma actual.
- **Cambiar el formato del PDF**: los parámetros están en el objeto que recibe `.set({...})` dentro de `descargarFacturaPdf` (márgenes, calidad de imagen, tamaño de página).

---

## 12. `js/factura.js` — Nota de envío (documento imprimible)

### Qué hace
Arma el documento imprimible de un envío puntual. Se usa de dos formas: como página standalone (`factura.html?envio_id=123`) y embebido dentro del modal de `historial.html` (reutilizando las mismas funciones).

### Bloques

- **Arranque de la página (solo standalone)**: si no encuentra el botón `#btn-imprimir`, corta ahí (`return`) — es la señal de que el script se cargó desde `historial.html`, donde el pintado lo dispara `historial.js` en vez de este bloque. Si sí lo encuentra, lee `?envio_id=` de la URL, trae el envío y lo pinta.
- **Acceso a datos** (`obtenerEnvioCompleto`): hace tres consultas a Supabase (cabecera+cliente, detalle de productos, detalle de empaques) y las combina en un solo objeto JavaScript listo para pintar. Nota clave: `telefono` y `direccion` del cliente viajan acá **solo para imprimir**, no se vuelven a guardar en ningún lado.
- **Pintado del documento**:
  - `pintarFactura(envio)`: rellena todos los campos de texto de la nota (número, cliente, fecha, receptor, ciudad, teléfono, dirección, observaciones) y llama a `pintarFilas` para las dos tablas de detalle.
  - `pintarFilas(tbodyId, items, textoVacio)`: función genérica reutilizada para ambas tablas (productos y empaques) — recibe el id del `<tbody>`, la lista de items y el texto a mostrar si está vacía.

### Cómo personalizarlo
- **Agregar un dato nuevo a la nota** (ej. "número de bultos" u "observaciones de empaque"): hay que traerlo en la consulta de `obtenerEnvioCompleto`, agregarlo al objeto que devuelve, y sumar la línea correspondiente en `pintarFactura` (además del `<span>`/`<td>` nuevo en el HTML de `factura.html` y del bloque del modal en `historial.html`).
- **Cambiar el diseño del documento**: el HTML/CSS vive en `factura.html` y `css/styles.css` — este archivo JS solo rellena esos elementos por id, no define su estructura visual.
- Como esta lógica se comparte con `historial.js`, cualquier cambio acá se refleja automáticamente tanto en la página standalone como en el modal del historial — no hace falta duplicar el cambio.

---

## Mapa de dependencias entre archivos

```
supabaseClient.js   → lo usan TODOS (conexión base)
auth.js              → depende de supabaseClient.js
login.js             → depende de supabaseClient.js, utils.js
acceso-codigo.js     → depende de supabaseClient.js, utils.js
utils.js             → sin dependencias internas (funciones puras / UI genérica)

clientes.js          → depende de supabaseClient.js, utils.js
empaques.js          → depende de supabaseClient.js, utils.js
productos.js         → depende de supabaseClient.js, utils.js

salidas.js           → depende de supabaseClient.js, utils.js

realizar-envio.js    → depende de clientes.js, productos.js, empaques.js,
                        salidas.js, utils.js (usa funciones de todos ellos)

factura.js           → depende de supabaseClient.js, utils.js
historial.js         → depende de factura.js (reutiliza sus funciones),
                        supabaseClient.js, utils.js
```

**Regla práctica**: si vas a modificar una función que otro archivo reutiliza (por ejemplo `crearCliente` en `clientes.js`, que usa `realizar-envio.js`), revisá primero el mapa de arriba para saber a quién más le puede afectar el cambio.

---

## Dónde tocar según lo que quieras hacer (resumen)

| Querés... | Archivo(s) a tocar |
|---|---|
| Cambiar textos de error/éxito | `utils.js` (función `mostrarMensaje`) o el archivo puntual donde está el texto |
| Agregar un campo a un formulario existente | El archivo del catálogo correspondiente (`clientes.js`, `productos.js`, `empaques.js`) + el HTML de esa página + `supabase/schema.sql` |
| Cambiar cómo se calculan roles/permisos | `auth.js` (front) + `supabase/migracion_roles_y_codigos.sql` y las políticas RLS (backend) |
| Descontar stock automáticamente al enviar | `salidas.js` (dentro de `registrarSalida`, Paso 2) usando `actualizarStock` de `productos.js` |
| Agregar filtros a la búsqueda del historial | `historial.js` (funciones `listarHistorial` y `filtrarHistorial`) |
| Cambiar el diseño de la nota de envío / PDF | `factura.html`, `css/styles.css`, y `factura.js` solo si cambian los datos que se muestran |
| Agregar un catálogo nuevo (ej. transportistas) | Copiar `empaques.js` como plantilla (es el más simple) |

---

*Informe generado a partir del código fuente de `js/` tal como está comentado en la carpeta del proyecto. Si el código cambia, conviene revisar que este informe siga reflejando la lógica real.*
