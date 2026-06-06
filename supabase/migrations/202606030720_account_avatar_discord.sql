alter table public.profiles
add column if not exists avatar_url text;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.account_connections'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%provider%'
  loop
    execute format('alter table public.account_connections drop constraint %I', constraint_record.conname);
  end loop;
end $$;

alter table public.account_connections
add constraint account_connections_provider_check
check (provider in ('google', 'x', 'discord'));
