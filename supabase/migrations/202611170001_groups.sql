begin;

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and char_length(name) between 1 and 80 and name ~ '[^[:space:]]'),
  description text not null check (description = btrim(description) and char_length(description) between 1 and 2000 and description ~ '[^[:space:]]'),
  founder_id uuid not null references auth.users(id) on delete restrict,
  owner_id uuid not null references auth.users(id) on delete restrict,
  -- Parte da FK abaixo: o único Dono sempre precisa ser um membro administrador.
  owner_is_admin boolean not null default true check (owner_is_admin),
  is_private boolean not null default true check (is_private),
  created_at timestamptz not null default now()
);
create table public.group_members (
  group_id uuid not null references public.groups(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  is_admin boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id),
  unique (group_id, user_id, is_admin)
);
create index group_members_user_idx on public.group_members(user_id, group_id);
alter table public.groups add constraint groups_owner_membership_fk
  foreign key (id, owner_id, owner_is_admin)
  references public.group_members(group_id, user_id, is_admin)
  deferrable initially deferred;

-- Capacidades reservadas; false nega ao administrador comum, nunca ao Dono.
-- Funcionalidades correspondentes e interface de configuração ficam para outra entrega.
create table public.group_admin_permissions (
  group_id uuid primary key references public.groups(id) on delete restrict,
  manage_group boolean not null default false,
  manage_cycles boolean not null default false,
  manage_members boolean not null default false
);
create table public.group_audit_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index group_audit_events_group_idx on public.group_audit_events(group_id, created_at);

alter table public.groups enable row level security;
alter table public.groups force row level security;
alter table public.group_members enable row level security;
alter table public.group_members force row level security;
alter table public.group_admin_permissions enable row level security;
alter table public.group_admin_permissions force row level security;
alter table public.group_audit_events enable row level security;
alter table public.group_audit_events force row level security;
revoke all on public.groups, public.group_members, public.group_admin_permissions, public.group_audit_events from public, anon, authenticated;
grant select on public.groups, public.group_members, public.group_admin_permissions to authenticated;
grant update (manage_group, manage_cycles, manage_members) on public.group_admin_permissions to authenticated;

-- Schema não exposto pelo PostgREST. Helper sem UUID de usuário fornecido pelo cliente;
-- SECURITY DEFINER evita que a política de membros consulte a si mesma com RLS.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
create function private.is_group_member(target_group_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members
    where group_id = target_group_id and user_id = (select auth.uid()));
$$;
revoke all on function private.is_group_member(uuid) from public, anon, authenticated;
grant execute on function private.is_group_member(uuid) to authenticated;
-- Ponto único para futuras ações: Dono sempre autorizado; demais admins
-- dependem da capacidade configurada. Fundador não participa dessa decisão.
create function private.has_group_admin_permission(target_group_id uuid, permission_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.groups g
    join public.group_members m on m.group_id = g.id and m.user_id = (select auth.uid())
    join public.group_admin_permissions p on p.group_id = g.id
    where g.id = target_group_id and m.is_admin
      and permission_name in ('manage_group', 'manage_cycles', 'manage_members')
      and (g.owner_id = (select auth.uid()) or case permission_name
        when 'manage_group' then p.manage_group
        when 'manage_cycles' then p.manage_cycles
        when 'manage_members' then p.manage_members
        else false end)
  );
$$;
revoke all on function private.has_group_admin_permission(uuid, text) from public, anon, authenticated;
grant execute on function private.has_group_admin_permission(uuid, text) to authenticated;
create policy groups_read_member on public.groups for select to authenticated
  using (private.is_group_member(id));
create policy group_members_read_member on public.group_members for select to authenticated
  using (private.is_group_member(group_id));
create policy group_permissions_read_member on public.group_admin_permissions for select to authenticated
  using (private.is_group_member(group_id));
create policy group_permissions_update_owner on public.group_admin_permissions for update to authenticated
  using (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = (select auth.uid())));
-- Auditoria sem grants/policies para clientes: nenhuma inserção forjada, alteração ou exclusão.

create function private.preserve_group_founder() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.founder_id is distinct from old.founder_id then
    raise exception 'Founder is immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.preserve_group_founder() from public, anon, authenticated;
create trigger groups_preserve_founder before update on public.groups
  for each row execute function private.preserve_group_founder();

create function private.audit_group_permissions() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new is distinct from old then
    insert into public.group_audit_events(group_id, actor_id, action, details)
      values (new.group_id, auth.uid(), 'admin_permissions.updated',
        jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new)));
  end if;
  return new;
end;
$$;
revoke all on function private.audit_group_permissions() from public, anon, authenticated;
create trigger group_permissions_audit after update on public.group_admin_permissions
  for each row execute function private.audit_group_permissions();

-- Não recebe fundador, dono, papéis ou privacidade do navegador.
-- A chamada RPC inteira e a validação da FK diferida pertencem à mesma transação.
create function public.create_group(group_name text, group_description text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  new_group_id uuid;
begin
  if actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  insert into public.groups(name, description, founder_id, owner_id)
    values (btrim(group_name), btrim(group_description), actor, actor)
    returning id into new_group_id;
  insert into public.group_members(group_id, user_id, is_admin)
    values (new_group_id, actor, true);
  insert into public.group_admin_permissions(group_id) values (new_group_id);
  insert into public.group_audit_events(group_id, actor_id, action)
    values (new_group_id, actor, 'group.created');
  return new_group_id;
end;
$$;
revoke all on function public.create_group(text, text) from public, anon, authenticated;
grant execute on function public.create_group(text, text) to authenticated;
commit;
