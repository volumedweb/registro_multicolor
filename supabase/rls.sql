-- ============================================================
-- Row Level Security — un solo usuario administrador
-- ============================================================
-- Ya corrida en el proyecto de Supabase real (2026-08-20). Se guarda
-- acá para que quede versionada junto con schema.sql — no hace falta
-- volver a correrla si ya está aplicada.
--
-- Con RLS habilitado y esta política, solo alguien autenticado (o
-- sea, que inició sesión mediante login.html / Supabase Auth) puede
-- leer o escribir en estas tablas usando la anon key del frontend.
-- Sin esto, la anon key por sí sola le daría acceso a cualquiera,
-- aunque la pantalla de login esté ahí.

-- Habilitar RLS en todas las tablas
alter table clientes enable row level security;
alter table productos enable row level security;
alter table tipos_empaque enable row level security;
alter table envios enable row level security;
alter table envio_productos enable row level security;
alter table envio_empaques enable row level security;

-- clientes
create policy "authenticated_all_clientes"
  on clientes for all
  to authenticated
  using (true)
  with check (true);

-- productos
create policy "authenticated_all_productos"
  on productos for all
  to authenticated
  using (true)
  with check (true);

-- tipos_empaque
create policy "authenticated_all_tipos_empaque"
  on tipos_empaque for all
  to authenticated
  using (true)
  with check (true);

-- envios
create policy "authenticated_all_envios"
  on envios for all
  to authenticated
  using (true)
  with check (true);

-- envio_productos
create policy "authenticated_all_envio_productos"
  on envio_productos for all
  to authenticated
  using (true)
  with check (true);

-- envio_empaques
create policy "authenticated_all_envio_empaques"
  on envio_empaques for all
  to authenticated
  using (true)
  with check (true);
