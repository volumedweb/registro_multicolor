# Envíos Multicolor

Aplicación web para el registro y control de salida de mercadería,
destinada a un único usuario administrador.

## Objetivo

Registrar cada salida de mercadería considerando dos aspectos que se
mantienen independientes en su información, pero que pueden
consultarse de manera conjunta:

- **Producto y stock**: identificación del ítem despachado y control
  de la cantidad disponible.
- **Tipo de empaque**: forma en que se despachó la mercadería
  (baldes, cajas, paquetes 4x1, u otros).

El sistema conserva un historial completo de todos los movimientos
realizados.

## Stack

- Frontend: HTML, CSS y JavaScript puro (sin frameworks). Única
  librería externa: [html2pdf.js](https://github.com/eKoopmans/html2pdf.js)
  (vía CDN, solo en historial.html) para descargar la nota de envío
  como PDF tamaño carta desde el modal del historial.
- Base de datos y backend: [Supabase](https://supabase.com)
  (Postgres + API + Auth).
- Hosting: a definir (GitHub Pages u otro servicio de archivos
  estáticos).

## Estructura del proyecto

```
index.html              Pantalla principal
productos.html           Alta, edición y control de stock de productos
clientes.html            Alta y listado de clientes (nombre, teléfono, dirección, ciudad)
empaques.html            Alta y gestión de tipos de empaque
realizar-envio.html      Formulario para registrar un envío (cliente + productos + empaques)
factura.html             Nota de envío imprimible de un envío ya guardado
historial.html           Consulta del historial de movimientos
login.html               Acceso del usuario administrador

css/styles.css           Estilos generales

js/supabaseClient.js     Conexión a Supabase
js/login.js              Lógica de inicio de sesión
js/auth.js               Protege las páginas (redirige a login.html sin sesión) y cierra sesión
js/clientes.js           Lógica del catálogo de clientes/destinatarios
js/productos.js          Lógica de productos y stock
js/empaques.js           Lógica de tipos de empaque
js/salidas.js            Lógica de registro de envíos (cabecera + detalle)
js/realizar-envio.js     Lógica de la pantalla "Realizar envío" (autocompletado, listas)
js/factura.js            Lógica de la nota de envío imprimible
js/historial.js          Lógica de consulta de historial
js/utils.js              Funciones utilitarias comunes

assets/img/               Logo, íconos, etc.

supabase/schema.sql                       Definición de tablas (confirmado)
supabase/rls.sql                          Políticas de RLS (ya corridas en el proyecto real)
supabase/reset.sql                        Borra el esquema viejo (proyecto arrancando de cero)
supabase/migracion_folio_unico_y_ciudad.sql  Migración puntual ya usada en el proyecto real
```

## Estado actual

- [x] Estructura de archivos y carpetas.
- [x] Diseño definitivo de las tablas en Supabase.
- [x] Estructura y estilo de las páginas principales (index, productos,
      clientes, empaques, realizar-envio, factura, historial, login),
      con paleta pastel mate.
- [x] Políticas de RLS (`supabase/rls.sql`), ya corridas en el proyecto
      real de Supabase: solo un usuario autenticado puede leer/escribir.
- [x] Conexión real a Supabase (`js/supabaseClient.js` con la Project
      URL y la publishable key reales).
- [x] Protección de páginas (`js/auth.js`): todas las páginas menos
      login.html verifican que haya sesión iniciada, si no la hay
      redirigen a login.html. Cada página protegida tiene un link
      "Cerrar sesión" en el menú.
- [x] Usuario administrador creado en Supabase Auth y login funcionando
      en producción (`https://volumedweb.github.io/registro_multicolor/`).
      No habrá alta de más usuarios por ahora — un solo administrador.
- [x] Implementación de la lógica real de cada página: `js/clientes.js`,
      `js/productos.js`, `js/empaques.js`, `js/salidas.js`,
      `js/factura.js` y `js/historial.js` ya hacen las llamadas reales a
      Supabase (antes eran funciones con TODOs). `productos.js` genera
      un `codigo` (SKU) automático porque el formulario de
      productos.html no lo pide a mano. `realizar-envio.js` usa el
      nombre del cliente también como `nombre_receptor` del envío, ya
      que el formulario no tiene un campo separado para "quien recibe".
- [x] Hosting: GitHub Pages, rama `main`, carpeta raíz.

## Notas sobre el proyecto real de Supabase

El proyecto real se armó primero con una versión anterior de
`schema.sql` (con dos folios por envío) más un `ALTER TABLE clientes`
manual que agregó `direccion` y `fecha_registro`. Se corrió
`supabase/migracion_folio_unico_y_ciudad.sql` para alinearlo con el
`schema.sql` actual (un solo folio, `clientes.ciudad`). La columna
`clientes.fecha_registro` quedó de esa etapa — no la usa ningún
`js/*.js` todavía (se guarda `creado_en` en su lugar); se puede dejar
así o eliminarla, a definir.
