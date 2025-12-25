# Google OAuth Integration Design

**Date:** 2025-12-25
**Status:** Approved
**Author:** Claude (with user validation)

## Overview

This design implements Google OAuth authentication to enable monitoring of Google Drive folders and Gmail labels for M&A deal intelligence. Users authenticate once at the account level, then configure per-deal folder/label selections.

## Design Decisions

### Scope Strategy
**Decision:** Unified Google connection requesting both Drive and Gmail scopes in a single OAuth flow.

**Rationale:** Better UX - user authorizes Google once rather than going through separate flows for Drive and Gmail.

### Connection Architecture
**Decision:** User-level OAuth tokens + deal-level folder/label configuration.

**Rationale:**
- User authenticates once, tokens shared across all their deals
- Each deal selects its own folder/label to monitor
- Scales better than duplicating tokens per deal

### Folder/Label Selection Timing
**Decision:** Just-in-time selection - OAuth in global settings, folder/label selection during deal configuration.

**Rationale:**
- Keeps OAuth flow simple (no folder browsing during auth)
- Makes deal → folder/label relationship explicit
- Only configure what you actually use

### Token Refresh Strategy (MVP)
**Decision:** On-demand refresh when API calls fail with expired token errors.

**Rationale:** Simpler for MVP, avoids background job complexity.

**Future Improvement:** Add proactive background refresh for active deals to prevent monitoring failures.

### Token Security
**Decision:** Application-level encryption using AES-256-GCM before storing in database.

**Rationale:** Even if database is compromised, encrypted tokens remain protected.

### Error Handling
**Decision:** Silent degradation with notifications - don't block user access when connection fails.

**Rationale:** User can still view existing deal data while fixing connection issues.

### UI Components
**Decision:**
- Drive: Folder tree picker (not URL paste)
- Gmail: Label checkbox list (not search query)

**Rationale:** Executive audience needs polished, non-technical UI. URL pasting or search syntax would be too technical.

**Future Enhancement:** Add search query option (Option B/C) as advanced feature if requested.

---

## Architecture

### Database Schema

#### New Table: `user_oauth_connections`

Stores OAuth tokens at the user level, shared across all deals.

```sql
create table user_oauth_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null check (provider in ('google', 'microsoft')),
  encrypted_access_token text not null,
  encrypted_refresh_token text not null,
  token_expires_at timestamp with time zone,
  scopes text[] not null, -- ['drive.readonly', 'gmail.readonly']
  provider_user_id text, -- Google user ID for verification
  provider_email text, -- Which Google account was connected
  is_active boolean default true,
  last_refresh_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, provider)
);

-- RLS policies
alter table user_oauth_connections enable row level security;

create policy "Users can manage their own OAuth connections"
  on user_oauth_connections for all
  using (auth.uid() = user_id);

-- Indexes
create index user_oauth_connections_user_id_idx on user_oauth_connections(user_id);
create index user_oauth_connections_provider_idx on user_oauth_connections(provider);
```

#### Modified Table: `source_connections`

Add reference to user OAuth connection, make tokens nullable (legacy support).

```sql
-- Migration: Add new column
alter table source_connections
  add column user_oauth_connection_id uuid references user_oauth_connections(id),
  alter column access_token drop not null,
  alter column refresh_token drop not null;

-- New connections use user_oauth_connection_id
-- Legacy connections (if any) still have tokens directly
-- Configuration JSONB stores:
--   - Drive: { folderId, folderPath }
--   - Gmail: { labelIds: ['Label_123'], labelNames: ['Deal/Apollo'] }
```

### Token Encryption

**Algorithm:** AES-256-GCM
**Key Storage:** Environment variable `TOKEN_ENCRYPTION_KEY` (32-byte hex string)
**Format:** `iv:authTag:encrypted` (all hex-encoded)

