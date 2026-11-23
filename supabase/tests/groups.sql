-- Somente PostgreSQL descartável. Usuários e operações administrativas são fixtures.
begin;
insert into auth.users(id) values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222'),
 ('33333333-3333-4333-8333-333333333333');
update public.profiles set display_name = 'Nome de exibição do Dono'
  where id = '11111111-1111-4111-8111-111111111111';
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('test.group_a', public.create_group('  Clube A  ', '  Descrição A  ')::text, true);
-- Forçar validação imediata também prova que os vínculos obrigatórios existem.
set constraints all immediate;
do $$ begin
 if (select count(*) from public.groups) <> 1 then raise exception 'Grupo ausente'; end if;
 if not exists(select 1 from public.groups where name = 'Clube A' and description = 'Descrição A'
   and founder_id = auth.uid() and owner_id = auth.uid() and is_private) then raise exception 'Criação incorreta'; end if;
 if not exists(select 1 from public.group_members where user_id = auth.uid() and is_admin) then raise exception 'Dono não é administrador'; end if;
 if (select count(*) from public.group_admin_permissions) <> 1 then raise exception 'Permissões ausentes'; end if;
 if not private.has_group_admin_permission(current_setting('test.group_a')::uuid, 'manage_cycles') then raise exception 'Dono sem permissão total'; end if;
 update public.group_admin_permissions set manage_group = true;
 begin
  insert into public.groups(name, description, founder_id, owner_id) values ('Forjado', 'x', auth.uid(), auth.uid());
  raise exception 'Insert direto permitido';
 exception when insufficient_privilege then null; end;
 begin
  update public.groups set founder_id = '22222222-2222-4222-8222-222222222222';
  raise exception 'Troca de fundador permitida';
 exception when insufficient_privilege then null; end;
 begin
  update public.groups set owner_id = '22222222-2222-4222-8222-222222222222';
  raise exception 'Troca de dono permitida';
 exception when insufficient_privilege then null; end;
 begin
  delete from public.groups;
  raise exception 'Delete de grupo permitido';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.group_members(group_id, user_id, is_admin) values (current_setting('test.group_a')::uuid, '22222222-2222-4222-8222-222222222222', true);
  raise exception 'Adição de membro permitida';
 exception when insufficient_privilege then null; end;
 begin
  update public.group_members set is_admin = false;
  raise exception 'Mudança de papel permitida';
 exception when insufficient_privilege then null; end;
 begin
  delete from public.group_members;
  raise exception 'Remoção de membro permitida';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.group_audit_events(group_id, actor_id, action) values (current_setting('test.group_a')::uuid, auth.uid(), 'forged');
  raise exception 'Auditoria forjada permitida';
 exception when insufficient_privilege then null; end;
 begin
  update public.group_audit_events set action = 'forged';
  raise exception 'Auditoria alterada';
 exception when insufficient_privilege then null; end;
 begin
  delete from public.group_audit_events;
  raise exception 'Auditoria apagada';
 exception when insufficient_privilege then null; end;
 begin
  perform public.create_group('   ', 'válida');
  raise exception 'Nome vazio aceito';
 exception when check_violation then null; end;
 begin
  perform public.create_group(null, 'válida');
  raise exception 'Nome nulo aceito';
 exception when not_null_violation then null; end;
 begin
  perform public.create_group(repeat('x', 81), 'válida');
  raise exception 'Nome excessivo aceito';
 exception when check_violation then null; end;
 begin
  perform public.create_group('Nome', repeat('x', 2001));
  raise exception 'Descrição excessiva aceita';
 exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$ begin
 if (select count(*) from public.groups) <> 0 or (select count(*) from public.group_members) <> 0
   or (select count(*) from public.group_admin_permissions) <> 0 then raise exception 'Grupo privado exposto'; end if;
 if exists(select from public.list_group_members(current_setting('test.group_a')::uuid)) then
  raise exception 'Nomes de membros de grupo privado expostos';
 end if;
 update public.group_admin_permissions set manage_group = false where group_id = current_setting('test.group_a')::uuid;
 if found then raise exception 'Estranho alterou permissões'; end if;
end $$;
set constraints all deferred;
select set_config('test.group_b', public.create_group('Clube B')::text, true);
do $$ begin
 if not exists(select from public.groups where id = current_setting('test.group_b')::uuid and description = '')
   or not exists(select from public.list_group_members(current_setting('test.group_b')::uuid)
     where user_id = auth.uid() and is_admin and display_name is null) then
  raise exception 'Criação sem descrição ou projeção do Dono incorreta';
 end if;
end $$;
set constraints all immediate;
savepoint blank_descriptions;
set constraints all deferred;
select public.create_group('Descrição nula', null);
select public.create_group('Somente espaços', E'\n\t');
set constraints all immediate;
do $$ begin
 if (select count(*) from public.groups where description = '') <> 3 then
  raise exception 'Descrições vazias explícitas não foram normalizadas';
 end if;
end $$;
rollback to savepoint blank_descriptions;
do $$ begin
 if (select array_agg(id) from public.groups) is distinct from array[current_setting('test.group_b')::uuid] then
  raise exception 'Listagem cruzada';
 end if;
end $$;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
 if (select count(*) from public.groups) <> 0 or
    exists(select from public.list_group_members(current_setting('test.group_a')::uuid)) then
  raise exception 'Sem identidade leu dados de grupo';
 end if;
 begin
  perform public.create_group('Inválido', 'Sem identidade');
  raise exception 'Sem identidade criou grupo';
 exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
 begin
  perform * from public.groups;
  raise exception 'Anônimo leu grupos';
 exception when insufficient_privilege then null; end;
 begin
  perform public.create_group('Inválido', 'Anônimo');
  raise exception 'Anônimo criou grupo';
 exception when insufficient_privilege then null; end;
 begin
  perform * from public.list_group_members(current_setting('test.group_a')::uuid);
  raise exception 'Anônimo consultou nomes de membros';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Restrições de integridade devem valer mesmo para futuras rotinas privilegiadas.
