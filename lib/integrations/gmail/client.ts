import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

/**
 * Gmail OAuth Client
 *
 * Handles authentication and API access for Gmail
 * From originplan.md Section 5.2: Email Awareness
 */

// OAuth2 Configuration (same as Google Drive)
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/gmail/callback`
    : 'http://localhost:3000/api/oauth/gmail/callback'

// Gmail-specific scopes
const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.metadata',
]

/**
 * Create OAuth2 client
 */
export function createOAuth2Client(): OAuth2Client {
    return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
}

/**
 * Get Gmail authorization URL
 */
export function getAuthUrl(): string {
    const oauth2Client = createOAuth2Client()

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent', // Force consent screen to always get refresh token
    })
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string) {
    const oauth2Client = createOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)

    return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
    }
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string) {
    const oauth2Client = createOAuth2Client()
    oauth2Client.setCredentials({ refresh_token: refreshToken })

    const { credentials } = await oauth2Client.refreshAccessToken()

    return {
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token || refreshToken,
        expiry_date: credentials.expiry_date,
    }
}

/**
 * Create Gmail API client
 */
export function createGmailClient(
    accessToken: string,
    refreshToken?: string
) {
    const oauth2Client = createOAuth2Client()

    oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
    })

    return google.gmail({ version: 'v1', auth: oauth2Client })
}
