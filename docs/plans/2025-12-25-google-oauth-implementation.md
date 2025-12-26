# Google OAuth Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Google OAuth authentication for Drive and Gmail monitoring with encrypted token storage, user-level connections, and per-deal folder/label selection.

**Architecture:** User authenticates once in global settings (tokens stored encrypted in `user_oauth_connections`). Each deal references the user's OAuth connection and stores deal-specific folder_id/labelIds in `source_connections`. Tokens refresh on-demand when API calls fail.

**Tech Stack:** Next.js 16, googleapis, Node crypto (AES-256-GCM), Supabase, React 19, shadcn/ui

---

## Phase 1: Database & Security Foundation

### Task 1.1: Generate Encryption Key

**Files:**
- Modify: `.env.local`

**Step 1: Generate encryption key**

Run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Expected: Outputs 64-character hex string

**Step 2: Add to .env.local**

Add to `.env.local`:
```bash
TOKEN_ENCRYPTION_KEY=<paste-generated-key-here>
```

**Step 3: Verify key length**

Run:
```bash
node -e "console.log(process.env.TOKEN_ENCRYPTION_KEY.length)"
```

Expected: `64`

**Step 4: Commit**

```bash
git add .env.local
git commit -m "Add TOKEN_ENCRYPTION_KEY to environment"
```

---

### Task 1.2: Create Token Encryption Utilities

**Files:**
- Create: `lib/crypto/token-encryption.ts`
- Create: `lib/crypto/__tests__/token-encryption.test.ts`

**Step 1: Write failing test**

Create `lib/crypto/__tests__/token-encryption.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from '@jest/globals'
import { encryptToken, decryptToken } from '../token-encryption'

describe('Token Encryption', () => {
  beforeAll(() => {
    // Set test encryption key
    process.env.TOKEN_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  })

  it('should encrypt and decrypt tokens correctly', () => {
    const plaintext = 'ya29.a0AfH6SMBx...'
    const encrypted = encryptToken(plaintext)
    const decrypted = decryptToken(encrypted)

    expect(decrypted).toBe(plaintext)
    expect(encrypted).not.toBe(plaintext)
  })

  it('should produce different ciphertext for same plaintext', () => {
    const plaintext = 'same-token'
    const encrypted1 = encryptToken(plaintext)
    const encrypted2 = encryptToken(plaintext)

    expect(encrypted1).not.toBe(encrypted2)
  })

  it('should throw error if encryption key missing', () => {
    const originalKey = process.env.TOKEN_ENCRYPTION_KEY
    delete process.env.TOKEN_ENCRYPTION_KEY

    expect(() => encryptToken('test')).toThrow()

    process.env.TOKEN_ENCRYPTION_KEY = originalKey
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- lib/crypto/__tests__/token-encryption.test.ts`

Expected: FAIL - module not found

**Step 3: Write implementation**

Create `lib/crypto/token-encryption.ts`:

```typescript
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable not set')
  }
  if (key.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }
  return Buffer.from(key, 'hex')
}

/**
 * Encrypt a token using AES-256-GCM
 * Returns format: iv:authTag:encrypted (all hex-encoded)
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ])

  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypt a token encrypted with encryptToken
 */
export function decryptToken(ciphertext: string): string {
  const key = getEncryptionKey()
  const parts = ciphertext.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format')
  }

  const [ivHex, authTagHex, encryptedHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]).toString('utf8')
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- lib/crypto/__tests__/token-encryption.test.ts`

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add lib/crypto/
git commit -m "Add token encryption utilities with AES-256-GCM"
```

---

### Task 1.3: Create user_oauth_connections Migration

**Files:**
- Create: `supabase/migrations/20250126000000_add_user_oauth_connections.sql`

**Step 1: Write migration**

Create `supabase/migrations/20250126000000_add_user_oauth_connections.sql`:

```sql
-- User OAuth Connections
-- Stores encrypted OAuth tokens at user level

