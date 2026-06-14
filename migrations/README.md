# Database Migrations

These migrations describe the PostgreSQL schema currently used by Sosyo.

Run them in numerical order in the Supabase SQL Editor:

```txt
001_create_users.sql
002_create_friend_requests.sql
003_create_friendships.sql
004_create_user_blocks.sql
```

The files use `IF NOT EXISTS` where PostgreSQL supports it, so they can safely
create missing tables and indexes. Existing tables are not automatically
rewritten to match these definitions.

Before applying migrations to production:

1. Confirm the SQL Editor is open for the project used by `DATABASE_URL`.
2. Back up important data.
3. Check for duplicate usernames or emails before creating unique indexes.
4. Confirm `xsah_user.id` is a UUID.

Current tables:

```txt
xsah_user
xsah_friends_request_tab
xsah_friendship_tab
xsah_user_blocks_tab
```

Redis data such as OTPs is temporary and does not require a PostgreSQL
migration.