```typescript
// lib/crypto/token-encryption.ts
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = process.env.TOKEN_ENCRYPTION_KEY! // 32-byte hex

export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(KEY, 'hex'),
    iv
  )
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ])
  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptToken(ciphertext: string): string {
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':')
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(KEY, 'hex'),
    Buffer.from(ivHex, 'hex')
  )
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final()
  ]).toString('utf8')
}
```

**Key Generation:**
```bash
# Generate encryption key (run once, store in .env)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## OAuth Flow

### Step 1: User Initiates Connection

**Location:** Settings → Integrations → "Connect Google Account" button

**Frontend:**
```typescript
// app/settings/page.tsx
async function handleConnectGoogle() {
  // POST to generate OAuth URL
  const response = await fetch('/api/oauth/google/init', { method: 'POST' })
  const { url } = await response.json()

  // Redirect to Google
  window.location.href = url
}
```

**Backend:**
```typescript
// app/api/oauth/google/init/route.ts
export async function POST(request: Request) {
  const oauth2Client = createOAuth2Client()

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Force consent to get refresh token
    scope: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.metadata',
    ],
  })

  return Response.json({ url })
}
```

### Step 2: Google Callback

**Route:** `GET /api/oauth/google/callback?code=...`

**Flow:**
1. Receive authorization code from Google
2. Exchange code for access_token and refresh_token
3. Encrypt both tokens
4. Get Google user info (email, user ID)
5. Upsert into `user_oauth_connections`
6. Redirect to Settings with success message

```typescript
// app/api/oauth/google/callback/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return redirect('/settings?error=oauth_failed')
  }

  try {
    const oauth2Client = createOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)

    // Get Google user info
    const userInfo = await getGoogleUserInfo(tokens.access_token!)

    // Encrypt tokens
    const encryptedAccess = encryptToken(tokens.access_token!)
    const encryptedRefresh = encryptToken(tokens.refresh_token!)

    // Get current user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Upsert OAuth connection
    await supabase
      .from('user_oauth_connections')
      .upsert({
        user_id: user!.id,
        provider: 'google',
        encrypted_access_token: encryptedAccess,
        encrypted_refresh_token: encryptedRefresh,
        token_expires_at: new Date(tokens.expiry_date!).toISOString(),
        scopes: ['drive.readonly', 'gmail.readonly'],
        provider_user_id: userInfo.id,
        provider_email: userInfo.email,
        is_active: true,
        last_refresh_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider'
      })

    return redirect('/settings?success=google_connected')
  } catch (error) {
    console.error('OAuth callback error:', error)
    return redirect('/settings?error=oauth_failed')
  }
}
```

### Step 3: Token Refresh (On-Demand)

**Helper Function:**
```typescript
// lib/oauth/token-manager.ts
export async function getValidAccessToken(
  userId: string,
  provider: 'google'
): Promise<string> {
  const supabase = await createClient()

  const { data: conn } = await supabase
    .from('user_oauth_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single()

  if (!conn || !conn.is_active) {
    throw new Error('No active OAuth connection')
  }

  // Check if token expired or expires in < 5 minutes
  const expiresAt = new Date(conn.token_expires_at).getTime()
  const now = Date.now()
  const buffer = 5 * 60 * 1000 // 5 minutes

  if (expiresAt < now + buffer) {
    // Need to refresh
    const refreshToken = decryptToken(conn.encrypted_refresh_token)
    const newTokens = await refreshGoogleToken(refreshToken)

    // Update database
    await supabase
      .from('user_oauth_connections')
      .update({
        encrypted_access_token: encryptToken(newTokens.access_token!),
        encrypted_refresh_token: encryptToken(
          newTokens.refresh_token || refreshToken
        ),
        token_expires_at: new Date(newTokens.expiry_date!).toISOString(),
        last_refresh_at: new Date().toISOString(),
      })
      .eq('id', conn.id)

    return newTokens.access_token!
  }

  // Token still valid
  return decryptToken(conn.encrypted_access_token)
}

async function refreshGoogleToken(refreshToken: string) {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  const { credentials } = await oauth2Client.refreshAccessToken()
  return credentials
}
```

---

## User Interface

### Settings Page - Integrations Tab

**Route:** `/settings` (or `/settings/integrations`)

**Component:** `GoogleConnectionCard`

**UI States:**

**Not Connected:**
```
┌─────────────────────────────────────────┐
│ Connected Accounts                       │
├─────────────────────────────────────────┤
│                                          │
│ [Google Logo] Google Account             │
│ Access Google Drive and Gmail            │
│                                          │
│ [Connect Google Account] ←─ Primary btn │
│                                          │
│ Not connected                            │
└─────────────────────────────────────────┘
```

**Connected:**
```
┌─────────────────────────────────────────┐
│ Connected Accounts                       │
├─────────────────────────────────────────┤
│                                          │
│ [Google Logo] Google Account             │
│ ✓ Connected as user@company.com          │
│ Access to: Google Drive, Gmail           │
│ Last refreshed: 2 hours ago              │
│                                          │
│ [Disconnect] [Refresh Connection]        │
│                                          │
└─────────────────────────────────────────┘
```

**Component Implementation:**
```typescript
// components/settings/google-connection-card.tsx
export function GoogleConnectionCard() {
  const { connection, isLoading } = useGoogleConnection()

  if (isLoading) return <Skeleton />

  if (!connection || !connection.is_active) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <GoogleIcon />
            <div>
              <CardTitle>Google Account</CardTitle>
              <CardDescription>
                Access Google Drive and Gmail
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={handleConnect}>
            Connect Google Account
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Not connected
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <GoogleIcon />
          <div>
            <CardTitle>Google Account</CardTitle>
            <Badge variant="success">Connected</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-1">
          Connected as {connection.provider_email}
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Access to: Google Drive, Gmail
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Last refreshed: {formatRelative(connection.last_refresh_at)}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDisconnect}>
            Disconnect
          </Button>
          <Button variant="outline" onClick={handleRefresh}>
            Refresh Connection
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Deal Settings - Sources Tab

**Route:** `/deals/[id]/settings` → "Sources" tab

**Component:** `DriveSourceConfig` and `GmailSourceConfig`

**Google Drive Section - States:**

**No Google connection:**
```
┌─────────────────────────────────────────┐
│ Google Drive                             │
├─────────────────────────────────────────┤
│ ⚠ No Google account connected            │
│                                          │
│ Connect your Google account in Settings  │
│ to monitor Drive folders for this deal.  │
│                                          │
│ [Go to Settings] ←─ Link button         │
└─────────────────────────────────────────┘
```

**Connected, no folder:**
```
┌─────────────────────────────────────────┐
│ Google Drive                             │
├─────────────────────────────────────────┤
│ ✓ Google account connected               │
│                                          │
│ Select which folder to monitor:          │
│                                          │
│ [Select Folder] ←─ Opens picker         │
└─────────────────────────────────────────┘
```

**Folder configured:**
```
┌─────────────────────────────────────────┐
│ Google Drive                             │
├─────────────────────────────────────────┤
│ ✓ Monitoring folder                      │
│                                          │
│ 📁 M&A > Project Apollo > Documents      │
│                                          │
│ [Change Folder] [Stop Monitoring]        │
└─────────────────────────────────────────┘
```

**Gmail Section - Similar pattern with labels:**

**Labels configured:**
```
┌─────────────────────────────────────────┐
│ Gmail                                    │
├─────────────────────────────────────────┤
│ ✓ Monitoring labels                      │
│                                          │
│ 🏷️ Deal/Project Apollo                   │
│                                          │
│ [Change Labels] [Stop Monitoring]        │
│                                          │
│ 💡 How to use labels: Create and apply   │
│    labels in Gmail to organize emails.   │
│    [Learn more]                          │
└─────────────────────────────────────────┘
```

### Folder Picker Component

**Component:** `DriveFolderPicker`

**UI:**
```
┌──────────────────────────────────────────────┐
│ Select Google Drive Folder           [X]     │
├──────────────────────────────────────────────┤
│                                              │
│ 📁 My Drive                          [>]     │
│   📁 M&A Projects                    [v]     │
│     📁 Project Apollo                ( )  ←─ Radio
│     📁 Project Mercury               ( )     │
│   📁 Legal                           [>]     │
│   📁 Personal                        [>]     │
│                                              │
│ 📁 Shared with me                    [>]     │
│                                              │
│ ─────────────────────────────────────────   │
│ Selected: M&A Projects/Project Apollo        │
│                                              │
│          [Cancel]  [Confirm Selection]       │
└──────────────────────────────────────────────┘
```

**Features:**
- Tree view with expand/collapse
- Lazy loading (fetch children when expanded)
- Radio button selection
- Full path preview at bottom
- Separate "My Drive" and "Shared with me" sections

**Implementation Notes:**
```typescript
// components/integrations/drive-folder-picker.tsx
export function DriveFolderPicker({ onSelect, onCancel }) {
  const [expandedFolders, setExpandedFolders] = useState(['root'])
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [folderPath, setFolderPath] = useState('')

  // Fetch folders for parent when expanded
  const { data: folders } = useDriveFolders(parentId)

  // Build path when selection changes
  useEffect(() => {
    if (selectedFolder) {
      buildFolderPath(selectedFolder.id).then(setFolderPath)
    }
  }, [selectedFolder])

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Google Drive Folder</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[400px]">
          <FolderTree
            folders={folders}
            expanded={expandedFolders}
            selected={selectedFolder}
            onExpand={handleExpand}
            onSelect={handleSelect}
          />
        </ScrollArea>

        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Selected: {folderPath || 'None'}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => onSelect(selectedFolder)}
            disabled={!selectedFolder}
          >
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Label Picker Component

**Component:** `GmailLabelPicker`

**UI:**
```
┌──────────────────────────────────────────────┐
│ Select Gmail Labels                  [X]     │
├──────────────────────────────────────────────┤
│                                              │
│ ☑ Deal/Project Apollo              ←─ Checked│
│ ☐ Deal/Project Mercury                      │
│ ☐ M&A/Legal                                  │
│ ☐ M&A/Financial                              │
│ ☐ Inbox                                      │
│                                              │
│ ─────────────────────────────────────────   │
│ Selected: 1 label                            │
│                                              │
│ 💡 Tip: Only emails with these labels will   │
│    be monitored. Create and apply labels in  │
│    Gmail to organize deal communications.    │
│                                              │
│          [Cancel]  [Confirm Selection]       │
└──────────────────────────────────────────────┘
```

**Features:**
- Checkbox list (multi-select)
- Hierarchical labels with "/" separator
- Selection counter
- Helper text with link to Gmail documentation

---

## API Routes

### OAuth Routes

```
POST   /api/oauth/google/init
  → Generate OAuth URL
  → Response: { url: string }

GET    /api/oauth/google/callback?code=...
  → Exchange code for tokens
  → Encrypt and store tokens
  → Redirect to /settings?success=google_connected

POST   /api/oauth/google/disconnect
  → Set user_oauth_connection.is_active = false
  → Response: { success: true }
```

### Google API Routes

```
GET    /api/google/drive/folders?parentId=root
  → Returns: { folders: Array<{ id, name, mimeType }> }
  → Uses lazy loading for tree view

GET    /api/google/drive/folder/:folderId/info
  → Returns: { id, name, path: string }
  → Validates folder access

GET    /api/google/gmail/labels
  → Returns: { labels: Array<{ id, name, type }> }
```

### Deal Source Connection Routes

```
POST   /api/deals/:dealId/sources/drive
  → Body: { folderId: string, folderPath: string }
  → Creates source_connections record
  → Links to user_oauth_connection_id
  → Response: { success: true, connection: {...} }

DELETE /api/deals/:dealId/sources/drive
  → Removes source_connections record
  → Response: { success: true }

POST   /api/deals/:dealId/sources/gmail
  → Body: { labelIds: string[], labelNames: string[] }
  → Stores in configuration: { labelIds, labelNames }
  → Response: { success: true, connection: {...} }

DELETE /api/deals/:dealId/sources/gmail
  → Removes source_connections record
  → Response: { success: true }
```

---

## Error Handling

### Scenario 1: Token Refresh Fails (Revoked Access)

**Detection:**
- Background monitor attempts API call
- Token refresh returns 400/401
- Mark `user_oauth_connection.is_active = false`

**User Notification:**
- Email: "Google connection lost - reconnect to resume monitoring"
- Dashboard warning badge on affected deals
- Deal banner: "⚠️ Google Drive disconnected - [Reconnect]"

**Recovery:**
- User clicks "Reconnect" → OAuth flow
- New tokens stored, `is_active = true`
- Monitoring resumes

### Scenario 2: Folder/Label No Longer Accessible

**Detection:**
- API returns 404 or permission denied
- Store in `source_connections.configuration.last_error`

**User Notification:**
- Deal settings: "⚠️ Cannot access folder 'Project Apollo'"
- Suggestion: "Folder may have been deleted or permissions changed"

**Recovery:**
- User selects new folder/labels
- Error clears

### Scenario 3: Google API Rate Limit

**Detection:**
- API returns 429 Too Many Requests

**Handling:**
- Exponential backoff: retry after 1min, 5min, 15min
- No user notification (temporary, self-healing)
- Log warning for monitoring

**Recovery:**
- Automatic retry with backoff

### Email Notification Template

**Subject:** Reconnect your Google account - DealPulse

```
Hi [User],

We've lost connection to your Google account for monitoring:
- Deal: Project Apollo
- Source: Google Drive

This usually happens when you revoke access or change your Google password.

→ Reconnect now: [Link to Settings]

Your deal data is safe, but we can't monitor new changes until reconnected.

Best,
DealPulse Team
```

---

## Implementation Plan

### Phase 1: Database & Security
1. Create `user_oauth_connections` migration
2. Modify `source_connections` migration
3. Implement token encryption utilities
4. Generate `TOKEN_ENCRYPTION_KEY` and add to `.env`

### Phase 2: OAuth Flow
1. Create OAuth init route (`/api/oauth/google/init`)
2. Create OAuth callback route (`/api/oauth/google/callback`)
3. Implement token manager (`getValidAccessToken`)
4. Create disconnect route

### Phase 3: Settings UI
1. Create Settings page with Integrations tab
2. Build `GoogleConnectionCard` component
3. Implement connect/disconnect actions
4. Add success/error toast notifications

### Phase 4: Google API Integration
1. Create Drive folders API route
2. Create Gmail labels API route
3. Create folder info API route
4. Add error handling and retry logic

### Phase 5: Deal Configuration UI
1. Add "Sources" tab to Deal Settings
2. Build `DriveSourceConfig` component
3. Build `GmailSourceConfig` component
4. Implement source connection server actions

### Phase 6: Picker Components
1. Build `DriveFolderPicker` with tree view
2. Build `GmailLabelPicker` with checkboxes
3. Add lazy loading for folders
4. Add helper text and documentation links

### Phase 7: Error Handling & Notifications
1. Implement connection failure detection
2. Create email notification templates
3. Add warning badges to dashboard
4. Build reconnection flow

### Phase 8: Testing
1. Test full OAuth flow (connect, disconnect, reconnect)
2. Test token refresh logic
3. Test folder/label selection
4. Test error scenarios (revoked access, deleted folder)
5. Test encryption/decryption

---

## File Structure

### New Files

```
lib/
├── crypto/
│   └── token-encryption.ts              # Encrypt/decrypt utilities
├── oauth/
│   ├── google-oauth.ts                  # OAuth helpers
│   └── token-manager.ts                 # Token refresh logic
└── integrations/
    └── google/
        ├── drive-folders.ts             # Fetch folder tree
        └── gmail-labels.ts              # Fetch labels

app/
├── settings/
│   ├── page.tsx                         # Settings page
│   └── actions.ts                       # Disconnect action
├── api/
│   └── oauth/
│       └── google/
│           ├── init/route.ts            # Generate OAuth URL
│           ├── callback/route.ts        # Handle callback
│           └── disconnect/route.ts      # Disconnect
└── api/google/
    ├── drive/
    │   ├── folders/route.ts             # List folders
    │   └── folder/[id]/route.ts         # Folder info
    └── gmail/
        └── labels/route.ts              # List labels

app/(authenticated)/deals/[id]/
└── settings/
    ├── page.tsx                         # Add Sources tab
    ├── sources-tab.tsx                  # Source configuration
    └── actions.ts                       # Source CRUD actions

components/
├── settings/
│   └── google-connection-card.tsx       # Settings connection UI
└── integrations/
    ├── drive-folder-picker.tsx          # Folder tree picker
    └── gmail-label-picker.tsx           # Label checkbox list

supabase/migrations/
├── 20250126000000_add_user_oauth_connections.sql
└── 20250126000001_modify_source_connections.sql
```

### Modified Files

```
.env / .env.local
  → Add: TOKEN_ENCRYPTION_KEY
  → Add: GOOGLE_CLIENT_ID
  → Add: GOOGLE_CLIENT_SECRET
  → Add: GOOGLE_REDIRECT_URI
```

---

## Environment Variables

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/oauth/google/callback

# Token Encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
TOKEN_ENCRYPTION_KEY=your-64-char-hex-string
```

---

## Future Enhancements

### Proactive Token Refresh
- Background cron job checks token expiry hourly
- Refreshes tokens 10 minutes before expiry
- Prevents monitoring failures from expired tokens

### Advanced Gmail Filtering
- Add search query option (Option B from design)
- Add simple filter builder UI (Option C from design)
- Support combinations: labels AND search queries

### Folder Picker Improvements
- Search folders by name
- Show recently used folders
- Bookmark frequently used folders

### Multi-Account Support
- Allow multiple Google accounts per user
- Select which account per deal
- Unified token management

### Monitoring Dashboard
- Show connection health status
- Token expiry warnings
- API usage statistics
- Last sync timestamps

---

## Security Considerations

1. **Token Storage:** Tokens encrypted at rest using AES-256-GCM
2. **Key Management:** Encryption key stored in environment, never committed to git
3. **Token Transmission:** Always use HTTPS in production
4. **Scope Minimization:** Only request readonly scopes needed
5. **RLS Policies:** Users can only access their own OAuth connections
6. **Admin-Only Source Config:** Only deal admins can modify source connections
7. **Token Refresh:** On-demand refresh minimizes token lifetime exposure

---

## Testing Checklist

- [ ] OAuth flow completes successfully
- [ ] Tokens stored encrypted in database
- [ ] Token decryption works correctly
- [ ] Token refresh triggered on expiry
- [ ] Disconnect marks connection inactive
- [ ] Reconnect replaces old tokens
- [ ] Folder picker loads folders correctly
- [ ] Folder selection saves to database
- [ ] Label picker loads labels correctly
- [ ] Label selection saves to database
- [ ] Error handling for revoked access
- [ ] Error handling for deleted folder
- [ ] Error handling for rate limits
- [ ] Email notifications sent on failure
- [ ] Warning badges shown on dashboard
- [ ] Multiple deals can share OAuth connection
- [ ] Each deal can have different folder/labels

---

## Glossary

**OAuth Connection:** User-level authentication to Google, stored in `user_oauth_connections`

**Source Connection:** Deal-level configuration (folder/label), stored in `source_connections`

**Token Refresh:** Process of exchanging refresh_token for new access_token when expired

**Lazy Loading:** Fetching folder children only when folder is expanded in tree view

**Silent Degradation:** Monitoring stops gracefully without blocking user access to existing data
