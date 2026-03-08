-- Activities: one row per activity, with responses and comments as JSONB.
create table if not exists public.activities (
  id text primary key,
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  creator_id uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  start_time timestamptz not null,
  location text default '',
  notes text default '',
  responses jsonb not null default '{}',
  comments jsonb not null default '[]'
);

-- Busy slots: when a user is busy in a group (next 48h availability).
create table if not exists public.busy_slots (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  on_ground boolean not null default false
);

-- RLS: only group members can read/write activities and busy_slots.
alter table public.activities enable row level security;
alter table public.busy_slots enable row level security;

-- Drop existing policies so this migration is safe to re-run.
drop policy if exists "activities_select" on public.activities;
drop policy if exists "activities_insert" on public.activities;
drop policy if exists "activities_update" on public.activities;
drop policy if exists "activities_delete" on public.activities;
drop policy if exists "busy_slots_select" on public.busy_slots;
drop policy if exists "busy_slots_insert" on public.busy_slots;
drop policy if exists "busy_slots_update" on public.busy_slots;
drop policy if exists "busy_slots_delete" on public.busy_slots;

-- Activities: allow if user is in group_members for this group.
create policy "activities_select" on public.activities for select
  using (exists (select 1 from public.group_members where group_id = activities.group_id and user_id = auth.uid()));
create policy "activities_insert" on public.activities for insert
  with check (exists (select 1 from public.group_members where group_id = activities.group_id and user_id = auth.uid()));
create policy "activities_update" on public.activities for update
  using (exists (select 1 from public.group_members where group_id = activities.group_id and user_id = auth.uid()));
create policy "activities_delete" on public.activities for delete
  using (exists (select 1 from public.group_members where group_id = activities.group_id and user_id = auth.uid()));

-- Busy_slots: same.
create policy "busy_slots_select" on public.busy_slots for select
  using (exists (select 1 from public.group_members where group_id = busy_slots.group_id and user_id = auth.uid()));
create policy "busy_slots_insert" on public.busy_slots for insert
  with check (exists (select 1 from public.group_members where group_id = busy_slots.group_id and user_id = auth.uid()));
create policy "busy_slots_update" on public.busy_slots for update
  using (exists (select 1 from public.group_members where group_id = busy_slots.group_id and user_id = auth.uid()));
create policy "busy_slots_delete" on public.busy_slots for delete
  using (exists (select 1 from public.group_members where group_id = busy_slots.group_id and user_id = auth.uid()));
