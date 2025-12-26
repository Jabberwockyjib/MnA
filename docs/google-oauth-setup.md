# Google OAuth Setup Guide

Complete guide to setting up Google OAuth integration for DealPulse.

## Prerequisites

1. Google Cloud Project with OAuth 2.0 credentials
2. Authorized redirect URI configured: `http://localhost:3000/api/oauth/google/callback`
3. Google Drive API and Gmail API enabled in your project

## Environment Variables

Add these to `.env.local`:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OAuth Token Encryption (REQUIRED)
TOKEN_ENCRYPTION_KEY=<64-character-hex-string>
```

### Generating TOKEN_ENCRYPTION_KEY

The encryption key must be exactly 64 hexadecimal characters (32 bytes). Generate it using:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as the `TOKEN_ENCRYPTION_KEY` value.

**⚠️ IMPORTANT**: Keep this key secret and never commit it to version control. If compromised, all stored OAuth tokens will need to be re-encrypted.

## Google Cloud Console Setup

Follow these steps to obtain OAuth credentials:

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click **Create Credentials** → **OAuth 2.0 Client ID**
4. Configure the OAuth consent screen if prompted:
   - User Type: External (or Internal if using Google Workspace)
   - App name: DealPulse
   - Scopes: Add `drive.readonly`, `gmail.readonly`
5. Set **Application type** to **Web application**
6. Add authorized redirect URI:
   - Development: `http://localhost:3000/api/oauth/google/callback`
   - Production: `https://yourdomain.com/api/oauth/google/callback`
7. Copy the **Client ID** and **Client Secret** to `.env.local`
8. Enable required APIs:
   - [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
   - [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)

## Database Setup

The OAuth integration requires two database migrations:

```bash
# Apply user OAuth connections table
docker exec -i mna-db psql -U postgres -d postgres < supabase/migrations/20250126000000_add_user_oauth_connections.sql

# Apply source connections modification
docker exec -i mna-db psql -U postgres -d postgres < supabase/migrations/20250126000001_modify_source_connections.sql
```

Verify migrations:

```bash
docker exec mna-db psql -U postgres -d postgres -c "\d user_oauth_connections"
docker exec mna-db psql -U postgres -d postgres -c "\d source_connections"
```

## Usage

### 1. Connect Google Account

1. Navigate to Settings (`/settings`)
2. Click "Connect Google Account"
3. Authorize Google Drive and Gmail access
4. You'll be redirected back to Settings showing "Connected as [email]"

### 2. Configure Deal Sources

1. Navigate to a deal's Settings page (`/deals/[deal-id]/settings`)
2. Go to the "Sources" tab
3. **For Google Drive:**
   - Click "Select Folder"
   - Browse and select a folder to monitor
   - Click "Confirm Selection"
4. **For Gmail:**
   - Click "Select Labels"
   - Check the labels to monitor
   - Click "Confirm Selection"

### 3. Disconnect Google Account

1. Navigate to Settings (`/settings`)
2. Click "Disconnect" in the Google Account card
3. Confirm the disconnection

**Note**: Disconnecting will stop monitoring for all deals. Source configurations will remain but become inactive.

## Security Notes

### Token Storage

- OAuth tokens are encrypted using AES-256-GCM before storage
- Encryption happens at the application layer using the `TOKEN_ENCRYPTION_KEY`
- Each token is encrypted with a unique IV (Initialization Vector)
- Database stores: `iv:authTag:encrypted` format

### Token Refresh

- Tokens are automatically refreshed when they expire
- 5-minute buffer prevents race conditions
- Refresh happens transparently during API calls
- New tokens are re-encrypted before storage

### Row Level Security

- `user_oauth_connections` table uses RLS
- Users can only access their own OAuth connections
- Policy: `auth.uid() = user_id`

### Best Practices

1. **Never commit** `.env.local` to version control
2. **Rotate encryption keys** periodically (requires token re-encryption)
3. **Use environment-specific** OAuth credentials for dev/staging/prod
4. **Monitor API quotas** in Google Cloud Console
5. **Review OAuth scopes** regularly - only request what you need

## Troubleshooting

### "Not authenticated" errors

- Verify user is logged in to DealPulse
- Check Supabase auth session is valid
- Ensure `createClient()` is called correctly

### "Google account not connected" errors

- User needs to connect Google account in Settings first
- Check `user_oauth_connections` table for active connection
- Verify `is_active = true` in database

### "Failed to refresh token" errors

- OAuth refresh token may be invalid or revoked
- User should disconnect and reconnect Google account
- Check Google Cloud Console for API errors

### Encryption errors

- Verify `TOKEN_ENCRYPTION_KEY` is exactly 64 hex characters
- Ensure key is set before starting the application
- Check that encrypted tokens use `iv:authTag:encrypted` format

### Database connection errors

- Verify Supabase environment variables are set
- Check Docker containers are running: `docker ps`
- Test database connection: `docker exec mna-db psql -U postgres -d postgres -c "SELECT 1"`

## API Endpoints

The following API endpoints are available:

### OAuth Flow
- `POST /api/oauth/google/init` - Get OAuth authorization URL
- `GET /api/oauth/google/callback` - Handle OAuth callback
- `POST /api/oauth/google/disconnect` - Disconnect Google account

### Google Drive
- `GET /api/google/drive/folders?parentId=<id>` - List folders

### Gmail
- `GET /api/google/gmail/labels` - List user labels

## Development Tips

1. **Use test Google account** for development
2. **Create test labels** in Gmail for testing
3. **Create test folders** in Drive for testing
4. **Check browser console** for client-side errors
5. **Check server logs** for API errors
6. **Inspect network tab** to debug OAuth flow

## Production Deployment

Before deploying to production:

1. ✅ Generate new `TOKEN_ENCRYPTION_KEY` for production
2. ✅ Create production OAuth credentials in Google Cloud Console
3. ✅ Update redirect URI to production domain
4. ✅ Set production environment variables
5. ✅ Apply database migrations to production database
6. ✅ Test OAuth flow end-to-end
7. ✅ Monitor API quota usage
8. ✅ Set up error tracking (Sentry, etc.)

## Support

For issues or questions:
- Check this documentation
- Review implementation plan: `docs/plans/2025-12-25-google-oauth-implementation.md`
- Check Next.js logs for errors
- Verify Google Cloud Console for API errors
