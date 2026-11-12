-- Executar como administrador somente em banco LOCAL descartável com a migração aplicada.
-- Transação e rollback: não deixa os usuários sintéticos persistidos.
begin;
insert into auth.users(id) values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
do $$ begin
 if (select count(*) from public.profiles) <> 1 then raise exception 'RLS expôs outro perfil'; end if;
 if not exists(select 1 from public.profiles where id = auth.uid()) then raise exception 'Perfil próprio ausente'; end if;
 update public.profiles set display_name = 'Teste A' where id = auth.uid();
 update public.profiles set display_name = 'Intrusão' where id = '22222222-2222-4222-8222-222222222222';
 if found then raise exception 'Atualização cruzada permitida'; end if;
 begin
  insert into public.profiles(id) values ('33333333-3333-4333-8333-333333333333');
  raise exception 'Insert permitido';
 exception when insufficient_privilege then null; end;
 begin
  update public.profiles set id = '33333333-3333-4333-8333-333333333333' where id = auth.uid();
  raise exception 'Troca de id permitida';
 exception when insufficient_privilege then null; end;
 begin
  update public.profiles set created_at = now() where id = auth.uid();
  raise exception 'Troca de data permitida';
 exception when insufficient_privilege then null; end;
 begin
  delete from public.profiles where id = auth.uid();
  raise exception 'Delete permitido';
 exception when insufficient_privilege then null; end;
 begin
  update public.profiles set display_name = repeat('x',81) where id = auth.uid();
  raise exception 'Nome excessivo permitido';
 exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$ begin
 if (select display_name from public.profiles where id = auth.uid()) <> '' then raise exception 'Perfil B modificado'; end if;
end $$;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
 if (select count(*) from public.profiles) <> 0 then raise exception 'Sem identidade pode ler'; end if;
end $$;
set local role anon;
do $$ begin
 begin
  perform * from public.profiles;
  raise exception 'Anônimo pode ler';
 exception when insufficient_privilege then null; end;
 begin
  update public.profiles set display_name = 'Intrusão';
  raise exception 'Anônimo pode escrever';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
