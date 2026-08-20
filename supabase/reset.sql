-- ============================================================
-- Envíos Multicolor — reset de la base (borra el esquema viejo)
-- ============================================================
-- Corré esto UNA VEZ en el SQL Editor de Supabase, ANTES de volver a
-- correr supabase/schema.sql. Borra las tablas, triggers, funciones y
-- secuencias del diseño — incluye los nombres del diseño anterior (el
-- que generaba dos folios por envío) por si tu proyecto todavía los
-- tiene así.
--
-- ¡OJO! Esto borra TODOS los datos que haya en esas tablas. Si tenés
-- algo cargado que querés conservar, avisame antes de correrlo para
-- armar una migración en vez de un reset.

drop table if exists envio_empaques cascade;
drop table if exists envio_productos cascade;
drop table if exists envios cascade;
drop table if exists tipos_empaque cascade;
drop table if exists productos cascade;
drop table if exists clientes cascade;

drop function if exists fn_generar_numero_envio() cascade;
drop function if exists fn_generar_numeros_factura() cascade;  -- nombre del diseño anterior
drop function if exists fn_descontar_stock() cascade;

drop sequence if exists seq_envio;
drop sequence if exists seq_factura_producto;  -- diseño anterior
drop sequence if exists seq_factura_empaque;   -- diseño anterior
