# Supabase setup – activities & busy slots sync

For activities and availability to **persist and sync** across users, you must create the tables first.

## Steps

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Open `migrations/20250305000000_activities_and_busy_slots.sql` in this repo.
3. Copy its full contents, paste into the SQL Editor, and click **Run**.
4. If it succeeds, you should see “Success. No rows returned.”
5. Restart or redeploy your app so it uses the new tables.

## If you see errors

- **"relation \"activities\" does not exist"** in the app console → the migration was not run or failed. Run the SQL above.
- **Foreign key or type errors** when running the SQL → your `groups` or `users` table may use a different primary key type. The migration assumes `groups(id)` and `users(id)` are `uuid`. If yours are `text`, change the migration: use `text` for `group_id`, `creator_id`, and `user_id` instead of `uuid`, and remove the `references` if needed.
- After running the migration, create a **new** activity or busy slot; it will be stored in Supabase and other group members will see it within about 15 seconds (or on refresh).
