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
--  - Cada envío genera automáticamente un número de folio
--    correlativo al crearse (formato E000001, columna
--    numero_envio). Es un solo documento imprimible (la nota de
--    envío) con el detalle de productos y de empaques juntos.
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
-- Secuencia para el número de folio del envío
-- ------------------------------------------------------------
create sequence if not exists seq_envio start 1;

-- ------------------------------------------------------------
-- Clientes / destinatarios
-- ------------------------------------------------------------
-- direccion y ciudad son los datos "de base" del cliente: se cargan al
-- registrarlo y sirven para autocompletar el formulario de envío. En
-- "Realizar envío" se pueden editar sin que eso modifique este registro
-- (ahí solo se usan para imprimir la nota de envío, salvo ciudad_destino
-- en la tabla envios, que sí se guarda por ser dato propio de cada envío).
create table clientes (
  id         bigint generated always as identity primary key,
  nombre     text not null,          -- empresa o persona
  telefono   text,
  direccion  text,
  ciudad     text,
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
  id                bigint generated always as identity primary key,
  cliente_id        bigint not null references clientes (id),
  ciudad_destino    text not null,
  nombre_receptor   text not null,   -- se tipea a mano en cada envío
  fecha             date not null default current_date,
  numero_envio      text not null unique,   -- folio único, formato E000001
  observaciones     text,
  creado_en         timestamptz not null default now()
);

create index idx_envios_cliente_id on envios (cliente_id);

-- Autogenera el número de folio al crear un envío
create or replace function fn_generar_numero_envio()
returns trigger as $$
begin
  new.numero_envio := 'E' || lpad(nextval('seq_envio')::text, 6, '0');
  return new;
end;
$$ language plpgsql;

create trigger trg_envios_numero_envio
  before insert on envios
  for each row
  execute function fn_generar_numero_envio();

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
