# Supabase setup

## 1. RLS for groups and group_members (fixes "create group" not working)

If **Create group** does nothing or you see `groups: {}` in state, Row Level Security (RLS) is likely blocking inserts.

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Run **`migrations/20250305000001_groups_and_group_members_rls.sql`** (copy full file → paste → Run).
3. Try creating a group again; it should appear and persist.

## 2. Activities and busy slots sync

For activities and availability to **persist and sync** across users:

1. In the same SQL Editor, run **`migrations/20250305000000_activities_and_busy_slots.sql`**.
2. Restart or redeploy your app.

## If you see errors

- **"policy already exists"** → Use the updated migration files (they include `drop policy if exists`).
- **"relation activities does not exist"** → Run the activities migration (step 2).
- **Create group fails / groups stay empty** → Run the RLS migration (step 1).
- **Foreign key or type errors** → Your `groups` or `users` table may use a different primary key type; adjust the migration accordingly.
