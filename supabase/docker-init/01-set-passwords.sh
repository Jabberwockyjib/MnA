#!/bin/bash
set -e

# This script runs during postgres initialization to set Supabase role passwords
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Set passwords for Supabase roles
    ALTER ROLE authenticator WITH PASSWORD '${POSTGRES_PASSWORD}';
    ALTER ROLE supabase_auth_admin WITH PASSWORD '${POSTGRES_PASSWORD}';
    ALTER ROLE supabase_storage_admin WITH PASSWORD '${POSTGRES_PASSWORD}';
    ALTER ROLE supabase_admin WITH PASSWORD '${POSTGRES_PASSWORD}';
EOSQL
