\set owner  'cc000000-0000-4000-8000-000000000001'
\set admin  'cc000000-0000-4000-8000-000000000002'
\set member 'cc000000-0000-4000-8000-000000000003'
\set existing 'cc000000-0000-4000-8000-000000000004'
\set newcomer 'cc000000-0000-4000-8000-000000000005'

create function pg_temp.assert(ok boolean, failure text) returns void
language plpgsql as $$
begin
  if ok is distinct from true then raise exception '%', failure; end if;
end;
$$;

insert into auth.users(id, email, email_confirmed_at) values
  (:'owner', 'owner@example.test', now()),
  (:'admin', 'admin@example.test', now()),
  (:'member', 'wrong@example.test', now()),
  (:'existing', 'existing@example.test', now());
select set_config('request.jwt.claim.sub', :'owner', false);
select public.create_group('Grupo de convites') as main_group \gset
select public.create_group('Outro grupo privado') as other_group \gset
insert into public.group_members(group_id, user_id, is_admin)
values (:'main_group', :'admin', true), (:'main_group', :'member', false);

select pg_temp.assert(not has_table_privilege('authenticated', 'public.group_invitations', 'SELECT'), 'direct invitation read');
select pg_temp.assert(not has_table_privilege('service_role', 'public.group_invitations', 'UPDATE'), 'direct service table update');
select pg_temp.assert(not has_function_privilege('anon', 'public.accept_group_invitation(text)', 'EXECUTE'), 'anonymous acceptance');
select pg_temp.assert(not has_function_privilege('authenticated', 'public.issue_group_invitation(uuid,uuid,text,uuid,text)', 'EXECUTE'), 'direct issuance');
select pg_temp.assert(not has_function_privilege('authenticated', 'public.record_group_invitation_delivery(uuid,boolean)', 'EXECUTE'), 'forged delivery');

-- Exercita EXECUTE com os papéis da Data API, mesmo com um UUID de Dono no corpo.
create function pg_temp.assert_privileged_rpc_denied(owner_id uuid, group_id uuid) returns void
language plpgsql as $$
begin
  begin
    perform public.issue_group_invitation(owner_id, group_id, 'forged@example.test', null, repeat('ab',32));
    raise exception 'API role % reached privileged issuance', current_user;
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.record_group_invitation_delivery(owner_id, true);
    raise exception 'API role % reached privileged delivery update', current_user;
  exception when insufficient_privilege then null;
  end;
end;
$$;

set role anon;
select pg_temp.assert_privileged_rpc_denied(:'owner', :'main_group');
reset role;
select set_config('request.jwt.claim.sub', :'member', false);
set role authenticated;
select pg_temp.assert_privileged_rpc_denied(:'owner', :'main_group');
reset role;
select set_config('request.jwt.claim.sub', :'owner', false);
set role authenticated;
select pg_temp.assert_privileged_rpc_denied(:'owner', :'main_group');
reset role;

set role service_role;
select * from public.issue_group_invitation(:'admin', :'main_group', ' EXISTING@EXAMPLE.TEST ', null,
  encode(sha256(decode(repeat('11',32), 'hex')), 'hex')) \gset existing_
select * from public.issue_group_invitation(:'owner', :'main_group', 'new@example.test', null,
  encode(sha256(decode(repeat('22',32), 'hex')), 'hex')) \gset new_
select * from public.issue_group_invitation(:'owner', :'main_group', 'cancel@example.test', null,
  encode(sha256(decode(repeat('33',32), 'hex')), 'hex')) \gset cancel_
select * from public.issue_group_invitation(:'owner', :'main_group', 'expired@example.test', null,
  encode(sha256(decode(repeat('44',32), 'hex')), 'hex')) \gset expired_
select public.record_group_invitation_delivery(:'existing_attempt_id', true);
select public.record_group_invitation_delivery(:'new_attempt_id', false);
reset role;

select set_config('invitation_tests.main_group', :'main_group', false);
select set_config('invitation_tests.other_group', :'other_group', false);
select set_config('invitation_tests.cancel_id', :'cancel_id', false);
select set_config('invitation_tests.new_id', :'new_id', false);
select set_config('invitation_tests.admin', :'admin', false);
select set_config('invitation_tests.member', :'member', false);

set role service_role;
do $$
declare
  g uuid := current_setting('invitation_tests.main_group');
  other_group uuid := current_setting('invitation_tests.other_group');
  admin uuid := current_setting('invitation_tests.admin');
  member uuid := current_setting('invitation_tests.member');
  new_id uuid := current_setting('invitation_tests.new_id');