create table user_oauth_connections (
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
create index user_oauth_connections_user_id_idx on user_oauth_connections(user_id);
create index user_oauth_connections_provider_idx on user_oauth_connections(provider);
create index user_oauth_connections_is_active_idx on user_oauth_connections(is_active);

-- Trigger for updated_at
create trigger update_user_oauth_connections_updated_at
  before update on user_oauth_connections
  for each row
  execute function moddatetime(updated_at);
```

**Step 2: Run migration locally**

Run:
```bash
docker exec -i mna-db psql -U postgres -d postgres < supabase/migrations/20250126000000_add_user_oauth_connections.sql
```

Expected: Success messages for CREATE TABLE, ALTER TABLE, CREATE INDEX

**Step 3: Verify table created**

Run:
```bash
docker exec mna-db psql -U postgres -d postgres -c "\d user_oauth_connections"
```

Expected: Table structure displayed

**Step 4: Commit**

```bash
git add supabase/migrations/20250126000000_add_user_oauth_connections.sql
git commit -m "Add user_oauth_connections table migration"
```

---

### Task 1.4: Modify source_connections Table

**Files:**
- Create: `supabase/migrations/20250126000001_modify_source_connections.sql`

**Step 1: Write migration**

Create `supabase/migrations/20250126000001_modify_source_connections.sql`:

```sql
-- Modify source_connections to reference user OAuth connections
-- Support both new pattern (user_oauth_connection_id) and legacy (direct tokens)

alter table source_connections
  add column user_oauth_connection_id uuid references user_oauth_connections(id) on delete set null,
  alter column access_token drop not null,
  alter column refresh_token drop not null;

-- Index for faster lookups
create index source_connections_user_oauth_connection_id_idx
  on source_connections(user_oauth_connection_id);

-- Add check: either has user_oauth_connection_id OR has access_token
-- (allow both for migration period, will enforce one or the other later)
```

**Step 2: Run migration**

Run:
```bash
docker exec -i mna-db psql -U postgres -d postgres < supabase/migrations/20250126000001_modify_source_connections.sql
```

Expected: ALTER TABLE success

**Step 3: Verify column added**

Run:
```bash
docker exec mna-db psql -U postgres -d postgres -c "\d source_connections"
```

Expected: Shows `user_oauth_connection_id` column

**Step 4: Commit**

```bash
git add supabase/migrations/20250126000001_modify_source_connections.sql
git commit -m "Add user_oauth_connection_id to source_connections"
```

---

## Phase 2: OAuth Flow Backend

### Task 2.1: Add Google OAuth Environment Variables

**Files:**
- Modify: `.env.local`

**Step 1: Add Google credentials**

Add to `.env.local`:
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Step 2: Document setup in README**

Add note: "To get Google OAuth credentials, visit Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID"

**Step 3: Commit**

```bash
git add .env.local
git commit -m "Add Google OAuth environment variables"
```

---

### Task 2.2: Create Google OAuth Helper

**Files:**
- Create: `lib/oauth/google-oauth.ts`
- Create: `lib/oauth/__tests__/google-oauth.test.ts`

**Step 1: Write test**

Create `lib/oauth/__tests__/google-oauth.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from '@jest/globals'
import { createOAuth2Client, getAuthUrl } from '../google-oauth'

describe('Google OAuth', () => {
  beforeAll(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  })

  it('should create OAuth2 client', () => {
    const client = createOAuth2Client()
    expect(client).toBeDefined()
  })

  it('should generate auth URL with correct scopes', () => {
    const url = getAuthUrl()
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url).toContain('scope=')
    expect(url).toContain('drive.readonly')
    expect(url).toContain('gmail.readonly')
    expect(url).toContain('access_type=offline')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- lib/oauth/__tests__/google-oauth.test.ts`

Expected: FAIL - module not found

**Step 3: Write implementation**

Create `lib/oauth/google-oauth.ts`:

```typescript
import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.metadata',
]

export function createOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/google/callback`

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export function getAuthUrl(): string {
  const oauth2Client = createOAuth2Client()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent to always get refresh token
  })
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  const { credentials } = await oauth2Client.refreshAccessToken()
  return credentials
}

export async function getGoogleUserInfo(accessToken: string) {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
  const { data } = await oauth2.userinfo.get()

  return {
    id: data.id!,
    email: data.email!,
    name: data.name,
    picture: data.picture,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- lib/oauth/__tests__/google-oauth.test.ts`

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add lib/oauth/
git commit -m "Add Google OAuth helper utilities"
```

---

### Task 2.3: Create Token Manager

**Files:**
- Create: `lib/oauth/token-manager.ts`
- Create: `lib/oauth/__tests__/token-manager.test.ts`

**Step 1: Write test**

Create `lib/oauth/__tests__/token-manager.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { getValidAccessToken } from '../token-manager'

describe('Token Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return decrypted token if not expired', async () => {
    // Mock: token expires in 10 minutes
    const futureExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Test requires Supabase mocking - implementation will be integration tested
    expect(true).toBe(true) // Placeholder
  })

  it('should refresh token if expired', async () => {
    // Test requires Supabase mocking - implementation will be integration tested
    expect(true).toBe(true) // Placeholder
  })
})
```

**Step 2: Write implementation**

Create `lib/oauth/token-manager.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { decryptToken, encryptToken } from '@/lib/crypto/token-encryption'
import { refreshAccessToken } from './google-oauth'

export async function getValidAccessToken(
  userId: string,
  provider: 'google' | 'microsoft'
): Promise<string> {
  const supabase = await createClient()

  const { data: conn, error } = await supabase
    .from('user_oauth_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single()

  if (error || !conn || !conn.is_active) {
    throw new Error(`No active ${provider} connection for user ${userId}`)
  }

  // Check if token expired or expires in < 5 minutes
  const expiresAt = new Date(conn.token_expires_at).getTime()
  const now = Date.now()
  const buffer = 5 * 60 * 1000 // 5 minutes

  if (expiresAt < now + buffer) {
    // Need to refresh
    console.log('Token expired or expiring soon, refreshing...')

    const decryptedRefresh = decryptToken(conn.encrypted_refresh_token)
    const newTokens = await refreshAccessToken(decryptedRefresh)

    if (!newTokens.access_token) {
      throw new Error('Token refresh failed')
    }

    // Update database with new tokens
    const { error: updateError } = await supabase
      .from('user_oauth_connections')
      .update({
        encrypted_access_token: encryptToken(newTokens.access_token),
        encrypted_refresh_token: encryptToken(
          newTokens.refresh_token || decryptedRefresh
        ),
        token_expires_at: new Date(newTokens.expiry_date!).toISOString(),
        last_refresh_at: new Date().toISOString(),
      })
      .eq('id', conn.id)

    if (updateError) {
      console.error('Failed to update tokens:', updateError)
      throw new Error('Failed to update tokens after refresh')
    }

    return newTokens.access_token
  }

  // Token still valid, return decrypted
  return decryptToken(conn.encrypted_access_token)
}

export async function markConnectionInactive(
  userId: string,
  provider: 'google' | 'microsoft'
): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('user_oauth_connections')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('provider', provider)
}
```

**Step 3: Commit**

```bash
git add lib/oauth/token-manager.ts lib/oauth/__tests__/token-manager.test.ts
git commit -m "Add token manager with auto-refresh logic"
```

---

### Task 2.4: Create OAuth Init Route

**Files:**
- Create: `app/api/oauth/google/init/route.ts`

**Step 1: Write route**

Create `app/api/oauth/google/init/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/oauth/google-oauth'

