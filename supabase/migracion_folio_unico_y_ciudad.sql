-- ============================================================
-- Envíos Multicolor — migración: alinear la base ya creada con
-- el supabase/schema.sql actual
-- ============================================================
-- Tu base ya tiene: el schema original + tu ALTER de "clientes"
-- (direccion, fecha_registro) + las políticas de RLS.
--
-- Lo único que falta para que quede igual a schema.sql es:
--   1) agregar la columna "ciudad" a clientes (direccion y
--      fecha_registro se conservan tal cual, no hace falta tocarlas)
--   2) cambiar "envios" de dos folios (numero_factura_producto /
--      numero_factura_empaque) a uno solo (numero_envio)
--
-- Las políticas de RLS que armaste NO necesitan ningún cambio: son
-- "for all ... using (true)" a nivel de tabla, no dependen de qué
-- columnas tenga cada una. No hace falta volver a correrlas.
--
-- ¡OJO! El paso 2 vacía la tabla "envios" (y sus detalles) antes de
-- cambiar las columnas, porque no se puede convertir un envío viejo
-- (con los dos folios) a uno nuevo (con uno solo) sin inventar un
-- valor. Si es solo la estructura de prueba (sin envíos reales
-- cargados todavía), esto no importa. Si ya cargaste envíos que
-- querés conservar, avisame antes de correr este script.
-- ============================================================

-- 1) clientes: agregar la columna que falta
alter table clientes
  add column if not exists ciudad text;

-- 2) envios: pasar de dos folios a uno solo

-- 2a) vaciar envíos y sus detalles (ver advertencia arriba)
truncate table envio_empaques, envio_productos, envios restart identity cascade;

-- 2b) sacar las columnas viejas, agregar la nueva
alter table envios
  drop column if exists numero_factura_producto,
  drop column if exists numero_factura_empaque,
  add column if not exists numero_envio text;

alter table envios
  alter column numero_envio set not null;

alter table envios
  add constraint envios_numero_envio_key unique (numero_envio);

-- 2c) reemplazar el trigger/función/secuencias de los dos folios por
--     uno solo
drop trigger if exists trg_envios_numeros_factura on envios;
drop function if exists fn_generar_numeros_factura();
drop sequence if exists seq_factura_producto;
drop sequence if exists seq_factura_empaque;

create sequence if not exists seq_envio start 1;

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
