# Supabase setup

Run the migration in the Supabase SQL Editor so activities and availability sync across users:

1. Open your project in [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor**.
2. Paste and run the contents of `migrations/20250305000000_activities_and_busy_slots.sql`.

This creates the `activities` and `busy_slots` tables and RLS policies so group members can read/write them. After that, activities and busy slots will persist and sync across all clients (with a 15s refresh).
