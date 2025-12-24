-- 20250101000002_add_briefs_table.sql

-- BRIEFS (Daily Deal Briefs)
create table briefs (
  id uuid default gen_random_uuid() primary key,
  deal_id uuid references deals(id) on delete cascade not null,
  brief_date date not null,
  progress_snapshot jsonb, -- Overall and workstream progress
  changes jsonb, -- New/updated documents
  blockers jsonb, -- Detected blockers
  risks jsonb, -- Highlighted risks and issues
  communications jsonb, -- Notable email threads
  status text default 'draft', -- draft, published
  created_at timestamp with time zone default timezone('utc'::text, now()),
  published_at timestamp with time zone,
  unique(deal_id, brief_date)
);

-- RLS: Briefs
alter table briefs enable row level security;

create policy "Members can view briefs" on briefs for select
  using (is_deal_member(deal_id));

create policy "Members can insert briefs" on briefs for insert
  with check (is_deal_member(deal_id));

create policy "Members can update briefs" on briefs for update
  using (is_deal_member(deal_id));

-- Index for faster queries
create index briefs_deal_id_date_idx on briefs(deal_id, brief_date desc);
