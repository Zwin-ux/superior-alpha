create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  handle text not null,
  active_spore_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bot_spores (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  starter_preset_id text,
  spore jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.bot_spores enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.bot_spores to authenticated;

drop policy if exists "profiles are owned by user" on public.profiles;
create policy "profiles are owned by user"
on public.profiles
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "bot spores are owned by user" on public.bot_spores;
create policy "bot spores are owned by user"
on public.bot_spores
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists bot_spores_user_id_updated_at_idx
on public.bot_spores (user_id, updated_at desc);
