create table public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete restrict,
  email text not null,
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_attempt_at timestamptz not null,
  attempt_id uuid not null unique,
  attempted_by uuid not null references auth.users(id) on delete restrict,
  delivery_status text not null check (delivery_status in ('pending', 'sent', 'unconfirmed')),
  closed_at timestamptz,
  outcome text check (outcome in ('accepted', 'cancelled', 'expired')),
  check ((closed_at is null) = (outcome is null))
);
create unique index group_invitations_open_email
  on public.group_invitations(group_id, email) where closed_at is null;
create index group_invitations_group_created
  on public.group_invitations(group_id, created_at desc);
create index group_invitations_email_attempt
  on public.group_invitations(group_id, email, last_attempt_at desc);
create index group_audit_events_invitation_actor
  on public.group_audit_events(actor_id, created_at)
  where action in ('invitation.created', 'invitation.resent');

alter table public.group_invitations enable row level security;
alter table public.group_invitations force row level security;
revoke all on public.group_invitations from public, anon, authenticated, service_role;

create function public.list_group_invitations(target_group_id uuid)
returns table (
  id uuid, email text, status text, delivery_status text,
  expires_at timestamptz, can_manage boolean
)
language sql stable security definer set search_path = '' as $$
  select i.id, i.email,
    coalesce(i.outcome, case when i.expires_at <= now() then 'expired' else 'pending' end),
    case when i.delivery_status = 'pending' and i.last_attempt_at <= now() - interval '1 minute'
      then 'unconfirmed' else i.delivery_status end,
    i.expires_at, i.closed_at is null
  from public.group_invitations i
  where i.group_id = target_group_id and exists (
    select 1 from public.group_members m
    where m.group_id = target_group_id and m.user_id = (select auth.uid()) and m.is_admin
  )
  order by i.created_at desc, i.id;
$$;

-- EXECUTE fica restrito a service_role. A Edge Function obtém actor_id do Auth,
-- e o papel do ator no grupo é conferido nesta transação.
-- O grupo serializa emissões e cancelamentos. O aceite serializa na linha do convite.
create function public.issue_group_invitation(
  actor_id uuid, target_group_id uuid, invited_email text, invitation_id uuid, token_digest text
)
returns table (id uuid, email text, group_name text, attempt_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  normalized_email text := lower(btrim(invited_email));
  invitation public.group_invitations;
  name text;
  issued_at timestamptz;
  attempt uuid := gen_random_uuid();
begin
  select g.name into name from public.groups g
  join public.group_members m on m.group_id = g.id
  where g.id = target_group_id and m.user_id = actor_id and m.is_admin
  for no key update of g for share of m;
  if not found then
    raise exception 'Invitation administration forbidden' using errcode = '42501';
  end if;

  if token_digest is null or token_digest !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid token digest' using errcode = '22023';
  end if;
  if invitation_id is null and (
    normalized_email is null or char_length(normalized_email) > 254
    or char_length(split_part(normalized_email, '@', 1)) > 64
    or normalized_email !~ '^[a-z0-9!#$%&''*+/=?^_`{|}~-]+([.][a-z0-9!#$%&''*+/=?^_`{|}~-]+)*@[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
  ) then
    raise exception 'Invalid email' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('caffeine:group-invitations:' || actor_id::text, 0));
  issued_at := clock_timestamp();
  if (select count(*) from public.group_audit_events a where a.actor_id = issue_group_invitation.actor_id
      and a.created_at >= issued_at - interval '1 hour'
      and a.action in ('invitation.created', 'invitation.resent')) >= 10 then
    raise exception 'Administrator invitation rate limit' using errcode = 'PT429';
  end if;
  if (select count(*) from public.group_audit_events a where a.group_id = target_group_id
      and a.created_at >= issued_at - interval '1 hour'
      and a.action in ('invitation.created', 'invitation.resent')) >= 30 then
    raise exception 'Group invitation rate limit' using errcode = 'PT429';
  end if;

  if invitation_id is not null then
    select i.* into invitation from public.group_invitations i
    where i.id = invitation_id and i.group_id = target_group_id for update;
    if not found or invitation.closed_at is not null then
      raise exception 'Invitation unavailable' using errcode = 'PT409';
    end if;
    if invitation.last_attempt_at > issued_at - interval '1 minute' then
      raise exception 'Invitation resend cooldown' using errcode = 'PT429';
    end if;
    update public.group_invitations i
    set token_hash = decode(token_digest, 'hex'), expires_at = issued_at + interval '7 days',
      last_attempt_at = issued_at, attempt_id = attempt, attempted_by = actor_id, delivery_status = 'pending'
    where i.id = invitation_id returning i.* into invitation;
  else
    if exists (
      select 1 from public.group_invitations i
      where i.group_id = target_group_id and i.email = normalized_email
        and i.closed_at is not null and i.last_attempt_at > issued_at - interval '1 minute'
    ) then
      raise exception 'Invitation recipient cooldown' using errcode = 'PT429';
    end if;
    update public.group_invitations i
    set closed_at = issued_at, outcome = 'expired'
    where i.group_id = target_group_id and i.email = normalized_email
      and i.closed_at is null and i.expires_at <= issued_at;

    insert into public.group_invitations as i
      (group_id, email, token_hash, expires_at, last_attempt_at, attempt_id, attempted_by, delivery_status)
    values (target_group_id, normalized_email, decode(token_digest, 'hex'),
      issued_at + interval '7 days', issued_at, attempt, actor_id, 'pending')
    on conflict do nothing
    returning i.* into invitation;
    if not found then
      raise exception 'Invitation already pending' using errcode = 'PT409';
    end if;
  end if;

  insert into public.group_audit_events(group_id, actor_id, action, details, created_at)
  values (target_group_id, actor_id,
    case when invitation_id is null then 'invitation.created' else 'invitation.resent' end,
    jsonb_build_object('invitation_id', invitation.id, 'attempt_id', attempt), issued_at);

  return query select invitation.id, invitation.email, name, attempt;