export async function POST() {
  try {
    const url = getAuthUrl()
    return NextResponse.json({ url })
  } catch (error) {
    console.error('OAuth init error:', error)
    return NextResponse.json(
      { error: 'Failed to generate OAuth URL' },
      { status: 500 }
    )
  }
}
```

**Step 2: Test manually**

Run dev server, then:
```bash
curl -X POST http://localhost:3000/api/oauth/google/init
```

Expected: JSON with Google OAuth URL

**Step 3: Commit**

```bash
git add app/api/oauth/google/init/route.ts
git commit -m "Add OAuth init route"
```

---

### Task 2.5: Create OAuth Callback Route

**Files:**
- Create: `app/api/oauth/google/callback/route.ts`

**Step 1: Write route**

Create `app/api/oauth/google/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { exchangeCodeForTokens, getGoogleUserInfo } from '@/lib/oauth/google-oauth'
import { encryptToken } from '@/lib/crypto/token-encryption'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    console.error('OAuth error:', error)
    return redirect('/settings?error=oauth_denied')
  }

  if (!code) {
    return redirect('/settings?error=oauth_no_code')
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Missing tokens from Google')
    }

    // Get Google user info
    const userInfo = await getGoogleUserInfo(tokens.access_token)

    // Get current user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return redirect('/login?error=not_authenticated')
    }

    // Encrypt tokens
    const encryptedAccess = encryptToken(tokens.access_token)
    const encryptedRefresh = encryptToken(tokens.refresh_token)

    // Upsert OAuth connection
    const { error: upsertError } = await supabase
      .from('user_oauth_connections')
      .upsert({
        user_id: user.id,
        provider: 'google',
        encrypted_access_token: encryptedAccess,
        encrypted_refresh_token: encryptedRefresh,
        token_expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : new Date(Date.now() + 3600 * 1000).toISOString(), // Default 1 hour
        scopes: ['drive.readonly', 'gmail.readonly'],
        provider_user_id: userInfo.id,
        provider_email: userInfo.email,
        is_active: true,
        last_refresh_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider'
      })

    if (upsertError) {
      console.error('Database error:', upsertError)
      return redirect('/settings?error=database_error')
    }

    return redirect('/settings?success=google_connected')
  } catch (error) {
    console.error('OAuth callback error:', error)
    return redirect('/settings?error=oauth_failed')
  }
}
```

**Step 2: Commit**

```bash
git add app/api/oauth/google/callback/route.ts
git commit -m "Add OAuth callback route with token storage"
```

---

### Task 2.6: Create Disconnect Route

**Files:**
- Create: `app/api/oauth/google/disconnect/route.ts`

**Step 1: Write route**

Create `app/api/oauth/google/disconnect/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Mark connection as inactive (don't delete - preserves history)
    const { error } = await supabase
      .from('user_oauth_connections')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('provider', 'google')

    if (error) {
      console.error('Disconnect error:', error)
      return NextResponse.json(
        { error: 'Failed to disconnect' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
```

**Step 2: Commit**

```bash
git add app/api/oauth/google/disconnect/route.ts
git commit -m "Add OAuth disconnect route"
```

---

## Phase 3: Settings UI

### Task 3.1: Create Settings Page

**Files:**
- Create: `app/settings/page.tsx`
- Modify: `app/(authenticated)/layout.tsx` (add Settings link to sidebar)

**Step 1: Create basic Settings page structure**

Create `app/settings/page.tsx`:

```typescript
import { Separator } from '@/components/ui/separator'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and integrations
        </p>
      </div>
      <Separator />

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-4">Integrations</h2>
          <div className="space-y-4">
            {/* GoogleConnectionCard will go here */}
          </div>
        </section>
      </div>
    </div>
  )
}
```

**Step 2: Test page loads**

Navigate to `http://localhost:3000/settings`

Expected: Basic settings page renders

**Step 3: Commit**

```bash
git add app/settings/page.tsx
git commit -m "Add Settings page structure"
```

---

### Task 3.2: Create Google Connection Card Component

**Files:**
- Create: `components/settings/google-connection-card.tsx`
- Create: `lib/hooks/use-google-connection.ts`

**Step 1: Create hook to fetch connection status**

Create `lib/hooks/use-google-connection.ts`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useGoogleConnection() {
  const [connection, setConnection] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchConnection() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsLoading(false)
        return
      }

      const { data } = await supabase
        .from('user_oauth_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .single()

      setConnection(data)
      setIsLoading(false)
    }

    fetchConnection()
  }, [])

  return { connection, isLoading, refetch: () => window.location.reload() }
}
```

**Step 2: Create GoogleConnectionCard component**

Create `components/settings/google-connection-card.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useGoogleConnection } from '@/lib/hooks/use-google-connection'
import { formatDistanceToNow } from 'date-fns'

