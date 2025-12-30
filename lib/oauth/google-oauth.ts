/**
 * Google OAuth Helper Utilities
 *
 * Handles Google OAuth 2.0 authentication flow including:
 * - Generating OAuth authorization URLs
 * - Exchanging authorization codes for tokens
 * - Refreshing expired access tokens
 * - Retrieving user profile information
 *
 * Note: Token encryption is handled at the application layer by the
 * encryption utilities in lib/crypto/token-encryption.ts. Tokens are
 * encrypted before being stored in the user_oauth_connections table.
 */

import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

// Note: gmail.readonly includes metadata access AND search capability
// drive.readonly includes metadata access
// Using the broader scopes to avoid permission issues
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
]

export function createOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL must be configured for OAuth')
  }

  const redirectUri = `${appUrl}/api/oauth/google/callback`

  // Validate redirect URI format
  try {
    new URL(redirectUri)
  } catch {
    throw new Error(`Invalid redirect URI: ${redirectUri}`)
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
  if (!code?.trim()) {
    throw new Error('Authorization code is required')
  }

  try {
    const oauth2Client = createOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)
    return tokens
  } catch (error) {
    console.error('Failed to exchange code for tokens:', error)
    throw new Error('Failed to complete OAuth authorization')
  }
}

export async function refreshAccessToken(refreshToken: string) {
  if (!refreshToken?.trim()) {
    throw new Error('Refresh token is required')
  }

  try {
    const oauth2Client = createOAuth2Client()
    oauth2Client.setCredentials({ refresh_token: refreshToken })

    const { credentials } = await oauth2Client.refreshAccessToken()
    return credentials
  } catch (error) {
    console.error('Failed to refresh access token:', error)
    throw new Error('Failed to refresh OAuth token')
  }
}

export async function getGoogleUserInfo(accessToken: string) {
  if (!accessToken?.trim()) {
    throw new Error('Access token is required')
  }

  try {
    const oauth2Client = createOAuth2Client()
    oauth2Client.setCredentials({ access_token: accessToken })

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data } = await oauth2.userinfo.get()

    if (!data.id || !data.email) {
      throw new Error('Invalid user info response from Google')
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name ?? null,
      picture: data.picture ?? null,
    }
  } catch (error) {
    console.error('Failed to get Google user info:', error)
    throw new Error('Failed to retrieve user information')
  }
}