end;
$$;

create function public.record_group_invitation_delivery(
  target_attempt_id uuid, provider_accepted boolean
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  invitation public.group_invitations;
begin
  update public.group_invitations i
  set delivery_status = case when provider_accepted then 'sent' else 'unconfirmed' end
  where i.attempt_id = target_attempt_id and i.delivery_status = 'pending'
  returning i.* into invitation;
  if found then
    insert into public.group_audit_events(group_id, actor_id, action, details)
    values (invitation.group_id, invitation.attempted_by, 'invitation.delivery_recorded',
      jsonb_build_object('invitation_id', invitation.id, 'attempt_id', target_attempt_id,
        'status', invitation.delivery_status));
  end if;
end;
$$;

create function public.cancel_group_invitation(target_group_id uuid, invitation_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
begin
  perform 1 from public.groups g join public.group_members m on m.group_id = g.id
  where g.id = target_group_id and m.user_id = actor and m.is_admin
  for no key update of g for share of m;
  if not found then
    raise exception 'Invitation administration forbidden' using errcode = '42501';
  end if;

  update public.group_invitations i set closed_at = clock_timestamp(), outcome = 'cancelled'
  where i.group_id = target_group_id and i.id = invitation_id and i.closed_at is null;
  if not found then
    raise exception 'Invitation unavailable' using errcode = 'PT409';
  end if;
  insert into public.group_audit_events(group_id, actor_id, action, details)
  values (target_group_id, actor, 'invitation.cancelled', jsonb_build_object('invitation_id', invitation_id));
end;
$$;

create function public.accept_group_invitation(invitation_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  confirmed_email text;
  invitation public.group_invitations;
  accepted_at timestamptz;
begin
  if actor is null or invitation_token is null or invitation_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select i.* into invitation from public.group_invitations i
    where i.token_hash = sha256(decode(invitation_token, 'hex')) and i.closed_at is null
    for update;
  if not found then
    return null;
  end if;

  select lower(btrim(u.email)) into confirmed_email from auth.users u
    where u.id = actor and u.email_confirmed_at is not null for share;
  accepted_at := clock_timestamp();
  if confirmed_email is distinct from invitation.email or invitation.expires_at <= accepted_at then
    return null;
  end if;

  insert into public.group_members(group_id, user_id, joined_at)
  values (invitation.group_id, actor, accepted_at)
  on conflict (group_id, user_id) do nothing;
  if found then
    insert into public.group_audit_events(group_id, actor_id, action, details)
    values (invitation.group_id, actor, 'member.joined', jsonb_build_object('invitation_id', invitation.id));
  end if;
  update public.group_invitations set closed_at = accepted_at, outcome = 'accepted'
    where id = invitation.id;
  insert into public.group_audit_events(group_id, actor_id, action, details)
  values (invitation.group_id, actor, 'invitation.accepted', jsonb_build_object('invitation_id', invitation.id));
  return invitation.group_id;
end;
$$;

revoke all on function public.list_group_invitations(uuid), public.issue_group_invitation(uuid, uuid, text, uuid, text),
  public.record_group_invitation_delivery(uuid, boolean), public.cancel_group_invitation(uuid, uuid),
  public.accept_group_invitation(text) from public, anon, authenticated, service_role;
grant execute on function public.list_group_invitations(uuid), public.cancel_group_invitation(uuid, uuid),
  public.accept_group_invitation(text) to authenticated;
grant execute on function public.issue_group_invitation(uuid, uuid, text, uuid, text),
  public.record_group_invitation_delivery(uuid, boolean) to service_role;
