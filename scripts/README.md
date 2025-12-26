# DealPulse Scripts

Utility scripts for managing the DealPulse development environment.

## Available Scripts

### `generate-secrets.sh`
Generates cryptographically secure secrets for the application.

**Usage:**
```bash
./scripts/generate-secrets.sh
```

**Output:**
Prints environment variables to stdout. You can redirect to `.env`:
```bash
./scripts/generate-secrets.sh > .env
```

**What it generates:**
- `POSTGRES_PASSWORD` - 64 hex characters (256-bit)
- `JWT_SECRET` - 128 hex characters (512-bit)
- `ANON_KEY` - JWT token signed with JWT_SECRET (role: anon)
- `SERVICE_ROLE_KEY` - JWT token signed with JWT_SECRET (role: service_role)
- `TOKEN_ENCRYPTION_KEY` - 64 hex characters for AES-256 encryption

### `reset-backend.sh`
Complete backend reset with fresh secrets and clean database.

**Usage:**
```bash
./scripts/reset-backend.sh
```

**What it does:**
1. Stops and removes all containers and volumes
2. Backs up existing `.env` files
3. Generates new secrets
4. Rebuilds the app container
5. Starts all services
6. Runs database migrations

**⚠️ WARNING:** This deletes ALL data. Use only for development reset.

## Quick Commands

### Start services
```bash
docker compose up -d
```

### Stop services
```bash
docker compose down
```

### Stop services and remove data
```bash
docker compose down -v
```

### View logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
docker compose logs -f db
```

### Rebuild app after code changes
```bash
docker compose up -d --build app
```

### Run migrations manually
```bash
for file in supabase/migrations/*.sql; do
  docker exec -i mna-db psql -U postgres -d postgres < "$file"
done
```

### Access database
```bash
docker exec -it mna-db psql -U postgres -d postgres
```

### Access Redis
```bash
docker exec -it mna-redis redis-cli
```

## Service URLs

When services are running:

- **App**: http://localhost:3005
- **Supabase Studio**: http://localhost:54343
- **Kong API Gateway**: http://localhost:8025
- **PostgreSQL**: localhost:54342
- **Redis**: localhost:6379

## First Time Setup

1. Generate secrets:
   ```bash
   ./scripts/generate-secrets.sh > .env
   ```

2. Add your Google OAuth credentials to `.env`:
   ```bash
   GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-secret
   ```

3. Start services:
   ```bash
   docker compose up -d
   ```

4. Wait for database to be ready (10-15 seconds)

5. Run migrations:
   ```bash
   for file in supabase/migrations/*.sql; do
     docker exec -i mna-db psql -U postgres -d postgres < "$file"
   done
   ```

6. Access the app at http://localhost:3005

## Troubleshooting

### Services won't start
```bash
# Check service status
docker compose ps

# View logs for failing service
docker compose logs [service-name]

# Restart a specific service
docker compose restart [service-name]
```

### Database connection errors
```bash
# Check if database is healthy
docker compose ps db

# View database logs
docker compose logs db

# Restart database
docker compose restart db
```

### Migrations not applied
```bash
# Check if tables exist
docker exec mna-db psql -U postgres -d postgres -c "\dt"

# Manually run migrations
for file in supabase/migrations/*.sql; do
  echo "Running: $(basename $file)"
  docker exec -i mna-db psql -U postgres -d postgres < "$file"
done
```

### Port conflicts
If ports are already in use, you can modify them in `compose.yaml`:
- App: 3005 (change first number in `"3005:3000"`)
- Kong: 8025 (change first number in `"8025:8000"`)
- PostgreSQL: 54342 (change first number in `"54342:5432"`)
- Studio: 54343 (change first number in `"54343:3000"`)
