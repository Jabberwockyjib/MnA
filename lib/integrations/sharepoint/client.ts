import { ConfidentialClientApplication, AuthorizationUrlRequest, AuthorizationCodeRequest } from '@azure/msal-node'
import { Client } from '@microsoft/microsoft-graph-client'
import 'isomorphic-fetch'

/**
 * SharePoint/Microsoft Graph OAuth Client
 *
 * Handles authentication and API access for SharePoint via Microsoft Graph
 * From originplan.md Section 5.2: Source Monitoring
 */

// OAuth2 Configuration
const CLIENT_ID = process.env.SHAREPOINT_CLIENT_ID || ''
const CLIENT_SECRET = process.env.SHAREPOINT_CLIENT_SECRET || ''
const TENANT_ID = process.env.SHAREPOINT_TENANT_ID || 'common'
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/sharepoint/callback`
    : 'http://localhost:3000/api/oauth/sharepoint/callback'

// Microsoft Graph Scopes
const SCOPES = [
    'https://graph.microsoft.com/Files.Read.All',
    'https://graph.microsoft.com/Sites.Read.All',
    'offline_access', // For refresh token
]

/**
 * Create MSAL confidential client application
 */
export function createMsalClient() {
    return new ConfidentialClientApplication({
        auth: {
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            authority: `https://login.microsoftonline.com/${TENANT_ID}`,
        },
    })
}

/**
 * Get Microsoft OAuth authorization URL
 */
export function getAuthUrl(dealId: string): string {
    const msalClient = createMsalClient()

    const authCodeUrlParameters: AuthorizationUrlRequest = {
        scopes: SCOPES,
        redirectUri: REDIRECT_URI,
        state: dealId, // Pass dealId via state parameter
    }

    return msalClient.getAuthCodeUrl(authCodeUrlParameters)
}

/**
 * Exchange authorization code for access tokens
 */
export async function getTokensFromCode(code: string) {
    const msalClient = createMsalClient()

    const tokenRequest: AuthorizationCodeRequest = {
        code,
        scopes: SCOPES,
        redirectUri: REDIRECT_URI,
    }

    const response = await msalClient.acquireTokenByCode(tokenRequest)

    return {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken || null,
        expiresOn: response.expiresOn ? response.expiresOn.getTime() : null,
    }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string) {
    const msalClient = createMsalClient()

    try {
        const response = await msalClient.acquireTokenByRefreshToken({
            refreshToken,
            scopes: SCOPES,
        })

        return {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken || refreshToken,
            expiresOn: response.expiresOn ? response.expiresOn.getTime() : null,
        }
    } catch (error) {
        console.error('Token refresh failed:', error)
        throw new Error('Failed to refresh SharePoint access token')
    }
}

/**
 * Create Microsoft Graph client with access token
 */
export function createGraphClient(accessToken: string): Client {
    return Client.init({
        authProvider: (done) => {
            done(null, accessToken)
        },
    })
}

/**
 * Get or refresh access token
 */
export async function getValidAccessToken(
    currentToken: string,
    refreshToken: string | null,
    expiresAt: string | null
): Promise<string> {
    // Check if token is expired
    if (expiresAt) {
        const expiresDate = new Date(expiresAt)
        const now = new Date()
        const bufferTime = 5 * 60 * 1000 // 5 minutes buffer

        if (expiresDate.getTime() - now.getTime() > bufferTime) {
            // Token still valid
            return currentToken
        }
    }

    // Token expired, refresh it
    if (refreshToken) {
        const tokens = await refreshAccessToken(refreshToken)
        return tokens.accessToken
    }

    throw new Error('Token expired and no refresh token available')
}
