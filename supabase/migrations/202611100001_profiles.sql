begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
revoke all on table public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
create policy profiles_read_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Sem cópia de e-mail/metadados de provedores e sem INSERT fornecido pelo cliente.
create function public.create_user_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
revoke all on function public.create_user_profile() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.create_user_profile();
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;
commit;
