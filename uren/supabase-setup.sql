-- Uitvoeren in Supabase: Project -> SQL Editor -> New query -> plakken -> Run

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  category text not null,
  client text default '',
  note text default '',
  minutes integer not null check (minutes > 0),
  created_at timestamptz not null default now()
);

alter table public.entries enable row level security;

create policy "select own entries" on public.entries
  for select using (owner_id = auth.uid());

create policy "insert own entries" on public.entries
  for insert with check (owner_id = auth.uid());

create policy "update own entries" on public.entries
  for update using (owner_id = auth.uid());

create policy "delete own entries" on public.entries
  for delete using (owner_id = auth.uid());

-- Realtime updates aanzetten voor deze tabel (voor live sync tussen apparaten)
alter publication supabase_realtime add table public.entries;
