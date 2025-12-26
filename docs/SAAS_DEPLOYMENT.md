# SaaS Deployment Guide

## Understanding the Model

**DealPulse is a multi-tenant SaaS application where:**

- YOU create ONE Google OAuth app for "DealPulse"
- ALL customers use YOUR OAuth app to connect their individual Google accounts
- Each customer's tokens are stored separately in the database
- You deploy ONE set of OAuth credentials to production

**This is the standard SaaS model** used by Slack, Notion, Dropbox, etc.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Production Server                                            │
│                                                              │
│ Environment Variables (from secrets manager):               │
│   GOOGLE_CLIENT_ID=123...apps.googleusercontent.com        │
│   GOOGLE_CLIENT_SECRET=GOCSPX-xyz...                       │
│   NEXT_PUBLIC_APP_URL=https://app.dealpulse.com            │
│                                                              │
│ ┌─────────────────────────────────────────────────┐        │
│ │ Database: user_oauth_connections                 │        │
│ │                                                   │        │
│ │ Row 1: Customer A User 1 → encrypted tokens      │        │
│ │ Row 2: Customer A User 2 → encrypted tokens      │        │
│ │ Row 3: Customer B User 1 → encrypted tokens      │        │
│ │ Row 4: Customer B User 2 → encrypted tokens      │        │
│ │ Row 5: Customer C User 1 → encrypted tokens      │        │
│ │ ...                                               │        │
│ └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

**Key Point**: All customers connect through YOUR OAuth app, but each gets their own tokens.

---

## Production Secrets Management

### ❌ DON'T: Put secrets in .env on server

```bash
# BAD - Don't do this in production
ssh into-production-server
nano .env  # Manually editing secrets
```

### ✅ DO: Use a secrets manager

Choose based on your hosting platform:

#### Option 1: Docker Swarm Secrets (Self-hosted)

```yaml
# compose.production.yaml
services:
  app:
    secrets:
      - google_client_id
      - google_client_secret
      - jwt_secret
    environment:
      GOOGLE_CLIENT_ID_FILE: /run/secrets/google_client_id
      GOOGLE_CLIENT_SECRET_FILE: /run/secrets/google_client_secret

secrets:
  google_client_id:
    external: true
  google_client_secret:
    external: true
```

Create secrets:
```bash
echo "your-client-id" | docker secret create google_client_id -
echo "your-client-secret" | docker secret create google_client_secret -
```

#### Option 2: AWS Secrets Manager

```bash
# Store secrets
aws secretsmanager create-secret \
  --name dealpulse/google-oauth \
  --secret-string '{"client_id":"...","client_secret":"..."}'

# Retrieve in app (using AWS SDK)
```

Update your app to read from AWS Secrets Manager:

```typescript
// lib/secrets.ts
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-east-1" });

export async function getGoogleOAuthCredentials() {
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: "dealpulse/google-oauth" })
  );

  const secret = JSON.parse(response.SecretString!);
  return {
    clientId: secret.client_id,
    clientSecret: secret.client_secret
  };
}
```

#### Option 3: Vercel Environment Variables

In Vercel dashboard or CLI:

```bash
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production
vercel env add TOKEN_ENCRYPTION_KEY production
```

These are injected at runtime - not stored in files.

#### Option 4: Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dealpulse-oauth
type: Opaque
data:
  google-client-id: <base64-encoded>
  google-client-secret: <base64-encoded>
```

Reference in deployment:
```yaml
env:
  - name: GOOGLE_CLIENT_ID
    valueFrom:
      secretKeyRef:
        name: dealpulse-oauth
        key: google-client-id
```

---

## Recommended SaaS Stack

### For MVP/Small Scale

**Hosting**: DigitalOcean App Platform or Render

**Secrets**: Platform environment variables

**Setup**:
```bash
# Create app on platform
# Set environment variables in dashboard:
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...
TOKEN_ENCRYPTION_KEY=...
POSTGRES_PASSWORD=...
```

**Deploy**:
```bash
git push origin main  # Auto-deploys
```

**Cost**: ~$20-50/month

---

### For Growth/Enterprise

**Hosting**: AWS ECS or Google Cloud Run

**Database**: AWS RDS PostgreSQL or Google Cloud SQL

**Secrets**: AWS Secrets Manager or Google Secret Manager

**Redis**: AWS ElastiCache or Google Cloud Memorystore

**Storage**: S3 or Cloud Storage

**Cost**: ~$200-500/month (depending on scale)

---

## Customer Onboarding Flow

### What Customers Experience

1. **Sign up** at `https://app.dealpulse.com`
   - Email/password or SSO
   - Creates account in `auth.users` table

2. **Complete profile**
   - Company name, role, etc.
   - Row created in `profiles` table

3. **Create or join deal**
   - Creates/joins a deal
   - Row in `deals` and `deal_members` tables

4. **Connect Google** (optional but recommended)
   - Clicks "Connect Google Drive" or "Connect Gmail"
   - Redirected to Google OAuth consent screen
   - Sees: "DealPulse wants to access your Google Drive"
   - Approves
   - Redirected back to app
   - Row created in `user_oauth_connections` with encrypted tokens

