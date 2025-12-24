-- 20250101000004_add_communications_table.sql

-- COMMUNICATIONS TABLE
-- Store email communications from Gmail/Outlook
create table communications (
  id uuid default gen_random_uuid() primary key,
  deal_id uuid references deals(id) on delete cascade not null,
  type text not null default 'email',
  subject text not null,
  sender text not null,
  recipients text[] not null default '{}',
  body text,
  thread_id text,
  source_id text,
  source_type text check (source_type in ('gmail', 'outlook')),
  sentiment text,
  is_blocker boolean default false,
  status text default 'new',
  received_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS: Communications
alter table communications enable row level security;

create policy "Members can view communications" on communications for select
  using (is_deal_member(deal_id));

create policy "Members can insert communications" on communications for insert
  with check (is_deal_member(deal_id));

create policy "Members can update communications" on communications for update
  using (is_deal_member(deal_id));

-- Indexes
create index communications_deal_id_idx on communications(deal_id);
create index communications_source_id_idx on communications(source_id);
create index communications_received_at_idx on communications(received_at desc);
