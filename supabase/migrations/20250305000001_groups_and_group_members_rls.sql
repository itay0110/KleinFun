-- RLS for groups and group_members so create group and sync work.
-- Run this if "create group" fails or groups stay empty (e.g. "new row violates row-level security policy").

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

drop policy if exists "groups_select" on public.groups;
drop policy if exists "groups_insert" on public.groups;
drop policy if exists "groups_update" on public.groups;
drop policy if exists "groups_delete" on public.groups;
drop policy if exists "group_members_select" on public.group_members;
drop policy if exists "group_members_insert" on public.group_members;
drop policy if exists "group_members_delete" on public.group_members;

-- Groups: members can read; creator can insert/update/delete.
create policy "groups_select" on public.groups for select
  using (exists (select 1 from public.group_members where group_id = groups.id and user_id = auth.uid()));

create policy "groups_insert" on public.groups for insert
  with check (created_by = auth.uid());

create policy "groups_update" on public.groups for update
  using (created_by = auth.uid());

create policy "groups_delete" on public.groups for delete
  using (created_by = auth.uid());

-- Group members: members can read; anyone authenticated can add themselves (user_id = auth.uid()).
create policy "group_members_select" on public.group_members for select
  using (exists (select 1 from public.group_members gm where gm.group_id = group_members.group_id and gm.user_id = auth.uid()));

create policy "group_members_insert" on public.group_members for insert
  with check (user_id = auth.uid());

create policy "group_members_delete" on public.group_members for delete
  using (user_id = auth.uid());
