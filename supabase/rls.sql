-- ============================================================
-- Row Level Security — roles (dueño / administrador / veedor)
-- ============================================================
-- Reemplaza la versión anterior de "un solo usuario administrador"
-- (la de using(true)/with check(true) para cualquier autenticado).
-- Si el proyecto real de Supabase ya tiene la versión vieja aplicada,
-- correr supabase/migracion_roles_y_codigos.sql en vez de este
-- archivo tal cual — ese script hace el DROP de las políticas viejas
-- antes de crear las nuevas. Este archivo queda como referencia del
-- estado "definitivo" para cuando se arranca de cero.
--
-- Reglas:
--   - Lectura (select): cualquiera con perfil activo (dueño,
--     administrador o veedor) puede leer clientes/productos/envíos/etc.
--   - Escritura (insert/update/delete): solo dueño o administrador.
--     El veedor nunca puede escribir, ni siquiera si alguien manipula
--     la app — queda bloqueado acá, no solo escondiendo botones.
--   - "perfiles": cada quien puede ver su propia fila (para que el
--     frontend sepa su rol). No hay políticas de escritura desde el
--     cliente todavía — las altas/bajas de usuarios se hacen a mano
--     desde el SQL Editor de Supabase mientras no exista una pantalla
--     de "Usuarios" en la app.

-- ------------------------------------------------------------
-- Funciones de apoyo
-- ------------------------------------------------------------

-- Rol de quien está haciendo la consulta (o null si no tiene perfil
-- activo). security definer para poder leer "perfiles" sin depender
-- de sus propias políticas (evita recursión) y sin necesidad de que
-- el rol "authenticated" tenga permisos directos sobre la tabla.
create or replace function mi_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from perfiles where id = auth.uid() and activo = true;
$$;

-- Busca el correo asociado a un código de acceso (administrador o
-- veedor) para poder iniciar sesión con supabaseClient.auth.signInWithPassword.
-- Devuelve null si el código no existe o está inactivo. Al ser
-- security definer, quien la llama (incluso sin sesión, rol "anon")
-- nunca ve la tabla "perfiles" completa ni otros códigos — solo el
-- único resultado de una coincidencia exacta.
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
-- Habilitar RLS en todas las tablas
-- ------------------------------------------------------------
alter table perfiles enable row level security;
alter table clientes enable row level security;
alter table productos enable row level security;
alter table tipos_empaque enable row level security;
alter table envios enable row level security;
alter table envio_productos enable row level security;
alter table envio_empaques enable row level security;

-- ------------------------------------------------------------
-- perfiles: cada quien ve su propia fila (para leer su rol)
-- ------------------------------------------------------------
create policy "select_propio_perfil"
  on perfiles for select
  to authenticated
  using (id = auth.uid());

-- ------------------------------------------------------------
-- clientes
-- ------------------------------------------------------------
create policy "select_clientes"
  on clientes for select
  to authenticated
  using (mi_rol() is not null);

create policy "insert_clientes"
  on clientes for insert
  to authenticated
  with check (mi_rol() in ('dueno', 'administrador'));

create policy "update_clientes"
  on clientes for update
  to authenticated
  using (mi_rol() in ('dueno', 'administrador'))
  with check (mi_rol() in ('dueno', 'administrador'));

create policy "delete_clientes"
  on clientes for delete
  to authenticated
  using (mi_rol() in ('dueno', 'administrador'));

-- ------------------------------------------------------------
-- productos
-- ------------------------------------------------------------
create policy "select_productos"
  on productos for select
  to authenticated
  using (mi_rol() is not null);

create policy "insert_productos"
  on productos for insert
  to authenticated
  with check (mi_rol() in ('dueno', 'administrador'));

create policy "update_productos"
  on productos for update
  to authenticated
  using (mi_rol() in ('dueno', 'administrador'))
  with check (mi_rol() in ('dueno', 'administrador'));

create policy "delete_productos"
  on productos for delete
  to authenticated
  using (mi_rol() in ('dueno', 'administrador'));

-- ------------------------------------------------------------
-- tipos_empaque
-- ------------------------------------------------------------
create policy "select_tipos_empaque"
  on tipos_empaque for select
  to authenticated
  using (mi_rol() is not null);

create policy "insert_tipos_empaque"
  on tipos_empaque for insert
  to authenticated
  with check (mi_rol() in ('dueno', 'administrador'));

create policy "update_tipos_empaque"
  on tipos_empaque for update
  to authenticated
  using (mi_rol() in ('dueno', 'administrador'))
  with check (mi_rol() in ('dueno', 'administrador'));

create policy "delete_tipos_empaque"
  on tipos_empaque for delete
  to authenticated
  using (mi_rol() in ('dueno', 'administrador'));

-- ------------------------------------------------------------
-- envios
-- ------------------------------------------------------------
create policy "select_envios"
  on envios for select
  to authenticated
  using (mi_rol() is not null);

create policy "insert_envios"
  on envios for insert
  to authenticated
  with check (mi_rol() in ('dueno', 'administrador'));

create policy "update_envios"
  on envios for update
  to authenticated
  using (mi_rol() in ('dueno', 'administrador'))
  with check (mi_rol() in ('dueno', 'administrador'));

create policy "delete_envios"
  on envios for delete
  to authenticated
  using (mi_rol() in ('dueno', 'administrador'));

-- ------------------------------------------------------------
-- envio_productos
-- ------------------------------------------------------------
create policy "select_envio_productos"
  on envio_productos for select
  to authenticated
  using (mi_rol() is not null);

create policy "insert_envio_productos"
  on envio_productos for insert
  to authenticated
  with check (mi_rol() in ('dueno', 'administrador'));

create policy "update_envio_productos"
  on envio_productos for update
  to authenticated
  using (mi_rol() in ('dueno', 'administrador'))
  with check (mi_rol() in ('dueno', 'administrador'));

create policy "delete_envio_productos"
  on envio_productos for delete
  to authenticated
  using (mi_rol() in ('dueno', 'administrador'));

-- ------------------------------------------------------------
-- envio_empaques
-- ------------------------------------------------------------
create policy "select_envio_empaques"
  on envio_empaques for select
  to authenticated
  using (mi_rol() is not null);

create policy "insert_envio_empaques"
  on envio_empaques for insert
  to authenticated
  with check (mi_rol() in ('dueno', 'administrador'));

create policy "update_envio_empaques"
  on envio_empaques for update
  to authenticated
  using (mi_rol() in ('dueno', 'administrador'))
  with check (mi_rol() in ('dueno', 'administrador'));

create policy "delete_envio_empaques"
  on envio_empaques for delete
  to authenticated
  using (mi_rol() in ('dueno', 'administrador'));