begin
  begin
    perform public.issue_group_invitation(member, g, 'blocked@example.test', null, repeat('ab',32));
    raise exception 'member issued an invitation';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.issue_group_invitation(admin, other_group, 'blocked@example.test', null, repeat('ab',32));
    raise exception 'administrator accessed another group';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.issue_group_invitation(admin, g, 'existing@example.test', null, repeat('ab',32));
    raise exception 'duplicate invitation';
  exception when sqlstate 'PT409' then null;
  end;
  begin
    perform public.issue_group_invitation(admin, g, null, new_id, repeat('ab',32));
    raise exception 'resend skipped cooldown';
  exception when sqlstate 'PT429' then null;
  end;
  begin
    perform public.issue_group_invitation(admin, g, 'x..y@example.test', null, repeat('ab',32));
    raise exception 'invalid email accepted';
  exception when invalid_parameter_value then null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claim.sub', :'member', false);
set role authenticated;
select pg_temp.assert((select count(*) = 0 from public.list_group_invitations(:'main_group')), 'member read invite list');
select pg_temp.assert(public.accept_group_invitation(repeat('11',32)) is null, 'wrong email accepted');
do $$
begin
  perform public.cancel_group_invitation(current_setting('invitation_tests.main_group')::uuid,
    current_setting('invitation_tests.cancel_id')::uuid);
  raise exception 'member cancelled an invitation';
exception when insufficient_privilege then null;
end;
$$;
reset role;

select set_config('request.jwt.claim.sub', :'admin', false);
set role authenticated;
select pg_temp.assert((select count(*) = 4 from public.list_group_invitations(:'main_group')), 'admin could not read invite list');
select pg_temp.assert((select count(*) = 0 from public.list_group_invitations(:'other_group')), 'invite list crossed groups');
select pg_temp.assert((select email = 'existing@example.test' and delivery_status = 'sent'
  from public.list_group_invitations(:'main_group') where id = :'existing_id'), 'confirmed send not tracked');
select pg_temp.assert((select delivery_status = 'unconfirmed'
  from public.list_group_invitations(:'main_group') where id = :'new_id'), 'failed send not tracked');
select public.cancel_group_invitation(:'main_group', :'cancel_id');
reset role;

set role service_role;
do $$
begin
  perform public.issue_group_invitation(current_setting('invitation_tests.admin')::uuid,
    current_setting('invitation_tests.main_group')::uuid, ' CANCEL@EXAMPLE.TEST ', null, repeat('ab',32));
  raise exception 'cancelling bypassed the recipient cooldown';
exception when sqlstate 'PT429' then null;
end;
$$;
reset role;

update public.group_invitations set expires_at = now() - interval '1 second' where id = :'expired_id';
update public.group_invitations set last_attempt_at = now() - interval '2 minutes' where id = :'new_id';
set role service_role;
select * from public.issue_group_invitation(:'admin', :'main_group', null, :'new_id',
  encode(sha256(decode(repeat('55',32), 'hex')), 'hex')) \gset resend_
select public.record_group_invitation_delivery(:'new_attempt_id', true);
reset role;
select pg_temp.assert((select delivery_status = 'pending' from public.group_invitations where id = :'new_id'), 'previous attempt overwrote current delivery');
select pg_temp.assert((select expires_at > now() + interval '6 days' from public.group_invitations where id = :'new_id'), 'resend did not renew validity');

insert into auth.users(id,email) values (:'newcomer', 'new@example.test');
select set_config('request.jwt.claim.sub', :'newcomer', false);
set role authenticated;
select pg_temp.assert(public.accept_group_invitation(repeat('55',32)) is null, 'unconfirmed email accepted');
reset role;
update auth.users set email_confirmed_at = now() where id = :'newcomer';
set role authenticated;
select pg_temp.assert((select count(*) = 0 from public.groups where id = :'main_group'), 'group leaked before accepting');
select pg_temp.assert(public.accept_group_invitation(repeat('22',32)) is null, 'superseded token accepted');
select pg_temp.assert(public.accept_group_invitation(repeat('55',32)) = :'main_group', 'new user acceptance failed');
select pg_temp.assert(public.accept_group_invitation(repeat('55',32)) is null, 'token reused');
select pg_temp.assert((select count(*) = 1 from public.groups where id = :'main_group'), 'membership missing after acceptance');
reset role;

update auth.users set email = 'cancel@example.test' where id = :'newcomer';
set role authenticated;
select pg_temp.assert(public.accept_group_invitation(repeat('33',32)) is null, 'cancelled token accepted');
reset role;
update auth.users set email = 'expired@example.test' where id = :'newcomer';
set role authenticated;
select pg_temp.assert(public.accept_group_invitation(repeat('44',32)) is null, 'expired token accepted');
reset role;