do $$ begin
 begin
  update public.groups set owner_id = null where id = current_setting('test.group_a')::uuid;
  raise exception 'Grupo sem dono aceito';
 exception when not_null_violation then null; end;
 begin
  update public.groups set founder_id = '22222222-2222-4222-8222-222222222222' where id = current_setting('test.group_a')::uuid;
  raise exception 'Fundador não é imutável';
 exception when check_violation then null; end;
 begin
  update public.groups set owner_id = '33333333-3333-4333-8333-333333333333' where id = current_setting('test.group_a')::uuid;
  raise exception 'Dono não membro aceito';
 exception when foreign_key_violation then null; end;
 begin
  update public.group_members set is_admin = false where group_id = current_setting('test.group_a')::uuid;
  raise exception 'Dono sem administração aceito';
 exception when foreign_key_violation then null; end;
 begin
  delete from public.group_members where group_id = current_setting('test.group_a')::uuid;
  raise exception 'Grupo sem dono aceito';
 exception when foreign_key_violation then null; end;
 if (select count(*) from public.group_audit_events where action = 'group.created') <> 2 then raise exception 'Auditoria de criação incorreta'; end if;
 if not exists(select 1 from public.group_audit_events where action = 'admin_permissions.updated'
   and actor_id = '11111111-1111-4111-8111-111111111111'
   and details->'before'->>'manage_group' = 'false' and details->'after'->>'manage_group' = 'true') then raise exception 'Auditoria de configuração incorreta'; end if;
end $$;
-- Admin comum e participante: leitura permitida, configuração e auditoria protegidas.
insert into public.group_members(group_id, user_id, is_admin) values
 (current_setting('test.group_a')::uuid, '22222222-2222-4222-8222-222222222222', true),
 (current_setting('test.group_a')::uuid, '33333333-3333-4333-8333-333333333333', false);
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$ begin
 if (select count(*) from public.groups) <> 2 then raise exception 'Grupos do membro ausentes'; end if;
 if (select count(*) from public.list_group_members(current_setting('test.group_a')::uuid)) <> 3 or
   not exists(select from public.list_group_members(current_setting('test.group_a')::uuid)
     where display_name = 'Nome de exibição do Dono' and is_admin) then
  raise exception 'Projeção de nomes e papéis incompleta para membro';
 end if;
 if exists(select from public.profiles where id <> auth.uid()) then
  raise exception 'A RLS de perfis expôs outro usuário';
 end if;
 if not private.has_group_admin_permission(current_setting('test.group_a')::uuid, 'manage_group')
   or private.has_group_admin_permission(current_setting('test.group_a')::uuid, 'manage_cycles') then raise exception 'Permissões configuráveis incorretas'; end if;
 update public.group_admin_permissions set manage_group = false where group_id = current_setting('test.group_a')::uuid;
 if found then raise exception 'Admin comum alterou configuração'; end if;
 begin
  update public.group_audit_events set action = 'forged';
  raise exception 'Admin comum alterou auditoria';
 exception when insufficient_privilege then null; end;
 begin
  delete from public.group_audit_events;
  raise exception 'Admin comum apagou auditoria';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
do $$ begin
 if (select count(*) from public.groups) <> 1 then raise exception 'Participante não lê seu grupo'; end if;
 if not exists(select from public.list_group_members(current_setting('test.group_a')::uuid)
     where user_id = auth.uid() and not is_admin) or
   exists(select from public.list_group_members(current_setting('test.group_b')::uuid)) then
  raise exception 'Papéis ou isolamento incorretos para participante';
 end if;
 update public.group_admin_permissions set manage_members = true;
 if found then raise exception 'Participante alterou configuração'; end if;
end $$;
reset role;
-- Falha depois de criar grupo/membro/configuração precisa desfazer tudo.
set constraints all deferred;
create function private.test_reject_audit() returns trigger language plpgsql as $$
begin raise exception 'synthetic audit failure' using errcode = '23514'; end $$;
create trigger test_reject_audit before insert on public.group_audit_events for each row execute function private.test_reject_audit();
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
do $$ begin
 begin
  perform public.create_group('Não persistir', 'Falha sintética na última escrita');
  raise exception 'Falha não foi propagada';
 exception when check_violation then null; end;
end $$;
reset role;
do $$ begin
 if (select count(*) from public.groups) <> 2 or (select count(*) from public.group_members) <> 4
   or (select count(*) from public.group_admin_permissions) <> 2
   or (select count(*) from public.group_audit_events) <> 3 then raise exception 'Criação parcial persistiu'; end if;
end $$;
drop trigger test_reject_audit on public.group_audit_events;
-- Fixture de transferência futura: Fundador sem cargo não ganha privilégios vitalícios.
update public.groups set owner_id = '22222222-2222-4222-8222-222222222222' where id = current_setting('test.group_a')::uuid;
update public.group_members set is_admin = false where group_id = current_setting('test.group_a')::uuid and user_id = '11111111-1111-4111-8111-111111111111';
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
do $$ begin
 update public.group_admin_permissions set manage_cycles = true;
 if found then raise exception 'Fundador ganhou privilégio vitalício'; end if;
 if private.has_group_admin_permission(current_setting('test.group_a')::uuid, 'manage_group') then raise exception 'Fundador sem cargo tem permissão'; end if;
end $$;
reset role;
rollback;
