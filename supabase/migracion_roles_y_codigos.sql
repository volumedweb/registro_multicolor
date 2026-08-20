-- ============================================================
-- Migración: roles (dueño / administrador / veedor) + login por código
-- ============================================================
-- Para correr en el proyecto real de Supabase (SQL Editor), sobre la
-- base que ya tiene aplicados schema.sql + rls.sql "viejos" (un solo
-- administrador, políticas using(true)).
--
-- *** PASO OBLIGATORIO ANTES DE CORRER ESTO ***
-- Reemplazá 'TU_EMAIL_AQUI@ejemplo.com' más abajo (sección 5) por el
-- correo real con el que ya iniciás sesión hoy. Si se corre esta
-- migración sin darle un perfil "dueno" a esa cuenta, las políticas
-- nuevas la van a dejar SIN acceso a nada (ni lectura) y la app deja
-- de funcionar hasta corregirlo.
--
-- Después de correr esto:
--  - Tu cuenta actual sigue entrando por login.html (correo +
--    contraseña) como dueño, sin cambios para vos.
--  - Para dar de alta un administrador o veedor nuevo: 1) crearlo en
--    Authentication -> Add user con un correo y una contraseña
--    cualquiera (esa contraseña NO se la das a la persona), y
--    2) insertar su fila en "perfiles" con el código que sí le vas a
--    compartir (ver ejemplos al final de este archivo).

-- ------------------------------------------------------------
-- 1) Tabla de perfiles (si no existe)
-- ------------------------------------------------------------
create table if not exists perfiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  rol            text not null check (rol in ('dueno', 'administrador', 'veedor')),
  nombre         text not null,
  codigo_acceso  text unique,
  activo         boolean not null default true,
  creado_por     uuid references perfiles (id),
  creado_en      timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2) Quitar las políticas viejas (un solo administrador)
-- ------------------------------------------------------------
drop policy if exists "authenticated_all_clientes" on clientes;
drop policy if exists "authenticated_all_productos" on productos;
drop policy if exists "authenticated_all_tipos_empaque" on tipos_empaque;
drop policy if exists "authenticated_all_envios" on envios;
drop policy if exists "authenticated_all_envio_productos" on envio_productos;
drop policy if exists "authenticated_all_envio_empaques" on envio_empaques;

-- ------------------------------------------------------------
-- 3) Funciones de apoyo (rol actual + login por código)
-- ------------------------------------------------------------
create or replace function mi_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from perfiles where id = auth.uid() and activo = true;
$$;

