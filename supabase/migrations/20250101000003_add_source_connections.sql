-- 20250101000003_add_source_connections.sql

-- SOURCE CONNECTIONS
-- Store OAuth tokens and configuration for external sources
create table source_connections (
  id uuid default gen_random_uuid() primary key,
  deal_id uuid references deals(id) on delete cascade not null,
  source_type text not null check (source_type in ('gdrive', 'sharepoint', 'gmail', 'outlook')),
  access_token text not null,
  refresh_token text,
  token_expires_at timestamp with time zone,
  folder_id text, -- Google Drive folder ID or SharePoint site ID
  configuration jsonb, -- Additional source-specific config
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(deal_id, source_type)
);

-- RLS: Source Connections
alter table source_connections enable row level security;

create policy "Members can view source connections" on source_connections for select
  using (is_deal_member(deal_id));

create policy "Admins can manage source connections" on source_connections for all
  using (
    exists (
      select 1 from deal_members
      where deal_id = source_connections.deal_id
      and user_id = auth.uid()
      and role = 'admin'
    )
  );

-- Index for faster lookups
create index source_connections_deal_id_idx on source_connections(deal_id);
create index source_connections_source_type_idx on source_connections(source_type);
