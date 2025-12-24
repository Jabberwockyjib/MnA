import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

/**
 * Google Drive Client
 *
 * From originplan.md Section 5.2: Source Monitoring
 * - One document repository (Google Drive or SharePoint)
 * - Detect new documents
 * - Detect document updates
 * - Never modifies source files
 */

// OAuth2 Configuration
const SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
]

/**
 * Create OAuth2 client
 */
export function createOAuth2Client(): OAuth2Client {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/google/callback'

    if (!clientId || !clientSecret) {
        throw new Error('Google OAuth credentials not configured')
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

/**
 * Get authorization URL for OAuth flow
 */
export function getAuthUrl(): string {
    const oauth2Client = createOAuth2Client()

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent', // Force consent to get refresh token
    })
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string) {
    const oauth2Client = createOAuth2Client()

    const { tokens } = await oauth2Client.getToken(code)

    return tokens
}

/**
 * Create authenticated Google Drive client
 */
export function createDriveClient(accessToken: string, refreshToken?: string) {
    const oauth2Client = createOAuth2Client()

    oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
    })

    return google.drive({ version: 'v3', auth: oauth2Client })
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string) {
    const oauth2Client = createOAuth2Client()

    oauth2Client.setCredentials({
        refresh_token: refreshToken,
    })

    const { credentials } = await oauth2Client.refreshAccessToken()

    return credentials
}
