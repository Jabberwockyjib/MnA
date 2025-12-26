-- Modify source_connections to reference user OAuth connections
-- Support both new pattern (user_oauth_connection_id) and legacy (direct tokens)

-- Add new column for referencing user OAuth connections
alter table if exists source_connections
  add column if not exists user_oauth_connection_id uuid references user_oauth_connections(id) on delete set null;

-- Make token columns nullable to support new pattern
-- (tokens will come from user_oauth_connections instead)
alter table if exists source_connections
  alter column access_token drop not null,
  alter column refresh_token drop not null;

-- Index for faster lookups
create index if not exists source_connections_user_oauth_connection_id_idx
  on source_connections(user_oauth_connection_id);

-- Comment for future check constraint
-- Note: We allow both patterns during migration period:
-- 1. New pattern: user_oauth_connection_id is set (tokens from user_oauth_connections)
-- 2. Legacy pattern: access_token is set directly
-- Future migration may enforce one or the other with check constraint
