-- User OAuth Connections
-- Stores encrypted OAuth tokens at user level

create table if not exists user_oauth_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null check (provider in ('google', 'microsoft')),
  encrypted_access_token text not null,
  encrypted_refresh_token text not null,
  token_expires_at timestamp with time zone,
  scopes text[] not null,
  provider_user_id text,
  provider_email text,
  is_active boolean default true,
  last_refresh_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, provider)
);

-- RLS Policies
alter table user_oauth_connections enable row level security;

create policy "Users can manage their own OAuth connections"
  on user_oauth_connections for all
  using (auth.uid() = user_id);

-- Indexes
create index if not exists user_oauth_connections_user_id_idx on user_oauth_connections(user_id);
create index if not exists user_oauth_connections_provider_idx on user_oauth_connections(provider);
create index if not exists user_oauth_connections_is_active_idx on user_oauth_connections(is_active);

-- Trigger function for updated_at
create or replace function update_user_oauth_connections_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger for updated_at
create trigger update_user_oauth_connections_updated_at
  before update on user_oauth_connections
  for each row
  execute function update_user_oauth_connections_updated_at();
