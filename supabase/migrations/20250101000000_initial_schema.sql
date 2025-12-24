-- 20250101000000_initial_schema.sql

-- Enable pgvector
create extension if not exists vector with schema extensions;

-- PROFILES (Managed by Supabase Auth)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS: Profiles
alter table profiles enable row level security;
create policy "Users can view their own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- DEALS
create table deals (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  status text not null default 'active', -- active, closed, paused
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS: Deals (Simplified for now, will rely on deal_members)
alter table deals enable row level security;

-- DEAL MEMBERS
create table deal_members (
  id uuid default gen_random_uuid() primary key,
  deal_id uuid references deals(id) on delete cascade not null,
  user_id uuid references profiles(id) not null,
  role text not null check (role in ('admin', 'member', 'viewer')),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(deal_id, user_id)
);

alter table deal_members enable row level security;

-- WORKSTREAMS
create table workstreams (
  id uuid default gen_random_uuid() primary key,
  deal_id uuid references deals(id) on delete cascade not null,
  name text not null, -- Legal, HR, Finance, etc.
  description text,
  status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table workstreams enable row level security;

-- DOCUMENTS (Metadata)
create table documents (
  id uuid default gen_random_uuid() primary key,
  deal_id uuid references deals(id) on delete cascade not null,
  name text not null,
  source_id text, -- ID from source system (Drive/Sharepoint)
  source_url text,
  source_type text not null, -- 'gdrive', 'sharepoint'
  workstream_id uuid references workstreams(id),
  summary text,
  status text default 'new', -- new, updated, reviewed
  last_ingested_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table documents enable row level security;

-- EMAILS (Metadata)
create table emails (
  id uuid default gen_random_uuid() primary key,
  deal_id uuid references deals(id) on delete cascade not null,
  thread_id text,
  subject text,
  sender text,
  snippet text,
  sentiment text, -- risk, blocker, positive, neutral
  is_blocker boolean default false,
  status text default 'new',
  received_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table emails enable row level security;

-- SHARED RLS HELPER
-- Check if current user is a member of the deal
create or replace function is_deal_member(_deal_id uuid)
returns boolean as $$
  select exists (
    select 1
    from deal_members
    where deal_id = _deal_id
    and user_id = auth.uid()
  );
$$ language sql security definer;

-- Apply RLS Policies using helper
-- Deals
create policy "Members can view deals" on deals for select
  using (exists (select 1 from deal_members where deal_id = id and user_id = auth.uid()));

-- Deal Members
create policy "Members can view other members" on deal_members for select
  using (is_deal_member(deal_id));

-- Workstreams
create policy "Members can view workstreams" on workstreams for select
  using (is_deal_member(deal_id));

-- Documents
create policy "Members can view documents" on documents for select
  using (is_deal_member(deal_id));

-- Emails
create policy "Members can view emails" on emails for select
  using (is_deal_member(deal_id));