5. **Configure sources**
   - Select which Drive folders to monitor
   - Select which Gmail labels to track
   - Rows in `source_connections` table

6. **Start using**
   - Background workers sync their data
   - Daily briefs generated
   - Notifications on changes

**At no point does the customer:**
- ❌ Configure OAuth credentials
- ❌ Access the backend
- ❌ Edit environment variables
- ❌ Deploy anything

---

## Multi-Tenancy Isolation

Your app already has multi-tenancy built in via `deal_members`:

```sql
-- User can only see deals they're a member of
create policy "Users can view deals they are members of"
  on deals for select
  using (is_deal_member(auth.uid(), id));
```

This ensures:
- Company A can't see Company B's deals
- Company A can't see Company B's documents
- Company A can't see Company B's OAuth tokens

**Row Level Security (RLS)** handles all isolation automatically.

---

## Scaling Considerations

### When you hit 100+ customers:

1. **Separate worker instances**
   ```bash
   docker compose scale worker=5
   ```

2. **Database connection pooling**
   - Use PgBouncer
   - Or managed database with built-in pooling

3. **Redis cluster**
   - For distributed queue processing

4. **CDN for static assets**
   - CloudFront, Cloudflare

### When you hit 1000+ customers:

1. **Database read replicas**
   - Primary for writes
   - Replicas for reads

2. **Horizontal scaling**
   - Multiple app instances behind load balancer
   - Multiple worker instances

3. **Queue prioritization**
   - Paid customers get priority
   - Free tier gets lower priority

---

## OAuth App Verification (Important!)

### Google OAuth Verification

For **production use with external users**, you MUST get verified by Google:

**When needed**: If using sensitive scopes (Gmail, Drive)

**Process**:
1. Complete OAuth consent screen
2. Add privacy policy and terms of service
3. Submit for verification
4. Google reviews (4-6 weeks)
5. May require screencast demo

**Before verification**:
- Limited to 100 test users
- Shows "unverified app" warning

### Workarounds for MVP:

**Option A: Internal use only**
- Mark as "Internal" in OAuth consent screen
- Only users in your Google Workspace can use it
- No verification needed

**Option B: Beta with test users**
- Keep in "Testing" mode
- Manually add beta customers as test users
- Up to 100 test users

**Option C: Request sensitive scope exemption**
- If use case is clearly business-focused
- Explain why you need Gmail/Drive access
- May get faster approval

---

## Alternative: Multi-Instance Architecture (Enterprise)

If you want to offer **white-label deployments** where each enterprise customer gets:
- Their own instance
- Their own OAuth app
- Their own branding

Then you'd need a different architecture:

```
┌──────────────────────────────────────────────────────┐
│ Control Plane (dealpulse.com)                        │
│ - Customer management                                │
│ - Billing                                            │
│ - Instance provisioning                              │
└──────────────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ customer-a  │ │ customer-b  │ │ customer-c  │
│ .dealpulse  │ │ .dealpulse  │ │ .dealpulse  │
│                                                │
│ Separate DB │ │ Separate DB │ │ Separate DB │
│ Own OAuth   │ │ Own OAuth   │ │ Own OAuth   │
└─────────────┘ └─────────────┘ └─────────────┘
```

This is more complex and typically only for enterprise ($50k+/year) customers.

---

## Recommended Approach

### Phase 1: MVP (Now - 3 months)

- ✅ Single-tenant SaaS (all customers share infrastructure)
- ✅ ONE Google OAuth app for "DealPulse"
- ✅ Deploy to Render/Railway/DigitalOcean App Platform
- ✅ Secrets via platform environment variables
- ✅ Keep Google OAuth in "Testing" mode with <100 beta users

### Phase 2: Growth (3-12 months)

- ✅ Move to AWS/GCP
- ✅ Use AWS Secrets Manager / Google Secret Manager
- ✅ Get Google OAuth verified
- ✅ Scale workers horizontally
- ✅ Add database read replicas

### Phase 3: Enterprise (12+ months)

- ✅ Offer white-label for enterprise deals
- ✅ Multi-instance architecture
- ✅ Customer-specific OAuth apps
- ✅ SOC 2 compliance

---

## Summary

**For SaaS deployment:**

1. **You create** ONE Google OAuth app
2. **You deploy** those credentials to production (via secrets manager, not .env files)
3. **Customers** self-service connect their individual Google accounts
4. **Each customer** gets their own tokens stored in the database
5. **Multi-tenancy** is handled by RLS and deal_members table

**Customers never touch OAuth credentials - it's all automated!**

---

## Next Steps

1. Deploy to Render/Railway/Vercel for MVP
2. Set environment variables in platform dashboard
3. Test OAuth flow end-to-end
4. Add first 10 beta customers as Google OAuth test users
5. Iterate based on feedback
6. Plan Google verification (start 2 months before public launch)

The architecture you have **already supports multi-tenant SaaS** - you just need to deploy it properly!