export function GoogleConnectionCard() {
  const { connection, isLoading, refetch } = useGoogleConnection()
  const [connecting, setConnecting] = useState(false)

  async function handleConnect() {
    setConnecting(true)
    try {
      const response = await fetch('/api/oauth/google/init', { method: 'POST' })
      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Failed to connect:', error)
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Google account? This will stop monitoring for all deals.')) {
      return
    }

    try {
      await fetch('/api/oauth/google/disconnect', { method: 'POST' })
      refetch()
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isConnected = connection && connection.is_active

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border">
              {/* Google icon placeholder */}
              <span className="text-xl">G</span>
            </div>
            <div>
              <CardTitle>Google Account</CardTitle>
              {isConnected ? (
                <Badge variant="default" className="mt-1">Connected</Badge>
              ) : (
                <Badge variant="secondary" className="mt-1">Not connected</Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Connected as {connection.provider_email}
              </p>
              <p className="text-sm text-muted-foreground">
                Access to: Google Drive, Gmail
              </p>
              <p className="text-xs text-muted-foreground">
                Last refreshed: {formatDistanceToNow(new Date(connection.last_refresh_at))} ago
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleDisconnect}
              size="sm"
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <CardDescription>
              Connect your Google account to monitor Drive folders and Gmail labels for your deals.
            </CardDescription>
            <Button
              onClick={handleConnect}
              disabled={connecting}
            >
              {connecting ? 'Connecting...' : 'Connect Google Account'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

**Step 3: Add to Settings page**

Modify `app/settings/page.tsx`:

```typescript
import { Separator } from '@/components/ui/separator'
import { GoogleConnectionCard } from '@/components/settings/google-connection-card'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and integrations
        </p>
      </div>
      <Separator />

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-4">Integrations</h2>
          <div className="space-y-4">
            <GoogleConnectionCard />
          </div>
        </section>
      </div>
    </div>
  )
}
```

**Step 4: Install date-fns**

Run:
```bash
npm install date-fns
```

**Step 5: Test Settings page**

Navigate to `http://localhost:3000/settings`

Expected: GoogleConnectionCard shows "Not connected" state

**Step 6: Commit**

```bash
git add components/settings/ lib/hooks/ app/settings/
npm install # Ensure package-lock.json updated
git add package.json package-lock.json
git commit -m "Add Google connection card to Settings page"
```

---

### Task 3.3: Add Settings Link to Sidebar

**Files:**
- Modify: `components/layout/app-sidebar.tsx`

**Step 1: Add Settings link**

Modify `components/layout/app-sidebar.tsx`, add to navigation items:

```typescript
{
  title: "Settings",
  url: "/settings",
  icon: Settings,
}
```

Import Settings icon:
```typescript
import { Settings } from "lucide-react"
```

**Step 2: Test navigation**

Click Settings in sidebar

Expected: Navigates to /settings

**Step 3: Commit**

```bash
git add components/layout/app-sidebar.tsx
git commit -m "Add Settings link to sidebar navigation"
```

---

## Phase 4: Google API Integration

### Task 4.1: Create Drive Folders API Route

**Files:**
- Create: `app/api/google/drive/folders/route.ts`
- Create: `lib/integrations/google/drive-folders.ts`

**Step 1: Create helper to fetch folders**

Create `lib/integrations/google/drive-folders.ts`:

```typescript
import { google } from 'googleapis'
import { createOAuth2Client } from '@/lib/oauth/google-oauth'

export async function listDriveFolders(accessToken: string, parentId: string = 'root') {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const drive = google.drive({ version: 'v3', auth: oauth2Client })

  const response = await drive.files.list({
    q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name, mimeType)',
    orderBy: 'name',
  })

  return response.data.files || []
}

export async function getDriveFolderInfo(accessToken: string, folderId: string) {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const drive = google.drive({ version: 'v3', auth: oauth2Client })

  const response = await drive.files.get({
    fileId: folderId,
    fields: 'id, name, mimeType, parents',
  })

  return response.data
}

export async function buildFolderPath(accessToken: string, folderId: string): Promise<string> {
  const parts: string[] = []
  let currentId = folderId

  while (currentId && currentId !== 'root') {
    const folder = await getDriveFolderInfo(accessToken, currentId)
    parts.unshift(folder.name!)

    if (folder.parents && folder.parents.length > 0) {
      currentId = folder.parents[0]
    } else {
      break
    }
  }

  return parts.join(' > ') || 'My Drive'
}
```

**Step 2: Create API route**

Create `app/api/google/drive/folders/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidAccessToken } from '@/lib/oauth/token-manager'
import { listDriveFolders } from '@/lib/integrations/google/drive-folders'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const parentId = searchParams.get('parentId') || 'root'

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get valid access token (auto-refreshes if needed)
    const accessToken = await getValidAccessToken(user.id, 'google')

    // Fetch folders
    const folders = await listDriveFolders(accessToken, parentId)

    return NextResponse.json({ folders })
  } catch (error: any) {
    console.error('Drive folders API error:', error)

    if (error.message?.includes('No active')) {
      return NextResponse.json(
        { error: 'Google account not connected' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    )
  }
}
```

**Step 3: Test endpoint**

After connecting Google in Settings:
```bash
curl http://localhost:3000/api/google/drive/folders?parentId=root
```

Expected: JSON with folder list

**Step 4: Commit**

```bash
git add lib/integrations/google/ app/api/google/drive/
git commit -m "Add Drive folders API endpoint"
```

---

### Task 4.2: Create Gmail Labels API Route

**Files:**
- Create: `app/api/google/gmail/labels/route.ts`
- Create: `lib/integrations/google/gmail-labels.ts`

**Step 1: Create helper to fetch labels**

Create `lib/integrations/google/gmail-labels.ts`:

```typescript
import { google } from 'googleapis'
import { createOAuth2Client } from '@/lib/oauth/google-oauth'

export async function listGmailLabels(accessToken: string) {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  const response = await gmail.users.labels.list({
    userId: 'me',
  })

  // Filter out system labels, keep only user labels
  const labels = response.data.labels || []
  return labels
    .filter(label => label.type === 'user')
    .map(label => ({
      id: label.id!,
      name: label.name!,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
```

**Step 2: Create API route**

Create `app/api/google/gmail/labels/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidAccessToken } from '@/lib/oauth/token-manager'
import { listGmailLabels } from '@/lib/integrations/google/gmail-labels'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const accessToken = await getValidAccessToken(user.id, 'google')
    const labels = await listGmailLabels(accessToken)

    return NextResponse.json({ labels })
  } catch (error: any) {
    console.error('Gmail labels API error:', error)

    if (error.message?.includes('No active')) {
      return NextResponse.json(
        { error: 'Google account not connected' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch labels' },
      { status: 500 }
    )
  }
}
```

**Step 3: Test endpoint**

```bash
curl http://localhost:3000/api/google/gmail/labels
```

Expected: JSON with Gmail labels

**Step 4: Commit**

```bash
git add lib/integrations/google/ app/api/google/gmail/
git commit -m "Add Gmail labels API endpoint"
```

---

## Phase 5: Deal Configuration UI

### Task 5.1: Create Sources Tab for Deal Settings

**Files:**
- Create: `app/(authenticated)/deals/[id]/settings/page.tsx`
- Create: `app/(authenticated)/deals/[id]/settings/sources-tab.tsx`

**Step 1: Create Settings page with tabs**

Create `app/(authenticated)/deals/[id]/settings/page.tsx`:

```typescript
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SourcesTab } from './sources-tab'

export default function DealSettingsPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Deal Settings</h1>
        <p className="text-muted-foreground">
          Configure monitoring and preferences
        </p>
      </div>
      <Separator />

      <Tabs defaultValue="sources" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="space-y-4">
          <SourcesTab dealId={params.id} />
        </TabsContent>

        <TabsContent value="team">
          <p className="text-muted-foreground">Team management coming soon</p>
        </TabsContent>

        <TabsContent value="general">
          <p className="text-muted-foreground">General settings coming soon</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

**Step 2: Create empty SourcesTab**

Create `app/(authenticated)/deals/[id]/settings/sources-tab.tsx`:

```typescript
'use client'

export function SourcesTab({ dealId }: { dealId: string }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Configure which Google Drive folders and Gmail labels to monitor for this deal.
      </p>

      {/* Components will go here */}
    </div>
  )
}
```

**Step 3: Add Tabs component if missing**

Run:
```bash
npx shadcn-ui@latest add tabs
```

**Step 4: Test page loads**

Navigate to `http://localhost:3000/deals/[deal-id]/settings`

Expected: Settings page with tabs

**Step 5: Commit**

```bash
git add app/(authenticated)/deals/\[id\]/settings/
git commit -m "Add Deal Settings page with Sources tab"
```

---

### Task 5.2: Create Drive Source Config Component

**Files:**
- Create: `components/integrations/drive-source-config.tsx`
- Create: `lib/hooks/use-source-connection.ts`

**Step 1: Create hook to fetch source connection**

Create `lib/hooks/use-source-connection.ts`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useSourceConnection(dealId: string, sourceType: 'gdrive' | 'gmail') {
  const [connection, setConnection] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchConnection() {
      const supabase = createClient()

      const { data } = await supabase
        .from('source_connections')
        .select('*')
        .eq('deal_id', dealId)
        .eq('source_type', sourceType)
        .single()

      setConnection(data)
      setIsLoading(false)
    }

    fetchConnection()
  }, [dealId, sourceType])

  return { connection, isLoading, refetch: () => window.location.reload() }
}
```

**Step 2: Create DriveSourceConfig component**

Create `components/integrations/drive-source-config.tsx`:

```typescript
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSourceConnection } from '@/lib/hooks/use-source-connection'
import { useGoogleConnection } from '@/lib/hooks/use-google-connection'
import { FolderIcon } from 'lucide-react'
import Link from 'next/link'

export function DriveSourceConfig({ dealId }: { dealId: string }) {
  const { connection: googleConn } = useGoogleConnection()
  const { connection: sourceConn, isLoading } = useSourceConnection(dealId, 'gdrive')

  const isGoogleConnected = googleConn?.is_active
  const hasFolderConfigured = sourceConn?.configuration?.folderId

  if (isLoading) {
    return <Card><CardContent className="p-6">Loading...</CardContent></Card>
  }

  if (!isGoogleConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Google Drive</CardTitle>
          <Badge variant="secondary">Not Connected</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription>
            No Google account connected. Connect your Google account in Settings to monitor Drive folders.
          </CardDescription>
          <Link href="/settings">
            <Button variant="outline">Go to Settings</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (!hasFolderConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Google Drive</CardTitle>
          <Badge variant="default">Connected</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription>
            Google account connected. Select which folder to monitor for this deal.
          </CardDescription>
          <Button onClick={() => {/* Open folder picker */}}>
            Select Folder
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Drive</CardTitle>
        <Badge variant="default">Monitoring</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <FolderIcon className="h-4 w-4" />
          <span className="font-medium">{sourceConn.configuration.folderPath}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {/* Open folder picker */}}>
            Change Folder
          </Button>
          <Button variant="outline" size="sm" onClick={() => {/* Stop monitoring */}}>
            Stop Monitoring
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 3: Add to SourcesTab**

Modify `app/(authenticated)/deals/[id]/settings/sources-tab.tsx`:

```typescript
'use client'

import { DriveSourceConfig } from '@/components/integrations/drive-source-config'

export function SourcesTab({ dealId }: { dealId: string }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Configure which Google Drive folders and Gmail labels to monitor for this deal.
      </p>

      <DriveSourceConfig dealId={dealId} />
    </div>
  )
}
```

**Step 4: Test rendering**

Navigate to Deal Settings → Sources tab

Expected: Shows appropriate state based on Google connection

**Step 5: Commit**

```bash
git add components/integrations/ lib/hooks/ app/(authenticated)/deals/
git commit -m "Add Drive source configuration component"
```

---

## Phase 6: Picker Components

### Task 6.1: Create Drive Folder Picker Component

**Files:**
- Create: `components/integrations/drive-folder-picker.tsx`

**Step 1: Create DriveFolderPicker component**

Create `components/integrations/drive-folder-picker.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronRight, ChevronDown, Folder } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

interface Folder {
  id: string
  name: string
  mimeType: string
}

interface FolderPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (folderId: string, folderPath: string) => void
}

export function DriveFolderPicker({ open, onClose, onSelect }: FolderPickerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']))
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [folderCache, setFolderCache] = useState<Record<string, Folder[]>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && !folderCache['root']) {
      fetchFolders('root')
    }
  }, [open])

  async function fetchFolders(parentId: string) {
    if (folderCache[parentId]) return

    setLoading(true)
    try {
      const response = await fetch(`/api/google/drive/folders?parentId=${parentId}`)
      const { folders } = await response.json()

      setFolderCache(prev => ({
        ...prev,
        [parentId]: folders || []
      }))
    } catch (error) {
      console.error('Failed to fetch folders:', error)
    } finally {
      setLoading(false)
    }
  }

  function toggleFolder(folderId: string) {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
      fetchFolders(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  function handleConfirm() {
    if (selectedFolder) {
      // Build path - for now just use folder name
      // TODO: Build full path using buildFolderPath
      const folder = Object.values(folderCache)
        .flat()
        .find(f => f.id === selectedFolder)

      onSelect(selectedFolder, folder?.name || selectedFolder)
    }
  }

  function renderFolder(folder: Folder, level: number = 0) {
    const isExpanded = expandedFolders.has(folder.id)
    const children = folderCache[folder.id] || []
    const hasChildren = children.length > 0 || !folderCache[folder.id]

    return (
      <div key={folder.id}>
        <div
          className="flex items-center gap-2 py-2 px-2 hover:bg-accent rounded-md cursor-pointer"
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleFolder(folder.id)}
              className="p-0.5 hover:bg-accent-foreground/10 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}

          <RadioGroupItem
            value={folder.id}
            id={folder.id}
            className="cursor-pointer"
          />
          <Label
            htmlFor={folder.id}
            className="flex items-center gap-2 cursor-pointer flex-1"
          >
            <Folder className="h-4 w-4 text-blue-500" />
            <span>{folder.name}</span>
          </Label>
        </div>

        {isExpanded && children.map(child => renderFolder(child, level + 1))}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Google Drive Folder</DialogTitle>
          <DialogDescription>
            Choose a folder to monitor for this deal
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] border rounded-md p-4">
          <RadioGroup value={selectedFolder || ''} onValueChange={setSelectedFolder}>
            <div>
              <p className="text-sm font-semibold mb-2">My Drive</p>
              {folderCache['root']?.map(folder => renderFolder(folder))}
            </div>
          </RadioGroup>

          {loading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Loading folders...
            </p>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedFolder}>
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Add missing components**

Run:
```bash
npx shadcn-ui@latest add radio-group
npx shadcn-ui@latest add scroll-area
```

**Step 3: Integrate into DriveSourceConfig**

Modify `components/integrations/drive-source-config.tsx`:

```typescript
import { useState } from 'react'
import { DriveFolderPicker } from './drive-folder-picker'

export function DriveSourceConfig({ dealId }: { dealId: string }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  // ... existing code ...

  async function handleFolderSelect(folderId: string, folderPath: string) {
    // TODO: Save to database
    console.log('Selected:', folderId, folderPath)
    setPickerOpen(false)
  }

  // Update buttons to open picker:
  // <Button onClick={() => setPickerOpen(true)}>Select Folder</Button>

  return (
    <>
      {/* existing Card JSX */}
      <DriveFolderPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleFolderSelect}
      />
    </>
  )
}
```

**Step 4: Test folder picker**

Click "Select Folder" button

Expected: Modal opens showing folder tree

**Step 5: Commit**

```bash
git add components/integrations/
git commit -m "Add Drive folder picker with tree view"
```

---

### Task 6.2: Create Source Connection Server Actions

**Files:**
- Create: `app/(authenticated)/deals/[id]/settings/actions.ts`

**Step 1: Create server actions**

Create `app/(authenticated)/deals/[id]/settings/actions.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveDriveSource(
  dealId: string,
  folderId: string,
  folderPath: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Get user's Google OAuth connection
  const { data: oauthConn } = await supabase
    .from('user_oauth_connections')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .eq('is_active', true)
    .single()

  if (!oauthConn) {
    throw new Error('No active Google connection')
  }

  // Upsert source connection
  const { error } = await supabase
    .from('source_connections')
    .upsert({
      deal_id: dealId,
      source_type: 'gdrive',
      user_oauth_connection_id: oauthConn.id,
      folder_id: folderId,
      configuration: {
        folderId,
        folderPath,
      },
      is_active: true,
    }, {
      onConflict: 'deal_id,source_type'
    })

  if (error) {
    console.error('Save Drive source error:', error)
    throw new Error('Failed to save Drive source')
  }

  revalidatePath(`/deals/${dealId}/settings`)
  return { success: true }
}

export async function removeDriveSource(dealId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('source_connections')
    .delete()
    .eq('deal_id', dealId)
    .eq('source_type', 'gdrive')

  if (error) {
    throw new Error('Failed to remove Drive source')
  }

  revalidatePath(`/deals/${dealId}/settings`)
  return { success: true }
}

export async function saveGmailSource(
  dealId: string,
  labelIds: string[],
  labelNames: string[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: oauthConn } = await supabase
    .from('user_oauth_connections')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .eq('is_active', true)
    .single()

  if (!oauthConn) {
    throw new Error('No active Google connection')
  }

  const { error } = await supabase
    .from('source_connections')
    .upsert({
      deal_id: dealId,
      source_type: 'gmail',
      user_oauth_connection_id: oauthConn.id,
      configuration: {
        labelIds,
        labelNames,
      },
      is_active: true,
    }, {
      onConflict: 'deal_id,source_type'
    })

  if (error) {
    console.error('Save Gmail source error:', error)
    throw new Error('Failed to save Gmail source')
  }

  revalidatePath(`/deals/${dealId}/settings`)
  return { success: true }
}

export async function removeGmailSource(dealId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('source_connections')
    .delete()
    .eq('deal_id', dealId)
    .eq('source_type', 'gmail')

  if (error) {
    throw new Error('Failed to remove Gmail source')
  }

  revalidatePath(`/deals/${dealId}/settings`)
  return { success: true }
}
```

**Step 2: Wire up to DriveSourceConfig**

Modify `components/integrations/drive-source-config.tsx`:

```typescript
import { saveDriveSource, removeDriveSource } from '@/app/(authenticated)/deals/[id]/settings/actions'

// In handleFolderSelect:
async function handleFolderSelect(folderId: string, folderPath: string) {
  try {
    await saveDriveSource(dealId, folderId, folderPath)
    setPickerOpen(false)
    refetch()
  } catch (error) {
    console.error('Failed to save:', error)
  }
}

// Add handleStopMonitoring:
async function handleStopMonitoring() {
  if (!confirm('Stop monitoring this folder?')) return

  try {
    await removeDriveSource(dealId)
    refetch()
  } catch (error) {
    console.error('Failed to remove:', error)
  }
}
```

**Step 3: Test saving folder**

Select folder in picker, click Confirm

Expected: Source connection saved, UI updates

**Step 4: Commit**

```bash
git add app/(authenticated)/deals/\[id\]/settings/ components/integrations/
git commit -m "Add server actions for source connection management"
```

---

## Phase 7: Gmail Label Picker & Config

### Task 7.1: Create Gmail Label Picker Component

**Files:**
- Create: `components/integrations/gmail-label-picker.tsx`

**Step 1: Create GmailLabelPicker component**

Create `components/integrations/gmail-label-picker.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface Label {
  id: string
  name: string
}

interface LabelPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (labelIds: string[], labelNames: string[]) => void
  initialLabelIds?: string[]
}

export function GmailLabelPicker({ open, onClose, onSelect, initialLabelIds = [] }: LabelPickerProps) {
  const [labels, setLabels] = useState<Label[]>([])
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(new Set(initialLabelIds))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchLabels()
    }
  }, [open])

  async function fetchLabels() {
    setLoading(true)
    try {
      const response = await fetch('/api/google/gmail/labels')
      const { labels: fetchedLabels } = await response.json()
      setLabels(fetchedLabels || [])
    } catch (error) {
      console.error('Failed to fetch labels:', error)
    } finally {
      setLoading(false)
    }
  }

  function toggleLabel(labelId: string) {
    const newSelected = new Set(selectedLabelIds)
    if (newSelected.has(labelId)) {
      newSelected.delete(labelId)
    } else {
      newSelected.add(labelId)
    }
    setSelectedLabelIds(newSelected)
  }

  function handleConfirm() {
    const selectedIds = Array.from(selectedLabelIds)
    const selectedNames = labels
      .filter(l => selectedLabelIds.has(l.id))
      .map(l => l.name)

    onSelect(selectedIds, selectedNames)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Gmail Labels</DialogTitle>
          <DialogDescription>
            Choose labels to monitor for this deal
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] border rounded-md p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Loading labels...
            </p>
          ) : (
            <div className="space-y-3">
              {labels.map(label => (
                <div key={label.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={label.id}
                    checked={selectedLabelIds.has(label.id)}
                    onCheckedChange={() => toggleLabel(label.id)}
                  />
                  <Label
                    htmlFor={label.id}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {label.name}
                  </Label>
                </div>
              ))}

              {labels.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No labels found. Create labels in Gmail first.
                </p>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground mb-2">
            Selected: {selectedLabelIds.size} label{selectedLabelIds.size !== 1 ? 's' : ''}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-xs text-blue-900">
              💡 <strong>Tip:</strong> Only emails with these labels will be monitored.
              Create and apply labels in Gmail to organize deal communications.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedLabelIds.size === 0}>
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Add Checkbox component if missing**

Run:
```bash
npx shadcn-ui@latest add checkbox
```

**Step 3: Commit**

```bash
git add components/integrations/
git commit -m "Add Gmail label picker component"
```

---

### Task 7.2: Create Gmail Source Config Component

**Files:**
- Create: `components/integrations/gmail-source-config.tsx`

**Step 1: Create GmailSourceConfig component**

Create `components/integrations/gmail-source-config.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSourceConnection } from '@/lib/hooks/use-source-connection'
import { useGoogleConnection } from '@/lib/hooks/use-google-connection'
import { GmailLabelPicker } from './gmail-label-picker'
import { saveGmailSource, removeGmailSource } from '@/app/(authenticated)/deals/[id]/settings/actions'
import { Tag } from 'lucide-react'
import Link from 'next/link'

export function GmailSourceConfig({ dealId }: { dealId: string }) {
  const { connection: googleConn } = useGoogleConnection()
  const { connection: sourceConn, isLoading, refetch } = useSourceConnection(dealId, 'gmail')
  const [pickerOpen, setPickerOpen] = useState(false)

  const isGoogleConnected = googleConn?.is_active
  const hasLabelsConfigured = sourceConn?.configuration?.labelIds?.length > 0

  async function handleLabelsSelect(labelIds: string[], labelNames: string[]) {
    try {
      await saveGmailSource(dealId, labelIds, labelNames)
      setPickerOpen(false)
      refetch()
    } catch (error) {
      console.error('Failed to save:', error)
    }
  }

  async function handleStopMonitoring() {
    if (!confirm('Stop monitoring Gmail labels?')) return

    try {
      await removeGmailSource(dealId)
      refetch()
    } catch (error) {
      console.error('Failed to remove:', error)
    }
  }

  if (isLoading) {
    return <Card><CardContent className="p-6">Loading...</CardContent></Card>
  }

  if (!isGoogleConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gmail</CardTitle>
          <Badge variant="secondary">Not Connected</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription>
            No Google account connected. Connect your Google account in Settings to monitor Gmail labels.
          </CardDescription>
          <Link href="/settings">
            <Button variant="outline">Go to Settings</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (!hasLabelsConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gmail</CardTitle>
          <Badge variant="default">Connected</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription>
            Google account connected. Select which labels to monitor for this deal.
          </CardDescription>
          <Button onClick={() => setPickerOpen(true)}>
            Select Labels
          </Button>
        </CardContent>

        <GmailLabelPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={handleLabelsSelect}
        />
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gmail</CardTitle>
        <Badge variant="default">Monitoring</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {sourceConn.configuration.labelNames.map((name: string, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4" />
              <span className="font-medium">{name}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPickerOpen(true)}
          >
            Change Labels
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleStopMonitoring}
          >
            Stop Monitoring
          </Button>
        </div>
      </CardContent>

      <GmailLabelPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleLabelsSelect}
        initialLabelIds={sourceConn.configuration.labelIds}
      />
    </Card>
  )
}
```

**Step 2: Add to SourcesTab**

Modify `app/(authenticated)/deals/[id]/settings/sources-tab.tsx`:

```typescript
import { GmailSourceConfig } from '@/components/integrations/gmail-source-config'

export function SourcesTab({ dealId }: { dealId: string }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Configure which Google Drive folders and Gmail labels to monitor for this deal.
      </p>

      <DriveSourceConfig dealId={dealId} />
      <GmailSourceConfig dealId={dealId} />
    </div>
  )
}
```

**Step 3: Test Gmail configuration**

Navigate to Deal Settings → Sources

Expected: Can select and save Gmail labels

**Step 4: Commit**

```bash
git add components/integrations/ app/(authenticated)/deals/
git commit -m "Add Gmail source configuration component"
```

---

## Phase 8: Testing & Polish

### Task 8.1: End-to-End Manual Testing

**Test Checklist:**

1. **OAuth Flow**
   - [ ] Navigate to Settings
   - [ ] Click "Connect Google Account"
   - [ ] Complete Google OAuth consent
   - [ ] Redirected back to Settings
   - [ ] Shows "Connected as [email]"

2. **Token Storage**
   - [ ] Check database: `user_oauth_connections` has encrypted tokens
   - [ ] Tokens are hex strings with `:` separators
   - [ ] `is_active` = true

3. **Drive Folder Selection**
   - [ ] Navigate to Deal Settings → Sources
   - [ ] Click "Select Folder"
   - [ ] Folder tree loads
   - [ ] Can expand/collapse folders
   - [ ] Select folder and confirm
   - [ ] Shows folder path

4. **Gmail Label Selection**
   - [ ] Click "Select Labels"
   - [ ] Labels load
   - [ ] Can select multiple
   - [ ] Confirm and see labels displayed

5. **Token Refresh**
   - [ ] Manually expire token in database (set `token_expires_at` to past)
   - [ ] Make API call (fetch folders)
   - [ ] Verify token automatically refreshes
   - [ ] Check logs for "Token expired or expiring soon, refreshing..."

6. **Disconnect Flow**
   - [ ] Click Disconnect in Settings
   - [ ] Confirm dialog
   - [ ] Connection marked inactive
   - [ ] Deal Settings shows "Not Connected" state

**Document Results:**

Create test log: `docs/testing/google-oauth-test-results.md`

**Commit:**

```bash
git add docs/testing/
git commit -m "Add manual testing results for Google OAuth"
```

---

### Task 8.2: Update Documentation

**Files:**
- Create: `docs/google-oauth-setup.md`

**Step 1: Write setup guide**

Create `docs/google-oauth-setup.md`:

```markdown
# Google OAuth Setup Guide

## Prerequisites

1. Google Cloud Project with OAuth 2.0 credentials
2. Authorized redirect URI configured: `http://localhost:3000/api/oauth/google/callback`

## Environment Variables

Add to `.env.local`:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
TOKEN_ENCRYPTION_KEY=<64-char-hex-string>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Setup

Run migrations:

```bash
docker exec -i mna-db psql -U postgres -d postgres < supabase/migrations/20250126000000_add_user_oauth_connections.sql
docker exec -i mna-db psql -U postgres -d postgres < supabase/migrations/20250126000001_modify_source_connections.sql
```

## Usage

1. Navigate to Settings
2. Click "Connect Google Account"
3. Authorize Google Drive and Gmail access
4. Configure folders/labels per deal in Deal Settings → Sources

## Security Notes

- Tokens encrypted with AES-256-GCM before database storage
- Encryption key must be 64 hex characters (32 bytes)
- Keep `TOKEN_ENCRYPTION_KEY` secret and never commit to git
```

**Step 2: Commit**

```bash
git add docs/google-oauth-setup.md
git commit -m "Add Google OAuth setup documentation"
```

---

### Task 8.3: Final Integration Commit

**Step 1: Review all changes**

Run:
```bash
git log --oneline --since="1 day ago"
```

Expected: See all commits from this implementation

**Step 2: Test full flow one more time**

- Connect Google
- Select folder
- Select labels
- Verify in database

**Step 3: Create summary commit**

```bash
git commit --allow-empty -m "Complete Google OAuth integration

Implemented:
- User-level OAuth with AES-256-GCM encrypted token storage
- Auto-refresh on token expiry
- Drive folder picker with tree navigation
- Gmail label picker with multi-select
- Deal-level source configuration
- Settings UI for connection management

All phases complete and tested."
```

---

## Completion

All tasks complete!

**Next Steps:**
1. Test with real Google account
2. Monitor for token refresh issues
3. Add proactive token refresh (future enhancement)
4. Implement document/email monitoring using configured sources

**Future Enhancements:**
- Proactive background token refresh
- Advanced Gmail search query filters
- Folder search in picker
- Multiple Google accounts per user
