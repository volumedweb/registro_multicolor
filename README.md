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

- Frontend: HTML, CSS y JavaScript puro (sin frameworks).
- Base de datos y backend: [Supabase](https://supabase.com)
  (Postgres + API + Auth).
- Hosting: a definir (GitHub Pages u otro servicio de archivos
  estáticos).

## Estructura del proyecto

```
index.html              Pantalla principal
productos.html           Alta, edición y control de stock de productos
empaques.html            Alta y gestión de tipos de empaque
registrar-salida.html    Formulario para registrar una salida
historial.html           Consulta del historial de movimientos

css/styles.css           Estilos generales

js/supabaseClient.js     Conexión a Supabase
js/productos.js          Lógica de productos y stock
js/empaques.js           Lógica de tipos de empaque
js/salidas.js            Lógica de registro de salidas
js/historial.js          Lógica de consulta de historial
js/utils.js              Funciones utilitarias comunes

assets/img/               Logo, íconos, etc.

supabase/schema.sql        Definición de tablas (borrador, a confirmar)
```

## Estado actual

- [x] Estructura de archivos y carpetas.
- [x] Diseño definitivo de las tablas en Supabase.
- [ ] Conexión real a Supabase (URL y anon key).
- [ ] Autenticación del usuario administrador.
- [ ] Implementación de las páginas y su lógica.
- [ ] Definición del hosting final.
