# DealPulse Deployment Guide

## Overview

DealPulse is designed to be deployed as a containerized application with a self-hosted Supabase backend. This guide covers deployment to various platforms.

## Table of Contents

1. [OAuth Configuration for Production](#oauth-configuration-for-production)
2. [Deployment Options](#deployment-options)
3. [Environment Variables](#environment-variables)
4. [Database Migrations](#database-migrations)
5. [Security Checklist](#security-checklist)

---

## OAuth Configuration for Production

### Understanding OAuth in Production

**Important**: Your users do NOT need backend access to connect their Google accounts.

**How it works**:
1. **You (app owner)** create ONE set of OAuth credentials
2. **You** deploy these credentials to your backend (securely)
3. **End users** authenticate with their own Google accounts via standard OAuth
4. **Your app** stores their encrypted tokens in the database

### Setting Up Google OAuth for Production

#### 1. Update OAuth Consent Screen

In [Google Cloud Console](https://console.cloud.google.com/):

1. Go to "APIs & Services" → "OAuth consent screen"
2. Click "PUBLISH APP" to move from Testing to Production
3. If using sensitive scopes (Gmail, Drive), you may need verification:
   - Add privacy policy URL
   - Add terms of service URL
   - Submit for verification (can take 4-6 weeks)

**For MVP/Beta**: Keep it in "Testing" mode and manually add beta users as test users.

#### 2. Add Production Redirect URIs

1. Go to "APIs & Services" → "Credentials"
2. Click your OAuth Client ID
3. Add authorized redirect URIs:
   ```
   https://yourdomain.com/api/oauth/google/callback
   https://app.yourdomain.com/api/oauth/google/callback
   ```
4. Keep localhost URI for development:
   ```
   http://localhost:3000/api/oauth/google/callback
   ```

#### 3. Update Environment Variables

Production `.env` should have:
```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
GOOGLE_CLIENT_ID=your-actual-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-secret
```

---

## Deployment Options

### Option 1: VPS with Docker Compose (Recommended for MVP)

**Best for**: Small teams, MVPs, full control over infrastructure

**Platforms**: DigitalOcean, Linode, Hetzner, AWS EC2

#### Setup Steps

1. **Provision VPS**:
   - Minimum: 2 CPU, 4GB RAM, 50GB SSD
   - Recommended: 4 CPU, 8GB RAM, 100GB SSD
   - Ubuntu 22.04 LTS

2. **Install Docker**:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

3. **Clone Repository**:
   ```bash
   git clone https://github.com/yourusername/MnA.git
   cd MnA
   ```

4. **Generate Production Secrets**:
   ```bash
   ./scripts/generate-secrets.sh > .env
   ```

5. **Update Environment Variables**:
   ```bash
   nano .env
   # Update:
   # - NEXT_PUBLIC_APP_URL=https://yourdomain.com
   # - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
   # - Any other production-specific settings
   ```

6. **Set Up SSL with Caddy** (recommended) or nginx:

   Add to `compose.yaml`:
   ```yaml
   caddy:
     image: caddy:2-alpine
     restart: unless-stopped
     ports:
       - "80:80"
       - "443:443"
     volumes:
       - ./Caddyfile:/etc/caddy/Caddyfile
       - caddy_data:/data
       - caddy_config:/config
     networks:
       - mna_network
   ```

   Create `Caddyfile`:
   ```
   yourdomain.com {
     reverse_proxy app:3000
   }
   ```

7. **Start Services**:
   ```bash
   docker compose up -d
   ```

8. **Run Migrations**:
   ```bash
   for file in supabase/migrations/*.sql; do
     docker exec -i mna-db psql -U postgres -d postgres < "$file"
   done
   ```

#### Maintenance

**Backups**:
```bash
# Backup database
docker exec mna-db pg_dump -U postgres postgres > backup_$(date +%Y%m%d).sql

# Backup volumes
docker run --rm -v mna_mna_db_data:/data -v $(pwd):/backup ubuntu tar czf /backup/db_data_backup.tar.gz /data
```

**Updates**:
```bash
git pull
docker compose build --no-cache
docker compose up -d
```

---

### Option 2: Vercel + Supabase Cloud

**Best for**: Quick deployment, managed infrastructure

**Limitations**: No self-hosted Supabase (uses Supabase Cloud)

#### Setup Steps

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note the project URL and anon key

2. **Configure Vercel**:
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

3. **Set Environment Variables** in Vercel dashboard:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   TOKEN_ENCRYPTION_KEY=...
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

4. **Deploy**:
   ```bash
   vercel --prod
   ```

**Trade-offs**:
- ✅ Easy deployment and scaling
- ✅ Free tier available
- ❌ Vendor lock-in to Supabase Cloud
- ❌ Less control over infrastructure
- ❌ Costs scale with usage

---

### Option 3: AWS/GCP/Azure (Enterprise)

**Best for**: Large scale, compliance requirements

Use managed services:
- **App**: ECS/Cloud Run/App Service
- **Database**: RDS PostgreSQL/Cloud SQL/Azure Database
- **Storage**: S3/Cloud Storage/Blob Storage
- **Secrets**: AWS Secrets Manager/Secret Manager/Key Vault

---

## Environment Variables

### Required Variables

```bash
# Database
POSTGRES_PASSWORD=<generated>

# JWT & Auth
JWT_SECRET=<generated>
ANON_KEY=<generated>
SERVICE_ROLE_KEY=<generated>

# Supabase Public
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8025  # Change for production
NEXT_PUBLIC_SUPABASE_ANON_KEY=<generated>

# Internal Service Keys
SUPABASE_SERVICE_ROLE_KEY=<generated>

# Token Encryption
TOKEN_ENCRYPTION_KEY=<generated>

# Application URL (CRITICAL for OAuth)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change for production

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Node Environment
NODE_ENV=production  # Change from development
```

### Production Secrets Management

**DON'T**:
- ❌ Commit `.env` to git
- ❌ Store secrets in plain text
- ❌ Share secrets via email/Slack

**DO**:
- ✅ Use Docker secrets or environment variables
- ✅ Use a secrets manager (AWS Secrets Manager, Vault, etc.)
- ✅ Rotate secrets regularly
- ✅ Use different secrets per environment

---

## Database Migrations

### Initial Setup

On first deployment:
```bash
for file in supabase/migrations/*.sql; do
  docker exec -i mna-db psql -U postgres -d postgres < "$file"
done
```

### Future Migrations

1. Create migration file in `supabase/migrations/`:
   ```sql
   -- supabase/migrations/20250127000000_add_new_feature.sql
   CREATE TABLE new_feature (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     created_at timestamptz DEFAULT now()
   );
   ```

2. Deploy to production:
   ```bash
   # On production server
   docker exec -i mna-db psql -U postgres -d postgres < supabase/migrations/20250127000000_add_new_feature.sql
   ```

3. **Best Practice**: Use migration tools:
   - Consider [dbmate](https://github.com/amacneil/dbmate)
   - Or [golang-migrate](https://github.com/golang-migrate/migrate)
   - These track which migrations have run

---

## Security Checklist

### Before Production Deployment

- [ ] All secrets generated with `generate-secrets.sh` (not placeholders)
- [ ] `NODE_ENV=production` in `.env`
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain
- [ ] Google OAuth redirect URIs include production domain
- [ ] SSL/TLS enabled (HTTPS)
- [ ] Database password is strong and unique
- [ ] Row Level Security (RLS) enabled on all tables
  - ⚠️ Currently disabled in `20250101000001_disable_rls.sql`
  - **MUST re-enable before production**
- [ ] `.env` files excluded from git (check `.gitignore`)
- [ ] Database backups configured
- [ ] Monitoring and logging set up
- [ ] Rate limiting configured (consider nginx/Caddy)
- [ ] CORS policies reviewed

### Re-enabling RLS for Production

The current setup has RLS disabled for development. Before production:

1. Create new migration:
   ```sql
   -- supabase/migrations/20250127000000_enable_rls.sql
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
   ALTER TABLE deal_members ENABLE ROW LEVEL SECURITY;
   ALTER TABLE workstreams ENABLE ROW LEVEL SECURITY;
   ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
   ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
   ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
   ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
   ALTER TABLE source_connections ENABLE ROW LEVEL SECURITY;
   ALTER TABLE user_oauth_connections ENABLE ROW LEVEL SECURITY;
   ```

2. Test thoroughly with test users

---

## Monitoring

### Health Checks

Add health check endpoint:

```typescript
// app/api/health/route.ts
export async function GET() {
  // Check database
  // Check redis
  // Check queue workers
  return Response.json({ status: 'healthy' })
}
```

### Logging

Use structured logging in production:
- Consider Loki + Grafana
- Or managed services: Datadog, New Relic, CloudWatch

### Metrics

Monitor:
- App response times
- Database query performance
- Queue job processing times
- OAuth token refresh failures
- Storage usage

---

## Cost Estimation

### VPS Deployment (DigitalOcean Example)

- **Droplet (4 CPU, 8GB)**: $48/month
- **Managed Backups**: $9.60/month
- **Domain**: ~$15/year
- **Total**: ~$58/month + domain

### Vercel + Supabase Cloud

- **Vercel Pro**: $20/month
- **Supabase Pro**: $25/month
- **Total**: $45/month (scales with usage)

---

## Support

For deployment issues:
1. Check logs: `docker compose logs -f`
2. Verify environment variables
3. Check database migrations status
4. Review this deployment guide
5. Open issue on GitHub

---

## Next Steps After Deployment

1. **Test OAuth flow** with real Google account
2. **Set up monitoring** and alerts
3. **Configure backups** (daily database backups)
4. **Document runbooks** for common issues
5. **Plan for scaling** (add more workers, database replicas, etc.)
