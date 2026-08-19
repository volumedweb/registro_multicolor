-- ============================================================
-- Envíos Multicolor — esquema de base de datos (Supabase/Postgres)
-- ============================================================
-- Modelo acordado con el usuario (registro y control de salida de
-- mercadería, un solo usuario administrador). Reemplaza el
-- placeholder anterior.
--
-- Reglas de negocio que definen este diseño:
--
--  - Un "envío" es el registro principal de una salida de
--    mercadería: a qué cliente, a qué ciudad, quién lo recibe.
--  - Cada envío puede incluir varios productos (envio_productos)
--    y varios tipos de empaque (envio_empaques). Ambos detalles
--    son independientes entre sí (no hay relación fija producto
--    <-> empaque, porque el mismo tipo de empaque se usa para
--    productos distintos), pero cuelgan del mismo envío y se
--    pueden consultar en conjunto.
--  - Cada envío genera automáticamente dos números de folio
--    correlativos al crearse: uno para la "factura por producto"
--    (formato E000001) y otro para la "factura por empaque"
--    (formato P000001). Ambas son documentos imprimibles.
--  - La ciudad de destino y el nombre de quien recibe se cargan
--    en cada envío (no en el cliente), porque pueden variar
--    aunque el cliente sea el mismo (ej. sucursales distintas).
--  - No hay registro de entradas de stock por ahora: el stock de
--    cada producto se ajusta manualmente y se descuenta
--    automáticamente al registrar cada línea de salida.
--  - El historial de movimientos no necesita tabla propia: sale
--    de consultar "envios" junto con sus dos detalles.
-- ============================================================

-- ------------------------------------------------------------
-- Secuencias para los números de folio de las facturas
-- ------------------------------------------------------------
create sequence if not exists seq_factura_producto start 1;
create sequence if not exists seq_factura_empaque   start 1;

-- ------------------------------------------------------------
-- Clientes / destinatarios
-- ------------------------------------------------------------
create table clientes (
  id         bigint generated always as identity primary key,
  nombre     text not null,          -- empresa o persona
  telefono   text,
  creado_en  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Productos y stock
-- ------------------------------------------------------------
create table productos (
  id         bigint generated always as identity primary key,
  nombre     text not null,
  codigo     text not null unique,   -- código / SKU interno
  stock      integer not null default 0 check (stock >= 0),
  creado_en  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Tipos de empaque
-- ------------------------------------------------------------
create table tipos_empaque (
  id                    bigint generated always as identity primary key,
  nombre                text not null,   -- ej. "6x1", "Baldes", "Cajas"
  unidades_por_paquete  integer,         -- referencia informativa, opcional
  creado_en             timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Envíos (cabecera de cada salida)
-- ------------------------------------------------------------
create table envios (
  id                       bigint generated always as identity primary key,
  cliente_id               bigint not null references clientes (id),
  ciudad_destino           text not null,
  nombre_receptor          text not null,   -- se tipea a mano en cada envío
  fecha                    date not null default current_date,
  numero_factura_producto  text not null unique,
  numero_factura_empaque   text not null unique,
  observaciones            text,
  creado_en                timestamptz not null default now()
);

create index idx_envios_cliente_id on envios (cliente_id);

-- Autogenera los dos números de folio al crear un envío
create or replace function fn_generar_numeros_factura()
returns trigger as $$
begin
  new.numero_factura_producto := 'E' || lpad(nextval('seq_factura_producto')::text, 6, '0');
  new.numero_factura_empaque  := 'P' || lpad(nextval('seq_factura_empaque')::text, 6, '0');
  return new;
end;
$$ language plpgsql;

create trigger trg_envios_numeros_factura
  before insert on envios
  for each row
  execute function fn_generar_numeros_factura();

-- ------------------------------------------------------------
-- Detalle de productos por envío
-- ------------------------------------------------------------
create table envio_productos (
  id           bigint generated always as identity primary key,
  envio_id     bigint not null references envios (id) on delete cascade,
  producto_id  bigint not null references productos (id),
  cantidad     integer not null check (cantidad > 0)
);

create index idx_envio_productos_envio_id on envio_productos (envio_id);
create index idx_envio_productos_producto_id on envio_productos (producto_id);

-- Descuenta stock automáticamente al registrar una línea de producto
create or replace function fn_descontar_stock()
returns trigger as $$
begin
  update productos
     set stock = stock - new.cantidad
   where id = new.producto_id;
  return new;
end;
$$ language plpgsql;

create trigger trg_envio_productos_descontar_stock
  after insert on envio_productos
  for each row
  execute function fn_descontar_stock();

-- ------------------------------------------------------------
-- Detalle de empaques por envío
-- ------------------------------------------------------------
create table envio_empaques (
  id               bigint generated always as identity primary key,
  envio_id         bigint not null references envios (id) on delete cascade,
  tipo_empaque_id  bigint not null references tipos_empaque (id),
  cantidad         integer not null check (cantidad > 0)
);

create index idx_envio_empaques_envio_id on envio_empaques (envio_id);
create index idx_envio_empaques_tipo_empaque_id on envio_empaques (tipo_empaque_id);
