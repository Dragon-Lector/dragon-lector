-- =============================================================================
-- Migración: usuarios antiguos (email real) → nuevo esquema (username + email sintético)
-- =============================================================================
--
-- Contexto:
--   El sistema de autenticación cambió. Antes los usuarios se registraban con
--   email + contraseña. Ahora se registran solo con username + contraseña, y
--   la app construye internamente un "email sintético" con la forma:
--       <username>@dragonlector.local
--
--   Los usuarios existentes tienen un email real (ej: admin@gmail.com) que ya
--   no coincide con lo que la app intenta autenticar (admin@dragonlector.local),
--   por lo que no podrían iniciar sesión.
--
-- Qué hace este script:
--   1. Migra el email de cada usuario en auth.users al formato sintético,
--      tomando el username desde public.profiles (que se creó al registrarse
--      vía el trigger handle_new_user).
--   2. Confirma el email (email_confirmed_at) si estaba pendiente.
--   3. Conserva intactos: id, contraseña (encrypted_password), metadata,
--      created_at, perfil, rol de admin, y cualquier referencia (challenges,
--      stories, comments, votes, etc.) ya que el id no cambia.
--
-- Seguridad:
--   - Es idempotente: correrlo dos veces no hace daño. Los usuarios que ya
--     estén en formato @dragonlector.local se omiten.
--   - Detecta y reporta conflictos (usernames duplicados o perfiles faltantes)
--     ANTES de modificar nada. Si hay conflictos, aborta con error.
--   - Se ejecuta dentro de una transacción.
--
-- Uso:
--   Pega y ejecuta este script en el SQL Editor de tu proyecto Supabase.
--   (O via psql, supabase CLI, MCP, etc.)
-- =============================================================================

begin;

-- Dominio sintético usado por el nuevo sistema de auth.
-- Si lo cambias en la app, cámbialo aquí también.
do $$
declare
  v_domain        text := 'dragonlector.local';
  v_total         int;
  v_to_migrate    int;
  v_no_profile    int;
  v_dup_username  int;
  v_already_done  int;
  r               record;
begin
  -- ---------------------------------------------------------------------------
  -- 1. Diagnóstico previo
  -- ---------------------------------------------------------------------------
  select count(*) into v_total from auth.users;

  select count(*) into v_already_done
  from auth.users
  where email like '%@' || v_domain;

  select count(*) into v_to_migrate
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.email is not null
    and u.email not like '%@' || v_domain;

  -- Usuarios SIN perfil (no podemos saber su username → bloquea la migración)
  select count(*) into v_no_profile
  from auth.users u
  left join public.profiles p on p.id = u.id
  where p.id is null
    and u.email is not null
    and u.email not like '%@' || v_domain;

  -- Usernames duplicados en profiles (no debería pasar por el unique, pero
  -- por si acaso revisamos antes de tocar auth.users)
  select count(*) into v_dup_username
  from (
    select lower(username) as u
    from public.profiles
    group by lower(username)
    having count(*) > 1
  ) d;

  raise notice '────────────────────────────────────────────────────────';
  raise notice ' Diagnóstico previo a la migración';
  raise notice '────────────────────────────────────────────────────────';
  raise notice ' Total de usuarios en auth.users:       %', v_total;
  raise notice ' Ya migrados (email @%):                 %', v_domain, v_already_done;
  raise notice ' A migrar en esta corrida:               %', v_to_migrate;
  raise notice ' Sin perfil (BLOQUEAN la migración):     %', v_no_profile;
  raise notice ' Usernames duplicados (BLOQUEAN):        %', v_dup_username;
  raise notice '────────────────────────────────────────────────────────';

  if v_no_profile > 0 then
    raise notice 'Usuarios sin perfil (créalos manualmente o bórralos):';
    for r in
      select u.id, u.email, u.created_at
      from auth.users u
      left join public.profiles p on p.id = u.id
      where p.id is null
        and u.email not like '%@' || v_domain
    loop
      raise notice '  - id=% email=% creado=%', r.id, r.email, r.created_at;
    end loop;
    raise exception 'Abortando: hay % usuario(s) sin perfil. Resuélvelos antes de migrar.', v_no_profile;
  end if;

  if v_dup_username > 0 then
    raise notice 'Usernames duplicados en public.profiles:';
    for r in
      select lower(username) as username, count(*) as n
      from public.profiles
      group by lower(username)
      having count(*) > 1
    loop
      raise notice '  - "%" aparece % veces', r.username, r.n;
    end loop;
    raise exception 'Abortando: hay % username(s) duplicado(s). Resuélvelos antes de migrar.', v_dup_username;
  end if;

  if v_to_migrate = 0 then
    raise notice 'Nada que migrar. Saliendo limpiamente.';
    return;
  end if;

  -- ---------------------------------------------------------------------------
  -- 2. Migración real
  -- ---------------------------------------------------------------------------
  raise notice 'Migrando % usuario(s)…', v_to_migrate;

  -- Actualiza el email al formato sintético usando el username del perfil.
  -- También guarda el email original en raw_user_meta_data por trazabilidad.
  update auth.users u
  set
    email = lower(p.username) || '@' || v_domain,
    email_confirmed_at = coalesce(u.email_confirmed_at, now()),
    raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb)
                         || jsonb_build_object(
                              'username', p.username,
                              'legacy_email', u.email,
                              'migrated_at', now()
                            ),
    updated_at = now()
  from public.profiles p
  where p.id = u.id
    and u.email is not null
    and u.email not like '%@' || v_domain;

  get diagnostics v_total = row_count;
  raise notice 'Migración completada: % fila(s) actualizada(s).', v_total;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Verificación final
-- ---------------------------------------------------------------------------
select
  count(*) filter (where email like '%@dragonlector.local')               as usuarios_nuevos_formato,
  count(*) filter (where email not like '%@dragonlector.local')           as usuarios_pendientes,
  count(*) filter (where email_confirmed_at is null)                      as sin_confirmar
from auth.users;

commit;

-- =============================================================================
-- Notas finales:
--
-- - El campo raw_user_meta_data.legacy_email guarda el email original por si
--   alguna vez quieres recuperarlo o contactar al usuario.
-- - La contraseña NO cambia. Los admins siguen entrando con la misma password,
--   solo que ahora la usan junto con su username (no su email).
-- - Si después necesitas mostrar el email original en el panel de admin:
--       select id, raw_user_meta_data ->> 'legacy_email' from auth.users;
-- =============================================================================
