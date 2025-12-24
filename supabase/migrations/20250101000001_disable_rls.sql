-- 20250101000001_disable_rls.sql

-- 1. Disable RLS on all tables
alter table profiles disable row level security;
alter table deals disable row level security;
alter table deal_members disable row level security;
alter table workstreams disable row level security;
alter table documents disable row level security;
alter table emails disable row level security;

-- 2. Decouple profiles from auth.users (to allow dev users without authing)
alter table profiles drop constraint if exists profiles_id_fkey;

-- 3. Insert specific Dev User (if not exists)
insert into profiles (id, email, full_name)
values ('00000000-0000-0000-0000-000000000000', 'dev@example.com', 'Dev User')
on conflict (id) do nothing;