-- Dois backends reais. O segundo aguarda o lock do primeiro e relê a versão consumida.
create extension dblink;
select dblink_connect('first', 'host=127.0.0.1 dbname=postgres user=postgres');
select dblink_connect('second', 'host=127.0.0.1 dbname=postgres user=postgres application_name=invitation-second');
select dblink_exec('first', 'begin');
select dblink_exec('first', format('set request.jwt.claim.sub = %L', :'existing'));
select dblink_exec('first', 'set local role authenticated');
select dblink_exec('second', format('set request.jwt.claim.sub = %L', :'existing'));
select dblink_exec('second', 'set role authenticated');
select pg_temp.assert(group_id = :'main_group', 'existing user acceptance failed')
from dblink('first', 'select public.accept_group_invitation(repeat(''11'',32))') as result(group_id uuid);
select dblink_send_query('second', 'select public.accept_group_invitation(repeat(''11'',32))');
do $$
begin
  for attempt in 1..100 loop
    perform pg_stat_clear_snapshot();
    if exists (select 1 from pg_stat_activity
      where application_name = 'invitation-second' and wait_event_type = 'Lock') then
      return;
    end if;
    perform pg_sleep(0.02);
  end loop;
  raise exception 'second acceptance did not wait for the first';
end;
$$;
select dblink_exec('first', 'commit');
select pg_temp.assert(group_id is null, 'concurrent acceptance succeeded twice')
from dblink_get_result('second') as result(group_id uuid);
select dblink_disconnect('first');
select dblink_disconnect('second');

select pg_temp.assert((select count(*) = 2 from public.group_members where group_id = :'main_group'
  and user_id in (:'newcomer', :'existing') and not is_admin and joined_at is not null), 'membership duplicated or malformed');
select pg_temp.assert((select count(*) = 2 from public.group_audit_events where group_id = :'main_group'
  and action = 'member.joined'), 'join audit missing or duplicated');
select pg_temp.assert((select count(*) = 2 from public.group_audit_events where group_id = :'main_group'
  and action = 'invitation.accepted'), 'accept audit missing or duplicated');
select pg_temp.assert((select count(*) = 8 from public.group_audit_events where group_id = :'main_group'
  and action in ('invitation.created','invitation.resent','invitation.cancelled','invitation.delivery_recorded')), 'administrative audit missing or duplicated');

-- O limite do ator cruza grupos e o limite do grupo cruza administradores.
begin;
select set_config('request.jwt.claim.sub', :'owner', true);
select public.create_group('Grupo no limite') as rate_group \gset
select public.create_group('Grupo alternativo') as alternate_group \gset
insert into public.group_members(group_id, user_id, is_admin)
values (:'rate_group', :'admin', true), (:'rate_group', :'member', true),
  (:'rate_group', :'existing', true), (:'alternate_group', :'existing', true);
select set_config('invitation_tests.rate_group', :'rate_group', true);
select set_config('invitation_tests.alternate_group', :'alternate_group', true);
select set_config('invitation_tests.existing', :'existing', true);

insert into public.group_audit_events(group_id, actor_id, action, created_at)
select :'alternate_group', :'existing', 'invitation.resent', clock_timestamp() - interval '10 minutes'
from generate_series(1, 9);
insert into public.group_audit_events(group_id, actor_id, action, created_at)
values (:'alternate_group', :'existing', 'invitation.created', clock_timestamp() - interval '61 minutes');
set local role service_role;
select * from public.issue_group_invitation(:'existing', :'rate_group', 'tenth@example.test', null, repeat('bb',32));
do $$
begin
  perform public.issue_group_invitation(current_setting('invitation_tests.existing')::uuid,
    current_setting('invitation_tests.alternate_group')::uuid, 'over-actor@example.test', null, repeat('cc',32));
  raise exception 'actor quota bypassed via another group';
exception when sqlstate 'PT429' then
  if sqlerrm <> 'Administrator invitation rate limit' then raise; end if;
end;
$$;
reset role;

-- Uma emissão real mais 29 eventos recentes de outros atores enchem a cota.
insert into public.group_audit_events(group_id, actor_id, action, created_at)
select :'rate_group', :'owner', 'invitation.created', clock_timestamp() - interval '10 minutes'
from generate_series(1, 29);
set local role service_role;
do $$
begin
  perform public.issue_group_invitation(current_setting('invitation_tests.member')::uuid,
    current_setting('invitation_tests.rate_group')::uuid, 'over-group@example.test', null, repeat('dd',32));
  raise exception 'group quota bypassed via another administrator';
exception when sqlstate 'PT429' then
  if sqlerrm <> 'Group invitation rate limit' then raise; end if;
end;
$$;
reset role;
select pg_temp.assert((select count(*) = 1 from public.group_invitations where group_id = :'rate_group'),
  'a rate-limited request wrote an invitation');
rollback;