create or replace function login_por_codigo(codigo_ingresado text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  email_encontrado text;
begin
  select au.email into email_encontrado
    from perfiles p
    join auth.users au on au.id = p.id
   where p.codigo_acceso = codigo_ingresado
     and p.activo = true
     and p.rol in ('administrador', 'veedor');

  return email_encontrado;
end;
$$;

grant execute on function mi_rol() to authenticated;
grant execute on function login_por_codigo(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 4) RLS: habilitar en perfiles + políticas nuevas por rol
-- ------------------------------------------------------------
alter table perfiles enable row level security;

drop policy if exists "select_propio_perfil" on perfiles;
create policy "select_propio_perfil"
  on perfiles for select
  to authenticated
  using (id = auth.uid());

-- clientes
drop policy if exists "select_clientes" on clientes;
drop policy if exists "insert_clientes" on clientes;
drop policy if exists "update_clientes" on clientes;
drop policy if exists "delete_clientes" on clientes;
create policy "select_clientes" on clientes for select to authenticated using (mi_rol() is not null);
create policy "insert_clientes" on clientes for insert to authenticated with check (mi_rol() in ('dueno', 'administrador'));
create policy "update_clientes" on clientes for update to authenticated using (mi_rol() in ('dueno', 'administrador')) with check (mi_rol() in ('dueno', 'administrador'));
create policy "delete_clientes" on clientes for delete to authenticated using (mi_rol() in ('dueno', 'administrador'));

-- productos
drop policy if exists "select_productos" on productos;
drop policy if exists "insert_productos" on productos;
drop policy if exists "update_productos" on productos;
drop policy if exists "delete_productos" on productos;
create policy "select_productos" on productos for select to authenticated using (mi_rol() is not null);
create policy "insert_productos" on productos for insert to authenticated with check (mi_rol() in ('dueno', 'administrador'));
create policy "update_productos" on productos for update to authenticated using (mi_rol() in ('dueno', 'administrador')) with check (mi_rol() in ('dueno', 'administrador'));
create policy "delete_productos" on productos for delete to authenticated using (mi_rol() in ('dueno', 'administrador'));

-- tipos_empaque
drop policy if exists "select_tipos_empaque" on tipos_empaque;
drop policy if exists "insert_tipos_empaque" on tipos_empaque;
drop policy if exists "update_tipos_empaque" on tipos_empaque;
drop policy if exists "delete_tipos_empaque" on tipos_empaque;
create policy "select_tipos_empaque" on tipos_empaque for select to authenticated using (mi_rol() is not null);
create policy "insert_tipos_empaque" on tipos_empaque for insert to authenticated with check (mi_rol() in ('dueno', 'administrador'));
create policy "update_tipos_empaque" on tipos_empaque for update to authenticated using (mi_rol() in ('dueno', 'administrador')) with check (mi_rol() in ('dueno', 'administrador'));
create policy "delete_tipos_empaque" on tipos_empaque for delete to authenticated using (mi_rol() in ('dueno', 'administrador'));

-- envios
drop policy if exists "select_envios" on envios;
drop policy if exists "insert_envios" on envios;
drop policy if exists "update_envios" on envios;
drop policy if exists "delete_envios" on envios;
create policy "select_envios" on envios for select to authenticated using (mi_rol() is not null);
create policy "insert_envios" on envios for insert to authenticated with check (mi_rol() in ('dueno', 'administrador'));
create policy "update_envios" on envios for update to authenticated using (mi_rol() in ('dueno', 'administrador')) with check (mi_rol() in ('dueno', 'administrador'));
create policy "delete_envios" on envios for delete to authenticated using (mi_rol() in ('dueno', 'administrador'));

-- envio_productos
drop policy if exists "select_envio_productos" on envio_productos;
drop policy if exists "insert_envio_productos" on envio_productos;
drop policy if exists "update_envio_productos" on envio_productos;
drop policy if exists "delete_envio_productos" on envio_productos;
create policy "select_envio_productos" on envio_productos for select to authenticated using (mi_rol() is not null);
create policy "insert_envio_productos" on envio_productos for insert to authenticated with check (mi_rol() in ('dueno', 'administrador'));
create policy "update_envio_productos" on envio_productos for update to authenticated using (mi_rol() in ('dueno', 'administrador')) with check (mi_rol() in ('dueno', 'administrador'));
create policy "delete_envio_productos" on envio_productos for delete to authenticated using (mi_rol() in ('dueno', 'administrador'));

-- envio_empaques
drop policy if exists "select_envio_empaques" on envio_empaques;
drop policy if exists "insert_envio_empaques" on envio_empaques;
drop policy if exists "update_envio_empaques" on envio_empaques;
drop policy if exists "delete_envio_empaques" on envio_empaques;
create policy "select_envio_empaques" on envio_empaques for select to authenticated using (mi_rol() is not null);
create policy "insert_envio_empaques" on envio_empaques for insert to authenticated with check (mi_rol() in ('dueno', 'administrador'));
create policy "update_envio_empaques" on envio_empaques for update to authenticated using (mi_rol() in ('dueno', 'administrador')) with check (mi_rol() in ('dueno', 'administrador'));
create policy "delete_envio_empaques" on envio_empaques for delete to authenticated using (mi_rol() in ('dueno', 'administrador'));

-- ------------------------------------------------------------
-- 5) Dar de alta tu perfil de dueño (OBLIGATORIO — ver aviso arriba)
-- ------------------------------------------------------------
insert into perfiles (id, rol, nombre)
select id, 'dueno', 'Dueño'
  from auth.users
 where email = 'TU_EMAIL_AQUI@ejemplo.com'
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Ejemplos para cuando quieras dar de alta un administrador o un
-- veedor nuevo (correr a mano, uno a la vez):
-- ------------------------------------------------------------
-- Paso A: crear la cuenta en Authentication -> Add user, con
-- "Auto Confirm User" marcado (igual que se hizo con el primer
-- admin). El correo puede ser cualquiera que no uses ya (ej.
-- admin.juan@interno.multicolor) — nadie lo va a escribir a mano. LA
-- CONTRASEÑA QUE LE PONGAS ACÁ TIENE QUE SER EXACTAMENTE IGUAL AL
-- CÓDIGO QUE VAS A GUARDAR EN EL PASO B, porque el login por código
-- (js/acceso-codigo.js) usa el código tal cual como contraseña real.
--
-- Paso B: insertar su perfil con ese mismo código en "codigo_acceso".
-- Ese código es lo único que la persona va a escribir en
-- acceso-codigo.html — nunca ve el correo interno del paso A.
--
-- insert into perfiles (id, rol, nombre, codigo_acceso)
-- select id, 'administrador', 'Nombre de la persona', 'MC-CODIGO123'
--   from auth.users
--  where email = 'correo-interno-del-administrador@ejemplo.com';
--
-- insert into perfiles (id, rol, nombre, codigo_acceso)
-- select id, 'veedor', 'Nombre de la persona', 'MC-CODIGO456'
--   from auth.users
--  where email = 'correo-interno-del-veedor@ejemplo.com';
--
-- Para revocar el acceso de alguien sin borrar su historial:
-- update perfiles set activo = false where codigo_acceso = 'MC-CODIGO456';
--
-- Nota de seguridad: el código funciona como contraseña real, así
-- que conviene generarlo largo y al azar (10+ caracteres, mezclando
-- letras y números) en vez de algo adivinable como "veedor1".
