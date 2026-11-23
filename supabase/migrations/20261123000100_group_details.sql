-- Preservar o tipo da descrição para grupos e clientes existentes.
alter table public.groups drop constraint groups_description_check;
alter table public.groups add constraint groups_description_check
  check (description = '' or
    (description = btrim(description) and char_length(description) between 1 and 2000
      and description ~ '[^[:space:]]'));

create or replace function public.create_group(group_name text, group_description text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  new_group_id uuid;
  normalized_description text := btrim(group_description);
begin
  if actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if normalized_description is null or normalized_description !~ '[^[:space:]]' then
    normalized_description := '';
  end if;
  insert into public.groups(name, description, founder_id, owner_id)
    values (btrim(group_name), normalized_description, actor, actor)
    returning id into new_group_id;
  insert into public.group_members(group_id, user_id, is_admin)
    values (new_group_id, actor, true);
  insert into public.group_admin_permissions(group_id) values (new_group_id);
  insert into public.group_audit_events(group_id, actor_id, action)
    values (new_group_id, actor, 'group.created');
  return new_group_id;
end;
$$;

-- A RLS de profiles continua privada. Expor somente o nome de exibição
-- de membros atuais, após verificar a participação de quem faz a consulta.
create function public.list_group_members(target_group_id uuid)
returns table (user_id uuid, is_admin boolean, display_name text)
language sql stable security definer set search_path = '' as $$
  select m.user_id, m.is_admin, nullif(btrim(p.display_name), '')
  from public.group_members m
  left join public.profiles p on p.id = m.user_id
  where m.group_id = target_group_id and private.is_group_member(target_group_id)
  order by m.joined_at, m.user_id;
$$;
revoke all on function public.list_group_members(uuid) from public, anon, authenticated, service_role;
grant execute on function public.list_group_members(uuid) to authenticated;
