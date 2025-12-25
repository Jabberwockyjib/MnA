#!/bin/bash
set -e

# Configure pg_hba.conf to trust connections from Docker network
# This allows Supabase services to connect without passwords
# Change the existing 172.16.0.0/12 rule from scram-sha-256 to trust
sed -i 's/^host\s\+all\s\+all\s\+172\.16\.0\.0\/12\s\+scram-sha-256/host  all  all  172.16.0.0\/12  trust/' /etc/postgresql/pg_hba.conf

# Reload PostgreSQL configuration
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT pg_reload_conf();
EOSQL
