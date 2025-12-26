/**
 * Token Manager
 *
 * Handles retrieval and automatic refresh of OAuth access tokens.
 * - Retrieves user's OAuth connection from database
 * - Decrypts access token
 * - Checks if token is expired or expires within 5 minutes
 * - If expiring: refreshes token, encrypts new tokens, updates database
 * - If valid: returns decrypted access token
 */

import { createClient } from '@/lib/supabase/server'
import { decryptToken, encryptToken } from '@/lib/crypto/token-encryption'
import { refreshAccessToken } from './google-oauth'

/**
 * Get a valid access token for a user's OAuth connection.
 * Automatically refreshes the token if it's expired or expires within 5 minutes.
 *
 * @param userId - The user's ID
 * @param provider - The OAuth provider ('google' or 'microsoft')
 * @returns The valid access token (decrypted)
 * @throws Error if no active connection exists or token refresh fails
 */
export async function getValidAccessToken(
  userId: string,
  provider: 'google' | 'microsoft'
): Promise<string> {
  // Input validation
  if (!userId?.trim()) {
    throw new Error('User ID is required')
  }

  if (!provider || !['google', 'microsoft'].includes(provider)) {
    throw new Error('Invalid provider. Must be "google" or "microsoft"')
  }

  try {
    const supabase = await createClient()

    // Retrieve the user's OAuth connection
    const { data: conn, error } = await supabase
      .from('user_oauth_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single()

    if (error || !conn) {
      throw new Error(`No ${provider} connection found for user ${userId}`)
    }

    if (!conn.is_active) {
      throw new Error(
        `${provider} connection for user ${userId} is inactive. Please re-authenticate.`
      )
    }

    // Check if token is expired or expires within 5 minutes
    const expiresAt = new Date(conn.token_expires_at).getTime()
    const now = Date.now()
    const buffer = 5 * 60 * 1000 // 5 minutes in milliseconds

    if (expiresAt < now + buffer) {
      // Token expired or expiring soon - need to refresh
      console.log(
        `Token for user ${userId} (${provider}) expired or expiring soon, refreshing...`
      )

      try {
        // Decrypt the refresh token
        const decryptedRefreshToken = decryptToken(conn.encrypted_refresh_token)

        // Refresh the access token
        const newTokens = await refreshAccessToken(decryptedRefreshToken)

        if (!newTokens.access_token) {
          throw new Error('Token refresh failed: no access token returned')
        }

        // Update database with new tokens
        const { error: updateError } = await supabase
          .from('user_oauth_connections')
          .update({
            encrypted_access_token: encryptToken(newTokens.access_token),
            // Use new refresh token if provided, otherwise keep the existing one
            encrypted_refresh_token: encryptToken(
              newTokens.refresh_token || decryptedRefreshToken
            ),
            token_expires_at: newTokens.expiry_date
              ? new Date(newTokens.expiry_date).toISOString()
              : new Date(Date.now() + 3600 * 1000).toISOString(), // Default to 1 hour if not provided
            last_refresh_at: new Date().toISOString(),
          })
          .eq('id', conn.id)

        if (updateError) {
          console.error('Failed to update tokens in database:', updateError)
          throw new Error('Failed to update tokens after refresh')
        }

        console.log(
          `Successfully refreshed token for user ${userId} (${provider})`
        )

        return newTokens.access_token
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)

        // If refresh fails, mark connection as inactive
        await markConnectionInactive(userId, provider).catch((markError) => {
          console.error('Failed to mark connection as inactive:', markError)
        })

        throw new Error(
          `Failed to refresh ${provider} token. Please re-authenticate.`
        )
      }
    }

    // Token is still valid - return decrypted token
    return decryptToken(conn.encrypted_access_token)
  } catch (error) {
    // If it's already our custom error, re-throw it
    if (error instanceof Error && error.message.includes('connection')) {
      throw error
    }

    // Otherwise, wrap it in a generic error
    console.error('Error getting valid access token:', error)
    throw new Error(
      `Failed to get valid access token for ${provider}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

/**
 * Mark a user's OAuth connection as inactive.
 * This is typically called when token refresh fails or the user revokes access.
 *
 * @param userId - The user's ID
 * @param provider - The OAuth provider ('google' or 'microsoft')
 */
export async function markConnectionInactive(
  userId: string,
  provider: 'google' | 'microsoft'
): Promise<void> {
  // Input validation
  if (!userId?.trim()) {
    throw new Error('User ID is required')
  }

  if (!provider || !['google', 'microsoft'].includes(provider)) {
    throw new Error('Invalid provider. Must be "google" or "microsoft"')
  }

  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('user_oauth_connections')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('provider', provider)

    if (error) {
      console.error('Failed to mark connection as inactive:', error)
      throw new Error('Failed to mark connection as inactive')
    }

    console.log(
      `Marked ${provider} connection for user ${userId} as inactive`
    )
  } catch (error) {
    console.error('Error marking connection as inactive:', error)
    throw error
  }
}
